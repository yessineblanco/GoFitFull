import { NextRequest, NextResponse } from "next/server";

import {
  ADVANCED_BI_SAVED_VIEWS_MAX,
  ADVANCED_BI_SAVED_VIEW_RANGE_KEYS,
  buildAdvancedBISavedViewsSettingKey,
  isMissingAdminSettingsTableError,
  parseAdvancedBISavedViewsValue,
  type AdvancedBISavedView,
  type AdvancedBISavedViewRangeKey,
} from "@/lib/bi-saved-views";
import { getAdminUserIdFromRequest } from "@/lib/audit";
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

async function getCurrentSavedViews(adminUserId: string) {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("admin_settings")
    .select("value")
    .eq("key", buildAdvancedBISavedViewsSettingKey(adminUserId))
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message);
  }

  return parseAdvancedBISavedViewsValue(data?.value);
}

async function persistSavedViews(
  adminUserId: string,
  savedViews: AdvancedBISavedView[]
) {
  const adminClient = createAdminClient();
  const { error } = await adminClient.from("admin_settings").upsert(
    {
      key: buildAdvancedBISavedViewsSettingKey(adminUserId),
      value: {
        views: savedViews,
        updatedAt: new Date().toISOString(),
        updatedBy: adminUserId,
      },
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "key",
    }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function GET(request: NextRequest) {
  try {
    const adminUserId = await getAdminUserIdFromRequest(request);

    if (!adminUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { savedViews: await getCurrentSavedViews(adminUserId) },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching BI saved views:", error);

    if (
      isMissingAdminSettingsTableError(
        error instanceof Error ? { message: error.message } : undefined
      )
    ) {
      return NextResponse.json({ savedViews: [] }, { status: 200 });
    }

    return NextResponse.json(
      { error: "Failed to fetch BI saved views." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUserId = await getAdminUserIdFromRequest(request);

    if (!adminUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const name = normalizeString(body.name);
    const rangeKey = normalizeString(body.rangeKey);
    const coachId = normalizeString(body.coachId);
    const packId = normalizeString(body.packId);

    if (!name) {
      return NextResponse.json(
        { error: "A saved view name is required." },
        { status: 400 }
      );
    }

    if (name.length > 40) {
      return NextResponse.json(
        { error: "Saved view names must be 40 characters or fewer." },
        { status: 400 }
      );
    }

    if (
      !rangeKey ||
      !ADVANCED_BI_SAVED_VIEW_RANGE_KEYS.includes(
        rangeKey as AdvancedBISavedViewRangeKey
      )
    ) {
      return NextResponse.json(
        { error: "Invalid BI saved-view range." },
        { status: 400 }
      );
    }

    const existingViews = await getCurrentSavedViews(adminUserId);

    if (existingViews.length >= ADVANCED_BI_SAVED_VIEWS_MAX) {
      return NextResponse.json(
        {
          error: `You can save up to ${ADVANCED_BI_SAVED_VIEWS_MAX} BI views.`,
        },
        { status: 400 }
      );
    }

    const nextView: AdvancedBISavedView = {
      id: crypto.randomUUID(),
      name,
      rangeKey: rangeKey as AdvancedBISavedViewRangeKey,
      coachId,
      packId,
      createdAt: new Date().toISOString(),
    };
    const nextViews = [nextView, ...existingViews];

    await persistSavedViews(adminUserId, nextViews);

    return NextResponse.json({ savedViews: nextViews }, { status: 200 });
  } catch (error) {
    console.error("Error saving BI view:", error);

    if (
      isMissingAdminSettingsTableError(
        error instanceof Error ? { message: error.message } : undefined
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Saved views are unavailable because admin_settings is not provisioned in this database yet.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to save BI view." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const adminUserId = await getAdminUserIdFromRequest(request);

    if (!adminUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = normalizeString(request.nextUrl.searchParams.get("id"));

    if (!id) {
      return NextResponse.json(
        { error: "A saved view id is required." },
        { status: 400 }
      );
    }

    const existingViews = await getCurrentSavedViews(adminUserId);
    const nextViews = existingViews.filter((view) => view.id !== id);

    if (nextViews.length === existingViews.length) {
      return NextResponse.json(
        { error: "Saved view not found." },
        { status: 404 }
      );
    }

    await persistSavedViews(adminUserId, nextViews);

    return NextResponse.json({ savedViews: nextViews }, { status: 200 });
  } catch (error) {
    console.error("Error deleting BI saved view:", error);

    if (
      isMissingAdminSettingsTableError(
        error instanceof Error ? { message: error.message } : undefined
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Saved views are unavailable because admin_settings is not provisioned in this database yet.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to delete BI saved view." },
      { status: 500 }
    );
  }
}
