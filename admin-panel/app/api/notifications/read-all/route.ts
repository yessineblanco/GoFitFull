import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUserIdFromRequest } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const adminUserId = await getAdminUserIdFromRequest(request);
    if (!adminUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("admin_notifications")
      .update({ read: true })
      .eq("admin_user_id", adminUserId)
      .eq("read", false);

    if (error) {
      console.error("Error marking all as read:", error);
      return NextResponse.json(
        { error: error.message || "Failed to mark all as read" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "All notifications marked as read" },
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
