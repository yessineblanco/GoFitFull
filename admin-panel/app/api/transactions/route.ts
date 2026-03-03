import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const adminClient = createAdminClient();

    const { data: purchases, error } = await adminClient
      .from("purchased_packs")
      .select(`
        id,
        client_id,
        coach_id,
        pack_id,
        sessions_remaining,
        sessions_total,
        purchased_at,
        status,
        created_at,
        session_packs!inner(name, price)
      `)
      .order("purchased_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching transactions:", error);
      return NextResponse.json(
        { error: "Failed to fetch transactions" },
        { status: 500 }
      );
    }

    if (!purchases || purchases.length === 0) {
      return NextResponse.json({ transactions: [] }, { status: 200 });
    }

    const clientIds = [...new Set(purchases.map((p: any) => p.client_id))];
    const coachIds = [...new Set(purchases.map((p: any) => p.coach_id))];

    const { data: authUsers } = await adminClient.auth.admin.listUsers();
    const authMap = new Map((authUsers?.users || []).map((u: any) => [u.id, u]));

    const { data: coachProfiles } = await adminClient
      .from("coach_profiles")
      .select("id, user_id")
      .in("id", coachIds);
    const coachUserIds = new Map(
      (coachProfiles || []).map((c: any) => [c.id, c.user_id])
    );

    const transactions = purchases.map((p: any) => {
      const pack = p.session_packs as { name?: string; price?: number };
      const clientAuth = authMap.get(p.client_id);
      const coachUserId = coachUserIds.get(p.coach_id);
      const coachAuth = coachUserId ? authMap.get(coachUserId) : null;

      return {
        id: p.id,
        client_id: p.client_id,
        client_name:
          clientAuth?.user_metadata?.display_name ||
          clientAuth?.email?.split("@")[0] ||
          "Unknown",
        client_email: clientAuth?.email || "—",
        coach_id: p.coach_id,
        coach_name:
          coachAuth?.user_metadata?.display_name ||
          coachAuth?.email?.split("@")[0] ||
          "Unknown",
        pack_name: pack?.name || "—",
        amount: pack?.price ?? 0,
        sessions_total: p.sessions_total,
        sessions_remaining: p.sessions_remaining,
        status: p.status,
        purchased_at: p.purchased_at,
      };
    });

    return NextResponse.json({ transactions }, { status: 200 });
  } catch (error: any) {
    console.error("Error in transactions API:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
