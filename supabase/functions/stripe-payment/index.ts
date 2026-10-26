import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "npm:stripe@^12.0.0";
import { createClient } from "npm:@supabase/supabase-js@2.90.1";
import { corsHeaders } from "../_shared/cors.ts";

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const token = req.headers.get("Authorization")?.replace(/^Bearer /i, "");
    if (!token) return reply({ error: "Sign in to make a payment" }, 401);
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: auth, error: authError } = await db.auth.getUser(token);
    if (authError || !auth.user) return reply({ error: "Sign in to make a payment" }, 401);
    const key = Deno.env.get("STRIPE_SECRET_KEY");
    if (!key) return reply({ error: "Payments are unavailable" }, 503);
    const stripe = new Stripe(key, { apiVersion: "2023-10-16" });
    const body = await req.json();

    if (body.action === "create_pack") {
      const { data: pack, error } = await db.from("session_packs")
        .select("id,coach_id,price,currency,session_count,is_active")
        .eq("id", body.packId).eq("is_active", true).single();
      if (error || !pack) return reply({ error: "Pack is unavailable" }, 400);
      const amount = Math.round(Number(pack.price) * 100);
      if (!Number.isSafeInteger(amount) || amount <= 0 || pack.currency !== "EUR") {
        return reply({ error: "Pack price or currency is unavailable" }, 400);
      }
      const intent = await stripe.paymentIntents.create({
        amount, currency: "eur", payment_method_types: ["card"],
        metadata: {
          checkoutKind: "pack", clientId: auth.user.id, packId: pack.id, coachId: pack.coach_id,
          sessionsTotal: String(pack.session_count), amountMinor: String(amount),
        },
      });
      return reply({ clientSecret: intent.client_secret, paymentIntentId: intent.id });
    }

    if (body.action === "fulfill_pack") {
      if (typeof body.paymentIntentId !== "string" || !/^pi_[A-Za-z0-9]+$/.test(body.paymentIntentId)) {
        return reply({ error: "Invalid payment reference" }, 400);
      }
      const intent = await stripe.paymentIntents.retrieve(body.paymentIntentId);
      const m = intent.metadata;
      if (m.checkoutKind !== "pack" || m.clientId !== auth.user.id) {
        return reply({ error: "Payment does not belong to this purchase" }, 403);
      }
      const sessions = Number(m.sessionsTotal);
      if (intent.status !== "succeeded" || intent.currency !== "eur" ||
          intent.amount_received !== intent.amount || intent.amount !== Number(m.amountMinor) ||
          !Number.isInteger(sessions) || sessions <= 0) {
        return reply({ error: "Payment is not completed; no pack was saved", paymentStatus: intent.status }, 409);
      }
      const purchase = {
        client_id: auth.user.id, pack_id: m.packId, coach_id: m.coachId,
        sessions_total: sessions, sessions_remaining: sessions, status: "active",
        stripe_payment_id: intent.id, paid_amount: intent.amount_received / 100,
        paid_currency: intent.currency.toUpperCase(), payment_livemode: intent.livemode,
      };
      const { data: saved, error } = await db.from("purchased_packs").insert(purchase).select("id").single();
      if (!error) return reply({ purchaseId: saved.id, paymentIntentId: intent.id, paymentStatus: intent.status });
      if (error.code === "23505") {
        // A retried confirmation returns the original purchase without adding credits.
        const { data: existing } = await db.from("purchased_packs").select("id,client_id")
          .eq("stripe_payment_id", intent.id).single();
        if (existing?.client_id === auth.user.id) {
          return reply({ purchaseId: existing.id, paymentIntentId: intent.id, paymentStatus: intent.status });
        }
      }
      return reply({ error: "Payment completed but saving the pack failed. Retry with the same payment reference.", paymentIntentId: intent.id }, 500);
    }

    if (body.action === "session_slots") {
      const now = new Date();
      const until = new Date(now.getTime() + 14 * 86400000);
      const { data: rows, error } = await db.from("bookings")
        .select("scheduled_at,duration_minutes,payment_status,checkout_expires_at")
        .eq("coach_id", body.coachId).neq("status", "cancelled")
        .gte("scheduled_at", now.toISOString()).lte("scheduled_at", until.toISOString());
      if (error) return reply({ error: "Unable to load booked times" }, 500);
      return reply({ busySlots: (rows || []).filter(row => row.payment_status !== "awaiting_payment" ||
        new Date(row.checkout_expires_at).getTime() > now.getTime())
        .map(({ scheduled_at, duration_minutes }) => ({ scheduled_at, duration_minutes })) });
    }

    if (body.action === "create_session") {
      const { data: booking, error } = await db.rpc("reserve_paid_session", {
        p_client_id: auth.user.id, p_coach_id: body.coachId, p_scheduled_at: body.scheduledAt,
        p_duration_minutes: body.durationMinutes, p_expected_amount: body.expectedAmount,
      });
      if (error || !booking) return reply({ error: "Time, price or duration changed. Please choose an available time." }, 409);
      let intent;
      try {
        intent = await stripe.paymentIntents.create({
          amount: Math.round(Number(booking.quoted_amount) * 100), currency: "eur",
          payment_method_types: ["card"], capture_method: "manual",
          metadata: { checkoutKind: "session", bookingId: booking.id, clientId: auth.user.id,
            coachId: booking.coach_id, amountMinor: String(Math.round(Number(booking.quoted_amount) * 100)) },
        });
        const { error: bindError } = await db.from("bookings").update({ stripe_payment_id: intent.id })
          .eq("id", booking.id).eq("payment_status", "awaiting_payment").select("id").single();
        if (bindError) throw new Error("Payment binding failed");
        return reply({ clientSecret: intent.client_secret, paymentIntentId: intent.id,
          bookingId: booking.id, amount: Number(booking.quoted_amount), currency: "EUR",
          expiresAt: booking.checkout_expires_at });
      } catch {
        await db.rpc("cancel_paid_session_checkout", { p_booking_id: booking.id, p_client_id: auth.user.id });
        if (intent) await stripe.paymentIntents.cancel(intent.id);
        return reply({ error: "Unable to initialize session checkout" }, 500);
      }
    }

    if (body.action === "fulfill_session" || body.action === "cancel_session") {
      if (typeof body.paymentIntentId !== "string" || !/^pi_[A-Za-z0-9]+$/.test(body.paymentIntentId)) {
        return reply({ error: "Invalid payment reference" }, 400);
      }
      let intent = await stripe.paymentIntents.retrieve(body.paymentIntentId);
      if (intent.metadata.checkoutKind !== "session" || intent.metadata.clientId !== auth.user.id) {
        return reply({ error: "Payment does not belong to this session" }, 403);
      }
      const args = { p_booking_id: intent.metadata.bookingId, p_client_id: auth.user.id };
      if (body.action === "cancel_session") {
        const { data: cancelled, error } = await db.rpc("cancel_paid_session_checkout", args);
        if (error || !cancelled?.id) return reply({ error: "This payment cannot be cancelled during capture" }, 409);
        if (intent.status !== "canceled") await stripe.paymentIntents.cancel(intent.id);
        return reply({ cancelled: true, bookingId: cancelled.id });
      }
      if (!["requires_capture", "succeeded"].includes(intent.status) || intent.currency !== "eur" ||
          intent.amount !== Number(intent.metadata.amountMinor)) {
        return reply({ error: "Card authorization is incomplete; no session confirmed", paymentStatus: intent.status }, 409);
      }
      const { data: reserved, error } = await db.rpc("prepare_paid_session_capture", {
        ...args, p_payment_id: intent.id,
      });
      if (error || !reserved) {
        if (intent.status === "requires_capture") await stripe.paymentIntents.cancel(intent.id);
        return reply({ error: "Session reservation expired or was cancelled; no capture was made" }, 409);
      }
      if (reserved.payment_status === "paid") return reply({ booking: reserved, paymentStatus: "succeeded" });
      if (intent.status === "requires_capture") {
        intent = await stripe.paymentIntents.capture(intent.id, {}, { idempotencyKey: `session-capture-${intent.id}` });
      }
      if (intent.status !== "succeeded" || intent.amount_received !== intent.amount) {
        return reply({ error: "Payment capture is not completed. Retry the same payment reference." }, 409);
      }
      const { data: saved, error: saveError } = await db.rpc("complete_paid_session", {
        ...args, p_payment_id: intent.id, p_amount: intent.amount_received / 100, p_livemode: intent.livemode,
      });
      if (saveError || !saved) return reply({ error: "Payment captured; session confirmation needs retry with the same reference.", paymentIntentId: intent.id }, 500);
      return reply({ booking: saved, paymentStatus: intent.status });
    }
    return reply({ error: "Invalid payment action" }, 400);
  } catch {
    // Never return provider keys, client secrets or internal database errors.
    return reply({ error: "Payment request failed. Please try again." }, 400);
  }
});
