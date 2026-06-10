---
name: Marketplace Payment Follow-ups
overview: Preserve unresolved payment and marketplace work extracted from the completed Phase 5 implementation plan.
status: future
---

# Marketplace Payment Follow-ups

The coach marketplace, bookings, packs, wallet display, chat, video calls, and
admin coach verification exist. Remaining payment work is intentionally kept
separate from the completed marketplace implementation history.

## Remaining work

1. Integrate a production payment provider and webhook reconciliation.
2. Implement coach onboarding/payout status around provider accounts.
3. Add client payment history and receipt details.
4. Reconcile pack purchases, refunds, platform fees, wallet transactions, and
   payout liability into one finance source of truth.
5. Add refund and dispute handling before exposing net-revenue analytics.

## Verification

- Webhooks are idempotent and authenticated.
- Service-role and provider secrets remain server-side.
- A purchase creates one reconciled pack and ledger result.
- Refunds and payouts are represented without rewriting historical amounts.
