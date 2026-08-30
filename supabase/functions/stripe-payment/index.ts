import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "npm:stripe@^12.0.0";
import { corsHeaders } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { amount, currency, metadata } = await req.json();

    if (!amount) {
      throw new Error("Amount is required");
    }

    // For testing without a key, we'll return a mock client secret if STRIPE_SECRET_KEY is missing
    if (!Deno.env.get("STRIPE_SECRET_KEY")) {
      console.warn("STRIPE_SECRET_KEY not set, returning mock clientSecret for testing");
      return new Response(
        JSON.stringify({
          clientSecret: "pi_mock_secret_12345",
          ephemeralKey: "ek_mock",
          customer: "cus_mock",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe expects amounts in cents
      currency: currency || 'usd',
      metadata,
    });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
