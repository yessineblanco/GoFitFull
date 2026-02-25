import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuditLog, AuditActions, getClientIP, getUserAgent, getAdminUserIdFromRequest } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name, difficulty, image_url, workout_type, exercises } = body;

    // Validation
    if (!name || !exercises || exercises.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 1. Create the workout
    const { data: workout, error: workoutError } = await adminClient
      .from("workouts")
      .insert({
        name,
        difficulty: difficulty || "Beginner",
        image_url,
        workout_type: workout_type || "native",
        user_id: null, // Native workouts have no user_id
      })
      .select()
      .single();

    if (workoutError) {
      console.error("Error creating workout:", workoutError);
      return NextResponse.json(
        { error: workoutError.message || "Failed to create workout" },
        { status: 500 }
      );
    }

    // 2. Add exercises to the workout
    const workoutExercises = exercises.map((ex: any, index: number) => ({
      workout_id: workout.id,
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
      // Rollback: delete the workout if exercises failed
      await adminClient.from("workouts").delete().eq("id", workout.id);

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
        action: AuditActions.CREATE_WORKOUT,
        resourceType: "workout",
        resourceId: workout.id,
        details: { name: workout.name, exerciseCount: exercises.length },
        ipAddress: getClientIP(request),
        userAgent: getUserAgent(request),
      });
    }

    return NextResponse.json({ data: workout }, { status: 201 });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
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
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
