import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PurchasedPackTransaction {
  id: string;
  client_id: string;
  coach_id: string;
  sessions_remaining: number;
  sessions_total: number;
  purchased_at: string;
  status: string;
  session_packs: { name?: string; price?: number } | null;
}

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

    const transactionRows = purchases as PurchasedPackTransaction[];
    const coachIds = [...new Set(transactionRows.map((purchase) => purchase.coach_id))];

    const { data: authUsers } = await adminClient.auth.admin.listUsers();
    const authMap = new Map(
      (authUsers?.users || []).map((user) => [user.id, user] as const)
    );

    const { data: coachProfiles } = await adminClient
      .from("coach_profiles")
      .select("id, user_id")
      .in("id", coachIds);
    const coachUserIds = new Map(
      (coachProfiles || []).map((coach) => [coach.id, coach.user_id] as const)
    );

    const transactions = transactionRows.map((p) => {
      const pack = p.session_packs;
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
  } catch (error: unknown) {
    console.error("Error in transactions API:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Internal server error") },
      { status: 500 }
    );
  }
}
