import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuditLog, AuditActions, getClientIP, getUserAgent, getAdminUserIdFromRequest } from "@/lib/audit";

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
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
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
    const body = await request.json();

    const { name, difficulty, image_url, exercises } = body;

    // Validation
    if (!name || !exercises || exercises.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 1. Update the workout
    const { data: workout, error: workoutError } = await adminClient
      .from("workouts")
      .update({
        name,
        difficulty,
        image_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (workoutError) {
      console.error("Error updating workout:", workoutError);
      return NextResponse.json(
        { error: workoutError.message || "Failed to update workout" },
        { status: 500 }
      );
    }

    // 2. Delete existing workout_exercises
    const { error: deleteError } = await adminClient
      .from("workout_exercises")
      .delete()
      .eq("workout_id", id);

    if (deleteError) {
      console.error("Error deleting old exercises:", deleteError);
      return NextResponse.json(
        { error: deleteError.message || "Failed to update exercises" },
        { status: 500 }
      );
    }

    // 3. Insert new workout_exercises
    const workoutExercises = exercises.map((ex: any, index: number) => ({
      workout_id: id,
      exercise_id: ex.exercise_id,
      sets: ex.sets || 3,
      reps: ex.reps || "10",
      rest_time: ex.rest_time || 60,
      day: ex.day || null,
      exercise_order: ex.exercise_order !== undefined ? ex.exercise_order : index,
    }));

    const { error: exercisesError } = await adminClient
      .from("workout_exercises")
      .insert(workoutExercises);

    if (exercisesError) {
      console.error("Error adding exercises:", exercisesError);
      return NextResponse.json(
        { error: exercisesError.message || "Failed to add exercises" },
        { status: 500 }
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
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
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
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
