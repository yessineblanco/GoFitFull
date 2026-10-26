import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuditLog, AuditActions, getClientIP, getUserAgent, getAdminUserIdFromRequest } from "@/lib/audit";
import { getErrorMessage } from "@/lib/errors";
import { workoutInputSchema } from "@/lib/workout-input";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from("workouts")
      .select(
        `
        *,
        workout_exercises (
          *,
          exercises (*)
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching workout:", error);
      return NextResponse.json(
        { error: error.message || "Workout not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: unknown) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Internal server error") },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsed = workoutInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid workout" },
        { status: 400 }
      );
    }

    const { exercises, ...fields } = parsed.data;
    const adminClient = createAdminClient();
    // One database call: the parent and all prescriptions commit or roll back together.
    const { data: workout, error: workoutError } = await adminClient.rpc(
      "admin_save_native_workout",
      {
        p_workout_id: id,
        p_payload: { ...fields, exercises },
      }
    );

    if (workoutError) {
      console.error("Error saving workout:", workoutError);
      const status = workoutError.code === "P0002" ? 404
        : /^(22|23)/.test(workoutError.code) ? 400 : 500;
      return NextResponse.json(
        { error: workoutError.message || "Failed to save workout" },
        { status }
      );
    }

    // Get admin user ID from session
    const adminUserId = await getAdminUserIdFromRequest(request);

    // Log audit event
    if (adminUserId && workout) {
      await createAuditLog({
        adminUserId,
        action: AuditActions.UPDATE_WORKOUT,
        resourceType: "workout",
        resourceId: id,
        details: { name: workout.name, exerciseCount: exercises.length },
        ipAddress: getClientIP(request),
        userAgent: getUserAgent(request),
      });
    }

    return NextResponse.json({ data: workout }, { status: 200 });
  } catch (error: unknown) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Internal server error") },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminClient = createAdminClient();

    // workout_exercises will be deleted automatically via CASCADE
    const { error } = await adminClient
      .from("workouts")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting workout:", error);
      return NextResponse.json(
        { error: error.message || "Failed to delete workout" },
        { status: 500 }
      );
    }

    // Get admin user ID from session
    const adminUserId = await getAdminUserIdFromRequest(request);

    // Log audit event
    if (adminUserId) {
      await createAuditLog({
        adminUserId,
        action: AuditActions.DELETE_WORKOUT,
        resourceType: "workout",
        resourceId: id,
        details: { workoutId: id },
        ipAddress: getClientIP(request),
        userAgent: getUserAgent(request),
      });
    }

    return NextResponse.json(
      { message: "Workout deleted successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Internal server error") },
      { status: 500 }
    );
  }
}
