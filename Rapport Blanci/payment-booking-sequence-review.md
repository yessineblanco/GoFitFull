# Payment and booking sequence correction

Approved scope applied on 21 October 2026: the two existing payment/booking figures, two added technical continuations, and their adjacent use-case table, captions, title, and explanation in `main.tex`. Application code and live services were not modified.

## Evidence ledger

| Topic | Repository evidence | Correction |
| --- | --- | --- |
| Pack checkout | `GoFitMobile/src/screens/marketplace/CoachDetailScreen.tsx:56–115` | Screen submits pack.price, USD and pack/coach/client metadata; initializes/presents PaymentSheet; calls purchasePack only after a presentation result without error. No automatic calendar navigation. |
| Intent creation | `supabase/functions/stripe-payment/index.ts:16–53` | Function accepts amount/currency/metadata and requests a PaymentIntent with rounded amount x 100. Returns clientSecret, not a later webhook result. No connected-account transfer routing, catalog-price resolution, or application-record insertion in this handler. |
| Configuration and mock branch | Same function; `GoFitMobile/App.tsx:354`; both screen initPaymentSheet calls | Real checkout depends on valid client/server setup. Missing-secret mock branch is an intended testing branch, not verified working fallback or payment evidence. No Apple Pay/Google Pay configuration in these checkout calls. |
| Pack record | `GoFitMobile/src/services/sessionPacks.ts:152–166` | Client-triggered purchased_packs insert with client_id, pack_id, coach_id, sessions_remaining, active status. No PaymentIntent ID passed by this caller. Successful insert is a selected continuation, not proof of schema defaults or successful runtime fulfilment. |
| Direct booking checkout | `GoFitMobile/src/screens/marketplace/BookSessionScreen.tsx:79–153` | Hardcoded USD 50, then 60-minute booking creation after PaymentSheet returns without error. No pack_purchase_id supplied. |
| Scheduling limitations | `BookSessionScreen.tsx:64–80` | Date helper moves today's selected weekday into next week; guard rejects Sunday index 0. Documented without changing application logic. |
| Booking persistence | `GoFitMobile/src/services/bookings.ts:130–175`; `GoFitMobile/src/store/bookingsStore.ts:76–87` | INSERT confirmed booking, then coach-account lookup/notification attempts, then return booking and prepend local store state. No atomic payment/booking transaction or automatic refund in these callers. |
| Existing-pack service branch | `bookings.ts:148–150` | Optional deduct_session RPC follows insert as a separate request; RPC error result is not inspected. Capability is not wired through the inspected booking screen. |
| Notification attempts | `bookings.ts:152–171`; `GoFitMobile/src/services/notificationInbox.ts:45–66`; `GoFitMobile/src/services/pushNotification.ts`; `GoFitMobile/src/services/notifications.ts:393–415` | Await inbox helper when coach account found; start push without awaiting; start local reminder without awaiting. Reminder target is 30 minutes before session and skipped when past. Helpers do not establish verified delivery. |
| Webhook claim | Inventory of `supabase/functions` | No supplied stripe-webhook handler. Removed webhook fulfilment/atomic crediting claims for this source snapshot; no assertion about unknown separately deployed code. |

Database structure was compared with the previously inspected `sprint3-deployed-schema.json`, including bookings and purchased_packs fields/keys. No new live query was performed for this correction. No Stripe dashboard configuration, deployed secret, payment event, receipt, or live delivery result was inferred.

## Figure scope

- `figures/seq_booking_ssd.png`: actor and two alternative user journeys, rather than purchase followed automatically by redemption/booking. Successful payment interaction and database writes are assumed for the selected continuations.
- `figures/seq_booking_detailed.png`: common configured intent/PaymentSheet path. Mobile screen, Edge Function, Stripe API and native SDK remain distinct. SDK network internals and payment failure branches are omitted; a no-error SDK return is not labelled independent backend fulfilment verification.
- `figures/seq_booking_pack_recording.png`: continuation after shared checkout; client-triggered pack insertion and UI success.
- `figures/seq_booking_direct.png`: continuation after direct checkout; booking insertion, coach lookup, optional notification attempts, reminder scheduling, local state and UI success. Notification helpers are grouped; their database/Edge Function/native scheduler internals are described in prose. Pack redemption is excluded because this caller supplies no pack reference.

Matching SVGs and `figures/source/build_booking_sequence_diagrams.py` are retained. All four use the approved pale-blue headers, dark-blue header text, charcoal flows, gray frames, white background, and no notation legend.

Verification: all four figures were visually inspected; PNG integrity, SVG parsing, report image references, and unique LaTeX labels were checked. No runtime checkout, refund, concurrent-booking, pack-redemption, notification-delivery, device-wallet, or LaTeX compilation test was performed. Broader payment/security assertions elsewhere remain subject to the remaining report audit.
