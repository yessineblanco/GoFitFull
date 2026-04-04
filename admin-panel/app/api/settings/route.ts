import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUserIdFromRequest } from "@/lib/audit";

// Store settings in a simple table or JSONB column
// For now, we'll use a settings table. If it doesn't exist, create it first.
export async function GET(request: NextRequest) {
  try {
    const adminClient = createAdminClient();
    const { searchParams } = new URL(request.url);
    const wantStats = searchParams.get("stats") === "true";

    const { data, error } = await adminClient
      .from("admin_settings")
      .select("*")
      .eq("key", "platform_settings")
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching settings:", error);
      return NextResponse.json(
        { error: "Failed to fetch settings" },
        { status: 500 }
      );
    }

    const defaultSettings = {
      platformName: "GoFit",
      supportEmail: "support@gofit.com",
      maintenanceMode: false,
      maxUsersPerPlan: 1000,
      platformFeePercent: 10,
    };

    const result: Record<string, any> = {
      settings: data?.value || defaultSettings,
    };

    if (wantStats) {
      const [users, coaches, packs, bookings] = await Promise.all([
        adminClient.from("user_profiles").select("id", { count: "exact", head: true }),
        adminClient.from("coach_profiles").select("id", { count: "exact", head: true }),
        adminClient.from("purchased_packs").select("id", { count: "exact", head: true }).gt("sessions_remaining", 0),
        adminClient.from("bookings").select("id", { count: "exact", head: true }),
      ]);
      result.stats = {
        totalUsers: users.count || 0,
        totalCoaches: coaches.count || 0,
        activePacks: packs.count || 0,
        totalBookings: bookings.count || 0,
      };
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("Unexpected error:", error);
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
    const { platformName, supportEmail, maintenanceMode, maxUsersPerPlan, platformFeePercent, notifications } = body;

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
    const settingsValue: Record<string, any> = {
      platformName: platformName.trim(),
      supportEmail: supportEmail.trim(),
      maintenanceMode: maintenanceMode || false,
      maxUsersPerPlan: maxUsersPerPlan || 1000,
      platformFeePercent: Math.min(100, Math.max(0, Number(platformFeePercent) || 10)),
      updatedAt: new Date().toISOString(),
      updatedBy: adminUserId,
    };
    if (notifications) {
      settingsValue.notifications = notifications;
    }

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
