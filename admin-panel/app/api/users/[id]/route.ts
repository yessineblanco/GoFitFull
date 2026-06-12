import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const adminClient = createAdminClient();

    // Note: Deleting the auth user will cascade to user_profiles
    // due to the foreign key constraint (ON DELETE CASCADE)
    // It will also delete associated data like workouts and sessions
    // due to cascade rules in the database schema

    const { error } = await adminClient.auth.admin.deleteUser(id);

    if (error) {
      console.error("Error deleting user:", error);
      return NextResponse.json(
        { error: "Failed to delete user" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "User deleted successfully",
    });
  } catch (error: unknown) {
    console.error("Error in delete user API:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Internal server error") },
      { status: 500 }
    );
  }
}
