import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/errors";
import { getPackPaymentDetails } from "@/lib/pack-payment";

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
  paid_amount: number | null;
  paid_currency: string | null;
  payment_livemode: boolean | null;
  stripe_payment_id: string | null;
  session_packs: { name?: string; price?: number; currency?: string } | null;
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
        paid_amount,
        paid_currency,
        payment_livemode,
        stripe_payment_id,
        session_packs!inner(name, price, currency)
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

    const { data: sessions, error: sessionsError } = await adminClient.from("bookings")
      .select("id,client_id,coach_id,status,scheduled_at,duration_minutes,paid_at,paid_amount,paid_currency,payment_livemode,stripe_payment_id")
      .eq("payment_status", "paid").is("pack_purchase_id", null)
      .order("paid_at", { ascending: false }).limit(100);
    // Keep existing pack records usable while the session migration awaits deployment.
    const sessionSchemaMissing = sessionsError?.code === "42703" || sessionsError?.code === "PGRST204";
    if (sessionsError && !sessionSchemaMissing) return NextResponse.json({ error: "Failed to fetch session payments" }, { status: 500 });

    if (!purchases?.length && !sessions?.length) {
      return NextResponse.json({ transactions: [], sessionPaymentsAvailable: !sessionSchemaMissing }, { status: 200 });
    }

    const transactionRows = [
      ...(purchases || []).map(p => ({ ...p, kind: "pack" as const })),
      ...(sessions || []).map(b => ({ ...b, kind: "session" as const,
        session_packs: { name: "1-on-1 session" }, purchased_at: b.paid_at,
        sessions_total: 1, sessions_remaining: b.status === "completed" ? 0 : 1,
      })),
    ] as (PurchasedPackTransaction & { kind: "pack" | "session"; scheduled_at?: string; duration_minutes?: number })[];
    transactionRows.sort((a, b) => Date.parse(b.purchased_at) - Date.parse(a.purchased_at));
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
        kind: p.kind,
        scheduled_at: p.scheduled_at,
        duration_minutes: p.duration_minutes,
        ...getPackPaymentDetails(p),
        sessions_total: p.sessions_total,
        sessions_remaining: p.sessions_remaining,
        status: p.status,
        purchased_at: p.purchased_at,
      };
    }).slice(0, 100);

    return NextResponse.json({ transactions, sessionPaymentsAvailable: !sessionSchemaMissing }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error in transactions API:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Internal server error") },
      { status: 500 }
    );
  }
}
