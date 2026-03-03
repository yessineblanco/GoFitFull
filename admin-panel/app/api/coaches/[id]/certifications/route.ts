import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, verifyAdminAccess } from "@/lib/supabase/admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdminAccess();

    const { id: coachId } = await params;
    const body = await request.json();
    const { certificationId, status } = body;

    if (!certificationId || !status) {
      return NextResponse.json(
        { error: "certificationId and status are required" },
        { status: 400 }
      );
    }

    if (!["verified", "rejected", "pending"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be: verified, rejected, or pending" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    const updateData: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "verified") {
      updateData.verified_at = new Date().toISOString();
    }

    const { data, error } = await adminClient
      .from("coach_certifications")
      .update(updateData)
      .eq("id", certificationId)
      .eq("coach_id", coachId)
      .select()
      .single();

    if (error) {
      console.error("Error updating certification:", error);
      return NextResponse.json(
        { error: "Failed to update certification" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, certification: data });
  } catch (error: any) {
    console.error("Certification update error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message?.includes("Not") ? 403 : 500 }
    );
  }
}
