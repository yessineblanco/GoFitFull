---
name: GoFit Market Retention Roadmap
overview: Phased roadmap for market-relevant fitness features focused on client retention. Builds around a Daily Coach Loop first, then adaptive training, faster nutrition, retention mechanics, and expanded wellness programs. Follow `.cursor/rules/karpathy-behavioral-guidelines.mdc`: keep scope explicit, make surgical implementation passes, and verify each phase with concrete checks.
todos:
  - id: daily-coach-loop
    content: "Phase 1: Daily Coach Loop -- readiness, today's workout, habits, nutrition progress, and progress prompts"
    status: done
  - id: adaptive-training
    content: "Phase 2: Adaptive Training Engine -- evolve one-shot AI recommendation into workout adjustments based on history, readiness, missed sessions, and equipment"
    status: in_progress
  - id: nutrition-upgrade
    content: "Phase 3: Nutrition Upgrade -- barcode scan, saved meals, water/protein/fiber targets, and later photo/voice logging"
    status: planned
  - id: retention-community
    content: "Phase 4: Retention & Community -- challenges, badges, milestones, coach cohorts, and privacy-safe share cards"
    status: planned
  - id: wellness-programs
    content: "Phase 5: Expanded Wellness Programs -- mobility, balance/core, older-adult fitness, beginner strength, recovery, stress, and later women's health planning"
    status: planned
isProject: false
---

# GoFit Market Retention Roadmap

## Context

Market research and repo inspection point to the same product gap: GoFit already has many core surfaces, but it needs a stronger daily retention loop. Current support includes workouts, nutrition logging, progress photos, body measurements, Android Health Connect steps/calories, AI workout recommendation v1, check-ins, coach marketplace, bookings, chat, video calls, and admin tooling.

The roadmap should optimize for **client retention first**, not a full rebuild. The first release should make GoFit feel like a daily coach: read the user's current state, recommend what to do today, reduce logging friction, and show progress.

## Assumptions and Decisions

- First audience priority: client retention.
- First product anchor: Daily Coach Loop.
- Wearables rollout: Android Health Connect first, iOS Apple Health next.
- Architecture: keep the current Supabase-centered app; no microservice migration.
- Readiness and AI outputs are coaching guidance only, not medical diagnosis.
- Keep implementation phased and verifiable; do not add speculative platform work inside early phases.

## Phase 1: Daily Coach Loop

Goal: create one daily surface that gives users a reason to open GoFit every day.

### Shipped

- [x] **Phase 1A Home vertical slice (2026-05-05):** added `DailyCoachLoopCard` on Home with deterministic readiness, workout/nutrition/steps summary, daily habit chips, and a primary action. Added DB migration for `daily_habits`, `habit_logs`, and `daily_readiness`; added mobile habit/readiness services and store. Verification: `cd GoFitMobile && npm run type-check` passed.
- [x] **Phase 1B Health Connect recovery metrics (2026-05-05):** extended Health Connect sync beyond steps and active calories with optional sleep minutes, resting heart rate, and HRV RMSSD inputs. Verification: mobile type-check passed, Supabase migration `extend_health_data_recovery_metrics_v1` applied.
- [x] **Phase 1C Habit management surface (2026-05-05):** added a Profile > Daily Habits screen for viewing all daily coach habits, creating/editing custom habits, toggling active status, deleting habits, and marking today's completion. Verification: `cd GoFitMobile && npm run type-check` passed.

1. Add a client-facing daily dashboard module.
   - Show readiness summary, today's workout, active habits, nutrition progress, and progress prompt.
   - Entry points: Home first; later consider making this the default post-login Home module.
   - Verify: user can open the app and understand today's recommended action in under 10 seconds.

2. Extend wearable and self-report inputs.
   - Existing `health_data` covers Android Health Connect steps and active calories.
   - Add support for optional sleep, resting heart rate, HRV, and recovery-related daily metrics when available.
   - Preserve current steps/calories sync behavior.
   - Verify: Health Connect users keep existing data sync, and users without wearable data still get a daily view.

3. Add first-class habits.
   - Supported v1 habits: hydration, protein, steps, sleep, mobility, nutrition logging, progress photo, weigh-in, and custom coach-assigned habits.
   - Use simple daily completion and streaks first.
   - Verify: habits can be created, assigned, completed, and displayed in the daily loop.

4. Convert check-ins into daily readiness inputs.
   - Reuse the existing mood, energy, soreness, sleep-quality model where possible.
   - Support non-coached users and coached users.
   - Verify: a check-in response changes the daily readiness state without requiring wearable data.

5. Add deterministic readiness v1.
   - Inputs: sleep/self-reported sleep, soreness, energy, recent workout load, steps, active calories.
   - Output: simple state such as low, moderate, high readiness plus one plain-language recommendation.
   - Verify: missing inputs degrade gracefully and never block the daily dashboard.

## Phase 2: Adaptive Training Engine

Goal: move from one-off AI workout ideas to adaptive programming.

### Shipped

- [x] **Phase 2A Adaptive AI workout v1 (2026-05-05):** upgraded the existing `ai-workout-recommendation` Edge Function so readiness, latest recovery metrics, and days since last completed workout produce deterministic volume/intensity guidance before Groq generates the workout. Updated the mobile recommendation type and Home card to show the adaptive context while preserving the existing save-to-custom-workout flow. Verification: `cd GoFitMobile && npm run type-check` passed; Supabase Edge Function `ai-workout-recommendation` deployed as version 3 with JWT verification enabled.

1. Upgrade the current `ai-workout-recommendation` concept.
   - Inputs: goal, equipment, recent workout history, missed sessions, completed sets/reps, soreness, readiness, available time, and coach program when assigned.
   - Outputs: recommended workout, substitutions, volume adjustment, deload suggestion, and explanation.
   - Verify: generated workouts remain editable before saving.

2. Preserve coach control.
   - Coaches can accept, edit, or override AI suggestions for clients.
   - Client-facing AI suggestions should not override coach-assigned programs without a clear prompt.
   - Verify: coached clients do not receive conflicting guidance.

3. Keep v1 conservative.
   - Prefer deterministic adjustments and AI explanation over fully autonomous programming.
   - Verify: low readiness reduces intensity/volume; missed sessions produce a catch-up suggestion, not a punishment.

## Phase 3: Nutrition Upgrade

Goal: reduce nutrition logging friction and make nutrition useful for weight-management progress.

1. Add fast logging in order.
   - Barcode scan first.
   - Saved meals and repeat previous meal.
   - Later: meal photo scan and voice/text natural-language logging.
   - Verify: manual search remains available as fallback.

2. Expand daily nutrition targets.
   - Existing macros stay.
   - Add water, protein emphasis, fiber, and optional calorie range.
   - Verify: the daily loop can show nutrition status without forcing full calorie tracking.

3. Add weight-management journey layer.
   - Weekly trend, adherence, plateau detection, safe calorie adjustment suggestions, waist/body-measurement trend, and progress photo reminders.
   - Verify: users can see trend direction without overreacting to one noisy day.

## Phase 4: Retention and Community

Goal: add motivation without turning GoFit into a noisy social network.

1. Add challenges and milestones.
   - Step streaks, workout consistency, protein goal, hydration, transformation challenge, and coach group challenge.
   - Verify: users can join/complete a challenge and see progress.

2. Add badges and celebrations.
   - Completed workouts, habit streaks, PRs, body-measurement consistency, and check-in compliance.
   - Verify: badges are earned from real events, not manual placeholders.

3. Add privacy-safe sharing.
   - Shareable progress cards for workouts, streaks, measurements, and photos.
   - Default to private.
   - Verify: no personal health data is shared without explicit user action.

## Phase 5: Expanded Wellness Programs

Goal: broaden market coverage after the daily loop is stable.

1. Add program categories.
   - Mobility, balance/core, older-adult fitness, beginner strength, functional fitness, recovery, and stress reduction.
   - Verify: categories are filterable and usable by clients and coaches.

2. Add women-focused planning later.
   - Cycle-aware training notes, symptom tracking, pregnancy/postpartum-safe labels, and menopause-friendly strength/mobility tracks.
   - Verify: language stays supportive and non-medical unless reviewed by qualified expertise.

## Implementation Notes

- Keep each phase small enough to ship independently.
- Do not combine schema expansion, AI behavior, and broad UI rewrites in the same implementation pass unless the phase requires it.
- Prefer extending existing services/stores/screens before adding new abstractions.
- Update this plan's todo statuses and living log whenever a phase starts, ships, or changes scope.

## Test Strategy

- Mobile type-check after each phase: `cd GoFitMobile && npm run type-check`.
- Admin type-check only when admin surfaces change.
- Database migrations should include RLS checks for user-owned and coach-owned data.
- Health sync must be tested on Android device/dev client because Health Connect is native.
- AI and nutrition features must include fallback paths for missing external services, empty catalogs, and unauthenticated users.

## Living Log

### Decided

- **2026-05-05** - Created this roadmap from market research and repo inspection. Priority is client retention through a Daily Coach Loop, with Android Health Connect first and iOS Apple Health deferred to a later platform phase.
- **2026-05-05** - Added Supabase remote MCP configuration to Codex global config (`~/.codex/config.toml`) scoped to project `rdozeaacwaisgkpxjycn`. After the Supabase plugin was installed and authorized, migrations could be applied directly through MCP.

### Done

- [x] **2026-05-05 - Phase 1A Home vertical slice:** shipped the first Daily Coach Loop implementation. Added `database/migrations/create_daily_coach_loop_v1.sql`, `GoFitMobile/src/components/home/DailyCoachLoopCard.tsx`, `GoFitMobile/src/services/habits.ts`, `GoFitMobile/src/services/readiness.ts`, `GoFitMobile/src/stores/dailyCoachStore.ts`, and wired the card into `GoFitMobile/src/screens/home/HomeScreen.tsx`. The card computes deterministic readiness from existing health, nutrition, sessions, check-in, and habit data; habit/readiness persistence degrades gracefully until the migration is applied. Verification: `cd GoFitMobile && npm run type-check` passed.
- [x] **2026-05-05 - Supabase Daily Coach Loop migrations:** verified the Supabase MCP plugin connection to project `rdozeaacwaisgkpxjycn`, applied `create_daily_coach_loop_v1`, and added/applied `database/migrations/optimize_daily_coach_loop_rls_v1.sql` after Supabase advisors flagged the direct `auth.uid()` RLS pattern. Verification: `daily_habits`, `habit_logs`, and `daily_readiness` exist in Supabase with RLS enabled and expected policy counts.
- [x] **2026-05-05 - Phase 1B Health Connect recovery metrics:** added `database/migrations/extend_health_data_recovery_metrics_v1.sql`, updated `GoFitMobile/src/services/healthSync.ts` to request/read optional Health Connect sleep, resting heart rate, and HRV RMSSD data, fed those inputs into deterministic readiness, and surfaced them in Home/Profile/Progress health cards. Verification: `cd GoFitMobile && npm run type-check` passed; Supabase shows nullable `sleep_minutes`, `resting_heart_rate`, and `hrv_rmssd_ms` columns on `public.health_data`.
- [x] **2026-05-05 - Phase 1C Habit management surface:** extended `GoFitMobile/src/services/habits.ts` and `GoFitMobile/src/stores/dailyCoachStore.ts` with habit CRUD/active-state actions, added `GoFitMobile/src/screens/profile/HabitSettingsScreen.tsx`, wired it into the Profile stack, and added a Profile settings entry. Verification: `cd GoFitMobile && npm run type-check` passed.
- [x] **2026-05-05 - Phase 2A Adaptive AI workout v1:** upgraded `supabase/functions/ai-workout-recommendation/index.ts` to compute deterministic adaptive context from `daily_readiness`, `health_data`, and recent completed `workout_sessions`, then pass that context into Groq generation and return a structured `adaptation` summary. Updated the mobile recommendation type and Home recommendation card to display adaptive volume/readiness context. Verification: `cd GoFitMobile && npm run type-check` passed; Supabase Edge Function `ai-workout-recommendation` deployed as version 3 with JWT verification enabled.

### Next

- [x] Restart Codex, authorize the Supabase MCP server, then apply `create_daily_coach_loop_v1.sql` to Supabase before relying on persisted habits/readiness in a shared environment.
- [x] Continue Phase 1 with Health Connect metric expansion beyond steps/active calories.
- [x] Add a dedicated habit management surface after the Home loop proves useful.
- [x] Deploy the updated `ai-workout-recommendation` Edge Function and verify mobile type-check for Phase 2A.
