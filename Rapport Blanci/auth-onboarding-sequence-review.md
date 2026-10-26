# Authentication and onboarding sequence correction

Approved scope applied on 21 October 2026: replace the two existing authentication/onboarding figures, add a separate onboarding technical figure, and revise their adjacent use-case table, captions, and explanatory paragraphs. Application code and database state were not changed.

## Implementation evidence

| Topic | Source | Correction |
| --- | --- | --- |
| Registration and login | `GoFitMobile/src/screens/auth/SignUpScreen.tsx:97–106`; `GoFitMobile/src/store/authStore.ts:282–329`, `:361–408`; `GoFitMobile/src/services/auth.ts:33–83` | Separate operations with a session-dependent continuation. Signup schedules Login navigation; root routing also reacts to session state. No invented universal immediate-session guarantee. |
| Session persistence | `GoFitMobile/src/config/supabase.ts:25–50`; `GoFitMobile/src/utils/secureStorage.ts:39–121` | Supabase client owns persistence through the configured adapter. Mobile uses SecureStore; web uses AsyncStorage. No fixed jwt_token write or universal hardware-backed guarantee. |
| Actual form order | `GoFitMobile/src/navigation/OnboardingNavigator.tsx:46–53`; forward navigation handlers in `src/screens/onboarding/OnboardingScreen*.tsx` | Introduction, weight, height, personal details, goal, nutrition preferences. System figure uses actor and visible screen names. |
| Skip | `GoFitMobile/src/screens/onboarding/OnboardingScreen1.tsx:66–70`, `:141–145` | Introduction can mark local completion without the full form; described as an alternative. |
| Temporary answers | `GoFitMobile/src/store/onboardingStore.ts:65–89` | Store merges answers in memory and requests AsyncStorage writes; no guarantee of successful persistence after every input. |
| Profile save | `GoFitMobile/src/services/userProfile.ts:95–171`; `GoFitMobile/src/screens/onboarding/OnboardingScreenNutrition.tsx:48–87` | Validate/normalize then upsert profile. Service suppresses some errors; final screen catches propagated errors and still proceeds to local completion. Optional display-name metadata update is explained in text, omitted from diagram. |
| Local completion and routing | `GoFitMobile/src/store/onboardingStore.ts:44–63`; `GoFitMobile/App.tsx:428–439` | In-memory flag set before attempted persistence; storage errors logged. Root navigator checks session, account type and local completion. Home is not evidence that remote profile persistence succeeded. |

## Figure scope and verification

- `figures/seq_auth_ssd.png`: selected full client form journey when authentication establishes a session and local onboarding is incomplete. Registration without a session, Skip, already-completed users, and coach accounts are explained in the text.
- `figures/seq_auth_detailed.png`: successful authentication request processing, optional session persistence, and auth-store update. Service and Supabase client are grouped explicitly; client owns storage. SDK method labels identify the request operation, not literal network endpoint names. Rate limiting, subscriptions, activity tracking, and storage-failure branches are omitted from this selected view.
- `figures/seq_auth_onboarding.png`: form collection, attempted remote persistence with success/failure outcomes, local completion, draft clearing, and routing. Onboarding UI and app routing share an explicitly grouped participant. The figure shows the upsert-request path; validation failures before the request can also reach the screen's catch and local completion. Root routing is reactive to the in-memory flag; it does not wait for proof of a successful disk write.

Matching SVG files and `figures/source/build_auth_sequence_diagrams.py` are included. All three figures were rendered and visually inspected. PNG integrity, SVG parsing, image references, and unique LaTeX labels were checked. No runtime authentication test, fresh live database/configuration query, or report compilation was performed. The earlier schema snapshot remains the database comparison baseline; deployed email-confirmation settings were not inferred from source.

Approved visual follow-up: all three figures now share the workout sequences’ muted palette: pale blue software headers, dark blue header text, charcoal actors/arrows/lifelines, gray frame borders, and white background. Sequence messages and participant roles were unchanged.
