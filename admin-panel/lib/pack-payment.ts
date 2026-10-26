export function getPackPaymentDetails(purchase: {
  paid_amount: number | null;
  paid_currency: string | null;
  payment_livemode: boolean | null;
  stripe_payment_id: string | null;
  session_packs: { price?: number; currency?: string } | null;
}) {
  const verified = purchase.paid_amount !== null && purchase.paid_currency !== null &&
    purchase.payment_livemode !== null && !!purchase.stripe_payment_id;
  return {
    amount: verified ? Number(purchase.paid_amount) : Number(purchase.session_packs?.price ?? 0),
    currency: verified ? purchase.paid_currency! : purchase.session_packs?.currency || "EUR",
    payment_reference: purchase.stripe_payment_id,
    payment_mode: verified ? (purchase.payment_livemode ? "live" : "sandbox") : "unverified",
  };
}
