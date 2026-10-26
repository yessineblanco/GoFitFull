import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/errors";

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
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (resourceType) {
      query = query.eq("resource_type", resourceType);
    }
    if (action) {
      query = query.eq("action", action);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching audit logs:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch audit logs" },
        { status: 500 }
      );
    }

    // Auth users are not a public-schema relationship. Resolve only this page's actors.
    const adminIds = [...new Set((data || []).map((log) => log.admin_user_id))];
    const admins = new Map(await Promise.all(adminIds.map(async (id) => {
      const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(id);
      const user = userData?.user;
      return [id, !userError && user ? {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
      } : null] as const;
    })));
    const logs = (data || []).map((log) => ({
      ...log,
      admin_user: admins.get(log.admin_user_id) || null,
    }));

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
        data: logs,
        total: totalCount || 0,
        limit,
        offset,
      },
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
