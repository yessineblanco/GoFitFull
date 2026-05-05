# GoFit Market Retention Technical Process

Date: 2026-05-05

This document explains the technical work completed for the GoFit market-retention roadmap. The goal was to add important market-missing features without moving the project to microservices or overbuilding around speculative product ideas.

## Architecture Decision

GoFit stayed on the existing Supabase-centered architecture. That matched the current app shape and avoided a premature microservice split. The work extended current tables, Edge Functions, mobile services, Zustand stores, and screens.

## Database Work

Applied Supabase migrations:

- `create_daily_coach_loop_v1`: created `daily_habits`, `habit_logs`, and `daily_readiness`.
- `optimize_daily_coach_loop_rls_v1`: tightened RLS policy patterns after Supabase advisors flagged direct `auth.uid()` usage.
- `extend_health_data_recovery_metrics_v1`: added nullable recovery fields to `health_data`: sleep minutes, resting heart rate, and HRV RMSSD.
- `extend_nutrition_water_fiber_v1`: added fiber and water goal support, plus `water_logs` with user-owned RLS.
- `extend_workouts_wellness_categories_v1`: added `workouts.wellness_category`, a check constraint, and a type/category index.
- `seed_wellness_native_workouts_v1`: seeded starter native workouts for mobility, balance/core, older-adult fitness, functional fitness, recovery, and stress reduction using the current exercise catalog.

## Edge Function Work

Updated `supabase/functions/ai-workout-recommendation/index.ts`.

- Reads recent readiness, recovery health data, and completed workout sessions.
- Computes deterministic adaptive guidance before calling Groq.
- Returns a structured `adaptation` payload to mobile.
- Detects assigned coach programs and active packs.
- Frames AI workouts as optional companion suggestions when coach programming exists.
- Deployed `ai-workout-recommendation` with JWT verification enabled.

## Mobile Work

Daily Coach Loop:

- Added `DailyCoachLoopCard` to Home.
- Added habit and readiness services/stores.
- Added Profile > Daily Habits management.
- Extended Health Connect sync and health UI for optional sleep, resting heart rate, and HRV.

Adaptive Training:

- Updated workout recommendation service types.
- Updated Home recommendation UI to show adaptive readiness, time-since-training, volume guidance, and coach-safe labels.

Nutrition Upgrade:

- Added recent-food repeat logging.
- Added fiber targets, water goals, daily water quick logging, and water/fiber display.
- Added weekly nutrition trend summary for average calories and protein/water/fiber adherence.

Retention:

- Added deterministic milestones derived from workout sessions, habit logs, and nutrition trends.
- Added explicit text-only native sharing for achieved milestones.

Wellness Programs:

- Added `wellness_category` through the workout service and workout store.
- Added filter chips to the Library screen for all planned wellness categories.
- Seeded starter category workouts so filters are immediately usable.

## Verification

Primary verification used:

- `cd GoFitMobile && npm run type-check`
- Supabase MCP migration success responses.
- Supabase schema/data checks for new tables, columns, and wellness seed exercise counts.
- Supabase Edge Function deployment responses for adaptive training updates.

Latest verified state:

- Mobile type-check passes.
- Water/fiber schema exists.
- Wellness starter workouts exist and have exercises.
- `ai-workout-recommendation` is deployed with JWT verification.

## Known Follow-Ups

- Barcode scanning and saved meals are still the next highest-value nutrition logging improvements.
- Apple Health should be added after Android Health Connect is stable.
- Women-focused planning needs qualified review before shipping cycle-aware, pregnancy/postpartum, or menopause-specific guidance.
- The exercise catalog is small; wellness categories will become stronger after adding true mobility, balance, and recovery exercises.
- Visual QA on a device or dev client is still needed for Health Connect and the Library category strip.
