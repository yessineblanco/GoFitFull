import { NextRequest, NextResponse } from "next/server";

import { getAdminUserIdFromRequest } from "@/lib/audit";
import {
  getAdminUserIdFromAdvancedBISavedViewsSettingKey,
  parseAdvancedBISavedViewsValue,
  type AdvancedBISavedView,
} from "@/lib/bi-saved-views";
import { buildAdvancedBISnapshotNotification } from "@/lib/bi-snapshot";
import { createAdminClient, isUserAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface RawAdminSettingRow {
  key: string;
  value: unknown;
}

const DIGEST_INTERVAL_MS = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
} as const;

async function isAuthorizedDigestRunner(request: NextRequest) {
  const cronSecret = process.env.BI_DIGEST_CRON_SECRET || process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  const adminUserId = await getAdminUserIdFromRequest(request);
  return adminUserId ? isUserAdmin(adminUserId) : false;
}

function isDigestDue(view: AdvancedBISavedView, now: Date) {
  if (view.digestCadence === "none") {
    return false;
  }

  if (!view.digestLastSentAt) {
    return true;
  }

  const lastSentAt = new Date(view.digestLastSentAt).getTime();

  if (!Number.isFinite(lastSentAt)) {
    return true;
  }

  return now.getTime() - lastSentAt >= DIGEST_INTERVAL_MS[view.digestCadence];
}

async function runScheduledDigests(request: NextRequest) {
  try {
    const isAuthorized = await isAuthorizedDigestRunner(request);

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const now = new Date();
    const nowIso = now.toISOString();
    const { data, error } = await adminClient
      .from("admin_settings")
      .select("key, value")
      .like("key", "advanced_bi_saved_views:%");

    if (error) {
      throw new Error(error.message);
    }

    let checkedViews = 0;
    let sentDigests = 0;
    const failedViews: Array<{ id: string; name: string; reason: string }> = [];

    for (const row of ((data || []) as RawAdminSettingRow[])) {
      const adminUserId = getAdminUserIdFromAdvancedBISavedViewsSettingKey(row.key);

      if (!adminUserId) {
        continue;
      }

      const savedViews = parseAdvancedBISavedViewsValue(row.value);
      let didUpdate = false;
      const nextViews: AdvancedBISavedView[] = [];

      for (const view of savedViews) {
        checkedViews += 1;

        if (!isDigestDue(view, now)) {
          nextViews.push(view);
          continue;
        }

        try {
          const notification = await buildAdvancedBISnapshotNotification({
            rangeKey: view.rangeKey,
            coachId: view.coachId,
            packId: view.packId,
            viewName: view.name,
          });

          const insertResult = await adminClient.from("admin_notifications").insert({
            admin_user_id: adminUserId,
            type: "info",
            title: notification.title,
            message: notification.message,
            href: notification.href,
          });

          if (insertResult.error) {
            throw new Error(insertResult.error.message);
          }

          sentDigests += 1;
          didUpdate = true;
          nextViews.push({
            ...view,
            digestLastSentAt: nowIso,
          });
        } catch (error) {
          failedViews.push({
            id: view.id,
            name: view.name,
            reason:
              error instanceof Error
                ? error.message
                : "Unknown scheduled digest error",
          });
          nextViews.push(view);
        }
      }

      if (didUpdate) {
        const updateResult = await adminClient
          .from("admin_settings")
          .update({
            value: {
              views: nextViews,
              updatedAt: nowIso,
              updatedBy: "bi_scheduled_digests",
            },
            updated_at: nowIso,
          })
          .eq("key", row.key);

        if (updateResult.error) {
          throw new Error(updateResult.error.message);
        }
      }
    }

    return NextResponse.json(
      {
        checkedViews,
        failedViews,
        sentDigests,
      },
      { status: failedViews.length > 0 ? 207 : 200 }
    );
  } catch (error) {
    console.error("Error running scheduled BI digests:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to run scheduled BI digests.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return runScheduledDigests(request);
}

export async function POST(request: NextRequest) {
  return runScheduledDigests(request);
}
