import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { createAuditLog, AuditActions, getClientIP, getUserAgent, getAdminUserIdFromRequest } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { isAdmin } = await request.json();

    if (typeof isAdmin !== "boolean") {
      return NextResponse.json(
        { error: "isAdmin must be a boolean" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Update the user_profiles table
    const { error } = await adminClient
      .from("user_profiles")
      .update({ is_admin: isAdmin })
      .eq("id", id);

    if (error) {
      console.error("Error updating admin status:", error);
      return NextResponse.json(
        { error: "Failed to update admin status" },
        { status: 500 }
      );
    }

    // Get admin user ID from session
    const adminUserId = await getAdminUserIdFromRequest(request);

    // Log audit event
    if (adminUserId) {
      await createAuditLog({
        adminUserId,
        action: AuditActions.TOGGLE_ADMIN,
        resourceType: "user",
        resourceId: id,
        details: { targetUserId: id, newAdminStatus: isAdmin },
        ipAddress: getClientIP(request),
        userAgent: getUserAgent(request),
      });
    }

    return NextResponse.json({
      message: `Admin status ${isAdmin ? "granted" : "revoked"} successfully`,
      isAdmin,
    });
  } catch (error: any) {
    console.error("Error in toggle-admin API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
