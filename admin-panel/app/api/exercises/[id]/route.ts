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
      .from("exercises")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching exercise:", error);
      return NextResponse.json(
        { error: error.message || "Exercise not found" },
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

    const {
      name,
      category,
      difficulty,
      muscle_groups,
      equipment,
      image_url,
      video_url,
      instructions,
      default_sets,
      default_reps,
      default_rest_time,
    } = body;

    // Validation
    if (!name || !category || !muscle_groups || muscle_groups.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from("exercises")
      .update({
        name,
        category,
        difficulty,
        muscle_groups,
        equipment,
        image_url,
        video_url,
        instructions,
        default_sets,
        default_reps,
        default_rest_time,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating exercise:", error);
      return NextResponse.json(
        { error: error.message || "Failed to update exercise" },
        { status: 500 }
      );
    }

    // Get admin user ID from session
    const adminUserId = await getAdminUserIdFromRequest(request);

    // Log audit event
    if (adminUserId && data) {
      await createAuditLog({
        adminUserId,
        action: AuditActions.UPDATE_EXERCISE,
        resourceType: "exercise",
        resourceId: id,
        details: { name: data.name, category: data.category },
        ipAddress: getClientIP(request),
        userAgent: getUserAgent(request),
      });
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("exercises")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting exercise:", error);
      return NextResponse.json(
        { error: error.message || "Failed to delete exercise" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Exercise deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
