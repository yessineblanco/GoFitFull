import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminClient = createAdminClient();

    // Get the original workout with exercises
    const { data: workout, error: workoutError } = await adminClient
      .from("workouts")
      .select(
        `
        *,
        workout_exercises (*)
      `
      )
      .eq("id", id)
      .single();

    if (workoutError || !workout) {
      return NextResponse.json(
        { error: "Workout not found" },
        { status: 404 }
      );
    }

    // Create new workout (copy)
    const { data: newWorkout, error: createError } = await adminClient
      .from("workouts")
      .insert({
        name: `${workout.name} (Copy)`,
        difficulty: workout.difficulty,
        image_url: workout.image_url,
        workout_type: workout.workout_type,
        user_id: null, // Native workouts have null user_id
      })
      .select()
      .single();

    if (createError || !newWorkout) {
      console.error("Error creating workout:", createError);
      return NextResponse.json(
        { error: "Failed to duplicate workout" },
        { status: 500 }
      );
    }

    // Copy all exercises
    if (workout.workout_exercises && workout.workout_exercises.length > 0) {
      const exercisesToInsert = workout.workout_exercises.map((we: any) => ({
        workout_id: newWorkout.id,
        exercise_id: we.exercise_id,
        sets: we.sets,
        reps: we.reps,
        rest_time: we.rest_time,
        exercise_order: we.exercise_order,
        day: we.day,
        exercise_name: we.exercise_name,
        exercise_image_url: we.exercise_image_url,
        exercise_equipment: we.exercise_equipment,
        exercise_difficulty: we.exercise_difficulty,
      }));

      const { error: exercisesError } = await adminClient
        .from("workout_exercises")
        .insert(exercisesToInsert);

      if (exercisesError) {
        console.error("Error copying exercises:", exercisesError);
        // Delete the workout if exercises failed
        await adminClient.from("workouts").delete().eq("id", newWorkout.id);
        return NextResponse.json(
          { error: "Failed to copy exercises" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      message: "Workout duplicated successfully",
      workout: newWorkout,
    });
  } catch (error: any) {
    console.error("Error in duplicate workout API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
