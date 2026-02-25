import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    const resourceType = searchParams.get("resource_type");
    const action = searchParams.get("action");

    const adminClient = createAdminClient();

    let query = adminClient
      .from("admin_audit_logs")
      .select(`
        *,
        admin_user:admin_user_id (
          id,
          email,
          user_metadata
        )
      `)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (resourceType) {
      query = query.eq("resource_type", resourceType);
    }
    if (action) {
      query = query.eq("action", action);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching audit logs:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch audit logs" },
        { status: 500 }
      );
    }

    // Get total count
    let countQuery = adminClient
      .from("admin_audit_logs")
      .select("*", { count: "exact", head: true });

    if (resourceType) {
      countQuery = countQuery.eq("resource_type", resourceType);
    }
    if (action) {
      countQuery = countQuery.eq("action", action);
    }

    const { count: totalCount } = await countQuery;

    return NextResponse.json(
      {
        data: data || [],
        total: totalCount || 0,
        limit,
        offset,
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
