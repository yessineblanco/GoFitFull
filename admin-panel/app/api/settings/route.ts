import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUserIdFromRequest } from "@/lib/audit";

// Store settings in a simple table or JSONB column
// For now, we'll use a settings table. If it doesn't exist, create it first.
export async function GET(request: NextRequest) {
  try {
    const adminClient = createAdminClient();

    // Try to fetch settings from a settings table
    // If the table doesn't exist, return defaults
    const { data, error } = await adminClient
      .from("admin_settings")
      .select("*")
      .eq("key", "platform_settings")
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned, which is fine for first run
      console.error("Error fetching settings:", error);
      return NextResponse.json(
        { error: "Failed to fetch settings" },
        { status: 500 }
      );
    }

    // Return default settings if none exist
    const defaultSettings = {
      platformName: "GoFit",
      supportEmail: "support@gofit.com",
      maintenanceMode: false,
      maxUsersPerPlan: 1000,
    };

    return NextResponse.json(
      { settings: data?.value || defaultSettings },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Unexpected error:", error);
    // Return defaults if table doesn't exist
    return NextResponse.json(
      {
        settings: {
          platformName: "GoFit",
          supportEmail: "support@gofit.com",
          maintenanceMode: false,
          maxUsersPerPlan: 1000,
        },
      },
      { status: 200 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platformName, supportEmail, maintenanceMode, maxUsersPerPlan } = body;

    // Validate
    if (!platformName || !supportEmail) {
      return NextResponse.json(
        { error: "Missing required fields: platformName and supportEmail" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const adminUserId = await getAdminUserIdFromRequest(request);

    if (!adminUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Upsert settings
    const settingsValue = {
      platformName: platformName.trim(),
      supportEmail: supportEmail.trim(),
      maintenanceMode: maintenanceMode || false,
      maxUsersPerPlan: maxUsersPerPlan || 1000,
      updatedAt: new Date().toISOString(),
      updatedBy: adminUserId,
    };

    const { data, error } = await adminClient
      .from("admin_settings")
      .upsert(
        {
          key: "platform_settings",
          value: settingsValue,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "key",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("Error saving settings:", error);
      return NextResponse.json(
        { error: error.message || "Failed to save settings" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, settings: data.value },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
