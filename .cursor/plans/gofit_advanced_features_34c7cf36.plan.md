---
name: GoFit Advanced Features
overview: Fix existing bugs, complete missing features (coach wallet/settings, client nutrition tracking, **on-device body measurements** replacing the retired Groq edge path), and add advanced features (BI dashboard, AI recommendations, smart notifications, wearables, progress photos, coach AI tools, automated check-ins). All completed work, fixes, and planned follow-ups are recorded in the “Living log” and relevant sections below—update this file whenever scope changes.
todos:
  - id: fix-bugs
    content: "Part 0: Fix QuickActions navigation, build TimerModal, delete orphaned screens, fix slides"
    status: completed
  - id: coach-wallet-settings
    content: "Part 1A: Build Coach Wallet screen + Coach Settings screen, wire navigation"
    status: completed
  - id: mediapipe
    content: "Part 1B: AI Body Measurements -- Groq vision (llama-4-scout) edge function + height_cm + mobile screen (diagram, history, manual)"
    status: completed
  - id: body-measure-ref-height
    content: "Part 1B extension: Optional A4 reference mode for height estimation (height_mode, dual AI calls, mobile UX)."
    status: completed
  - id: part-1b-a4-copy-profile-sanity
    content: "Part 1B: Accurate dual scan hints (AI vs A4) + optional profile vs A4 height delta rejection (20 cm) + send user_height_cm on A4 when profile exists."
    status: completed
  - id: part-1b-groq-stack-removed
    content: "Part 1B retired: Deleted Groq body-measurements edge function from repo + mobile AI scan (service, store, screen, bodyScanImage); kept DB body_measurements for future on-device flow."
    status: completed
  - id: nutrition
    content: "Part 1C: Nutrition Tracking -- DB tables + seed data, meal logging screens, macro rings"
    status: completed
  - id: bi-dashboard
    content: "Part 2: Admin BI v1 inside /dashboard -- fix core metrics, add session activity + coach performance, defer separate /bi-dashboard and finance-heavy BI until data model is ready"
    status: completed
  - id: bi-advanced
    content: "Part 2B: Advanced Admin BI -- canonical finance/retention/coaching-op views, drilldowns, filters, alerts, and role-specific dashboards"
    status: pending
  - id: smart-notifs
    content: "Part 3: Smart Notifications & Streaks -- DB tables, edge functions, streak widget, settings UI"
    status: pending
  - id: ai-recommendations
    content: "Part 4: AI Workout Recommendations -- DB table, Groq edge function, mobile screen + home section"
    status: pending
  - id: progress-photos
    content: "Part 5: Progress Photos -- DB table, storage bucket, timeline screen, comparison screen"
    status: pending
  - id: wearables
    content: "Part 6: Wearable Integration -- health_data table, react-native-health packages, sync service, widget"
    status: pending
  - id: coach-ai-productivity
    content: "Part 7: Coach AI & Productivity -- AI session notes, enhanced progress dashboard, program templates"
    status: pending
  - id: check-ins
    content: "Part 8: Automated Check-ins -- DB tables, edge function, client form screen, coach trend charts"
    status: pending
  - id: coach-ui-polish
    content: "Part 9: Coach UI Polish -- theme support, blur/glass, animations, charts on dashboard, skeletons, visual parity with client side"
    status: completed
isProject: false
---

# GoFit -- Advanced Features + Fixes Implementation

Original detail backlog lives in [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md), but scope decisions in this file take precedence when they diverge.

**Convention:** Whenever you ship a fix or change scope, append an entry to **Living log → Done** (dated, concrete: files, behavior, deploy version if applicable), add or update a **YAML todo** `status: completed` when the work maps to a trackable item, and adjust the relevant **phase section** so this file stays the single source of truth. No shipped step should exist only in code or chat.

---

## Living log (done + decided + next)

### Done

- **Part 2 - Admin BI v1 on existing dashboard (2026-04-23)** - **Product direction:** kept BI inside the current admin **`/dashboard`** instead of creating a separate **`/bi-dashboard`** route. **Data layer:** corrected DAU / WAU / MAU to use **distinct workout users**, fixed user growth cumulative math so the chart keeps the lifetime baseline, and added 30-day session activity + coach performance queries in `admin-panel/lib/analytics.ts`. **UI:** added BI v1 snapshot cards, `SessionActivityChart.tsx`, and `CoachPerformanceTable.tsx` to `admin-panel/app/dashboard/page.tsx`. **Deferred:** finance-heavy BI stays out of v1 because the repo currently treats pack sales (`purchased_packs` + `session_packs.price`) and coach wallet ledger data (`transactions` / `wallets`) as different sources of truth.

- **Part 0 / Part 1A / Part 9** — Completed per todos above (QuickActions + TimerModal, coach wallet/settings, coach UI polish theme + dashboard + skeletons + animations).
- **Part 1B — Groq / remote AI body measurements removed (2026-04-17)** — **Repo cleanup** so the client can be replaced with an **on-device** implementation without conflicting code paths. **Deleted:** `supabase/functions/body-measurements/` (entire edge function), `GoFitMobile/src/services/bodyMeasurements.ts`, `GoFitMobile/src/screens/progress/BodyMeasurementsScreen.tsx`, `GoFitMobile/src/stores/bodyMeasurementsStore.ts`, `GoFitMobile/src/utils/bodyScanImage.ts`. **Navigation / types:** removed `BodyMeasurements` from `AppNavigator` Progress stack and from `ProgressStackParamList` (`src/types/index.ts`). **UI:** removed Body Measurements quick link from `WorkoutStatisticsScreen.tsx` (Nutrition tile unchanged). **Docs:** `GoFitMobile/PROJECT_ANALYSIS.md` (checklist), `GoFitMobile/docs/guides/NEXT_STEPS.md` (progress bullet). **Database:** `public.body_measurements` and all SQL migrations **left unchanged** for reuse. **Supabase project:** if **`body-measurements`** is still deployed remotely, **undeploy** or delete that function in Dashboard/CLI so it does not stay live as dead API surface.
- **Part 9 — Coach dashboard UI (session)** — Client-style header (greeting, date, stat chips, weather), 2-column stat grid with wider card width and ~52px metric numbers, **Upcoming** tile replacing Hours/Mo, avg rating dash fix, real coach display name (not literal “Coach”), next-session icon tint (blue → green), stronger border glow / shadows, typography and chip styling cleanup.
- **Part 1C — Nutrition tracking (2026-04-16)** — **DB:** migration `database/migrations/create_nutrition_tracking.sql`: tables `food_items` (RLS `SELECT` for `authenticated`), `nutrition_goals` (per-user targets, auto-created defaults on first use from app), `meal_logs` (full CRUD own rows). **Seed:** ~120 common foods (single guarded insert when catalog empty; expand via later migrations if needed). **Mobile:** `services/nutrition.ts`, `stores/nutritionStore.ts`, `components/nutrition/{MacroRings,MealSection,FoodSearchItem}.tsx`, screens `NutritionScreen`, `AddFoodScreen`, `NutritionGoalsScreen`; **Progress stack** routes + **Nutrition** quick link on `WorkoutStatisticsScreen`; **Home** `NutritionHomeCard` (today kcal vs goal). **Apply migration** to Supabase project before using the feature (Dashboard SQL or `supabase db push` / linked project).

#### Archived — Part 1B Groq path (historical only; removed from repo 2026-04-17)

- **Deploy (2026-04-15)** — Edge **`body-measurements`** v11, `verify_jwt: true`, project `rdozeaacwaisgkpxjycn`.
- **Mobile/service** — `bodyMeasurements.ts` (no client `user_id`; RLS); history/latest/delete patterns.
- **Mobile hardening (2026-04-15)** — Library + AI Scan flows; `bodyMeasurementsStore` delete refetch; manual cm ranges; `bodyScanImage.ts` quality ~0.68.
- **Deploy (2026-04-16)** — **`body-measurements` v12** — `height_mode` `profile` | `reference_a4`; dual Groq calls for A4 geometry + measurements.
- **Mobile A4 (2026-04-16)** — `BodyMeasurementsScreen` A4 flow; `height_mode` + optional `user_height_cm`.
- **A4 UX + profile sanity (2026-04-16)** — Dual scan copy; **20 cm** delta when profile + A4; server `REFERENCE_VS_PROFILE_MAX_DELTA_CM`.

### Decided / documented

- **BI product direction (2026-04-23)** â€” BI v1 lives in the existing admin **`/dashboard`**. Do **not** create **`/bi-dashboard`** or a 4-tab BI shell until the data model is strong enough to support it cleanly.
- **BI finance scope (2026-04-23)** â€” Revenue beyond light operational monitoring is **deferred**. `purchased_packs` currently supports gross pack-sales views, while `transactions` / `wallets` describe coach ledger activity, so platform revenue / ARPU / refund-aware finance metrics are not yet a single reliable source.

- **`body-measurements` edge function** — **No longer in repo.** Any deploy/CLI notes for this function are **obsolete**; remove the function from the Supabase project if it is still deployed.
- **Body measurements product direction** — Next implementation is **on-device**, writing to existing **`body_measurements`** (and related columns/migrations). No Groq vision path in mobile until/unless explicitly reintroduced.

### Next (backlog — body measurements & progress)

- **Part 2B (new):** advanced BI foundation for the admin panel -- define the KPI contract and build canonical finance, lifecycle, coaching-ops, and client-health views before adding advanced tabs.
- **Part 1B (new):** on-device body measurement pipeline (capture, inference, validation), mobile service + screen(s), optional local history UI; reuse **`body_measurements`** table and RLS.
- **Repo/docs:** align root **`docs/IMPLEMENTATION_PLAN.md`**, **`FEATURES.md`**, and **`scripts/generate_features_md.py`** with removal when those files are next edited (they may still mention the old edge function).
- **Nutrition follow-ups:** optional imperial display; expand `food_items` seed; Storage for meal photos — see Part 1C shipped section.

---

## Phase A: Fixes (quick wins)

### Part 0: Bug Fixes & Cleanup

- **Fix Quick Actions "Create Workout"** -- `GoFitMobile/src/components/home/QuickActions.tsx` navigates to `CreateWorkout` which doesn't exist. Change to `WorkoutBuilder`.
- **Build Timer Modal** -- new `GoFitMobile/src/components/shared/TimerModal.tsx` with countdown presets (30s/60s/90s/120s), start/pause/reset, vibration alert. Wire into QuickActions.
- **Delete orphaned screens** -- remove `CoachChatScreen.tsx` and `CoachClientsScreen.tsx` (unused "Coming Soon" stubs).
- **Fix slides** -- update `docs/PRESENTATION_SLIDES.txt` to say "Supabase Realtime" instead of "Socket.io".

### Part 1A: Coach Wallet & Settings

- **Wallet screen** -- balance card, transaction history, earnings summary (this week/month/all time). New service `wallet.ts`, store `walletStore.ts`, screen `CoachWalletScreen.tsx`.
- **Settings screen** -- notification prefs, session defaults, profile visibility, account management. New `CoachSettingsScreen.tsx`.
- **Wire navigation** -- remove `comingSoon: true` from `CoachProfileScreen.tsx`, add screens to `CoachAppNavigator.tsx`.

---

## Phase B: Missing Features (promised in slides)

### Part 1B: Body measurements (platform TBD — on-device next)

**Current repo state (keep in sync):**

- **DB (unchanged):** `public.body_measurements` still includes **`height_cm`** and related migrations (`add_body_measurement_height_cm.sql`, optional length columns in `add_body_measurement_lengths.sql`). Intended for **manual rows**, legacy AI rows, and **future on-device** inserts — **no** mobile screen or service currently targets this table from the app after the 2026-04-17 removal.
- **Edge function:** **Removed.** The former **`supabase/functions/body-measurements/`** Groq vision implementation is deleted from the repo. Historical behavior (v11–v12, `height_mode`, A4 reference path) is summarized under **Living log → Archived**.
- **Mobile:** **Removed** — `bodyMeasurements.ts`, `BodyMeasurementsScreen.tsx`, `bodyMeasurementsStore.ts`, `bodyScanImage.ts`; no `BodyMeasurements` route on Progress stack; no entry from `WorkoutStatisticsScreen` for body measurements.

**Next:** Implement **Part 1B (new)** on-device flow and new UI; see **Living log → Next**.

#### Reference — old Groq + A4 design (archived)

- Was documented in **Living log → Archived** and git history: profile-height mode vs `reference_a4`, dual Groq calls, A4 **29.7 cm** scale, optional profile vs estimate **20 cm** delta. **Not present in codebase** after 2026-04-17 removal.

### Part 1C: Nutrition Tracking

**Shipped (keep in sync with repo):**

- **DB:** `food_items`, `nutrition_goals`, `meal_logs` + RLS — see migration `database/migrations/create_nutrition_tracking.sql`. Catalog seeded with **~120** foods (not 200; easy to extend).
- **Mobile:** `GoFitMobile/src/services/nutrition.ts`, `stores/nutritionStore.ts`, `components/nutrition/*`, `screens/nutrition/*`. **Navigation:** `ProgressStackParamList` + `AppNavigator` screens `Nutrition`, `AddFood`, `NutritionGoals`. Entry: **Progress** → Nutrition tile; **Home** → Nutrition today card.
- **Behavior:** Day picker, macro rings vs goals, meal sections (breakfast/lunch/dinner/snack), food search + servings, edit goals screen.

**Original checklist:** ~~tables~~, ~~screens~~, ~~components~~, ~~home card~~ — done.

---

## Phase C: Admin BI (inside existing dashboard)

### Part 2: BI v1 on `/dashboard`

**Shipped BI v1:**

- Keep BI inside the existing admin **`/dashboard`** and extend the current analytics page instead of adding a separate route.
- Fix the existing foundation first: DAU / WAU / MAU now use **distinct users**, and user growth cumulative no longer resets to the visible window.
- Add the smallest useful BI slice on top of the current dashboard: 30-day workout sessions, workout completion rate, completed coach bookings, active coaches, a session activity trend, and a top-coach performance table.
- Keep the older dashboard cards (heatmap, workout completion, popular exercises, recent activity, system health) in place as supporting operational analytics.

**Deferred until the data / model is clearer:**

- Separate **`/bi-dashboard`** route, 4 tabs, and the earlier 16-chart build.
- Revenue / ARPU / pack-sales finance BI beyond light monitoring, because `purchased_packs` and `transactions` / `wallets` do not yet form one clean finance source of truth.
- Cohorts, churn, funnels, communication BI, and broader demographic rollups beyond simple current-schema summaries.

### Part 2B: Advanced BI roadmap

**Assumptions / guardrails:**

- Keep advanced BI inside the admin panel unless a later product decision explicitly changes that.
- Do not build a bigger dashboard shell until the underlying metrics have one reliable definition each.
- Prefer reusable views / query modules over one-off page queries so KPI definitions stay consistent across cards, charts, exports, and alerts.

**Stage 0 -- KPI contract first (required before more UI)**

1. Define the KPI catalog in code/docs:
   - finance: gross revenue, net revenue, refunds, fees, payout liability, average order value, coach share, platform share
   - retention: signup, activated, first workout, first booking, active, churned, reactivated
   - coaching ops: completed bookings, cancellation rate, no-show rate, utilization, active clients per coach
   - client health: workout adherence, nutrition adherence, streak / inactivity, program completion
2. For each KPI, record the source tables, business definition, aggregation grain, and known caveats.
3. Verify every advanced KPI can be recomputed from the current schema or explicitly mark it blocked.

**Stage 1 -- Semantic layer / data foundation**

1. Build canonical BI query modules or SQL views for:
   - `bi_finance_daily`
   - `bi_user_lifecycle_daily`
   - `bi_coach_ops_daily`
   - `bi_client_health_daily`
2. Normalize finance so pack sales, refunds, wallet transactions, and fees reconcile cleanly.
3. Normalize lifecycle so activation, churn, and reactivation are based on one event model.
4. Add comparison helpers for previous period, rolling 7/30/90 day windows, and cumulative trends.

**Stage 2 -- Advanced BI v2 UI**

1. Executive summary:
   - revenue, active clients, active coaches, completed sessions, churn / retention, at-risk clients
2. Revenue dashboard:
   - gross vs net revenue, refunds, fees, package mix, coach mix, average order value, period comparison
3. Retention dashboard:
   - activation funnel, cohort retention, churn / reactivation, DAU / WAU / MAU trend, inactive-user buckets
4. Coaching ops dashboard:
   - coach utilization, cancellations, no-shows, response / review load, top / at-risk coaches
5. Client health dashboard:
   - adherence, nutrition logging, streak / inactivity, program-ending soon, at-risk segments

**Stage 3 -- Advanced BI product features**

1. Global filters:
   - date range, coach, package, acquisition channel, client segment
2. Drilldowns:
   - click KPI -> table -> entity detail
3. Operational actions:
   - export CSV
   - saved views
   - scheduled email snapshots
   - threshold alerts for churn spike, refund spike, low utilization, inactive clients

**Recommended build order**

1. Finance semantic layer
2. Retention semantic layer
3. Coaching ops semantic layer
4. Executive summary + revenue dashboard
5. Retention dashboard
6. Coaching ops dashboard
7. Alerts / exports / saved views

**Stop / ship gates**

- Gate 1: finance numbers reconcile across pack sales and wallet ledger
- Gate 2: retention / churn definitions are accepted and stable
- Gate 3: advanced tabs only ship after KPI definitions are trusted enough for exports and alerts

---

## Phase D: Advanced Mobile Features

### Part 3: Smart Notifications & Streaks

- New tables: `notification_schedules`, `user_streaks`.
- Edge functions: `smart-notifications` (cron: reminders, inactivity nudges, streak alerts), `update-streaks` (on session complete).
- Mobile: `StreakWidget.tsx` on home, notification preferences in settings.

### Part 4: AI Workout Recommendations (Groq)

- New table: `ai_recommendations`.
- Edge function: `ai-recommendations` -- fetches user data, calls Groq (llama-3.3-70b-versatile, free tier), caches 24h.
- Mobile: `RecommendationsScreen.tsx`, "Recommended for You" section on home, Zustand store + service.

### Part 5: Progress Photos

- New table: `progress_photos`. New Supabase Storage bucket `progress-photos`.
- Mobile: `ProgressPhotosScreen.tsx` (timeline grid, add photo with category), `PhotoCompareScreen.tsx` (side-by-side comparison). Add to Progress stack.

### Part 6: Wearable Integration (Apple Health / Google Fit)

- New table: `health_data` (steps, calories, source, date).
- Dependencies: `react-native-health` (iOS), `react-native-health-connect` (Android).
- Mobile: `healthSync.ts` service (auto-sync on foreground), `HealthWidget.tsx` on home screen (steps + calories), toggle in profile settings.

---

## Phase E: Coach Advanced Features

### Part 7: Coach AI & Productivity

- **AI Session Notes** -- edge function `ai-session-notes` calls Groq to summarize client's recent sessions. New `ai_session_notes` table. "Generate Briefing" button on `ClientDetailScreen.tsx`.
- **Enhanced Client Progress** -- upgrade `ClientProgressScreen.tsx` with volume chart, consistency calendar heatmap, PR table, muscle group distribution. New chart components.
- **Program Templates** -- add `duplicateProgram()` to programs service, long-press menu on program cards, `is_template` column on `custom_programs`.

### Part 8: Automated Check-ins

- New tables: `check_in_schedules`, `check_in_responses` (mood/energy/soreness/sleep 1-5).
- Add check-in reminders to `smart-notifications` edge function.
- Client: `CheckInScreen.tsx` with emoji sliders, prompt card on home.
- Coach: `CheckInHistory.tsx` with trend charts, schedule configuration on `ClientDetailScreen.tsx`.

---

## Phase F: Coach UI Polish

### Part 9: Coach UI Polish

- **Theme support** -- all 17 coach screens updated from hardcoded dark colors to dynamic `useThemeStore` + `useThemeColors` + `colorUtils` (`getBackgroundColor`, `getGlassBg`, `getGlassBorder`, etc.). LinearGradients are theme-conditional. Full light/dark mode parity with client side.
- **Dashboard upgrade** -- `CoachDashboardScreen.tsx` rewritten with glass-style stat cards, `BarChart` (weekly sessions, last 6 weeks via `react-native-chart-kit`), performance summary card (completion rate + total), `Animated.ScrollView`, staggered card animations, shimmer skeleton loading.
- **Dashboard iteration (2026-04)** -- client-style header (greeting, date, stat chips, weather), 2-column stat grid with wider cards and prominent numerals, **Upcoming** session tile (replaced Hours/Mo-style tile), avg rating display fix, **real coach name** from profile (not placeholder “Coach”), next-session accent **green** tint (was blue), stronger card border glow/shadows, refined chip and font styling. See **Living log** for snapshot.
- **Shimmer skeletons** -- replaced `ActivityIndicator` with shimmer loading on `CoachCalendarScreen`, `ClientDetailScreen`, `ClientProgressScreen`, `CoachAvailabilityScreen`, `SessionPacksScreen`, `ProgramsListScreen`.
- **Entrance animations** -- staggered spring fade-in + translateY on list screens: `ClientsListScreen`, `ConversationsListScreen`, `SessionPacksScreen`, `ProgramsListScreen`.
- **Glass card styling** -- all coach cards/surfaces use `getGlassBg` / `getGlassBorder` for frosted-glass appearance.
- **Theme toggle for coaches** -- added `Palette` menu item to `CoachProfileScreen`, registered `ThemeSettingsScreen` in `CoachAppNavigator` profile stack, added `sceneContainerStyle` with theme-aware background.
- **Cleanup** -- deleted orphaned placeholder screens `CoachChatScreen.tsx` and `CoachClientsScreen.tsx`.
