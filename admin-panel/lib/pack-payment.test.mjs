import test from "node:test";
import assert from "node:assert/strict";
import { getPackPaymentDetails } from "./pack-payment.ts";

test("verified payment uses the saved charge rather than today's pack price", () => {
  const result = getPackPaymentDetails({ paid_amount: 129, paid_currency: "EUR", payment_livemode: false,
    stripe_payment_id: "pi_test", session_packs: { price: 999, currency: "USD" } });
  assert.equal(result.amount, 129);
  assert.equal(result.currency, "EUR");
  assert.equal(result.payment_mode, "sandbox");
  assert.equal(result.payment_reference, "pi_test");
});

test("legacy purchases are explicitly unverified; live records remain distinguishable", () => {
  const input = { paid_amount: null, paid_currency: null, payment_livemode: null,
    stripe_payment_id: null, session_packs: { price: 49, currency: "EUR" } };
  assert.equal(getPackPaymentDetails(input).payment_mode, "unverified");
  assert.equal(getPackPaymentDetails({ ...input, paid_amount: 49, paid_currency: "EUR",
    payment_livemode: true, stripe_payment_id: "pi_test" }).payment_mode, "live");
});
