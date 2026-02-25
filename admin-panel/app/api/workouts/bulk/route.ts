import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createAuditLog,
  AuditActions,
  getClientIP,
  getUserAgent,
  getAdminUserIdFromRequest,
} from "@/lib/audit";

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Invalid request: ids array required" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Delete workouts (workout_exercises will be deleted via CASCADE)
    const { error } = await adminClient.from("workouts").delete().in("id", ids);

    if (error) {
      console.error("Error deleting workouts:", error);
      return NextResponse.json(
        { error: error.message || "Failed to delete workouts" },
        { status: 500 }
      );
    }

    // Get admin user ID from session
    const adminUserId = await getAdminUserIdFromRequest(request);

    // Log audit event
    if (adminUserId) {
      await createAuditLog({
        adminUserId,
        action: AuditActions.BULK_DELETE_WORKOUTS,
        resourceType: "workout",
        resourceId: null,
        details: { count: ids.length, ids },
        ipAddress: getClientIP(request),
        userAgent: getUserAgent(request),
      });
    }

    return NextResponse.json({ success: true, deletedCount: ids.length }, { status: 200 });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workouts } = body;

    if (!workouts || !Array.isArray(workouts) || workouts.length === 0) {
      return NextResponse.json(
        { error: "Invalid request: workouts array required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const errors: string[] = [];
    let successCount = 0;
    let failedCount = 0;

    // Process workouts one by one to handle individual errors
    for (let i = 0; i < workouts.length; i++) {
      const workout = workouts[i];

      try {
        // Validate required fields
        if (!workout.name) {
          errors.push(`Row ${i + 1}: Missing required field 'name'`);
          failedCount++;
          continue;
        }

        if (!workout.exercises || !Array.isArray(workout.exercises) || workout.exercises.length === 0) {
          errors.push(`Row ${i + 1}: Missing or invalid 'exercises' (must be a non-empty array)`);
          failedCount++;
          continue;
        }

        // Create workout
        const { data: workoutData, error: workoutError } = await adminClient
          .from("workouts")
          .insert({
            name: workout.name.trim(),
            difficulty: workout.difficulty || "Beginner",
            image_url: workout.image_url || null,
            workout_type: "native",
            user_id: null,
          })
          .select()
          .single();

        if (workoutError) {
          errors.push(`Row ${i + 1}: ${workoutError.message}`);
          failedCount++;
          continue;
        }

        // Add exercises to workout
        const workoutExercises = workout.exercises.map((ex: any, index: number) => ({
          workout_id: workoutData.id,
          exercise_id: ex.exercise_id || ex.id, // Support both field names
          sets: ex.sets || 3,
          reps: ex.reps || "10",
          rest_time: ex.rest_time || 60,
          day: ex.day || null,
          exercise_order: ex.exercise_order !== undefined ? ex.exercise_order : index,
        }));

        // Validate exercise IDs exist
        const exerciseIds = workoutExercises.map((we: any) => we.exercise_id).filter(Boolean);
        if (exerciseIds.length > 0) {
          const { data: existingExercises, error: checkError } = await adminClient
            .from("exercises")
            .select("id")
            .in("id", exerciseIds);

          if (checkError) {
            // Rollback workout
            await adminClient.from("workouts").delete().eq("id", workoutData.id);
            errors.push(`Row ${i + 1}: Failed to validate exercises: ${checkError.message}`);
            failedCount++;
            continue;
          }

          const validExerciseIds = new Set((existingExercises || []).map((e: any) => e.id));
          const invalidExerciseIds = exerciseIds.filter((id: string) => !validExerciseIds.has(id));
          if (invalidExerciseIds.length > 0) {
            // Rollback workout
            await adminClient.from("workouts").delete().eq("id", workoutData.id);
            errors.push(`Row ${i + 1}: Invalid exercise IDs: ${invalidExerciseIds.join(", ")}`);
            failedCount++;
            continue;
          }
        }

        const { error: exercisesError } = await adminClient
          .from("workout_exercises")
          .insert(workoutExercises);

        if (exercisesError) {
          // Rollback workout
          await adminClient.from("workouts").delete().eq("id", workoutData.id);
          errors.push(`Row ${i + 1}: ${exercisesError.message}`);
          failedCount++;
        } else {
          successCount++;
        }
      } catch (error: any) {
        errors.push(`Row ${i + 1}: ${error.message || "Unknown error"}`);
        failedCount++;
      }
    }

    // Get admin user ID from session
    const adminUserId = await getAdminUserIdFromRequest(request);

    // Log audit event
    if (adminUserId) {
      await createAuditLog({
        adminUserId,
        action: AuditActions.CREATE_WORKOUT, // Using same action for bulk import
        resourceType: "workout",
        resourceId: null,
        details: { count: successCount, total: workouts.length, errors: errors.length },
        ipAddress: getClientIP(request),
        userAgent: getUserAgent(request),
      });
    }

    return NextResponse.json(
      {
        success: successCount,
        failed: failedCount,
        errors: errors.slice(0, 10), // Limit errors returned
        total: workouts.length,
      },
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
