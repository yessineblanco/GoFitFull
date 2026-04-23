import { NextRequest, NextResponse } from "next/server";

import { getAdminUserIdFromRequest } from "@/lib/audit";
import {
  ADVANCED_BI_SNAPSHOT_RANGE_KEYS,
  buildAdvancedBISnapshotNotification,
  type AdvancedBISnapshotRangeKey,
} from "@/lib/bi-snapshot";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

export async function POST(request: NextRequest) {
  try {
    const adminUserId = await getAdminUserIdFromRequest(request);

    if (!adminUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const rangeKey = normalizeString(body.rangeKey);

    if (
      !rangeKey ||
      !ADVANCED_BI_SNAPSHOT_RANGE_KEYS.includes(
        rangeKey as AdvancedBISnapshotRangeKey
      )
    ) {
      return NextResponse.json(
        { error: "Invalid BI snapshot range." },
        { status: 400 }
      );
    }

    const notification = await buildAdvancedBISnapshotNotification({
      rangeKey: rangeKey as AdvancedBISnapshotRangeKey,
      coachId: normalizeString(body.coachId),
      coachName: normalizeString(body.coachName),
      packId: normalizeString(body.packId),
      packName: normalizeString(body.packName),
    });

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("admin_notifications")
      .insert({
        admin_user_id: adminUserId,
        type: "info",
        title: notification.title,
        message: notification.message,
        href: notification.href,
      })
      .select("id, title, message, href, created_at")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(
      {
        data,
        message: "BI snapshot sent to your notifications.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating BI snapshot notification:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to send BI snapshot notification.",
      },
      { status: 500 }
    );
  }
}
