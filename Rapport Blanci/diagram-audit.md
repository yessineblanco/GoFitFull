# GoFit report diagram audit

Audit date: 20 October 2026. Scope: all 23 image-based diagrams referenced by the authoritative `Rapport Blanci/main.tex`, checked visually, against the adjacent report text, related diagrams, and the available repository source. The unused `figures/test.png` was also inspected; it contains only “Test Diagram” and is not included in the report. The TikZ block near the beginning of the source draws chapter decoration, not a system diagram. No report source or diagram was changed.

This is a static content audit, not a runtime test or verification of deployed infrastructure. Current repository code is the comparison baseline; it does not establish exactly what existed at each historical sprint boundary. If the report intentionally describes an earlier version or a proposed design, identify that version or label the proposal explicitly before replacing it with a current implementation description.

Verdicts distinguish a useful conceptual abstraction from an inaccurate implementation claim. A domain class need not correspond to a database table, and conceptual operation names need not match code. However, concrete table names, stored fields, native interfaces, security behavior, and messages in diagrams presented as technical realizations must not imply implementations absent from the source. A happy-path sequence is acceptable without every failure branch, provided its scope and preconditions are clear.

## 1. Global use case diagram

- **Location:** `main.tex:524`, `figures/global_use_case.png`.
- **Verdict:** Revise scope and actor coverage; retain the basic platform overview.
- **Finding:** The three principal human roles and system boundary are sensible. Authentication/onboarding is associated only with the athlete, although coaches also authenticate and administrators have protected access. Chat, check-ins, notifications, and adaptive workout recommendations described elsewhere are not explicit goals. “Book & Attend Video Calls” overlaps “Conduct Video Consultations.” The diagram is a high-level selection rather than a complete inventory.
- **Correction:** Label it as an overview of principal use cases or include the missing major goals. Separate booking from participation in a video session; associate client and coach with participation. Show shared authentication separately from role-specific onboarding. Prefer business-goal labels to technical capabilities. Actor boxes are usable if consistently identified as actors; arrowheads do not by themselves make the diagram invalid, but plain associations communicate participation more clearly.
- **Evidence:** Report functional requirements at `main.tex:385` onward; protected admin implementation in `admin-panel/lib/supabase/admin.ts`; mobile authentication in `GoFitMobile/src/services/auth.ts`.

## 2. Sprint 1 class diagram

- **Location:** `main.tex:622`, `figures/class_diagram_sprint1.png`.
- **Verdict:** Revise structural relationships and clarify abstraction level.
- **Finding:** The workout/exercise junction and user/session concepts are useful. However, `WorkoutSession.workoutId` has no corresponding Workout–WorkoutSession association. The implementation permits a session without a resolved workout ID, so this association must allow an optional workout reference. `WorkoutSet` is drawn as a separate persisted-looking entity although completed exercises and sets are represented inside `workout_sessions.exercises_completed`. Timer preferences are a JSON field on the user profile, not a standalone UUID-based table. `WorkoutService.flushOfflineQueue()` assigns a responsibility actually implemented by `offlineQueueService.syncAll()`. Requiring at least one set for every session excludes a newly started empty session.
- **Correction:** State whether this is a conceptual domain model or an implementation class model. For a domain model, mark set data as a value object/embedded collection and timer preferences as a value object; remove misleading storage identities. Add the optional Workout–WorkoutSession association and allow zero sets while a session is in progress. If retaining services, separate the offline queue service and show conceptual service stereotypes. Do not imply implemented RPE capture without a supporting code path.
- **Evidence:** `GoFitMobile/src/services/workouts.ts:726`, `GoFitMobile/src/screens/library/WorkoutSessionScreen.tsx:427`, `database/schema/create_workouts_tables_normalized.sql:251`, `database/migrations/add_rest_timer_preferences.sql:14`, `GoFitMobile/src/services/offlineQueue.ts:53`.

## 3. Sprint 1 refined use case diagram

- **Location:** `main.tex:639`, `figures/use_case_sprint1.png`.
- **Verdict:** Revise user-goal wording and onboarding scope.
- **Finding:** Registration, browsing, workout creation, and session execution fit the sprint. “GoTrue Auth,” audio/haptics, and the local queue describe implementation mechanisms. Offline synchronization is shown as a separately initiated user goal. “4-Step Onboarding” does not describe the complete current navigator, which registers six screens, including personal details and nutrition.
- **Correction:** Use “Register/sign in,” “Complete profile onboarding,” “Execute workout,” and “Configure/use rest timer.” Describe offline completion as conditional behavior within workout execution rather than asking the user to operate a queue. Avoid a fixed onboarding step count unless the report explains which four steps it counts. Keep Sprint 1 catalog browsing consistent with the exercise-library validation currently assigned to Sprint 2.
- **Evidence:** `GoFitMobile/src/navigation/OnboardingNavigator.tsx:46`, `GoFitMobile/src/screens/library/WorkoutSessionScreen.tsx:852`; Sprint 2 test S2-T01 at `main.tex:1233`.

## 4. Workout system sequence diagram

- **Location:** `main.tex:671`, `figures/seq_workout_ssd.png`.
- **Verdict:** Retain the black-box happy path with small content edits.
- **Finding:** Selecting a workout, logging sets, receiving timer feedback, finishing, and seeing a summary form a coherent system-level interaction. The message parameters include RPE and personal-record badges that are not established by the inspected session/summary flow. Selection and starting a persisted session are also conflated.
- **Correction:** Add an explicit start action if session creation is within scope. Limit input/output parameters to observed set data and summary fields, or provide the missing supporting implementation. State that the depicted path assumes successful session initialization; offline completion is a separate alternative.
- **Evidence:** `GoFitMobile/src/screens/library/WorkoutSessionScreen.tsx:401`, `:784`, and `GoFitMobile/src/screens/library/WorkoutSummaryScreen.tsx:39`.

## 5. Workout technical sequence diagram

- **Location:** `main.tex:678`, `figures/seq_workout_detailed.png`; explanatory paragraph at `main.tex:683`.
- **Verdict:** Redraw to reflect actual responsibility and persistence.
- **Finding:** The drawing uses conceptual `WorkoutStore.startSession/logSet/completeSession` operations as though they were the implemented orchestration. The screen actually calls the workout service and manages session/set state. It shows `status='IN_PROGRESS'` and an INSERT into `workout_sets`, whereas the inspected path uses a session row, completion timestamps, and embedded `exercises_completed`. The offline alternative is incomplete because it ends at enqueueing. The prose additionally says an INSERT occurs when saving completion, while the code updates an existing row.
- **Correction:** Show screen → workout service → create session, local set updates and the timer hook/store, then completion UPDATE. On a failed update with no connectivity, show screen → offline queue → AsyncStorage. Add a later reconnect interaction from the application listener to `syncAll()` and the completion UPDATE. Do not claim the app can initialize every workout entirely offline or that this is an OS background worker.
- **Evidence:** `GoFitMobile/src/screens/library/WorkoutSessionScreen.tsx:427`, `:784`, `:852`; `GoFitMobile/src/services/offlineQueue.ts:53`; `GoFitMobile/App.tsx:187`.

## 6. Authentication/onboarding system sequence diagram

- **Location:** `main.tex:711`, `figures/seq_auth_ssd.png`.
- **Verdict:** Retain the happy path with minor abstraction and data corrections.
- **Finding:** The actor/system boundary and registration-then-onboarding order are coherent. Returning a JWT to the human actor is unnecessarily technical. The answers listed as goals, experience, and equipment do not match the actual current onboarding data, which includes weight, height, goal, personal details, and nutrition preferences. Immediate session creation depends on the registration configuration.
- **Correction:** Return “registration accepted / onboarding displayed,” use the actual profile categories, and identify the immediate-session precondition or show an email-confirmation alternative if it applies. The user's confirmed successful Android/iOS manual tests support their tested configuration; they do not establish all possible signup configurations.
- **Evidence:** `GoFitMobile/src/services/auth.ts:71`, `GoFitMobile/src/services/userProfile.ts:95`, `GoFitMobile/src/screens/onboarding/OnboardingScreenNutrition.tsx:48`.

## 7. Authentication/onboarding technical sequence diagram

- **Location:** `main.tex:718`, `figures/seq_auth_detailed.png`; explanation at `main.tex:723`.
- **Verdict:** Redraw token persistence and onboarding responsibilities.
- **Finding:** The diagram invents a direct AuthService write of an access token under `jwt_token`. The Supabase client instead uses a custom secure-storage adapter with session persistence and automatic token refresh. Onboarding has its own store and profile service; AuthStore is not the sole owner. The local onboarding-completion state is persisted in AsyncStorage. The current profile fields are also different from the diagram's `fitness_level/equipment/goals` payload.
- **Correction:** Show the Supabase auth client persisting its session through the configured adapter, with access and refresh session data handled by that client. Represent OnboardingStore and UserProfileService for collecting/saving answers and marking completion locally. Avoid universal hardware-backed guarantees unless separately substantiated. Include the registration-session condition rather than assuming it for every deployment.
- **Evidence:** `GoFitMobile/src/config/supabase.ts:25`, `:44`; `GoFitMobile/src/store/onboardingStore.ts:40`; `GoFitMobile/src/services/userProfile.ts:126`; `GoFitMobile/src/screens/onboarding/OnboardingScreenNutrition.tsx:48`.

## 8. Sprint 2 cumulative class diagram

- **Location:** `main.tex:903`, `figures/class_diagram_sprint2.png`.
- **Verdict:** Incorrect as a cumulative diagram; revise the new domain model too.
- **Finding:** Sprint 1 classes TimerPreferences, Exercise, WorkoutExercise, WorkoutSet, AuthService, and WorkoutService disappear, as do their relationships. A reduced selection can be valid but must not be presented as a complete cumulative model without explaining omissions. The new diagram also suggests stored MeasurementPhoto records with segmentation-mask URLs and mandatory photo cardinality; these do not describe the current measurement save path. Nutrition is flattened into NutritionEntry instead of representing the implemented FoodItem–MealLog relationship and nutrition goals. Dietary preferences are stored on the profile.
- **Correction:** Preserve the preceding sprint's domain model and add the new concepts, using multiple linked views if necessary. Represent captured measurement images as transient inputs unless persistence is actually intended. Model FoodItem, MealLog, NutritionGoals, profile dietary preferences, and separately stored progress photos. Explain any derived progress-metric view. Do not equate “user reviewed” with a verified ground-truth measurement.
- **Evidence:** Compare `figures/class_diagram_sprint1.png`; `database/migrations/create_nutrition_tracking.sql:2`, `:15`, `:24`; `GoFitMobile/src/screens/profile/BodyMeasurementScreen.tsx:454`; `database/migrations/add_user_dietary_preferences_v1.sql`.

## 9. Sprint 2 refined use case diagram

- **Location:** `main.tex:920`, `figures/use_case_sprint2.png`.
- **Verdict:** Revise the actor goals and backlog coverage.
- **Finding:** “Extract 33 BlazePose Landmarks & Silhouette Mask” is internal processing, not an independently initiated human goal. Capture, estimate, and review are presented as disconnected goals instead of a measurement workflow. Adaptive recommendations and reminders in US-4.4 are absent.
- **Correction:** Use “Obtain AI-assisted measurement drafts” with capture/review behavior beneath it. Add adaptive recommendations and reminders if the diagram is intended to cover the sprint backlog; otherwise label it a selected subset. Preserve manual correction and nutrition logging as user goals. Platform limitations belong in the implementation notes, so the diagram does not imply identical native AI support on iOS and Android.
- **Evidence:** `main.tex:881`–`892`; Android-only primary native path in `GoFitMobile/src/services/bodyMeasurementService.ts`; iOS stub in `GoFitMobile/modules/mediapipe-pose-landmarker/ios/MediaPipePoseLandmarkerModule.swift:7`.

## 10. Measurement system sequence diagram

- **Location:** `main.tex:952`, `figures/seq_measurement_ssd.png`.
- **Verdict:** Retain the principal workflow with a scope clarification.
- **Finding:** Capture → draft estimates → manual review → saved result matches the user-facing intent. Height calibration is not explicit; it must already exist in the profile. “Confirmed” could be mistaken for validated measurement accuracy. Updating a progress chart is asserted without showing which measurement-history/chart behavior is meant.
- **Correction:** State valid profile height as a precondition, identify outputs as draft estimates, and describe confirmation as user acceptance/correction. Replace the final output with saved measurement/history refreshed unless a specific chart update is verified. Optionally show a retake alternative for blocked capture/quality checks.
- **Evidence:** `GoFitMobile/src/screens/profile/BodyMeasurementScreen.tsx:169`, `:415`, `:454`.

## 11. Measurement technical sequence diagram

- **Location:** `main.tex:959`, `figures/seq_measurement_detailed.png`; explanation at `main.tex:964`.
- **Verdict:** Redraw; multiple concrete implementation claims are wrong.
- **Finding:** The local Android bridge is Kotlin and accepts image URIs through `analyzePoseFromImage` and `analyzeSegmentationFromImage`, not a two-buffer `processFrame` call to a C++ module. There is no implemented MeasurementStore matching the depicted orchestration. The drawing shows compulsory encrypted photo uploads and `is_verified=true`; the inspected save handler uploads no photos and inserts corrected centimeter values, confidence, source, and manual-override/debug metadata. This also conflicts with the report's privacy narrative.
- **Correction:** Show the screen coordinating the measurement and segmentation services, per-image native inference on Android, typed results, estimator/quality checks, editable local review, and the actual body_measurements insert. Remove compulsory Storage upload, application-level photo encryption, and the invented verification field. Identify the Android MediaPipe path and the fallback/platform limitation. Render the human as an actor rather than an undeclared plain component participant.
- **Evidence:** `GoFitMobile/modules/mediapipe-pose-landmarker/android/src/main/java/expo/modules/mediapipeposelandmarker/MediaPipePoseLandmarkerModule.kt:36`, `:56`; `GoFitMobile/src/screens/profile/BodyMeasurementScreen.tsx:327`, `:454`; iOS bridge stub cited above.

## 12. Nutrition system sequence diagram

- **Location:** `main.tex:992`, `figures/seq_nutrition_ssd.png`.
- **Verdict:** Keep the scan/log/totals pattern; remove the unsupported safety outcome.
- **Finding:** Barcode lookup, selecting a serving quantity, and updating daily totals are coherent. However, the response explicitly promises allergen warnings. The inspected barcode path does not perform an ingredient-conflict check or return the diagram's warning result. Existing food search exclusions operate on food names and are a different path.
- **Correction:** Show product/nutrient details, user confirmation, and refreshed totals. Show a product-not-found alternative if desired. Do not imply verified ingredient-allergen protection from a name-exclusion feature.
- **Evidence:** `GoFitMobile/src/screens/nutrition/AddFoodScreen.tsx:129`; `GoFitMobile/src/services/nutrition.ts:114`, `:165`.

## 13. Nutrition technical sequence diagram

- **Location:** `main.tex:999`, `figures/seq_nutrition_detailed.png`; explanation at `main.tex:1004`.
- **Verdict:** Redraw lookup, filtering, and persistence.
- **Finding:** NutritionStore exists, but barcode lookup is initiated through NutritionService. The service first queries the food catalog and invokes `food-barcode-lookup` on a miss; that server function calls Open Food Facts. The diagram bypasses this server function, introduces an unsubstantiated DietaryPreferencesStore ingredient check, and writes to `nutrition_entries`, whereas meal logging writes to `meal_logs` linked to `food_items`.
- **Correction:** Show AddFoodScreen → NutritionService → local catalog, then the Edge Function → Open Food Facts fallback. Keep name-based search exclusions as a separate search interaction. Show NutritionStore.addLog → NutritionService.addMealLog → meal_logs, followed by refreshed totals. Do not depict a warning banner or ingredient analysis that the barcode implementation lacks.
- **Evidence:** `GoFitMobile/src/services/nutrition.ts:141`, `:165`, `:518`; `supabase/functions/food-barcode-lookup/index.ts:102`, `:118`; `GoFitMobile/src/stores/nutritionStore.ts:116`.

## 14. Sprint 3 cumulative class diagram

- **Location:** `main.tex:1309`, `figures/class_diagram_sprint3.png`; claimed class list at `main.tex:1304`.
- **Verdict:** Incorrect as cumulative and incomplete for its stated scope.
- **Finding:** Most earlier classes disappear. WorkoutSession and BodyMeasurement remain as disconnected boxes. PurchasedPack, Conversation, programs/check-ins, and transactions are missing despite the surrounding description/backlog. SessionPack is linked directly to Booking, omitting a client's purchase and remaining-session balance. The implementation links a booking optionally to PurchasedPack via `pack_purchase_id`. An obligatory ConsultationRoom for every booking is not supported by the optional booking room ID and on-demand token generation. Persisted-looking clientToken/coachToken attributes misrepresent transient access tokens. ChatMessage also omits its Conversation association.
- **Correction:** Preserve the earlier domain graph. Add SessionPack → PurchasedPack → Booking, with an optional purchase per booking. Show Conversation → Message, and relevant program/check-in/transaction concepts consistent with the stated scope. Model video-room identity as optional booking data or a clearly conceptual runtime object; keep expiring tokens in the token service interaction. Use status values consistent with approved/pending/rejected and distinguish coach-profile approval from certification verification.
- **Evidence:** `database/schema/create_coach_marketplace_tables.sql:296`, `:348`, `:496`, `:553`; `GoFitMobile/src/services/bookings.ts:70`; `GoFitMobile/src/services/videoCall.ts:8`, `:23`; `supabase/functions/generate-video-token/index.ts:31`.

## 15. Sprint 3 refined use case diagram

- **Location:** `main.tex:1326`, `figures/use_case_sprint3.png`.
- **Verdict:** Revise combined goals and role permissions.
- **Finding:** “Reserve Calendar Slot & Join Video Call” combines distinct activities. “Conduct Video Consultation & AI Notes” associates the athlete with a combined goal that includes coach-only briefing content. Coach onboarding/accreditation submission, availability, chat, and check-ins are not explicit despite their importance to the sprint. Administrative catalog management and analytics are also merged.
- **Correction:** Separate reserve session, join consultation, and request/read AI briefing. Associate client and coach with the consultation, and coach with the private briefing. Add the major omitted goals or label the drawing a selected overview. Keep the distinction between pre-session briefing and post-session summary; the current AI workflow should not be described as a transcript-based summary without evidence.
- **Evidence:** `main.tex:1287`–`1298`; `GoFitMobile/src/services/aiSessionNotes.ts`; `docs/automation/n8n/README.md:41`; `database/migrations/gofit_coach_ai_templates_and_ai_session_notes_v1.sql`.

## 16. Booking/payment system sequence diagram

- **Location:** `main.tex:1358`, `figures/seq_booking_ssd.png`.
- **Verdict:** Revise to distinguish purchase and booking alternatives.
- **Finding:** The pack-purchase-first story is plausible, but it is not the only implemented route. BookSessionScreen separately takes a direct payment and then creates a booking; it does not require redemption of the purchased pack in the diagram. CoachDetailScreen purchases a pack without the depicted automatic transition to a scheduler. A human-level SSD also does not need a Stripe clientSecret or client-supplied price parameter.
- **Correction:** Depict pack purchase and direct paid booking as separate system interactions, or state clearly that a sequence describes the pack-redemption path. Use confirmed payment/purchase and booking outcomes without exposing payment SDK internals to the human actor. Do not imply that the present UI automatically chains the two flows.
- **Evidence:** `GoFitMobile/src/screens/marketplace/CoachDetailScreen.tsx:57`, `:100`; `GoFitMobile/src/screens/marketplace/BookSessionScreen.tsx:78`; `GoFitMobile/src/services/bookings.ts:130`.

## 17. Booking/payment technical sequence diagram

- **Location:** `main.tex:1365`, `figures/seq_booking_detailed.png`; explanation at `main.tex:1370`.
- **Verdict:** Replace the incorrect realization; distinguish any proposed hardened design.
- **Finding:** The drawing sends packId/userId to stripe-payment and assumes a connected coach account. The available function accepts amount/currency/metadata and creates a PaymentIntent without that transfer/account routing. It does not receive a payment-success webhook, insert a purchased pack, or return a later webhook result to the original store request. No stripe-webhook function exists in the supplied functions. CoachDetailScreen instead inserts the purchase through SessionPacksService after PaymentSheet returns success. The technical drawing never actually reserves a slot despite its booking caption. The surrounding prose additionally claims atomic booking creation and pack crediting that this source does not implement.
- **Correction:** Show the actual screen → stripe-payment → Stripe intent → screen PaymentSheet → SessionPacksService → purchased_packs path, and a separate booking path where applicable. Mark server-side price validation, verified/idempotent webhook fulfillment, and atomic updates as proposed improvements if they are intended future work. A webhook, if later implemented, must be shown as an independent asynchronous request rather than a delayed response to the intent-creation request.
- **Evidence:** `supabase/functions/stripe-payment/index.ts:17`, `:40`; `GoFitMobile/src/screens/marketplace/CoachDetailScreen.tsx:63`, `:100`; `GoFitMobile/src/services/sessionPacks.ts:152`; `GoFitMobile/src/screens/marketplace/BookSessionScreen.tsx:123`.

## 18. Coach-approval system sequence diagram

- **Location:** `main.tex:1398`, `figures/seq_admin_audit_ssd.png`.
- **Verdict:** Correct the result state and remove unsupported side effects.
- **Finding:** Reviewing and approving a coach is a valid system goal. The outcome uses profile status VERIFIED, but coach profiles use approved/pending/rejected, with a separate is_verified boolean. Individual certifications have their own verified status. A welcome email is asserted without a corresponding approval email implementation in the inspected path.
- **Correction:** Return coach profile approved, with its verification flag updated, and refreshed administrative details. Depict email or notification delivery only if its actual implementation is identified. Keep certification verification distinct from profile approval.
- **Evidence:** `admin-panel/app/api/coaches/route.ts:19`, `:29`; `database/schema/create_coach_marketplace_tables.sql:23`, `:87`.

## 19. Coach-approval technical sequence diagram

- **Location:** `main.tex:1405`, `figures/seq_admin_audit_detailed.png`; explanation at `main.tex:1410`.
- **Verdict:** Redraw the handler and remove unsubstantiated audit/notification guarantees.
- **Finding:** CoachActions performs PATCH /api/coaches rather than the depicted server action. The handler verifies admin access and updates status/is_verified; it does not set accreditation_status=VERIFIED. There is no audit insertion in this handler. A general audit utility elsewhere does not prove it runs for coach approval. The diagram's audit fields/action and revalidatePath call therefore cannot be treated as the implemented sequence. The prose also asserts signed-document review, immutable logging, and a coach notification without demonstrating those operations in this approval path.
- **Correction:** Show CoachActions → PATCH route → admin verification → privileged update → JSON response → UI refresh. If reviewing credentials belongs in this sequence, separately trace the actual document retrieval route. Remove automatic audit/email/notification claims unless a corresponding hook or deployed implementation is supplied. Generic audit capability may be documented separately with its real callers.
- **Evidence:** `admin-panel/components/coaches/CoachActions.tsx:40`; `admin-panel/app/api/coaches/route.ts:5`, `:29`; `admin-panel/lib/audit.ts:39`; `database/functions/coach_marketplace_functions.sql:86` shows a different approval side effect, wallet creation.

## 20. Physical architecture diagram

- **Location:** `main.tex:1762`, `figures/arch_physical.png`; description at `main.tex:1767`–`1782`.
- **Verdict:** Revise runtime boundaries, service routes, and unverified infrastructure labels.
- **Finding:** Mobile/admin/backend/external services are a useful outline. However, the drawing labels React Native 0.76 and Next.js 14 while current manifests specify React Native 0.81.5 and Next.js 16.1.3. It shows SQLite as application storage without a corresponding application-owned SQLite path in the inspected code. It labels AWS eu-central-1 while the text says eu-west-1. Exact PostgreSQL version, TLS version, hosting topology, and provider internals are not established by these files. The admin server is omitted although privileged work is performed server-side. The REST/realtime layer is not distinguished from a direct database connection. n8n points to Edge Functions, while v1 workflows use direct backend REST calls and AI Session Prep calls Groq directly. R2 media delivery and Open Food Facts are absent.
- **Correction:** Show browser → Next.js server/API → managed backend; mobile → authenticated backend APIs/realtime/storage; media delivery → R2; barcode Edge Function → Open Food Facts; and n8n → backend REST/Groq. Label storage by the actual AsyncStorage/SecureStore abstractions, with local inference on the mobile device. Remove region/version/replication/protocol specificity until supported by the report's target deployment snapshot. Describe LiveKit as an SFU service rather than a peer-to-peer media mesh. Avoid presenting an intended hosting arrangement as already deployed.
- **Evidence:** `GoFitMobile/package.json`, `admin-panel/package.json`, `admin-panel/lib/r2.ts:2`, `admin-panel/app/api/coaches/route.ts`, `docs/automation/n8n/README.md`, `supabase/functions/food-barcode-lookup/index.ts`.

## 21. Logical architecture diagram

- **Location:** `main.tex:1825`, `figures/arch_logical.png`.
- **Verdict:** Retain the layered concept, revise execution and trust boundaries.
- **Finding:** Presentation, state, domain logic, and persistence form a useful conceptual view. However, one shared state tier for web server components and mobile state obscures where code executes. TanStack React Table is table UI/state tooling, not a general server cache. React Hook Form/Zod handle forms and validation. The token broker appears among undifferentiated services, concealing the backend-only secret boundary. The native measurement module is not visibly on-device. Next.js 14 is inconsistent with the supplied manifest. Groq personalization is listed only as a generic external API, despite being a major product service.
- **Correction:** Mark mobile, admin browser, admin server, Edge Functions, and n8n execution boundaries. Keep form validation/table state in the appropriate UI modules. Identify backend token/payment/AI handlers and on-device CV services separately. Retain the logical layers without implying every request must pass through a Zustand store or that all server/client paths share the same cache.
- **Evidence:** `GoFitMobile/src/services/videoCall.ts:8`; `supabase/functions/generate-video-token/index.ts:17`; `supabase/functions/ai-workout-recommendation/index.ts`; `admin-panel/app/api/coaches/route.ts`; `admin-panel/package.json`.

## 22. n8n automation architecture diagram

- **Location:** `main.tex:2048`, `figures/n8n_automation.png`.
- **Verdict:** Replace; the diagram does not describe the supplied workflows.
- **Finding:** The drawing shows a daily 08:00 UTC trigger with a weekly branch, inactive-user reminders, weekly RPC aggregation, a Groq coach digest, template nodes, and Expo Push/Resend delivery. Actual exports contain five separate schedule-trigger-plus-Code-node workflows. Intervals are 60 minutes (AI prep), 15 minutes (booking reminders), 240 minutes (check-in reminders), and 1440 minutes for both digests. Fixed wall-clock execution times are not specified by these intervals. AI Session Prep calls Groq; Coach Daily Digest uses rule-based signal aggregation. The README explicitly excludes push notification delivery. Database notification insertion is the documented output.
- **Correction:** Show all five workflows, their intervals, direct backend REST access, the AI-prep Groq call, persisted briefing/notification outputs, and duplicate guards. Remove weekly aggregation, fixed 08:00 scheduling, Resend, and push delivery unless separate implementation evidence is supplied. Workflow definitions establish implementation artifacts, not activation or successful execution in a deployed n8n instance.
- **Evidence:** `docs/automation/n8n/workflows/*.json`; `docs/automation/n8n/README.md:41`, `:82`, `:181`.

## 23. Deployment diagram

- **Location:** `main.tex:2113`, `figures/deployment_diagram.png`.
- **Verdict:** Revise as an actual deployment view or relabel as a proposed topology.
- **Finding:** Device/browser, managed backend, Stripe, and LiveKit are recognizable nodes. The admin artifact is shown only inside the browser even though Next.js server/API execution is required. SQLite and Next.js 14 repeat the unsupported/outdated labels. Groq, n8n, R2, and Open Food Facts dependencies are omitted without stating that this is a restricted deployment view. The token-generation direction can be misleading: the backend signs a LiveKit token locally with server credentials; this does not require a remote LiveKit token-minting request. The diagram does not distinguish configuration from verified hosting.
- **Correction:** Show the admin hosting/server execution environment and its browser client, a mobile artifact/runtime, managed backend capabilities, n8n host if actually deployed, and the external dependencies needed by the chosen scope. Show token request/response between mobile and backend separately from mobile media/signaling to LiveKit. Use confirmed versions/hosts only; otherwise label the figure as the intended deployment architecture. A conceptual deployment view need not expose provider-private containers or ports.
- **Evidence:** `admin-panel/app/api/coaches/route.ts`, `admin-panel/package.json`, `admin-panel/lib/r2.ts`; `supabase/functions/generate-video-token/index.ts`; `docs/automation/n8n/README.md`; `GoFitMobile/src/services/videoCall.ts`.

## Additional diagram-related report gaps

The report has three sections titled Sprint Burn Down Chart (`main.tex:836`, `:1242`, `:1679`) but no actual chart or data is included there. Each section currently asserts that a chart represents velocity and story-point consumption. Supply authentic dated sprint data before adding a chart; otherwise remove or qualify the assertion. Do not fabricate a burndown series.

Use-case identifiers also differ between the global and sprint views (UC-01 versus UC-1.1, etc.) without an explicit mapping to the US identifiers in the backlog. Different identifiers are not inherently wrong, but a short traceability mapping would prevent ambiguity. This does not require treating every sequence message or technical subtask as a separate use case.

## Recommended correction order

Follow-up verification, 21 October 2026: the Sprint 1 review in `sprint1-class-model-review.md` refines two initial findings. The SQL profile timer-preference column does not establish active profile synchronization: the current settings UI persists through the local timer store. Also, session exercise snapshots should be represented before considering any conceptual per-set projection. Ownership references target authentication accounts, not necessarily existing user-profile rows. Use that source-checked proposal when revising the Sprint 1 model.

1. Restore a coherent cumulative domain model across the three class diagrams, distinguishing conceptual objects from stored entities.
2. Correct the measurement, payment, nutrition, and coach-approval technical sequences against the implementation.
3. Replace the n8n diagram and align logical/physical/deployment boundaries.
4. Refine use-case diagrams and retain the useful system-level sequences with the specific edits above.
5. Update only the explanatory paragraphs and captions affected by approved diagram corrections, then resume Step 1 of the original report revision.

Questions for a later correction pass: identify the report's target code snapshot if it intentionally differs from this workspace; provide any separately deployed webhook, email/push, or coach-audit implementation that is absent here; provide actual hosting configuration only if exact deployment details are to be retained. These unknowns do not prevent correcting the contradictions visible within the supplied report itself.
