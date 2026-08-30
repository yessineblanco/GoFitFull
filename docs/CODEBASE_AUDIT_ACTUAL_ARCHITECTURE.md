# GoFit Codebase Audit: Actual Architecture And Implementation

Audit date: 2026-07-29

This document audits the codebase as implemented. It treats README files, status reports, comments, and diagrams as claims to verify against source code, migrations, tests, and config.

## Architecture Overview

GoFit is a two-surface fitness platform backed mainly by Supabase.

- Mobile app: Expo/React Native app in `GoFitMobile`, using Supabase Auth/Data/Storage/Edge Functions, Zustand stores, React Navigation, Expo Camera/Health Connect/Video, LiveKit, and TFLite/MediaPipe dependencies. Evidence: `GoFitMobile/package.json:5`, `GoFitMobile/package.json:25`, `GoFitMobile/app.json:49`.
- Admin app: Next.js 16/React 19 app in `admin-panel`, using Supabase SSR and service-role clients for admin operations, content CRUD, analytics/BI, notifications, and audit logs. Evidence: `admin-panel/package.json:5`, `admin-panel/package.json:28`.
- Backend/database: Supabase SQL schema/migrations/functions under `database`, with Edge Functions under `supabase/functions`. Evidence: `database/schema/create_user_profiles_table.sql:5`, `supabase/functions/ai-workout-recommendation/index.ts:189`.
- Automation: n8n workflow JSON definitions under `docs/automation/n8n/workflows`. Evidence: `docs/automation/n8n/workflows/ai-session-prep-v1.json:27`.
- CI/CD: no `.github` directory was found in the repository root during audit. Mobile has EAS build profiles. Admin has local npm scripts only. Evidence: `GoFitMobile/eas.json:6`, `admin-panel/package.json:6`.

Top-level modules/services:

- `.agents`, `.cursor`, `.vscode`: local agent/editor configuration and planning artifacts.
- `admin-panel`: Next.js admin dashboard.
- `database`: Supabase schema, migrations, policies, SQL functions, index scripts, and database documentation.
- `docs`: project reports, diagrams, troubleshooting notes, automation definitions, archived status docs.
- `GoFitMobile`: Expo React Native mobile application.
- `output`: generated document/render artifacts.
- `scripts`: repo-level utility scripts such as feature-doc generation.
- `Storage`: local media/storage assets.
- `supabase`: Supabase Edge Functions.
- `tmp`: temporary generation/rendering artifacts.

## Feature-By-Feature Breakdown

### Authentication And Role Routing

The mobile app signs users in and up through Supabase Auth. Evidence: `GoFitMobile/src/services/auth.ts:30`, `GoFitMobile/src/services/auth.ts:61`.

After authentication, the mobile store reads `user_profiles.user_type` to decide user mode. Evidence: `GoFitMobile/src/store/authStore.ts:341`.

The app root routes coaches to coach onboarding or coach app, clients to the client app, and unauthenticated users to auth stacks. Evidence: `GoFitMobile/App.tsx:413`, `GoFitMobile/App.tsx:419`, `GoFitMobile/App.tsx:426`.

Current state: implemented, Supabase-dependent.

### Client Mobile App

The client app uses React Navigation tab/stack navigators. Main client areas are home, workouts/plan, library, progress/nutrition, and profile. Evidence: `GoFitMobile/src/navigation/AppNavigator.tsx:2`, `GoFitMobile/src/navigation/AppNavigator.tsx:198`.

Current state: implemented UI surface.

### Coach Mobile App

The coach app uses React Navigation tab/stack navigators. Coach areas are dashboard, clients, calendar, chat, and coach profile/settings. Evidence: `GoFitMobile/src/navigation/CoachAppNavigator.tsx:2`, `GoFitMobile/src/navigation/CoachAppNavigator.tsx:96`.

Current state: implemented UI surface.

### Workouts And Exercises

The current mobile workout service reads from Supabase `exercises`, `workouts`, and `workout_exercises`. Evidence: `GoFitMobile/src/services/workouts.ts:79`, `GoFitMobile/src/services/workouts.ts:185`, `GoFitMobile/src/services/workouts.ts:263`.

Custom workouts are inserted into `workouts`, with related rows inserted into `workout_exercises`; update/delete flows also manipulate the junction rows. Evidence: `GoFitMobile/src/services/workouts.ts:356`, `GoFitMobile/src/services/workouts.ts:400`, `GoFitMobile/src/services/workouts.ts:433`, `GoFitMobile/src/services/workouts.ts:521`.

Workout sessions are inserted and updated in `workout_sessions`. Evidence: `GoFitMobile/src/services/workouts.ts:727`, `GoFitMobile/src/services/workouts.ts:803`.

Current state: implemented.

### Workout Execution And Progress

`WorkoutSessionScreen` starts sessions, saves progress, loads previous workout data, and finishes workouts. Evidence: `GoFitMobile/src/screens/library/WorkoutSessionScreen.tsx:393`, `GoFitMobile/src/screens/library/WorkoutSessionScreen.tsx:441`, `GoFitMobile/src/screens/library/WorkoutSessionScreen.tsx:468`, `GoFitMobile/src/screens/library/WorkoutSessionScreen.tsx:732`.

Workout statistics read `workout_sessions` and derive progress/PRs from completed session data. Evidence: `GoFitMobile/src/services/workoutStats.ts:156`, `GoFitMobile/src/services/workoutStats.ts:933`, `GoFitMobile/src/services/workoutStats.ts:981`.

Current state: implemented.

### Nutrition, Barcode Lookup, Saved Meals, Water

Nutrition search reads `food_items`. Evidence: `GoFitMobile/src/services/nutrition.ts:115`.

Barcode lookup first checks local `food_items`, then invokes the Supabase Edge Function `food-barcode-lookup`. Evidence: `GoFitMobile/src/services/nutrition.ts:133`, `GoFitMobile/src/services/nutrition.ts:157`.

The Edge Function checks existing foods, calls OpenFoodFacts, normalizes product nutrition, and upserts data through a service-role Supabase client. Evidence: `supabase/functions/food-barcode-lookup/index.ts:90`, `supabase/functions/food-barcode-lookup/index.ts:103`, `supabase/functions/food-barcode-lookup/index.ts:117`, `supabase/functions/food-barcode-lookup/index.ts:148`.

Saved meals, meal logs, nutrition goals, and water logs are implemented through Supabase tables. Evidence: `GoFitMobile/src/services/nutrition.ts:173`, `GoFitMobile/src/services/nutrition.ts:223`, `GoFitMobile/src/services/nutrition.ts:322`, `GoFitMobile/src/services/nutrition.ts:490`.

Current state: implemented, with external OpenFoodFacts dependency for remote barcode lookup.

### Coach Marketplace, Bookings, Packs, Wallet

The database schema includes coach profiles, certifications, reviews, availability, session packs, purchased packs, bookings, custom programs, conversations, messages, wallets, transactions, client notes, AI session notes, push tokens, and notifications. Evidence: `database/schema/create_coach_marketplace_tables.sql:11`, `database/schema/create_coach_marketplace_tables.sql:80`, `database/schema/create_coach_marketplace_tables.sql:153`, `database/schema/create_coach_marketplace_tables.sql:203`, `database/schema/create_coach_marketplace_tables.sql:244`, `database/schema/create_coach_marketplace_tables.sql:296`, `database/schema/create_coach_marketplace_tables.sql:348`, `database/schema/create_coach_marketplace_tables.sql:632`.

The mobile marketplace service uses RPCs for the public approved-coach directory and identity data. Evidence: `GoFitMobile/src/services/marketplace.ts:119`, `GoFitMobile/src/services/marketplace.ts:175`.

Bookings can deduct sessions through `deduct_session`, create notifications, and update/cancel booking state. Evidence: `GoFitMobile/src/services/bookings.ts:149`, `database/migrations/harden_privileged_rpc_callers_v1.sql:4`.

Current state: implemented.

### Chat And Media

Mobile chat loads conversations/messages through services/stores and can upload media into the Supabase Storage bucket `chat-media`, then use public URLs. Evidence: `GoFitMobile/src/screens/coach-app/ChatScreen.tsx:88`, `GoFitMobile/src/screens/coach-app/ChatScreen.tsx:222`, `GoFitMobile/src/screens/coach-app/ChatScreen.tsx:239`, `GoFitMobile/src/screens/coach-app/ChatScreen.tsx:250`.

Current state: implemented in code, but depends on the `chat-media` bucket and storage policies existing in the deployed Supabase project.

### Video Calls

The mobile video call screen uses LiveKit when the native package is available. It has a fallback path for environments where LiveKit is unavailable, such as Expo Go. Evidence: `GoFitMobile/src/screens/coach-app/VideoCallScreen.tsx:36`, `GoFitMobile/src/screens/coach-app/VideoCallScreen.tsx:101`, `GoFitMobile/src/screens/coach-app/VideoCallScreen.tsx:147`.

The `generate-video-token` Edge Function signs a JWT from `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and `LIVEKIT_URL`. Evidence: `supabase/functions/generate-video-token/index.ts:18`, `supabase/functions/generate-video-token/index.ts:29`.

Current state: partial in Expo Go; expected to work in a native/dev build with LiveKit configuration.

### Body Measurements

The mobile body measurement screen captures/analyzes front and side images, reads previous `body_measurements`, and inserts new rows. Evidence: `GoFitMobile/src/screens/profile/BodyMeasurementScreen.tsx:92`, `GoFitMobile/src/screens/profile/BodyMeasurementScreen.tsx:220`, `GoFitMobile/src/screens/profile/BodyMeasurementScreen.tsx:454`.

The Android native module exists under `modules/mediapipe-pose-landmarker/android`. The iOS bridge explicitly throws “not implemented yet” for pose and segmentation analysis. Evidence: `GoFitMobile/modules/mediapipe-pose-landmarker/ios/MediaPipePoseLandmarkerModule.swift:11`, `GoFitMobile/modules/mediapipe-pose-landmarker/ios/MediaPipePoseLandmarkerModule.swift:19`.

Current state: partial, Android-focused. iOS MediaPipe is not implemented.

### Health, Habits, Daily Readiness

The schema has `health_data`, `daily_habits`, `habit_logs`, and `daily_readiness`. Evidence: `database/migrations/create_health_data_wearables_v1.sql:3`, `database/migrations/create_daily_coach_loop_v1.sql:3`, `database/migrations/create_daily_coach_loop_v1.sql:61`, `database/migrations/create_daily_coach_loop_v1.sql:117`.

The mobile app has services/stores for habits and readiness. Evidence: `GoFitMobile/src/services/habits.ts:105`, `GoFitMobile/src/services/readiness.ts:112`, `GoFitMobile/src/stores/dailyCoachStore.ts:18`.

Current state: implemented in code; platform/device health sync still depends on runtime permissions and OS support.

### Notifications And Push

Mobile local notification scheduling is implemented through Expo Notifications. Evidence: `GoFitMobile/src/services/notifications.ts:29`, `GoFitMobile/src/services/notifications.ts:208`.

Remote push token registration writes to `push_tokens`. Evidence: `GoFitMobile/src/services/notifications.ts:313`, `GoFitMobile/src/services/notifications.ts:328`.

The `send-push-notification` Edge Function sends to Expo Push API and can use `EXPO_ACCESS_TOKEN`. Evidence: `supabase/functions/send-push-notification/index.ts:19`, `supabase/functions/send-push-notification/index.ts:46`, `supabase/functions/send-push-notification/index.ts:52`.

Current state: local notifications are implemented; remote push is implemented in code but depends on deployed function, tokens, and environment.

### Admin Access Control

The Next proxy creates a Supabase SSR client, classifies admin routes, redirects unauthenticated page requests, returns 401/403 for API requests, and checks `user_profiles.is_admin`. Evidence: `admin-panel/proxy.ts:1`, `admin-panel/proxy.ts:38`, `admin-panel/proxy.ts:41`, `admin-panel/proxy.ts:48`, `admin-panel/proxy.ts:56`, `admin-panel/proxy.ts:62`.

Current state: implemented.

### Admin Users, Coaches, Exercises, Workouts, Transactions

Admin pages and routes use a service-role client for operational queries and mutations.

- Users: `admin-panel/app/users/page.tsx:34`, `admin-panel/app/api/users/[id]/route.ts:5`, `admin-panel/app/api/users/[id]/toggle-admin/route.ts:6`.
- Coaches: `admin-panel/app/coaches/page.tsx:32`, `admin-panel/app/api/coaches/route.ts:5`, `admin-panel/app/api/coaches/[id]/certifications/route.ts:11`.
- Exercises: `admin-panel/app/exercises/page.tsx:19`, `admin-panel/app/api/exercises/route.ts:6`, `admin-panel/app/api/exercises/[id]/route.ts:6`.
- Workouts: `admin-panel/app/workouts/page.tsx:25`, `admin-panel/app/api/workouts/route.ts:23`, `admin-panel/app/api/workouts/[id]/route.ts:22`, `admin-panel/app/api/workouts/[id]/duplicate/route.ts:6`.
- Transactions: `admin-panel/app/api/transactions/route.ts:19`.

Current state: implemented.

### Admin Uploads And R2

Admin upload code uses a Cloudflare R2 S3-compatible client and requires `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, and `R2_PUBLIC_URL`. Evidence: `admin-panel/lib/r2.ts:8`, `admin-panel/lib/r2.ts:14`, `admin-panel/lib/r2.ts:37`.

Current state: implemented only when R2 environment variables are configured.

### Admin BI And Analytics

Admin BI reads materialized/semantic views and derives current snapshots from operational tables.

- User lifecycle: `admin-panel/lib/bi-user-lifecycle.ts:515`, `database/migrations/create_bi_user_lifecycle_daily_view.sql:5`.
- Finance: `admin-panel/lib/bi-finance.ts:254`, `database/migrations/create_bi_finance_daily_view.sql:5`.
- Coach ops: `admin-panel/lib/bi-coach-ops.ts:191`, `database/migrations/create_bi_coach_ops_daily_view.sql:5`.
- Client health: `admin-panel/lib/bi-client-health.ts:325`, `database/migrations/create_bi_client_health_daily_view.sql:5`.
- Dashboard analytics: `admin-panel/lib/analytics.ts:168`, `admin-panel/lib/analytics.ts:234`, `admin-panel/lib/analytics.ts:280`, `admin-panel/lib/analytics.ts:332`.

Current state: implemented, database-view dependent.

### AI Features

AI workout recommendations invoke a Supabase Edge Function from mobile. Evidence: `GoFitMobile/src/services/workoutRecommendations.ts:38`, `GoFitMobile/src/services/workoutRecommendations.ts:40`.

The Edge Function authenticates the caller, reads Supabase context, calls Groq, and returns a workout recommendation. Evidence: `supabase/functions/ai-workout-recommendation/index.ts:195`, `supabase/functions/ai-workout-recommendation/index.ts:205`, `supabase/functions/ai-workout-recommendation/index.ts:321`.

AI session notes invoke another Supabase Edge Function and also exist in an n8n automation workflow. Evidence: `GoFitMobile/src/services/aiSessionNotes.ts:15`, `supabase/functions/ai-session-notes/index.ts:18`, `supabase/functions/ai-session-notes/index.ts:135`, `docs/automation/n8n/workflows/ai-session-prep-v1.json:27`.

Current state: implemented in code if Supabase functions and `GROQ_API_KEY` are configured.

## Data Model

This data model is based on actual schema and migration files, not diagrams.

### Identity

- `user_profiles`: primary key `id` references `auth.users(id)` with profile/onboarding data. Evidence: `database/schema/create_user_profiles_table.sql:5`.

### Workouts

- Historical schema files define `exercises`, `native_workouts`, `native_workout_exercises`, `custom_workouts`, `custom_workout_exercises`, and `workout_sessions`. Evidence: `database/schema/create_workouts_tables_normalized.sql:8`, `database/schema/create_workouts_tables_normalized.sql:47`, `database/schema/create_workouts_tables_normalized.sql:78`, `database/schema/create_workouts_tables_normalized.sql:115`, `database/schema/create_workouts_tables_normalized.sql:160`, `database/schema/create_workouts_tables_normalized.sql:240`.
- Later unified migration creates/normalizes `workouts` and `workout_exercises`, and current app/admin code uses those names. Evidence: `database/migrations/unify_workouts_design.sql:21`, `database/migrations/unify_workouts_design.sql:189`, `GoFitMobile/src/services/workouts.ts:185`, `admin-panel/app/api/workouts/route.ts:41`.
- `workout_sessions` stores user session history and completed exercise payloads. Evidence: `database/schema/create_workouts_tables_normalized.sql:240`.

### Coaching Marketplace And Communication

- `coach_profiles`: coach identity/profile, unique by `user_id`. Evidence: `database/schema/create_coach_marketplace_tables.sql:11`.
- `coach_certifications`: belongs to `coach_profiles`. Evidence: `database/schema/create_coach_marketplace_tables.sql:80`.
- `coach_reviews`: belongs to coach and client user. Evidence: `database/schema/create_coach_marketplace_tables.sql:153`.
- `coach_availability`: belongs to coach. Evidence: `database/schema/create_coach_marketplace_tables.sql:203`.
- `session_packs`: sellable coach session products. Evidence: `database/schema/create_coach_marketplace_tables.sql:244`.
- `purchased_packs`: links client, pack, coach, remaining sessions. Evidence: `database/schema/create_coach_marketplace_tables.sql:296`.
- `bookings`: links coach, client, optional pack purchase, schedule/status. Evidence: `database/schema/create_coach_marketplace_tables.sql:348`.
- `custom_programs`: coach-created templates or assigned client programs. Evidence: `database/schema/create_coach_marketplace_tables.sql:420`.
- `conversations` and `messages`: coach/client chat. Evidence: `database/schema/create_coach_marketplace_tables.sql:496`, `database/schema/create_coach_marketplace_tables.sql:553`.
- `wallets` and `transactions`: coach financial ledger. Evidence: `database/schema/create_coach_marketplace_tables.sql:632`, `database/schema/create_coach_marketplace_tables.sql:670`.
- `coach_client_notes`: private coach notes for clients. Evidence: `database/schema/create_coach_marketplace_tables.sql:709`.
- `ai_session_notes`: generated pre-session summaries. Evidence: `database/schema/create_coach_marketplace_tables.sql:745`.
- `push_tokens` and `notifications`: notification storage. Evidence: `database/schema/create_coach_marketplace_tables.sql:805`, `database/schema/create_coach_marketplace_tables.sql:829`.

### Nutrition

- `food_items`: searchable food catalog. Evidence: `database/migrations/create_nutrition_tracking.sql:2`.
- `nutrition_goals`: one row per user. Evidence: `database/migrations/create_nutrition_tracking.sql:15`.
- `meal_logs`: user food logs linked to `food_items`. Evidence: `database/migrations/create_nutrition_tracking.sql:24`.
- `saved_meals` and `saved_meal_items`: reusable meal templates. Evidence: `database/migrations/create_saved_meals_v1.sql:5`, `database/migrations/create_saved_meals_v1.sql:13`.
- `water_logs`: hydration entries. Evidence: `database/migrations/extend_nutrition_water_fiber_v1.sql:10`.

### Health, Progress, Body

- `health_data`: wearable/health sync data. Evidence: `database/migrations/create_health_data_wearables_v1.sql:3`.
- `daily_habits`, `habit_logs`, `daily_readiness`: daily coach loop/readiness data. Evidence: `database/migrations/create_daily_coach_loop_v1.sql:3`, `database/migrations/create_daily_coach_loop_v1.sql:61`, `database/migrations/create_daily_coach_loop_v1.sql:117`.
- `body_measurements`: body measurement history. Evidence: `database/migrations/create_body_measurements.sql:2`.
- `progress_photos`: storage-backed progress photos. Evidence: `database/migrations/create_progress_photos_v1.sql:4`.

### Admin And BI

- `admin_settings`: key/value admin settings. Evidence: `database/migrations/create_admin_settings.sql:2`.
- `admin_notifications`: admin notification center. Evidence: `database/migrations/create_admin_notifications.sql:2`.
- `admin_audit_logs`: audit trail. Evidence: `database/migrations/create_admin_audit_logs.sql:2`.
- BI views: `bi_user_lifecycle_daily`, `bi_finance_daily`, `bi_coach_ops_daily`, `bi_client_health_daily`. Evidence: `database/migrations/create_bi_user_lifecycle_daily_view.sql:5`, `database/migrations/create_bi_finance_daily_view.sql:5`, `database/migrations/create_bi_coach_ops_daily_view.sql:5`, `database/migrations/create_bi_client_health_daily_view.sql:5`.

## Development And Deployment Flow

### Mobile

The mobile app exposes:

- `npm start`: `expo start`.
- `npm run start:dev`: `expo start --dev-client`.
- `npm run android` / `npm run ios`: Expo native run commands.
- `npm test`: Jest.
- `npm run type-check`: TypeScript no-emit check.

Evidence: `GoFitMobile/package.json:7`, `GoFitMobile/package.json:15`, `GoFitMobile/package.json:18`.

EAS build profiles exist for development, preview, production, and submit. Evidence: `GoFitMobile/eas.json:6`, `GoFitMobile/eas.json:17`, `GoFitMobile/eas.json:21`.

### Admin

The admin app exposes:

- `npm run dev`: `next dev`.
- `npm run build`: `next build`.
- `npm run lint`: `eslint`.
- `npm test`: `node --test --test-isolation=none`.

Evidence: `admin-panel/package.json:6`, `admin-panel/package.json:10`.

### Supabase

Database changes are represented as plain SQL files under `database/schema`, `database/migrations`, `database/functions`, and `database/policies`.

Supabase Edge Functions are Deno handlers under `supabase/functions`. Evidence: `supabase/functions/generate-video-token/index.ts:3`, `supabase/functions/send-push-notification/index.ts:4`.

### CI/CD

No `.github` workflow directory was found during the audit. There is no verified repository-level CI pipeline in the checked-in tree.

## Tests And What They Actually Verify

I ran the test commands available in the workspace.

- Admin: `npm test` passed 28/28 tests. Coverage areas include admin route access classification, BI API parsing/export helpers, BI aggregation helpers, KPI contract metadata, import parsers, errors, and validation. It does not verify live Supabase, browser E2E flows, RLS behavior, or deployment.
- Mobile: `npm test -- --watch=false` passed 43/43 tests across 11 suites. Coverage areas include auth store behavior with mocks, bookings/packs stores, readiness computation, AI service wrappers with mocked Edge Function calls, MediaPipe wrapper behavior, form persistence, password strength, sanitization, rate limiting, and workout-start date logic. It does not verify live Supabase, native camera/MediaPipe runtime, LiveKit, push delivery, or full navigation E2E.

Relevant test declarations:

- Admin route access tests: `admin-panel/lib/admin-access.test.mjs:5`.
- Admin BI tests: `admin-panel/lib/bi-user-lifecycle.test.mjs:69`, `admin-panel/lib/bi-finance.test.mjs:9`, `admin-panel/lib/bi-client-health.test.mjs:92`.
- Mobile auth/store tests: `GoFitMobile/src/store/__tests__/authStore.test.ts:80`, `GoFitMobile/src/store/__tests__/bookingsStore.test.ts:37`, `GoFitMobile/src/store/__tests__/packsStore.test.ts:38`.
- Mobile utility/service tests: `GoFitMobile/src/services/__tests__/aiServices.test.ts:13`, `GoFitMobile/src/services/__tests__/readiness.test.ts:28`, `GoFitMobile/modules/mediapipe-pose-landmarker/src/__tests__/MediaPipePoseLandmarkerModule.test.ts:1`.

## Discrepancies Found

### Mobile Routing Docs Were Corrected

Earlier mobile docs said the app used Expo Router. That was re-verified against the code and corrected to React Navigation stack/tab navigators. Evidence: `GoFitMobile/src/navigation/AppNavigator.tsx:2`, `GoFitMobile/src/navigation/CoachAppNavigator.tsx:2`, `GoFitMobile/App.tsx:6`.

### Native Workout Documentation Was Consolidated

Earlier database docs contradicted each other about hardcoded native workouts versus a separate `native_workouts` table. They were re-verified against the current code and consolidated around the unified `workouts` plus `workout_exercises` model.

Actual current mobile code queries `workouts` from Supabase for native workouts. Evidence: `GoFitMobile/src/services/workouts.ts:185`.

### Old Schema Names Do Not Match Current App Queries

Older schema files define `native_workouts` and `custom_workouts`. Evidence: `database/schema/create_workouts_tables_normalized.sql:47`, `database/schema/create_workouts_tables_normalized.sql:115`.

Later migrations and current app/admin code use unified `workouts` and `workout_exercises`. Evidence: `database/migrations/unify_workouts_design.sql:21`, `database/migrations/unify_workouts_design.sql:189`, `GoFitMobile/src/services/workouts.ts:185`, `admin-panel/app/api/workouts/route.ts:41`.

### Body Measurement Is Not Fully Cross-Platform

Docs discuss current/future body measurement work and leave statistical estimator work unchecked. Evidence: `docs/troubleshooting/BODY_MEASUREMENT_STATISTICAL_MODEL_PLAN.md:312`.

Actual iOS native module throws not implemented for pose and segmentation analysis. Evidence: `GoFitMobile/modules/mediapipe-pose-landmarker/ios/MediaPipePoseLandmarkerModule.swift:11`, `GoFitMobile/modules/mediapipe-pose-landmarker/ios/MediaPipePoseLandmarkerModule.swift:19`.

### Broad Status Docs Were Softened

Several status documents previously made broad "complete" or "tested and working" claims, including the admin glass redesign note and mobile TypeScript-fix note. Those claims were softened to point to current checks and manual/browser verification needs.

Actual tests are unit/helper/store tests and do not prove full app/browser/native/Supabase E2E behavior.

### Video Upload Depends On R2 Configuration

Video docs discuss using admin URL fields and conditional upload behavior. Evidence: `GoFitMobile/docs/VIDEO_INTERFACE_PLAN.md:96`.

Actual R2 upload code requires environment variables and throws if missing. Evidence: `admin-panel/lib/r2.ts:8`, `admin-panel/lib/r2.ts:17`, `admin-panel/lib/r2.ts:44`.

## Gaps And Unfinished Work

- No repository CI workflow was found. Build/test automation appears local unless configured outside this repo.
- Body measurement iOS native support is explicitly not implemented. Evidence: `GoFitMobile/modules/mediapipe-pose-landmarker/ios/MediaPipePoseLandmarkerModule.swift:11`.
- Crash reporting is a TODO, not integrated. Evidence: `GoFitMobile/src/utils/logger.ts:98`.
- Remote push notifications require deployed Edge Function, valid push tokens, and env vars; local notification scheduling is more complete than remote push delivery. Evidence: `GoFitMobile/src/services/notifications.ts:313`, `supabase/functions/send-push-notification/index.ts:46`.
- Chat media requires the `chat-media` bucket and storage policies in the deployed Supabase project. Code assumes the bucket exists. Evidence: `GoFitMobile/src/screens/coach-app/ChatScreen.tsx:239`.
- n8n workflows are checked in as JSON definitions, but no repo-level CI/deployment hook was found to apply them automatically. Evidence: `docs/automation/n8n/workflows/ai-session-prep-v1.json:27`.
- Tests do not cover live Supabase RLS, migrations applying cleanly end-to-end, mobile navigation E2E, admin browser flows, Edge Function integration, LiveKit, Expo push delivery, or native camera/body measurement flows.

## Verified Commands

Commands run during audit:

```bash
cd admin-panel
npm test
```

Result: 28 tests passed.

```bash
cd GoFitMobile
npm test -- --watch=false
```

Result: 43 tests passed across 11 suites.
