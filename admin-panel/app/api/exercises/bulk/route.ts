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

    // Delete exercises
    const { error } = await adminClient.from("exercises").delete().in("id", ids);

    if (error) {
      console.error("Error deleting exercises:", error);
      return NextResponse.json(
        { error: error.message || "Failed to delete exercises" },
        { status: 500 }
      );
    }

    // Get admin user ID from session
    const adminUserId = await getAdminUserIdFromRequest(request);

    // Log audit event
    if (adminUserId) {
      await createAuditLog({
        adminUserId,
        action: AuditActions.BULK_DELETE_EXERCISES,
        resourceType: "exercise",
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
    const { exercises } = body;

    if (!exercises || !Array.isArray(exercises) || exercises.length === 0) {
      return NextResponse.json(
        { error: "Invalid request: exercises array required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const errors: string[] = [];
    let successCount = 0;
    let failedCount = 0;

    // Process exercises one by one to handle individual errors
    for (let i = 0; i < exercises.length; i++) {
      const exercise = exercises[i];

      try {
        // Validate required fields
        if (!exercise.name) {
          errors.push(`Row ${i + 1}: Missing required field 'name'`);
          failedCount++;
          continue;
        }

        if (!exercise.category) {
          errors.push(`Row ${i + 1}: Missing required field 'category'`);
          failedCount++;
          continue;
        }

        if (!exercise.muscle_groups || !Array.isArray(exercise.muscle_groups) || exercise.muscle_groups.length === 0) {
          errors.push(`Row ${i + 1}: Missing or invalid 'muscle_groups' (must be an array)`);
          failedCount++;
          continue;
        }

        // Insert exercise
        const { error: insertError } = await adminClient.from("exercises").insert({
          name: exercise.name.trim(),
          category: exercise.category.trim(),
          difficulty: exercise.difficulty || "Beginner",
          muscle_groups: exercise.muscle_groups,
          equipment: exercise.equipment || [],
          image_url: exercise.image_url || null,
          video_url: exercise.video_url || null,
          instructions: exercise.instructions || null,
          default_sets: exercise.default_sets || 3,
          default_reps: exercise.default_reps || 10,
          default_rest_time: exercise.default_rest_time || 60,
        });

        if (insertError) {
          errors.push(`Row ${i + 1}: ${insertError.message}`);
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
        action: AuditActions.CREATE_EXERCISE, // Using same action for bulk import
        resourceType: "exercise",
        resourceId: null,
        details: { count: successCount, total: exercises.length, errors: errors.length },
        ipAddress: getClientIP(request),
        userAgent: getUserAgent(request),
      });
    }

    return NextResponse.json(
      {
        success: successCount,
        failed: failedCount,
        errors: errors.slice(0, 10), // Limit errors returned
        total: exercises.length,
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
