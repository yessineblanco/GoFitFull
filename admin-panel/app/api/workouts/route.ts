import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuditLog, AuditActions, getClientIP, getUserAgent, getAdminUserIdFromRequest } from "@/lib/audit";
import { getErrorMessage } from "@/lib/errors";
import { workoutInputSchema } from "@/lib/workout-input";

export async function POST(request: NextRequest) {
  try {
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
        p_workout_id: null,
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
        action: AuditActions.CREATE_WORKOUT,
        resourceType: "workout",
        resourceId: workout.id,
        details: { name: workout.name, exerciseCount: exercises.length },
        ipAddress: getClientIP(request),
        userAgent: getUserAgent(request),
      });
    }

    return NextResponse.json({ data: workout }, { status: 201 });
  } catch (error: unknown) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Internal server error") },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
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
      .eq("workout_type", "native")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching workouts:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch workouts" },
        { status: 500 }
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
