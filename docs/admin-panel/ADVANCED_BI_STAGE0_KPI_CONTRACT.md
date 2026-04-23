# Advanced BI Stage 0 KPI Contract

This document defines the advanced BI KPI contract for GoFit before any new BI v2 UI is built.

## Goal

Lock one agreed definition for each advanced KPI and mark whether the current repository can compute it today.

Status meanings:

- `supported`: can be computed from the current schema with a clear definition
- `partial`: some source data exists, but the KPI still needs a stronger semantic layer or product definition
- `blocked`: current schema or event model does not support a trustworthy KPI yet

## Canonical source areas

- `user_profiles`: signups, demographics, user role
- `workout_sessions`: workout activity, distinct active users, inactivity, streak-like behavior
- `coach_profiles`: coach quality, approval status, ratings, lifetime sessions
- `bookings`: coach session operations, cancellations, no-shows, completed sessions
- `purchased_packs` + `session_packs`: gross pack sales, active clients, package mix
- `wallets` + `transactions`: coach ledger activity, platform fee rows, payout rows
- `meal_logs` + `nutrition_goals`: nutrition usage and daily goal adherence
- `messages` + `conversations`: messaging volume, possible response-time analytics
- `coach_availability`: recurring bookable windows for utilization estimates
- `custom_programs`: assigned program inventory, but not true completion
- `body_measurements`: future body-progress history once on-device flow ships consistently

## KPI catalog

| Domain | KPI | Status | Current source | Grain | Definition | Caveat / blocker |
|---|---|---|---|---|---|---|
| Finance | Gross pack sales | supported | `purchased_packs`, `session_packs` | daily, coach, package | Sum pack price at purchase time using `purchased_at` | Treats pack purchases as sales truth, not wallet truth |
| Finance | Pack sales count | supported | `purchased_packs` | daily, coach, package | Count purchased packs | Needs refund handling rules for restated history |
| Finance | Average order value | supported | `purchased_packs`, `session_packs` | daily, weekly, monthly | Gross pack sales divided by pack sales count | Same caveat as gross pack sales |
| Finance | Refund count | partial | `purchased_packs.status`, `transactions.type` | daily, coach | Count refunded packs or refund ledger rows | No single refund amount model tied to one sale record |
| Finance | Refund amount | blocked | none canonical | daily, coach, package | Sum refunded currency amount | `purchased_packs` lacks canonical refunded amount and refund timestamp |
| Finance | Net revenue | blocked | none canonical | daily, coach, package | Gross minus refunds minus fees | Pack sales and wallet ledger are separate truths today |
| Finance | Platform fee revenue | partial | `transactions.type = platform_fee`, `admin_settings` | daily, coach | Sum explicit platform fee rows | Coverage depends on ledger completeness; config percent is not enough for history |
| Finance | Coach payout liability | partial | `wallets.balance`, `transactions` | current snapshot, daily | Outstanding coach balance and payout flow | Current balance is usable, but historical liability trend needs a ledger view |
| Retention | Signups | supported | `user_profiles.created_at` | daily, weekly, monthly | Count new user profiles | None |
| Retention | Activated users (first workout) | supported | `user_profiles`, `workout_sessions` | signup cohort, daily | Users who complete first workout after signup | Activation window still needs product choice |
| Retention | Activated users (first booking) | supported | `user_profiles`, `bookings` | signup cohort, daily | Users who complete first booking after signup | Activation window still needs product choice |
| Retention | DAU / WAU / MAU | supported | `workout_sessions` | rolling daily | Distinct workout users over 1, 7, and 30 days | Current BI v1 already uses this definition |
| Retention | Signup-to-workout cohort retention | supported | `user_profiles`, `workout_sessions` | monthly cohort | Share of signup cohort active in later periods | Needs materialized view for performance |
| Retention | Churn | partial | `user_profiles`, `workout_sessions`, `bookings`, `purchased_packs` | monthly | Users active in prior period but inactive in current period | Product must choose the activity event set and churn window |
| Retention | Reactivation | partial | `workout_sessions`, `bookings` | monthly | Previously churned users becoming active again | Depends on final churn definition |
| Coaching ops | Completed bookings | supported | `bookings.status` | daily, coach | Count bookings marked `completed` | None |
| Coaching ops | Cancellation rate | supported | `bookings.status` | daily, coach | Cancelled bookings divided by total bookings | Need final inclusion rules for reschedules |
| Coaching ops | No-show rate | supported | `bookings.status` | daily, coach | No-show bookings divided by total bookings | None |
| Coaching ops | Active clients per coach | supported | `purchased_packs`, `bookings` | coach, current snapshot | Distinct active clients by coach | Must choose whether bookings-only clients count as active |
| Coaching ops | Coach review score | supported | `coach_profiles.average_rating`, `coach_profiles.total_reviews` | coach | Current average rating and review count | None |
| Coaching ops | Coach utilization | partial | `coach_availability`, `bookings` | coach, week | Booked minutes divided by available minutes | Recurring availability exists, but time off / exceptions are not modeled cleanly |
| Coaching ops | Coach response SLA | partial | `messages`, `conversations`, `coach_profiles` | coach, conversation | Time from client message to coach reply | Possible but needs a canonical message-pairing rule |
| Client health | Workout inactivity risk | supported | `workout_sessions` | user, segment | Users with no recent workout activity over threshold windows | Thresholds still need product rules |
| Client health | Workout streak / consistency | supported | `workout_sessions` | user, segment | Consecutive-day or weekly-consistency workout behavior | Exact streak formula must be frozen |
| Client health | Nutrition logging adoption | supported | `meal_logs` | user, day, segment | Users who logged meals in a period | None |
| Client health | Nutrition goal adherence | partial | `meal_logs`, `food_items`, `nutrition_goals` | user, day | Daily logged calories/macros versus goal | Good source exists, but only for users who actively log nutrition |
| Client health | Workout adherence | blocked | none canonical | user, coach | Completed assigned workouts divided by assigned workouts | No explicit assigned-vs-completed workout model today |
| Client health | Program completion | blocked | `custom_programs` | user, coach | Completed programs divided by assigned programs | `custom_programs` has status, but not canonical completion progress |
| Client health | Body progress trend | partial | `body_measurements` | user, period | Change in body measurements over time | Table exists, but production on-device measurement flow is not shipped yet |
| Client health | Health sync activity | blocked | none current | user, period | Steps / calories / wearable-based activity | `health_data` feature is still pending |
| Client health | At-risk client score | partial | `workout_sessions`, `meal_logs`, `purchased_packs`, `bookings` | user, coach | Composite risk score for inactivity / adherence / expiring relationship | Inputs exist for a basic score, but scoring model is not defined |

## Stage 1 view targets

These are the canonical semantic-layer targets that should come next:

- `bi_finance_daily`: gross sales, sales count, average order value, fee rows, payout rows, liability snapshot
- `bi_user_lifecycle_daily`: signups, first workout, first booking, active users, churn and reactivation inputs
- `bi_coach_ops_daily`: completed bookings, cancellations, no-shows, active clients, coach quality, utilization inputs
- `bi_client_health_daily`: inactivity, streak inputs, nutrition adoption, nutrition adherence, at-risk inputs

## Build gate before advanced BI UI

Do not build the advanced tabs until:

1. Finance has one reconciled source of truth
2. Churn and reactivation definitions are frozen
3. Utilization and response-time formulas are agreed
4. Every KPI above is either implemented from a canonical view or explicitly hidden as blocked
