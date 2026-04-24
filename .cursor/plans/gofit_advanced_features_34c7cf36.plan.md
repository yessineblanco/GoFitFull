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
    content: "Part 2B: Advanced Admin BI -- canonical BI views, dashboard drilldowns, filters, exports, saved views, alerts, snapshots, and scheduled digest runner"
    status: completed
  - id: smart-notifs
    content: "Part 3: Smart Notifications & Streaks v1 -- local derived streak metrics, home streak widget, inactivity/streak local reminders, settings UI; server automation deferred pending migration"
    status: completed
  - id: ai-recommendations
    content: "Part 4: AI Workout Recommendations v1 -- Groq edge function generates a custom workout from user needs and DB exercises; mobile saves it through existing custom-workout tables"
    status: completed
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

- **Mobile navigation audit + tab-bar hardening (2026-04-24)** - Audited the client app's nested tab navigation and tab-bar visibility paths after repeated Home -> nested screen and workout-session regressions. Root causes found: root-tab presses were not explicit about each tab's root screen, Home components were calling Library stack screens directly from the wrong navigator, one Home quick action pointed at a non-existent `EditBodyMetrics` route, and the client `CustomTabBar` appearance depended on a global scroll-driven `tabBarVisible` flag that could remain hidden after leaving a deep screen. Shipped a central fix in `GoFitMobile/src/components/shared/CustomTabBar.tsx`: bottom-tab presses now route to explicit roots and root-tab visibility is derived from navigation state plus keyboard state, not stale scroll state. Added cleanup resets in `GoFitMobile/src/components/shared/ScreenContainer.tsx` and `GoFitMobile/src/hooks/useTabScroll.ts`. Normalized Home entry points through their owning tabs in `GoFitMobile/src/components/home/ActionCard.tsx`, `TopWorkouts.tsx`, `YourPrograms.tsx`, and `QuickActions.tsx` so nested Library/Profile screens are opened through `Library` / `Profile` with real route names and `initial: false` where needed.
- **Mobile tab-root navigation hardening (2026-04-24)** - Fixed the recurring bottom-tab stale-stack issue in `GoFitMobile/src/components/shared/CustomTabBar.tsx`. Root cause: the custom tab bar emitted `tabPress` and then used plain `navigation.navigate(route.name)`, so React Navigation could restore a previously focused nested route such as `Library -> WorkoutSession` after a paused workout instead of showing the tab's main screen. The tab bar now sends each tab to its explicit root screen (`HomeMain`, `WorkoutsMain`, `LibraryMain`, `ProgressMain`, `ProfileMain`) on press. This keeps paused/incomplete workouts available through the app's resume UI rather than automatically reopening the active session from the bottom bar.
- **Part 3 - Smart Notifications & Streaks v1 (2026-04-24)** - Audited the existing notification and streak surface and shipped the smallest useful migration-free mobile v1. Existing support: mobile local Expo workout / weekly / booking reminders, `public.notifications` inbox, `push_tokens` + `send-push-notification`, booking/chat/program notification inserts, `user_profiles.notification_preferences`, and workout-session dates for streak derivation. Missing / blocked for server automation: no `user_streaks` or `notification_schedules` tables, no smart-notification cron function, and the current `notifications.type` check constraint does not allow new inbox types like `inactivity_nudge` or `streak_alert`. Implemented `GoFitMobile/src/store/sessionsStore.ts` streak metrics (`currentStreak`, `longestStreak`, last workout, inactivity), `GoFitMobile/src/components/home/StreakWidget.tsx`, `GoFitMobile/src/screens/home/HomeScreen.tsx` smart local scheduling hook, `GoFitMobile/src/services/notifications.ts` scoped notification cancellation plus local inactivity / streak-risk scheduling, and `GoFitMobile/src/screens/profile/NotificationsSettingsScreen.tsx` preferences for inactivity nudges, threshold, and streak alerts. No demo seed was needed because the feature derives from existing `workout_sessions`; local testing can use any existing or newly completed workout session. Verification: `npm run type-check` in `GoFitMobile` is still blocked by pre-existing unrelated TypeScript errors in `AppNavigator`, `CoachAppNavigator`, `CoachDetailScreen`, `EditWeightHeightScreen`, `NotificationInboxScreen`, and `deepLinkStore`; no reported errors were in the Part 3 files.
- **Part 4 - AI Workout Recommendations v1 audit + implementation (2026-04-24)** - Audited the recommendation surface before building. Existing support: `user_profiles.goal` / `activity_level`, native and custom workouts in `workouts`, workout exercise metadata through `workout_exercises`, recent completed sessions in `workout_sessions`, existing `WorkoutDetail` navigation, and home glass-card patterns. Missing for persistence-heavy v2: no `ai_recommendations` cache table, no dismiss/regenerate model, and no persistent server invalidation after new sessions. Shipped the smallest true-AI v1 without DB migration: `supabase/functions/ai-workout-recommendation/index.ts` verifies the user session, fetches profile + recent sessions + DB exercises, calls Groq (`llama-3.3-70b-versatile`), validates that returned exercises exist in the database catalog, and returns one custom workout proposal; `GoFitMobile/src/services/workoutRecommendations.ts` invokes the function; `GoFitMobile/src/components/home/RecommendedWorkouts.tsx` renders one dark/glass AI workout card and saves the generated workout through the existing `workoutService.createCustomWorkout` path before opening `Library -> WorkoutDetail`; `GoFitMobile/src/screens/home/HomeScreen.tsx` shows the AI card only as the no-recent-activity fallback so Home does not stack AI recommendations, Recent Activity, and Your Training together. No demo seed was needed because the function uses the existing `exercises` catalog. Operational requirement before live use: deploy the `ai-workout-recommendation` Edge Function and set `GROQ_API_KEY` in Supabase function secrets.
- **Part 3 - Home streak UI + nutrition deep-link follow-up (2026-04-24)** - Restyled `GoFitMobile/src/components/home/StreakWidget.tsx` to match the app's dark/glass visual language with `BlurView`, low-opacity dark glass surface, subtle brand-green wash, glass borders, and compact metric treatment. Fixed the Home -> Nutrition Today navigation edge case in `GoFitMobile/src/components/home/NutritionHomeCard.tsx` by navigating to the nested Progress stack with `initial: false`, so a cold Progress stack keeps `ProgressMain` underneath `Nutrition` and the bottom Progress tab can return correctly.
- **Part 1B - Body measurement status correction (2026-04-24)** - Confirmed the current repo does include the newer on-device body-measurement implementation, despite older plan wording that still described it as "next." Current mobile files include `GoFitMobile/src/screens/profile/BodyMeasurementScreen.tsx`, `GoFitMobile/src/services/bodyMeasurementService.ts`, `GoFitMobile/src/services/bodySegmentationService.ts`, `GoFitMobile/src/services/measurementLogger.ts`, and `GoFitMobile/src/components/shared/BodyGuideOverlay.tsx`. The detailed troubleshooting log in `docs/troubleshooting/BODY_MEASUREMENT_FIX_PLAN.md` is the source of truth for the Android MediaPipe / segmentation rollout, capture gates, save-path compatibility, and Progress-screen integration. Remaining body-measurement work is follow-up hardening, not initial implementation: iOS parity when hardware is available, validation-set accuracy work, and optional estimator improvements.
- **Part 2B - Advanced BI live completion (2026-04-24)** - Cursor/Supabase MCP applied the existing `database/migrations/create_admin_settings.sql` migration to project `rdozeaacwaisgkpxjycn`; `public.admin_settings` now exists with RLS enabled and columns `id`, `key`, `value`, `created_at`, and `updated_at`. The table is expectedly empty until the first admin saves a BI view. This resolves the last live blocker for advanced BI saved views and scheduled digest settings, so the `bi-advanced` track is complete across repo and database. Optional production ops follow-up: configure a hosted cron or external scheduler to call `/api/bi/scheduled-digests` with `BI_DIGEST_CRON_SECRET` if unattended digest delivery is needed.
- **Part 2B - Advanced BI scheduled digest runner (2026-04-24)** - Completed the repo-side scheduled BI digest flow on top of the existing admin `/dashboard` and `admin_notifications` system. Extended `admin-panel/lib/bi-saved-views.ts`, `admin-panel/app/api/bi/saved-views/route.ts`, and `admin-panel/components/analytics/AdvancedBISavedViews.tsx` so saved BI views can opt into `daily` or `weekly` digests while older saved views default to `none`. Added `admin-panel/app/api/bi/scheduled-digests/route.ts` so an admin session or cron secret can run due saved-view digests and stamp `digestLastSentAt` after notifications are inserted. Reused `admin-panel/lib/bi-snapshot.ts` so manual snapshots and scheduled digests share the same finance, lifecycle, coach-ops, and client-health summary logic. Final verification also tightened existing TypeScript casts in `admin-panel/lib/analytics.ts` and lifecycle activation typing in `admin-panel/lib/bi-user-lifecycle.ts` so `npx tsc --noEmit` passes.
- **Part 2B - Advanced BI snapshot delivery path (2026-04-23)** - Chose the smallest real outbound path for BI digests: the existing in-app `admin_notifications` system, not email. Added `admin-panel/lib/bi-snapshot.ts`, `admin-panel/app/api/bi/snapshot/route.ts`, and `admin-panel/components/analytics/AdvancedBISnapshotButton.tsx` so the advanced BI header on the existing `/dashboard` can now send the current BI view into the admin notification center as a compact digest of finance, lifecycle, coach ops, and client health. Also updated `admin-panel/components/notifications/NotificationCenter.tsx` so the bell refreshes immediately after a snapshot is sent. This keeps delivery inside the current admin panel and defines the outbound channel before any scheduled or saved-view automation work.

- **Part 2B - Advanced BI saved-views hardening (2026-04-23)** - Patched `admin-panel/app/dashboard/page.tsx`, `admin-panel/app/api/bi/saved-views/route.ts`, and `admin-panel/lib/bi-saved-views.ts` so the dashboard no longer crashes if `public.admin_settings` is missing in the connected Supabase project. In that case the page now falls back to an empty saved-views list, and save/delete attempts return a clear “saved views unavailable” message instead of taking down `/dashboard`.
- **Part 2B - Advanced BI Stage 3 in-panel threshold alerts (2026-04-23)** - Added `admin-panel/components/analytics/BIThresholdAlertsCard.tsx` and wired it into `admin-panel/app/dashboard/page.tsx` so the existing admin `/dashboard` now surfaces fixed in-panel alert thresholds for inactive clients and low coach utilization without adding a scheduled delivery layer yet. Client alerts use the current client-health snapshot (`14d+` warning, `30d+ / never` critical), while coach alerts use recurring-availability utilization inputs from the selected BI window (`<25%` warning, `<10%` critical). No extra demo seed was needed for this slice because the current BI demo data already produces live alert cases, including inactive clients and low-utilization coaches.
- **Part 2B - Advanced BI Stage 3 saved views (2026-04-23)** - Added `admin-panel/app/api/bi/saved-views/route.ts`, `admin-panel/lib/bi-saved-views.ts`, and `admin-panel/components/analytics/AdvancedBISavedViews.tsx` so the existing admin `/dashboard` now lets each admin save and reuse BI filter presets without creating a new route or another persistent page block. Saved views are stored per admin user in `admin_settings` under a dedicated key, and they capture only the current range plus the existing truthful coach/package scopes already supported by the dashboard.
- **Part 2B - Advanced BI Stage 3 CSV export (2026-04-23)** - Added `admin-panel/app/api/bi/export/route.ts` so the existing admin `/dashboard` now exports CSVs for the current advanced BI slices without creating a separate reporting surface. Exports stay aligned to the current semantic layer and current truthful scopes: **finance** honors range + coach + package filters where supported, **coach ops** honors range + coach scope, and **lifecycle / cohorts / client health** stay global so we do not imply coach or package attribution where it does not exist yet. The dashboard header now exposes compact CSV buttons instead of adding another long page section. No extra demo seed was needed for this step because the existing Stage 2 / Stage 3 demo datasets already populate all exportable BI slices.
- **Part 2B - Advanced BI Stage 3 coach/package filters (2026-04-23)** - Extended `admin-panel/app/dashboard/page.tsx` with a compact advanced-BI filter form so the existing admin `/dashboard` now supports shared coach and package query filters without turning the page into a client route. The current semantic layer only supports these scopes truthfully in specific places, so the UI now makes that explicit: **coach filters** scope finance and coach-ops, while **package filters** scope finance pack-sales only. To support the new package filter with real data instead of empty selects, also seeded a minimal demo package dataset in the connected Supabase project: two active `session_packs` for the approved coaches (`Demo Filter Starter 6`, `Demo Filter Pro 12`) plus four historical `purchased_packs` rows so each package has both a current-window and previous-window finance signal.
- **Part 2B - Advanced BI Stage 3 global range filter + period comparison (2026-04-23)** - Extended `admin-panel/app/dashboard/page.tsx` so the advanced BI section on the existing admin `/dashboard` now supports shared `7D` / `30D` / `90D` server-side range filters plus previous-period comparison across the executive finance, lifecycle, coach-ops, and client-health cards. The same pass refined the BI framing with range chips, explicit current-vs-previous date labels, clearer selected-window messaging, and new collapsible section wrappers so the dashboard stops reading like one long vertical stack while keeping current-state snapshot cards anchored to today's date. To keep the new finance comparison truthful and non-empty, also seeded a minimal demo finance dataset in the connected Supabase project: four `purchased_packs` rows across `2026-04-20`, `2026-04-12`, `2026-03-18`, and `2026-03-06`, which now produce matching current and previous 30-day gross pack-sales windows in `public.bi_finance_daily`.
- **Part 2B - Advanced BI Stage 2 client-health trend detail (2026-04-23)** - Added `admin-panel/components/analytics/ClientHealthTrendDetailCard.tsx` and wired it into `admin-panel/app/dashboard/page.tsx` so the existing admin `/dashboard` now shows daily workout, nutrition, and body-measurement trend lines from `getBIClientHealthOverview`. This panel stays within the truthful client-health scope: daily distinct users with each signal rather than speculative body-change or nutrition-adherence scoring. To keep the body-signal line useful in the current workspace, also seeded a minimal demo body-measurement dataset in the connected Supabase project: three recent `body_measurements` rows for non-admin client users, tagged in `manual_overrides.demo_seed`, across `2026-04-17`, `2026-04-20`, and `2026-04-22`.
- **Part 2B - Advanced BI Stage 2 lifecycle activation + inactivity detail (2026-04-23)** - Added `admin-panel/components/analytics/LifecycleActivationDetailCard.tsx`, extended `admin-panel/lib/bi-user-lifecycle.ts` with current lifecycle snapshots and activation / inactivity bucket counts, and wired the new card into `admin-panel/app/dashboard/page.tsx`. This panel stays within the current lifecycle model: workout activation vs booking-only activation plus last-workout inactivity buckets derived from the canonical lifecycle view. To keep the new panel useful in the current workspace, also seeded a minimal demo lifecycle dataset in the connected Supabase project: four recent completed `workout_sessions` spread across `2d`, `5d`, `10d`, and `21d` ago so the `active 7d`, `8-14d`, and `15-30d` buckets are no longer empty.
- **Part 2B - Advanced BI Stage 2 coach-ops detail (2026-04-23)** - Added `admin-panel/components/analytics/CoachOpsDetailCard.tsx` and wired it into `admin-panel/app/dashboard/page.tsx` so the existing admin `/dashboard` now shows a coach-operations detail table sourced from `getBICoachOpsOverview`. This panel stays within the truthful coach-ops scope: bookings, completion / cancellation / no-show rates, current relationship clients, and approximate utilization from recurring availability patterns. To keep the new panel useful in the current workspace, also seeded a minimal demo coach-ops dataset in the connected Supabase project: recent booking outcomes for the approved coaches plus recurring availability rows for the approved coach who had none.
- **Part 2B - Advanced BI Stage 2 finance-by-currency detail (2026-04-23)** - Added `admin-panel/components/analytics/FinanceCurrencyDetailCard.tsx` and wired it into `admin-panel/app/dashboard/page.tsx` so the existing admin `/dashboard` now shows a finance detail table by currency. This panel exposes only the finance metrics the current semantic layer can support truthfully: gross pack sales, orders, AOV, wallet earnings, platform fee rows, refund ledger rows, payout rows, and current payout liability, while keeping net revenue and reconciliation explicitly deferred.
- **Part 2B - Advanced BI Stage 2 client-health risk queue (2026-04-23)** - Added `admin-panel/components/analytics/ClientHealthRiskQueue.tsx` and extended `admin-panel/lib/bi-client-health.ts` so the existing admin `/dashboard` now shows a current risk queue with client display names, workout inactivity, nutrition log recency, body-measurement recency, pack expiry pressure, and current sessions remaining. The queue also calls out when nutrition signals are currently noisy because the workspace has no recent meal-log activity yet.
- **Part 2B - Advanced BI Stage 2 retention cohort drilldown (2026-04-23)** - Added `admin-panel/components/analytics/RetentionCohortCard.tsx` and wired `getBIUserWorkoutCohortRetention` into `admin-panel/app/dashboard/page.tsx` so the existing admin `/dashboard` now includes a signup-to-workout cohort retention matrix. The same pass also refined the advanced BI overview UI with clearer badges, section framing, and stronger card hierarchy while keeping the scope inside the current dashboard.
- **Part 2B - Advanced BI Stage 2 executive overview (2026-04-23)** - Extended `admin-panel/app/dashboard/page.tsx` with a first advanced BI overview section on the existing `/dashboard`, sourced from the canonical helpers `admin-panel/lib/bi-finance.ts`, `admin-panel/lib/bi-user-lifecycle.ts`, `admin-panel/lib/bi-coach-ops.ts`, and `admin-panel/lib/bi-client-health.ts`. This keeps advanced BI inside the current admin surface while exposing truthful finance foundation, lifecycle, coach-ops, and client-health summaries without jumping to separate tabs or speculative drilldowns.
- **Part 2B - Advanced BI Stage 1 database rollout complete (2026-04-23)** - Confirmed `public.bi_finance_daily`, `public.bi_user_lifecycle_daily`, `public.bi_coach_ops_daily`, and `public.bi_client_health_daily` are now applied and verified in the connected Supabase project, so the full semantic layer is live both repo-side and database-side.
- **Part 2B - Advanced BI Stage 1 client-health slice (2026-04-23)** - Added the canonical client-health view migration `database/migrations/create_bi_client_health_daily_view.sql` and the admin query module `admin-panel/lib/bi-client-health.ts`. This fourth semantic-layer slice now captures daily workout, nutrition, body-measurement, completed-booking, and pack-purchase signals plus current risk-oriented client snapshots without freezing a final at-risk score or overclaiming historical pack-state semantics.
- **Part 2B - Advanced BI Stage 1 coach-ops slice (2026-04-23)** - Added the canonical coach-ops view migration `database/migrations/create_bi_coach_ops_daily_view.sql` and the admin query module `admin-panel/lib/bi-coach-ops.ts`. This third semantic-layer slice now captures daily booking outcomes, booking-minute totals, recurring availability-pattern minutes, coach quality snapshots, and current coach relationship snapshots without pretending response-SLA or finalized utilization formulas are fully settled.
- **Part 2B - Advanced BI Stage 1 lifecycle slice (2026-04-23)** - Added the canonical lifecycle view migration `database/migrations/create_bi_user_lifecycle_daily_view.sql` and the admin query module `admin-panel/lib/bi-user-lifecycle.ts`. This second semantic-layer slice now captures daily per-user signup, first completed workout, first completed booking, workout activity, completed booking activity, pack-purchase activity, rolling DAU / WAU / MAU inputs, and signup-to-workout cohort retention inputs without prematurely freezing churn or reactivation definitions.
- **Part 2B - Advanced BI Stage 1 finance slice (2026-04-23)** - Added the canonical finance view migration `database/migrations/create_bi_finance_daily_view.sql` and the admin query module `admin-panel/lib/bi-finance.ts`. This first semantic-layer slice now exposes truthful daily pack-sales metrics plus explicit ledger signals for earnings, platform fees, payouts, and refund rows, while keeping net revenue and refund-aware reconciliation deferred until the finance model is stronger.
- **Part 2B - Advanced BI Stage 0 KPI contract (2026-04-23)** - Added the advanced KPI contract in `docs/admin-panel/ADVANCED_BI_STAGE0_KPI_CONTRACT.md` and the code-side catalog in `admin-panel/lib/bi-kpi-contract.ts`. Each KPI is now marked `supported`, `partial`, or `blocked` against the current schema so Stage 1 can build canonical views without redefining metrics.
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

- **Part 2B (ops optional):** configure the deployed scheduler or external cron to call `/api/bi/scheduled-digests` with `BI_DIGEST_CRON_SECRET` if unattended scheduled BI digests are needed in production.
- **Part 3 (next recommendation):** If cross-device / server-driven smart notifications are required, apply a focused DB migration for `notification_schedules`, `user_streaks`, and widened `notifications.type`, then add a scheduled edge route/function. Until then, the shipped v1 is mobile-local and derives streaks from `workout_sessions`.
- **Part 4 (ops optional):** deploy `supabase/functions/ai-workout-recommendation` and set `GROQ_API_KEY` in Supabase function secrets. Add an `ai_recommendations` cache table later only if cross-device cached recommendations, dismiss/regenerate history, or analytics are needed.
- **Part 1B (follow-up only):** body-measurement hardening remains open for iOS parity when hardware is available, validation-set accuracy work, and optional estimator improvements; initial Android on-device implementation is already present.
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

### Part 1B: Body measurements (Android on-device path implemented; hardening remains)

**Current repo state (keep in sync):**

- **DB (unchanged):** `public.body_measurements` still includes **`height_cm`** and related migrations (`add_body_measurement_height_cm.sql`, optional length columns in `add_body_measurement_lengths.sql`). The current app save path uses the DB-compatible `source = 'ai_ondevice'` value and stores richer provenance/debug details in the measurement payload/manual overrides rather than widening the DB source constraint.
- **Edge function:** **Removed.** The former **`supabase/functions/body-measurements/`** Groq vision implementation is deleted from the repo. Historical behavior (v11–v12, `height_mode`, A4 reference path) is summarized under **Living log → Archived**.
- **Mobile:** On-device implementation is present under `GoFitMobile/src/screens/profile/BodyMeasurementScreen.tsx`, `GoFitMobile/src/services/bodyMeasurementService.ts`, `GoFitMobile/src/services/bodySegmentationService.ts`, `GoFitMobile/src/services/measurementLogger.ts`, and `GoFitMobile/src/components/shared/BodyGuideOverlay.tsx`. The old removed files (`bodyMeasurements.ts`, progress-stack `BodyMeasurementsScreen.tsx`, `bodyMeasurementsStore.ts`, `bodyScanImage.ts`) are still gone and should not be reintroduced as the Groq path.
- **Progress integration:** saved body-measurement rows are surfaced in the Progress screen with latest snapshot and expandable recent history.

**Next:** Treat body measurements as follow-up hardening only: iOS MediaPipe parity when test hardware exists, validation-set accuracy work, and optional estimator improvements. Do not restart the initial implementation.

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

**Stage 0 shipped (2026-04-23):**

- KPI contract doc: `docs/admin-panel/ADVANCED_BI_STAGE0_KPI_CONTRACT.md`
- Code-side KPI catalog: `admin-panel/lib/bi-kpi-contract.ts`

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
   - `bi_finance_daily` -- shipped first as the finance foundation in `database/migrations/create_bi_finance_daily_view.sql` and `admin-panel/lib/bi-finance.ts`
   - `bi_user_lifecycle_daily` -- shipped second in `database/migrations/create_bi_user_lifecycle_daily_view.sql` and `admin-panel/lib/bi-user-lifecycle.ts`
   - `bi_coach_ops_daily` -- shipped third in `database/migrations/create_bi_coach_ops_daily_view.sql` and `admin-panel/lib/bi-coach-ops.ts`
   - `bi_client_health_daily` -- shipped fourth in `database/migrations/create_bi_client_health_daily_view.sql` and `admin-panel/lib/bi-client-health.ts`
2. Normalize finance so pack sales, refunds, wallet transactions, and fees reconcile cleanly.
   - Current shipped scope: daily gross pack sales, sales count, AOV, wallet earnings, platform fee rows, payout rows, and current payout liability snapshot
   - Still deferred: canonical refund amount and net revenue reconciliation
3. Normalize lifecycle so activation, churn, and reactivation are based on one event model.
4. Add comparison helpers for previous period, rolling 7/30/90 day windows, and cumulative trends.

**Stage 2 -- Advanced BI v2 UI**

1. Executive summary:
   - first slice shipped on the existing `/dashboard` using the canonical finance, lifecycle, coach-ops, and client-health helpers
   - revenue, active clients, active coaches, completed sessions, churn / retention, at-risk clients
   - retention cohort drilldown shipped on the same `/dashboard` using `getBIUserWorkoutCohortRetention`
   - client-health risk queue shipped on the same `/dashboard` using current snapshots from `getBIClientHealthOverview`
2. Revenue dashboard:
   - finance-by-currency detail shipped on the existing `/dashboard` using `getBIFinanceOverview`
   - gross vs net revenue, refunds, fees, package mix, coach mix, average order value, period comparison
3. Retention dashboard:
   - lifecycle activation + inactivity detail shipped on the existing `/dashboard` using `getBIUserLifecycleOverview`
   - activation funnel, cohort retention, churn / reactivation, DAU / WAU / MAU trend, inactive-user buckets
4. Coaching ops dashboard:
   - coach-ops detail shipped on the existing `/dashboard` using `getBICoachOpsOverview`
   - next: deepen coach views only if response / review load or coach-risk semantics become strong enough
5. Client health dashboard:
   - client-health trend detail shipped on the existing `/dashboard` using `getBIClientHealthOverview`
   - adherence, nutrition logging, streak / inactivity, program-ending soon, at-risk segments

**Stage 3 -- Advanced BI product features**

1. Global filters:
   - date range shipped on the existing `/dashboard` with shared `7D` / `30D` / `90D` filters and previous-period comparison across the advanced BI executive cards
   - coach and package filters shipped where truthful on the existing `/dashboard` (`coach`: finance + coach-ops, `package`: finance pack sales only)
   - acquisition channel and client-segment filters remain deferred until those source fields exist
2. Drilldowns:
   - click KPI -> table -> entity detail
3. Operational actions:
   - export CSV -- shipped on the existing `/dashboard` via `admin-panel/app/api/bi/export/route.ts` and compact header actions for finance, lifecycle, cohort, coach-ops, and client-health slices
   - saved views -- shipped on the existing `/dashboard` via `admin-panel/app/api/bi/saved-views/route.ts` and a compact per-admin dialog backed by `admin_settings`
   - scheduled in-app BI digests -- shipped via `admin-panel/app/api/bi/scheduled-digests/route.ts`, reusing saved views, `admin_settings`, and `admin_notifications`; email remains optional and deferred
   - threshold alerts for low utilization and inactive clients -- shipped in-panel on the existing `/dashboard`; churn spike / refund spike remain deferred until the underlying semantics are stronger

**Recommended build order**

1. Finance semantic layer -- first slice shipped
2. Retention semantic layer -- second slice shipped
3. Coaching ops semantic layer -- third slice shipped
4. Client health semantic layer -- fourth slice shipped
5. Executive summary + revenue dashboard
6. Retention dashboard
7. Coaching ops dashboard
8. Client health dashboard
9. Alerts / exports / saved views / scheduled in-app digests -- shipped

**Stop / ship gates**

- Gate 1: finance numbers reconcile across pack sales and wallet ledger
- Gate 2: retention / churn definitions are accepted and stable
- Gate 3: advanced tabs only ship after KPI definitions are trusted enough for exports and alerts

---

## Phase D: Advanced Mobile Features

### Part 3: Smart Notifications & Streaks

**Shipped v1 (migration-free):**

- Uses existing `workout_sessions` to derive current streak, longest streak, last workout date, and inactivity age on-device.
- Adds a compact home `StreakWidget`.
- Extends existing `user_profiles.notification_preferences` JSON with inactivity nudges, inactivity threshold days, and streak alerts.
- Schedules local Expo notifications for inactivity nudges and streak-at-risk alerts, alongside the existing local workout / weekly / booking reminders.
- No demo seed was needed because any existing or newly completed workout session drives the widget and reminder logic.

**Blocked / deferred until migration:**

- Server-side smart-notification automation and cross-device streak consistency need `notification_schedules` and `user_streaks`.
- In-app notification center entries for smart events need the `public.notifications.type` check constraint widened to allow types such as `inactivity_nudge` and `streak_alert`.
- Recommended Cursor MCP migration prompt when ready:

```text
Apply a Supabase migration to project rdozeaacwaisgkpxjycn for GoFit Smart Notifications & Streaks server v2:
1. Create public.notification_schedules with id uuid primary key default gen_random_uuid(), user_id uuid unique references auth.users(id) on delete cascade, workout_reminder_enabled boolean default true, reminder_time time default '09:00', reminder_days integer[] default '{1,2,3,4,5}', inactivity_nudge_enabled boolean default true, inactivity_threshold_days integer default 3 check between 1 and 30, streak_alerts_enabled boolean default true, last_inactivity_nudge_at timestamptz, last_streak_alert_at timestamptz, created_at timestamptz default now(), updated_at timestamptz default now(); enable RLS; users can select/insert/update/delete only their own row; authenticated gets CRUD grants.
2. Create public.user_streaks with id uuid primary key default gen_random_uuid(), user_id uuid unique references auth.users(id) on delete cascade, current_streak integer default 0 check >= 0, longest_streak integer default 0 check >= 0, last_workout_date date, streak_updated_at timestamptz default now(), created_at timestamptz default now(), updated_at timestamptz default now(); enable RLS; users can select only their own row; service_role can insert/update; authenticated gets SELECT grant.
3. Widen public.notifications type constraint to include existing values plus 'workout_reminder', 'inactivity_nudge', and 'streak_alert' without dropping existing data.
4. Add useful indexes on notification_schedules(user_id), user_streaks(user_id), user_streaks(last_workout_date), and notification_schedules(reminder_time).
5. Use the existing public.handle_updated_at trigger if available for both new tables.
```

### Part 4: AI Workout Recommendations (Groq)

**Shipped v1 (migration-free):**

- `supabase/functions/ai-workout-recommendation/index.ts` uses Groq to create one custom workout from the user's profile, recent sessions, and the current `exercises` catalog.
- The Edge Function validates that all returned exercises exist in the database before the mobile app can save the workout.
- `GoFitMobile/src/services/workoutRecommendations.ts` invokes the Edge Function.
- `GoFitMobile/src/components/home/RecommendedWorkouts.tsx` adds one compact dark/glass AI workout card on Home, only when there is no recent activity, then saves the generated plan through existing custom-workout tables and opens `Library -> WorkoutDetail`.
- No demo seed was needed because the function uses existing `exercises` rows.
- Live-use requirement: deploy the function and set `GROQ_API_KEY` in Supabase function secrets.

**Blocked / deferred until migration:**

- Cross-device cached recommendations, dismiss/regenerate state, analytics, and 24-hour invalidation need a persistent recommendation model.
- Recommended Cursor MCP migration prompt when ready:

```text
Apply a Supabase migration to project rdozeaacwaisgkpxjycn for GoFit Workout Recommendations server v2:
1. Create public.ai_recommendations with id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade, recommendations jsonb not null, context jsonb default '{}'::jsonb, dismissed_workout_ids uuid[] default '{}', generated_by text default 'groq', created_at timestamptz default now(), expires_at timestamptz default now() + interval '24 hours', invalidated_at timestamptz.
2. Enable RLS on public.ai_recommendations; users can select/update/delete only their own rows; service_role can insert/update/delete; authenticated gets SELECT/UPDATE/DELETE grants scoped by RLS.
3. Add indexes on ai_recommendations(user_id, expires_at desc), ai_recommendations(user_id, created_at desc), and a partial index for active rows where invalidated_at is null.
4. Add a trigger or documented app-side invalidation rule so completing a workout can mark the user's active recommendation rows invalidated_at = now().
```

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
