import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuditLog, AuditActions, getClientIP, getUserAgent, getAdminUserIdFromRequest } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Support both single object and array of exercises
    const items = Array.isArray(body) ? body : [body];

    // Validate all entries
    for (let i = 0; i < items.length; i++) {
      const { name, category, muscle_groups } = items[i];
      if (!name || !category || !muscle_groups || muscle_groups.length === 0) {
        return NextResponse.json(
          { error: `Exercise ${i + 1}: Missing required fields (name, category, muscle_groups)` },
          { status: 400 }
        );
      }
    }

    const adminClient = createAdminClient();

    const rows = items.map((item) => ({
      name: item.name,
      category: item.category,
      difficulty: item.difficulty || "Beginner",
      muscle_groups: item.muscle_groups,
      equipment: item.equipment,
      image_url: item.image_url,
      video_url: item.video_url,
      instructions: item.instructions,
      default_sets: item.default_sets || 3,
      default_reps: item.default_reps || 10,
      default_rest_time: item.default_rest_time || 60,
    }));

    const { data, error } = await adminClient
      .from("exercises")
      .insert(rows)
      .select();

    if (error) {
      console.error("Error creating exercise(s):", error);
      return NextResponse.json(
        { error: error.message || "Failed to create exercise(s)" },
        { status: 500 }
      );
    }

    // Get admin user ID from session
    const adminUserId = await getAdminUserIdFromRequest(request);

    // Log audit events
    if (adminUserId && data) {
      for (const exercise of data) {
        await createAuditLog({
          adminUserId,
          action: AuditActions.CREATE_EXERCISE,
          resourceType: "exercise",
          resourceId: exercise.id,
          details: { name: exercise.name, category: exercise.category },
          ipAddress: getClientIP(request),
          userAgent: getUserAgent(request),
        });
      }
    }

    // Return single object for single insert, array for batch
    const result = Array.isArray(body) ? data : data[0];
    return NextResponse.json({ data: result }, { status: 201 });
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
      .from("exercises")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching exercises:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch exercises" },
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
