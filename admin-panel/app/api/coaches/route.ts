import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, verifyAdminAccess } from "@/lib/supabase/admin";

export async function PATCH(request: NextRequest) {
  try {
    await verifyAdminAccess();

    const body = await request.json();
    const { coachProfileId, status } = body;

    if (!coachProfileId || !status) {
      return NextResponse.json(
        { error: "coachProfileId and status are required" },
        { status: 400 }
      );
    }

    if (!["approved", "rejected", "pending"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be: approved, rejected, or pending" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from("coach_profiles")
      .update({
        status,
        is_verified: status === "approved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", coachProfileId)
      .select()
      .single();

    if (error) {
      console.error("Error updating coach status:", error);
      return NextResponse.json(
        { error: "Failed to update coach status" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, coach: data });
  } catch (error: any) {
    console.error("Coach status update error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message?.includes("Not") ? 403 : 500 }
    );
  }
}
