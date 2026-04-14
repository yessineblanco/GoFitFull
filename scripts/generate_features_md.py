# -*- coding: utf-8 -*-
"""Generate FEATURES.md from repository file scan."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATE = "April 14, 2026"


def rel(p: Path) -> str:
    return str(p.relative_to(ROOT)).replace("\\", "/")


def collect(root: Path, pattern: str = "**/*") -> list[str]:
    if not root.exists():
        return []
    files: list[Path] = []
    for p in sorted(root.rglob(pattern)):
        if p.is_file():
            files.append(p)
    return [rel(f) for f in files]


def block(
    name: str,
    platform: str,
    screen: str,
    components: str,
    service: str,
    store: str,
    tables: str,
    api: str,
    libs: str,
    desc: str,
    flow: str,
) -> str:
    return f"""#### {name}
| Field | Detail |
|-------|--------|
| Platform | {platform} |
| Screen / Route | {screen} |
| Components | {components} |
| Service | {service} |
| Store | {store} |
| Supabase Tables | {tables} |
| API Routes | {api} |
| Libraries | {libs} |

**Description:** {desc}

**Technical flow:** {flow}

"""


def count_platform_feature_blocks(lines: list[str]) -> tuple[int, int, int, int, int]:
    """
    Count feature rows: a #### heading whose next non-blank line is the standard | Field | Detail | table.
    Scoped to major ### sections; stops before Tech Stack per Feature Category (excludes file index).
    Headings are matched by ASCII substrings so emoji in ### titles still match.
    """
    def find_section(needle: str, start: int = 0) -> int:
        for i in range(start, len(lines)):
            L = lines[i]
            if L.startswith("### ") and needle in L:
                return i
        return -1

    def count_blocks_in_range(a: int, b: int) -> int:
        if a < 0 or b < 0 or a >= b:
            return 0
        n = 0
        sub = lines[a:b]
        j = 0
        while j < len(sub):
            if sub[j].startswith("#### "):
                k = j + 1
                while k < len(sub) and sub[k].strip() == "":
                    k += 1
                if k < len(sub) and "| Field | Detail |" in sub[k]:
                    n += 1
            j += 1
        return n

    i_client = find_section("Mobile \u2014 Client App")
    i_coach = find_section("Mobile \u2014 Coach App")
    i_admin = find_section("Admin Panel")
    i_backend = find_section("Backend & Infrastructure")
    i_tech = find_section("Tech Stack per Feature Category")

    if i_client < 0 or i_coach < 0 or i_admin < 0 or i_backend < 0 or i_tech < 0:
        return 0, 0, 0, 0, 0

    c_client = count_blocks_in_range(i_client, i_coach)
    c_coach = count_blocks_in_range(i_coach, i_admin)
    c_admin = count_blocks_in_range(i_admin, i_backend)
    c_backend = count_blocks_in_range(i_backend, i_tech)
    total = c_client + c_coach + c_admin + c_backend
    return c_client, c_coach, c_admin, c_backend, total


TABLE_MARKER = "__FEATURE_COUNT_TABLE__"


def main() -> None:
    mobile_screens = collect(ROOT / "GoFitMobile" / "src" / "screens", "**/*.tsx")
    mobile_components = [
        rel(p)
        for p in sorted((ROOT / "GoFitMobile" / "src" / "components").rglob("*"))
        if p.is_file() and p.suffix in (".tsx", ".ts") and not p.name.endswith(".d.ts")
    ]
    mobile_services = collect(ROOT / "GoFitMobile" / "src" / "services", "**/*.ts")
    mobile_stores = collect(ROOT / "GoFitMobile" / "src" / "store", "**/*.ts")
    mobile_nav = collect(ROOT / "GoFitMobile" / "src" / "navigation", "**/*.tsx")
    mobile_hooks = collect(ROOT / "GoFitMobile" / "src" / "hooks", "**/*.ts")
    mobile_utils = collect(ROOT / "GoFitMobile" / "src" / "utils", "**/*.ts")
    admin_app = [
        rel(p)
        for p in sorted((ROOT / "admin-panel" / "app").rglob("*"))
        if p.is_file() and p.suffix in (".tsx", ".ts")
    ]
    admin_components = [
        rel(p)
        for p in sorted((ROOT / "admin-panel" / "components").rglob("*"))
        if p.is_file() and p.suffix in (".tsx", ".ts")
    ]
    admin_lib = collect(ROOT / "admin-panel" / "lib", "**/*.ts")
    edge = [
        "supabase/functions/_shared/cors.ts",
        "supabase/functions/send-push-notification/index.ts",
        "supabase/functions/generate-video-token/index.ts",
        "supabase/functions/body-measurements/index.ts",
    ]
    migrations = collect(ROOT / "database" / "migrations", "*.sql")
    schema = collect(ROOT / "database" / "schema", "*.sql")
    dbfuncs = collect(ROOT / "database" / "functions", "*.sql")

    lines: list[str] = []
    add = lines.append

    add("# GoFit — Complete Feature Documentation")
    add("")
    add(f"Generated: **{DATE}** (repository scan).")
    add("")
    add(
        "This document inventories implemented UI surfaces, data services, admin routes, "
        "Supabase Edge Functions, SQL artifacts, and supporting modules discovered under the paths "
        "requested in the product specification."
    )
    add("")
    add(TABLE_MARKER)
    add("")
    add(
        "> **How counts were computed:** The summary table lists **exact** counts of feature blocks "
        "(each `####` heading immediately followed by the standard `| Field | Detail |` table) under the "
        "sections **Mobile — Client App**, **Mobile — Coach App**, **Admin Panel**, and "
        "**Backend & Infrastructure**. Everything from **Tech Stack per Feature Category** onward "
        "(including the file index) is excluded. Re-run `python scripts/generate_features_md.py` to refresh."
    )
    add("")

    add("### 📱 Mobile — Client App")
    add("")
    lines.append(
        block(
            "Application shell, splash, fonts, and global providers",
            "Mobile (Client / Coach)",
            "GoFitMobile/App.tsx",
            "`SplashScreen`, `ErrorBoundary`, `NotificationBanner`, `CustomDialog` under `GoFitMobile/src/components/shared/`",
            "`notifications.ts` (push registration)",
            "`authStore`, `onboardingStore`, `coachStore`, `themeStore`, `workoutsStore`, `profileStore`, `deepLinkStore`",
            "`push_tokens` (registration); Supabase Auth session",
            "N/A",
            "Expo (fonts, splash, notifications), React Navigation, Safe Area",
            "Bootstraps the native app, restores session, routes client vs coach experiences, handles deep links and foreground notifications.",
            "Fonts and splash gate rendering; `initialize` loads auth; stack switches among Auth, Onboarding, App, and Coach trees; authenticated clients preload workouts and profile in the background.",
        )
    )
    add(
        "i18n keys in `GoFitMobile/src/i18n/locales/en.json` (mirrored in `fr.json`) function as the "
        "UX contract: `common`, `profile`, `account`, `notifications`, `goals`, `units`, `textSize`, "
        "`weightHeight`, `auth`, `onboarding`, `welcome`, `profileFields`, `theme`, `library` (including "
        "`workoutSession`, `restTimer`, `workoutSummary`, `daySelection`), `home`, `plan`, "
        "`coachOnboarding`, `coachAuth`, `marketplace`, `coachApp`, `sessionPacks`, `programs`, "
        "`booking`, `chat`, `clientManagement`, `coachDashboard`, `videoCall`, `review`."
    )
    add("")

    add("#### 🔐 Authentication & Security")
    for s in sorted(x for x in mobile_screens if "src/screens/auth/" in x):
        bn = Path(s).stem
        lines.append(
            block(
                bn,
                "Mobile (Client)",
                s,
                "`GoFitMobile/src/components/auth/*`; `GoFitMobile/src/components/shared/*`",
                "`GoFitMobile/src/services/auth.ts`",
                "`GoFitMobile/src/store/authStore.ts`",
                "Supabase Auth; `user_profiles`",
                "N/A",
                "Supabase JS; expo-secure-store (via persisted stores)",
                "Client credential flows, OTP reset, and password success UX.",
                "User input validated locally → `authService` calls Supabase Auth → `authStore` mirrors session → `App.tsx` swaps navigators.",
            )
        )

    add("#### 🚀 Onboarding")
    for s in sorted(x for x in mobile_screens if "src/screens/onboarding/" in x):
        bn = Path(s).stem
        lines.append(
            block(
                bn,
                "Mobile (Client)",
                s,
                "`GoFitMobile/src/components/onboarding/*`; `GoFitMobile/src/components/shared/*`",
                "`GoFitMobile/src/services/userProfile.ts`",
                "`GoFitMobile/src/store/onboardingStore.ts`; `GoFitMobile/src/store/profileStore.ts`",
                "`user_profiles`",
                "N/A",
                "zod (inside service); React Navigation",
                "Collects anthropometrics, goals, and personal details after signup.",
                "Each step persists partial profile data; completion flag stored per user id in `onboardingStore`.",
            )
        )

    add("#### 🏠 Home & Dashboard")
    lines.append(
        block(
            "Home dashboard",
            "Mobile (Client)",
            "GoFitMobile/src/screens/home/HomeScreen.tsx",
            "`GoFitMobile/src/components/home/*`; `GoFitMobile/src/components/shared/ScreenHeader.tsx`; `GoFitMobile/src/components/shared/TimerModal.tsx`",
            "`GoFitMobile/src/services/workouts.ts`; `workoutStats.ts`; `bodyMeasurements.ts`; `calendar.ts`",
            "`workoutsStore`; `profileStore`; `calendarStore`; `timerStore`",
            "`workout_sessions`, `workouts`, `user_profiles`",
            "N/A",
            "date-fns; lucide-react-native; expo-blur; expo-image",
            "Central hub for workouts, marketplace shortcuts, weather, streaks, and articles.",
            "Focused hooks pull store data; CTA navigates into nested stacks for sessions, builder, or marketplace.",
        )
    )

    add("#### 🏋️ Workout Library")
    for s in sorted(x for x in mobile_screens if "src/screens/library/" in x):
        bn = Path(s).stem
        lines.append(
            block(
                bn,
                "Mobile (Client)",
                s,
                "`GoFitMobile/src/components/shared/*`; `GoFitMobile/src/components/workout/*`",
                "`workouts.ts`; `exercises.ts`; `workoutSessions.ts`; `workoutDetails.ts`",
                "`workoutsStore`; `timerStore`",
                "`workouts`, `workout_exercises`, `exercises`, `workout_sessions`, `native_workouts` (per deployment)",
                "N/A",
                "expo-av (exercise media); i18next",
                "Browse templates, customize sessions, and preview exercise metadata.",
                "Library stack screens call workout and exercise services → Zustand caches results → list and detail UI render with filters and selection state.",
            )
        )

    add("#### 🔨 Workout Builder")
    add(
        "Implemented primarily by `ExerciseSelectionScreen.tsx` and `WorkoutBuilderScreen.tsx` "
        "(see Workout Library entries). Users pick exercises, configure sets, reps, and rest, then save "
        "custom workouts owned by their profile."
    )
    add("")

    add("#### 💪 Active Workout Session")
    add(
        "`WorkoutSessionScreen.tsx` orchestrates set logging, pause and resume, and rest intervals using "
        "`GoFitMobile/src/components/workout/EnhancedRestTimer.tsx`, `RestTimerSettings.tsx`, and "
        "`GoFitMobile/src/hooks/useRestTimer.ts`. `WorkoutSummaryScreen.tsx` surfaces aggregates after completion. "
        "Data persists through `workoutSessions` and `workouts` services into `workout_sessions`."
    )
    add("")

    add("#### 📊 Progress & Statistics")
    for s in sorted(x for x in mobile_screens if "src/screens/progress/" in x):
        bn = Path(s).stem
        lines.append(
            block(
                bn,
                "Mobile (Client)",
                s,
                "`GoFitMobile/src/components/shared/*`",
                "`workoutStats.ts`; `bodyMeasurements.ts`",
                "`profileStore`",
                "`workout_sessions`; `body_measurements`",
                "Edge `body-measurements` for pose-derived measurements (optional path)",
                "Supabase JS; in-screen charts",
                "Historical stats, PR detail, consistency heatmaps, manual measurements.",
                "Services aggregate session rows or call measurement Edge function → UI charts update.",
            )
        )

    add("#### 🗓️ Workout Plans & Calendar")
    for s in sorted(x for x in mobile_screens if "src/screens/plan/" in x):
        bn = Path(s).stem
        lines.append(
            block(
                bn,
                "Mobile (Client)",
                s,
                "`GoFitMobile/src/components/plan/*`",
                "`workoutPlans.ts`; `workouts.ts`",
                "`workoutPlansStore`; `calendarStore`; `sessionsStore`",
                "`workout_plans`; `workout_sessions`",
                "N/A",
                "date-fns; expo-haptics in calendar UI",
                "Plan workouts on the calendar, adjust times, open gym bag modal.",
                "`WorkoutsScreen` composes `Timeline`, `MyWorkouts`, and `CalendarView` to mutate `workout_plans` rows.",
            )
        )

    add("#### 🛒 Coach Marketplace")
    for s in sorted(x for x in mobile_screens if "src/screens/marketplace/" in x):
        bn = Path(s).stem
        lines.append(
            block(
                bn,
                "Mobile (Client)",
                s,
                "`GoFitMobile/src/components/shared/*`",
                "`marketplace.ts`; `bookings.ts`",
                "`marketplaceStore`",
                "`coach_profiles`, `coach_certifications`, `coach_reviews`, `user_profiles`, `session_packs`",
                "N/A",
                "Supabase JS",
                "Discover coaches, inspect profiles, initiate bookings.",
                "Marketplace service composes joins for certifications and reviews; navigation passes ids into booking screens.",
            )
        )

    add("#### 📅 Bookings")
    add(
        "Client booking surfaces: `GoFitMobile/src/screens/marketplace/BookSessionScreen.tsx` and "
        "`GoFitMobile/src/screens/profile/MyBookingsScreen.tsx` (see their rows under Marketplace and Profile)."
    )
    add("")

    add("#### 💬 Real-time Chat")
    for s in (
        "GoFitMobile/src/screens/coach-app/ConversationsListScreen.tsx",
        "GoFitMobile/src/screens/coach-app/ChatScreen.tsx",
    ):
        bn = Path(s).stem + " (client stacks)"
        lines.append(
            block(
                bn,
                "Mobile (Client)",
                s,
                "`GoFitMobile/src/components/shared/*`",
                "`chat.ts`",
                "`chatStore`",
                "`conversations`, `messages`, `coach_profiles`",
                "N/A",
                "Supabase Realtime; expo-image-picker",
                "DM threads between clients and coaches.",
                "Initial fetch plus channel subscription updates Zustand → inverted list renders attachments.",
            )
        )

    add("#### 📹 Video Calls")
    lines.append(
        block(
            "VideoCallScreen (client stacks)",
            "Mobile (Client)",
            "GoFitMobile/src/screens/coach-app/VideoCallScreen.tsx (registered in `AppNavigator` Home and Profile stacks)",
            "Shared UI primitives",
            "`videoCall.ts`",
            "N/A",
            "`bookings`",
            "Edge `generate-video-token`",
            "livekit-client; Expo dev build requirement (per `en.json`)",
            "Securely joins LiveKit rooms scoped to bookings.",
            "Loads booking metadata → POST Edge function for JWT → LiveKit SDK connects using token and URL.",
        )
    )

    add("#### 🔔 Notifications")
    for s in (
        "GoFitMobile/src/screens/profile/NotificationsSettingsScreen.tsx",
        "GoFitMobile/src/screens/profile/NotificationInboxScreen.tsx",
    ):
        bn = Path(s).stem
        lines.append(
            block(
                bn,
                "Mobile (Client)",
                s,
                "`GoFitMobile/src/components/shared/*`",
                "`notifications.ts`; `notificationInbox.ts`",
                "`profileStore`",
                "`user_profiles.notification_preferences`; `notifications`; `push_tokens`",
                "Edge `send-push-notification`",
                "expo-notifications",
                "Preference center plus transactional inbox and test notification UI.",
                "Settings persist JSON on profile; inbox queries `notifications`; `App.tsx` shows `NotificationBanner` for foreground events.",
            )
        )

    add("#### 📦 Programs & Session Packs")
    for s in sorted(
        x
        for x in mobile_screens
        if any(
            k in x
            for k in ("MyPacksScreen", "MyProgramsScreen", "ProgramDetailScreen")
        )
    ):
        bn = Path(s).stem
        lines.append(
            block(
                bn,
                "Mobile (Client)",
                s,
                "`GoFitMobile/src/components/shared/*`",
                "`programs.ts`; `sessionPacks.ts`",
                "`programsStore`; `packsStore`",
                "`custom_programs`, `session_packs`, `purchased_packs`",
                "N/A",
                "Supabase JS",
                "Client-visible programs and purchased packs from coaches.",
                "Stores hydrate from Supabase → detail screens render structured day, meal, and workout content.",
            )
        )

    add("#### 👤 Profile & Settings")
    prof = sorted(
        x
        for x in mobile_screens
        if "src/screens/profile/" in x
        and not any(
            k in x
            for k in (
                "MyPacksScreen",
                "MyProgramsScreen",
                "ProgramDetailScreen",
                "NotificationInboxScreen",
                "NotificationsSettingsScreen",
            )
        )
    )
    for s in prof:
        bn = Path(s).stem
        lines.append(
            block(
                bn,
                "Mobile (Client)",
                s,
                "`GoFitMobile/src/components/shared/*`; `GoFitMobile/src/components/auth/*` (password flows)",
                "`userProfile.ts`; `auth.ts`",
                "`profileStore`; `themeStore`; `languageStore`; `textSizeStore`",
                "`user_profiles`; bucket `profile-pictures`",
                "N/A",
                "i18next; zod; expo-image-picker",
                "Profile editing, preferences, legal, sign-out and delete.",
                "Validated mutations via `userProfileService` and Supabase Storage for avatars.",
            )
        )

    add("#### 🌍 Internationalization (EN/FR)")
    lines.append(
        block(
            "i18n bootstrap",
            "Mobile (Client / Coach)",
            "Imported in `GoFitMobile/App.tsx` (`./src/i18n`)",
            "All screens using `react-i18next` / `AppText`",
            "N/A",
            "`languageStore`",
            "N/A",
            "N/A",
            "i18next; react-i18next; `en.json`; `fr.json`",
            "Localized copy for every major module including marketplace and coach flows.",
            "`languageStore` changes language → tree re-renders; some strings remind users to restart for full effect.",
        )
    )

    add("#### ♿ Accessibility (text size, haptics)")
    lines.append(
        block(
            "Dynamic typography and haptics",
            "Mobile (Client)",
            "`TextSizeSettingsScreen.tsx`; various screens import `expo-haptics`",
            "`GoFitMobile/src/components/shared/AppText.tsx`",
            "N/A",
            "`textSizeStore`",
            "N/A",
            "N/A",
            "expo-haptics; persisted multiplier",
            "Improves readability and tactile confirmations.",
            "`AppText` multiplies font sizes; interactive controls trigger `Haptics.selectionAsync` patterns.",
        )
    )

    add("#### 🔗 Deep Linking")
    lines.append(
        block(
            "Coach profile deep links",
            "Mobile (Client)",
            "`GoFitMobile/App.tsx` linking config and `Linking` listeners",
            "N/A",
            "N/A",
            "`deepLinkStore`",
            "N/A",
            "N/A",
            "React Navigation deep linking (`gofit://`)",
            "Queues `gofit://coach/:coachId` until a logged-in client finishes onboarding.",
            "`parseGoFitUrl` captures UUID → `setPending` → after session and onboarding `consumePending` navigates to `Home/CoachDetail`.",
        )
    )

    add("#### ⚙️ Utilities & Hooks")
    for s in mobile_services:
        bn = Path(s).name
        lines.append(
            block(
                f"Service: {bn}",
                "Mobile (shared by surfaces)",
                "Referenced throughout screens and stores",
                "N/A",
                s,
                "Multiple stores",
                "Inspect `.from(` usage inside file",
                "Optional Edge calls per service",
                "Supabase JS; zod when used",
                "Domain-specific Supabase orchestration.",
                "Exports async helpers consumed by UI layers; centralizes retries and errors when paired with `apiClient`.",
            )
        )
    for s in mobile_stores:
        bn = Path(s).name
        lines.append(
            block(
                f"Store: {bn}",
                "Mobile (Client / Coach)",
                "N/A",
                "N/A",
                "N/A",
                s,
                "N/A",
                "N/A",
                "zustand (persist middleware for applicable stores)",
                "Composable client state.",
                "Selectors and actions defined with `create`; persisted slices hydrate from async storage.",
            )
        )
    for s in mobile_hooks:
        bn = Path(s).name
        lines.append(
            block(
                f"Hook: {bn}",
                "Mobile (Client)",
                s,
                "N/A",
                "N/A",
                "`timerStore` (when used for rest timing)",
                "N/A",
                "N/A",
                "React hooks API",
                "Encapsulates timer and scroll behaviors for workouts and tab bars.",
                "Custom hook isolates intervals and gesture handlers from screen files.",
            )
        )
    for s in mobile_utils:
        bn = Path(s).name
        lines.append(
            block(
                f"Util: {bn}",
                "Mobile (Client / Coach)",
                "N/A",
                "N/A",
                "N/A",
                "N/A",
                "N/A",
                "N/A",
                "Various (expo-av, and so on)",
                "Low-level helpers shared across modules.",
                "Pure functions and constants imported where needed.",
            )
        )
    lines.append(
        block(
            "Supabase API client (`apiClient`)",
            "Mobile (Client / Coach)",
            "N/A",
            "N/A",
            "N/A",
            "N/A",
            "Generic PostgREST tables",
            "N/A",
            "@supabase/supabase-js",
            "Timeout, retry, and error normalization for database calls.",
            "`executeQuery` wraps builder callbacks with `withTimeout`, `withRetry`, and `ApiError` mapping.",
        )
    )
    add("API module path: `GoFitMobile/src/api/client.ts`")
    add("")

    add("#### Mobile navigators (client)")
    for s in (
        "GoFitMobile/src/navigation/AuthNavigator.tsx",
        "GoFitMobile/src/navigation/OnboardingNavigator.tsx",
        "GoFitMobile/src/navigation/AppNavigator.tsx",
        "GoFitMobile/src/navigation/types.ts",
    ):
        bn = Path(s).stem
        lines.append(
            block(
                bn,
                "Mobile (Client)",
                s,
                "Imports all client stack screens",
                "N/A",
                "N/A",
                "N/A",
                "N/A",
                "@react-navigation/stack; bottom-tabs",
                "Defines auth, onboarding, and tabbed client navigation graphs.",
                "`AppNavigator` nests Home, Workouts, Library, Progress, and Profile stacks with shared chat and video routes.",
            )
        )

    add("### 🏋️ Mobile — Coach App")

    add("#### 🔐 Coach Authentication")
    for s in sorted(x for x in mobile_screens if "src/screens/coach-auth/" in x):
        bn = Path(s).stem
        lines.append(
            block(
                bn,
                "Mobile (Coach)",
                s,
                "`GoFitMobile/src/components/auth/*`",
                "`auth.ts`",
                "`authStore`",
                "Supabase Auth (`user_type` metadata)",
                "N/A",
                "Supabase JS",
                "Coach-specific credential entry.",
                "`signUp` passes coach user type; navigator parallels client auth.",
            )
        )
    for s in (
        "GoFitMobile/src/screens/auth/ForgotPasswordScreen.tsx",
        "GoFitMobile/src/screens/auth/VerifyOtpScreen.tsx",
        "GoFitMobile/src/screens/auth/ResetPasswordScreen.tsx",
        "GoFitMobile/src/screens/auth/PasswordChangedSuccessScreen.tsx",
    ):
        bn = "Coach stack: " + Path(s).stem
        lines.append(
            block(
                bn,
                "Mobile (Coach)",
                s,
                "Shared auth components",
                "`auth.ts`",
                "`authStore`",
                "Supabase Auth",
                "N/A",
                "Supabase JS",
                "Password reset UX reused from client implementation.",
                "Registered inside `CoachAuthNavigator` after coach login routes.",
            )
        )

    add("#### 🚀 Coach Onboarding")
    for s in sorted(x for x in mobile_screens if "src/screens/coach-onboarding/" in x):
        bn = Path(s).stem
        lines.append(
            block(
                bn,
                "Mobile (Coach)",
                s,
                "`GoFitMobile/src/components/shared/*`",
                "`coachProfile.ts`",
                "`coachStore`",
                "`coach_profiles`, `coach_certifications`, bucket `coach-documents`",
                "N/A",
                "expo-document-picker; Supabase Storage",
                "Guided verification workflow for new coaches.",
                "Uploads and metadata persisted via coach profile service until pending state.",
            )
        )

    add("#### 📊 Coach Dashboard")
    lines.append(
        block(
            "CoachDashboardScreen",
            "Mobile (Coach)",
            "GoFitMobile/src/screens/coach-app/CoachDashboardScreen.tsx",
            "Shared UI",
            "`bookings.ts` (plus RPC when deployed)",
            "`coachStore`",
            "`bookings`; `get_coach_dashboard_stats`",
            "N/A",
            "Supabase JS",
            "Operational snapshot for coaches.",
            "Pulls aggregates for sessions, clients, packs, and ratings.",
        )
    )
    lines.append(
        block(
            "Dashboard notification inbox",
            "Mobile (Coach)",
            "GoFitMobile/src/screens/profile/NotificationInboxScreen.tsx (stacked from coach dashboard)",
            "Shared UI",
            "`notificationInbox.ts`",
            "`profileStore`",
            "`notifications`",
            "N/A",
            "Supabase JS",
            "Same inbox component as clients, mounted under coach dashboard stack.",
            "Queries `notifications` filtered to authenticated coach user id.",
        )
    )

    add("#### 👥 Client Management")
    for s in (
        "GoFitMobile/src/screens/coach-app/ClientsListScreen.tsx",
        "GoFitMobile/src/screens/coach-app/ClientDetailScreen.tsx",
        "GoFitMobile/src/screens/coach-app/ClientNotesScreen.tsx",
        "GoFitMobile/src/screens/coach-app/ClientProgressScreen.tsx",
    ):
        bn = Path(s).stem
        lines.append(
            block(
                bn,
                "Mobile (Coach)",
                s,
                "Shared UI",
                "`clientManagement.ts`; `workoutStats.ts`",
                "`clientManagementStore`",
                "`coach_client_notes`, `bookings`, `custom_programs`, `workout_sessions`",
                "N/A",
                "Supabase JS",
                "CRM-style tools for roster, notes, and progress.",
                "Uses RPC `get_coach_clients` and targeted queries for detail panes.",
            )
        )
    lines.append(
        block(
            "CoachClientsScreen (dormant)",
            "Mobile (Coach)",
            "GoFitMobile/src/screens/coach-app/CoachClientsScreen.tsx",
            "N/A",
            "N/A",
            "N/A",
            "N/A",
            "N/A",
            "N/A",
            "Exported screen with no navigator import in the scanned tree; likely superseded by `ClientsListScreen`.",
            "Safe to wire into navigation or remove after product confirmation.",
        )
    )

    add("#### 📋 Program Builder")
    for s in (
        "GoFitMobile/src/screens/coach-app/ProgramBuilderScreen.tsx",
        "GoFitMobile/src/screens/coach-app/ProgramsListScreen.tsx",
    ):
        bn = Path(s).stem
        lines.append(
            block(
                bn,
                "Mobile (Coach)",
                s,
                "Shared UI",
                "`programs.ts`; `exercises.ts`",
                "`programsStore`",
                "`custom_programs`",
                "N/A",
                "Supabase JS",
                "Authoring tools for multi-day programs.",
                "CRUD JSON structures stored in `custom_programs`.",
            )
        )
    lines.append(
        block(
            "ProgramDetailScreen (shared)",
            "Mobile (Coach) / Mobile (Client)",
            "GoFitMobile/src/screens/profile/ProgramDetailScreen.tsx",
            "Shared UI",
            "`programs.ts`",
            "`programsStore`",
            "`custom_programs`",
            "N/A",
            "Supabase JS",
            "Detailed program viewer reused in coach client stack and client profile stack.",
            "Same component file mounted in both navigators with different entry params.",
        )
    )

    add("#### 📦 Session Packs")
    for s in (
        "GoFitMobile/src/screens/coach-app/SessionPacksScreen.tsx",
        "GoFitMobile/src/screens/coach-app/CreatePackScreen.tsx",
    ):
        bn = Path(s).stem
        lines.append(
            block(
                bn,
                "Mobile (Coach)",
                s,
                "Shared UI",
                "`sessionPacks.ts`",
                "`packsStore`",
                "`session_packs`",
                "N/A",
                "Supabase JS",
                "Configure sellable bundles of sessions.",
                "Validates business fields then upserts rows scoped to coach id.",
            )
        )

    add("#### 🗓️ Calendar & Availability")
    for s in (
        "GoFitMobile/src/screens/coach-app/CoachCalendarScreen.tsx",
        "GoFitMobile/src/screens/coach-app/CoachAvailabilityScreen.tsx",
    ):
        bn = Path(s).stem
        lines.append(
            block(
                bn,
                "Mobile (Coach)",
                s,
                "Shared UI",
                "`bookings.ts`",
                "N/A",
                "`coach_availability`, `bookings`",
                "N/A",
                "Supabase JS",
                "Manage coach-wide calendar plus slot templates.",
                "Reads and writes availability rows and surfaces upcoming bookings.",
            )
        )

    add("#### 💬 Chat with Clients")
    lines.append(
        block(
            "Coach chat tab",
            "Mobile (Coach)",
            "`GoFitMobile/src/navigation/CoachAppNavigator.tsx` (Chat stack)",
            "Reuses messaging screens",
            "`chat.ts`",
            "`chatStore`",
            "`conversations`, `messages`",
            "N/A",
            "Supabase Realtime",
            "Dedicated tab mirroring client chat implementation.",
            "Hosts `ConversationsListScreen` and `ChatScreen` for coach role.",
        )
    )
    lines.append(
        block(
            "CoachChatScreen (dormant)",
            "Mobile (Coach)",
            "GoFitMobile/src/screens/coach-app/CoachChatScreen.tsx",
            "N/A",
            "N/A",
            "N/A",
            "N/A",
            "N/A",
            "N/A",
            "Alternate chat screen not wired into navigators.",
            "Retain only if product plans a bespoke coach-only composer.",
        )
    )

    add("#### 📹 Video Calls")
    lines.append(
        block(
            "VideoCallScreen (coach calendar stack)",
            "Mobile (Coach)",
            "GoFitMobile/src/screens/coach-app/VideoCallScreen.tsx",
            "Shared UI",
            "`videoCall.ts`",
            "N/A",
            "`bookings`",
            "Edge `generate-video-token`",
            "livekit-client",
            "Coach joins the same LiveKit rooms as clients from calendar stack.",
            "Navigation supplies booking id → service validates window → token minted.",
        )
    )

    add("#### 👤 Coach Profile")
    for s in (
        "GoFitMobile/src/screens/coach-app/CoachProfileScreen.tsx",
        "GoFitMobile/src/screens/coach-app/CoachWalletScreen.tsx",
        "GoFitMobile/src/screens/coach-app/CoachSettingsScreen.tsx",
    ):
        bn = Path(s).stem
        lines.append(
            block(
                bn,
                "Mobile (Coach)",
                s,
                "Shared UI",
                "`wallet.ts`; `coachProfile.ts`; `auth.ts`",
                "`coachStore`; `authStore`",
                "`wallets`, `transactions`, `coach_profiles`",
                "N/A",
                "Supabase JS",
                "Coach profile hub, payouts, and operational settings.",
                "Wallet service reads balances and ledger; settings may expose toggles and sign-out.",
            )
        )

    add("#### Coach navigators")
    for s in (
        "GoFitMobile/src/navigation/CoachAuthNavigator.tsx",
        "GoFitMobile/src/navigation/CoachOnboardingNavigator.tsx",
        "GoFitMobile/src/navigation/CoachAppNavigator.tsx",
    ):
        bn = Path(s).stem
        lines.append(
            block(
                bn,
                "Mobile (Coach)",
                s,
                "Imports coach stacks",
                "N/A",
                "N/A",
                "N/A",
                "N/A",
                "React Navigation",
                "Parallel navigation graphs for the coach persona.",
                "`CoachAppNavigator` defines Dashboard, Clients, Calendar, Chat, and Profile tabs with nested stacks.",
            )
        )

    add("### 🖥️ Admin Panel")
    add(
        "Foundational UI chrome lives in `admin-panel/components/layout/Sidebar.tsx`, `Navbar.tsx`, "
        "`MobileSidebar.tsx`, `ThemeToggle.tsx`, plus skeleton and analytics building blocks referenced from pages."
    )
    add("")

    add("#### 🔐 Authentication & Middleware")
    lines.append(
        block(
            "Middleware — SSR session and admin enforcement",
            "Web (Admin)",
            "admin-panel/middleware.ts",
            "N/A",
            "N/A",
            "N/A",
            "`user_profiles.is_admin`",
            "N/A",
            "@supabase/ssr",
            "Protects dashboard modules; redirects anonymous or non-admin users.",
            "`createServerClient` reads cookies → `auth.getUser` → fetches `is_admin` flag before continuing request.",
        )
    )

    add("#### 📊 Analytics Dashboard")
    add(
        "The default signed-in landing experience is `admin-panel/app/dashboard/page.tsx` (see Admin pages below). "
        "It composes `admin-panel/components/analytics/*` and reads aggregates via `admin-panel/lib/analytics.ts`."
    )
    add("")

    add("#### 👥 User Management")
    add(
        "User administration uses `admin-panel/app/users/page.tsx` and `users/[id]/page.tsx` with "
        "`UserSearchFilter`, `ExportUsersButton`, `DeleteUserButton`, and `ToggleAdminButton` (see Admin pages below)."
    )
    add("")

    add("#### 🏋️ Coach Management")
    add(
        "`admin-panel/app/coaches/page.tsx` pairs with `CoachSearchFilter`, `CoachActions`, and "
        "`app/api/coaches/[id]/certifications/route.ts` (see Admin pages below)."
    )
    add("")

    add("#### 📚 Exercise Library")
    add(
        "`app/exercises/page.tsx`, `exercises/new/page.tsx`, and `exercises/[id]/page.tsx` mount the exercise CRUD "
        "experience backed by `components/exercises/*` (see Admin pages below)."
    )
    add("")

    add("#### 💪 Workout Management")
    add(
        "`app/workouts/page.tsx`, `workouts/new/page.tsx`, and `workouts/[id]/page.tsx` mount workout CRUD, preview, "
        "and import or export flows via `components/workouts/*` (see Admin pages below)."
    )
    add("")

    add("#### 💳 Transactions")
    add(
        "`admin-panel/app/transactions/page.tsx` reads ledger data through `app/api/transactions/route.ts` "
        "(see Admin pages below)."
    )
    add("")

    add("#### 📜 Audit & Activity Logs")
    add(
        "`admin-panel/app/activity-logs/page.tsx` renders `ActivityLogsTable.tsx` and loads `app/api/audit-logs/route.ts` "
        "(see Admin pages below)."
    )
    add("")

    add("#### 🔔 Notification Management")
    add(
        "Notification center UI is composed from `components/notifications/NotificationCenter.tsx` while mutations hit "
        "`app/api/notifications/*` routes (see API Routes and Admin pages below)."
    )
    add("")

    add("#### ⚙️ Settings")
    add(
        "`admin-panel/app/settings/page.tsx` persists admin configuration through `app/api/settings/route.ts` with "
        "schemas from `lib/validation` (see Admin pages below)."
    )
    add("")

    add("#### 📄 Admin App Router pages (`page.tsx`)")
    admin_pages = sorted(x for x in admin_app if x.endswith("/page.tsx"))

    def admin_page_blurb(route: str) -> tuple[str, str, str]:
        """Return (components_guess, tables_guess, description)."""
        comp = "`admin-panel/components/**` (module-specific imports inside the page)"
        tables = "Varies by page (see Supabase queries in page and `lib/*`)"
        if "login" in route:
            return (
                "`admin-panel/components/ui/*` inputs; branding from layout",
                "`user_profiles` (post-auth admin check via middleware)",
                "Email and password sign-in for administrators.",
            )
        if route.endswith("app/page.tsx"):
            return comp, "N/A", "Root route that immediately redirects to `/login` or `/dashboard`."
        if "dashboard" in route:
            return (
                "`admin-panel/components/analytics/*`, skeletons",
                tables,
                "Analytics landing: KPI cards, charts, heatmaps, and recent activity.",
            )
        if "/users/" in route:
            return (
                "`users/*` table components, filters, export",
                "`user_profiles`",
                "List or detail view for end users with admin actions.",
            )
        if "coaches" in route:
            return "`coaches/*`", "`coach_profiles`, `user_profiles`", "Coach directory and moderation actions."
        if "exercises" in route:
            return "`exercises/*`", "`exercises`", "Exercise CRUD, bulk import or export, and media fields."
        if "workouts" in route:
            return "`workouts/*`", "`workouts`, `workout_exercises`, `exercises`", "Workout templates, duplication, and previews."
        if "transactions" in route:
            return "`transactions` layout chrome", "`transactions`, `wallets`", "Financial ledger review."
        if "activity-logs" in route:
            return "`activity-logs/ActivityLogsTable.tsx`", "`admin_audit_logs`", "Immutable audit history viewer."
        if "settings" in route:
            return "settings form components", "`admin_settings`", "Mutable global admin configuration."
        return comp, tables, "Authenticated admin surface for the URL segment."

    for pg in admin_pages:
        comp, tbl, desc = admin_page_blurb(pg)
        title = "Admin page: " + pg.replace("admin-panel/app/", "").replace("/page.tsx", "") or "root"
        lines.append(
            block(
                title,
                "Web (Admin)",
                pg,
                comp,
                "`admin-panel/lib/supabase/server.ts` or `client.ts` (per page implementation)",
                "N/A",
                tbl,
                "N/A",
                "Next.js App Router; React Server or Client Components; Tailwind or shadcn UI primitives",
                desc,
                "Middleware guarantees `is_admin` → page loader queries Supabase with SSR helpers → interactive components call `/api/*` routes for mutations.",
            )
        )

    add("#### 🌙 Dark Mode")
    lines.append(
        block(
            "Theme toggle",
            "Web (Admin)",
            "`admin-panel/components/layout/ThemeToggle.tsx`; `components/theme-provider.tsx`",
            "Layout",
            "N/A",
            "N/A",
            "N/A",
            "N/A",
            "next-themes (per project dependency)",
            "Persists admin color scheme.",
            "Toggles CSS variables or classes at the document root.",
        )
    )

    add("#### 📁 File Uploads (R2)")
    lines.append(
        block(
            "Upload API",
            "Web (Admin)",
            "admin-panel/app/api/upload/route.ts",
            "Forms with file inputs",
            "`admin-panel/lib/r2.ts`",
            "N/A",
            "Cloudflare R2 objects",
            "`/api/upload`",
            "AWS or R2 SDK per implementation",
            "Secure media uploads for admin-managed assets.",
            "Authenticates admin → signs upload → returns instructions to browser.",
        )
    )

    add("#### 🔌 API Routes")
    for s in sorted(x for x in admin_app if "/api/" in x and x.endswith("/route.ts")):
        label = s.replace("admin-panel/", "")
        lines.append(
            block(
                f"HTTP handler: {label}",
                "Web (Admin)",
                s,
                "Various action components",
                "`admin-panel/lib/supabase/admin.ts`; validation helpers",
                "N/A",
                "Depends on handler",
                "Self-referential fetch to `/api/...`",
                "Next.js Route Handlers",
                "Implements REST verbs for CRUD, bulk operations, notifications, audits, and health checks.",
                "Validates payload → uses service-role Supabase client → returns JSON.",
            )
        )

    add("#### Admin layouts and shells")
    for s in sorted(x for x in admin_app if x.endswith("/layout.tsx")):
        label = s.replace("admin-panel/", "")
        lines.append(
            block(
                f"Layout: {label}",
                "Web (Admin)",
                s,
                "Sidebar, Navbar, Toaster children",
                "N/A",
                "N/A",
                "N/A",
                "N/A",
                "Next.js layouts",
                "Wraps segment-specific UI with shared navigation chrome.",
                "Nested layouts inherit providers for theme and Supabase SSR.",
            )
        )

    add("#### Admin loading states")
    for s in sorted(x for x in admin_app if x.endswith("/loading.tsx")):
        label = s.replace("admin-panel/", "")
        lines.append(
            block(
                f"Loading UI: {label}",
                "Web (Admin)",
                s,
                "Skeleton components",
                "N/A",
                "N/A",
                "N/A",
                "N/A",
                "React suspense skeletons",
                "Shows placeholder shimmer while RSC or streaming resolves.",
                "Next.js automatically swaps once data is ready.",
            )
        )

    add("### ⚙️ Backend & Infrastructure")

    add("#### 🔁 Edge Functions")
    for p in edge:
        label = p.replace("supabase/functions/", "")
        lines.append(
            block(
                f"Edge function: {label}",
                "Backend",
                p,
                "N/A",
                "N/A",
                "N/A",
                "Varies per function",
                "HTTPS callable",
                "Deno and Supabase Edge runtime",
                "Implements privileged operations (push relay, LiveKit JWT, pose estimation proxy).",
                "Validates JSON input → uses secrets → returns JSON.",
            )
        )

    add("#### 🗃️ Database Schema & Tables")
    for s in schema:
        bn = Path(s).name
        lines.append(
            block(
                f"Schema bundle: {bn}",
                "Backend",
                s,
                "N/A",
                "N/A",
                "N/A",
                "See file for CREATE TABLE statements",
                "N/A",
                "PostgreSQL DDL",
                "Canonical schema snapshots for workouts, profiles, and marketplace.",
                "Intended for manual or CI application before incremental migrations.",
            )
        )

    add("#### 🔒 Row Level Security Policies")
    lines.append(
        block(
            "RLS coverage (representative migrations)",
            "Backend",
            "See `database/migrations/unify_workouts_design.sql`, `add_workout_exercises_junction_tables.sql`, "
            "`add_native_workouts_table.sql`, `create_body_measurements.sql`, `create_admin_audit_logs.sql`, "
            "`create_admin_notifications.sql`, `create_admin_settings.sql`, `fix_admin_rls_policies.sql`, "
            "`add_get_client_progress.sql`, `add_notifications_insert_policy.sql`, `add_display_name_and_public_read.sql`, "
            "`add_user_type_column.sql`",
            "N/A",
            "N/A",
            "N/A",
            "All tables touched inside those files",
            "N/A",
            "PostgreSQL policies",
            "Enforces per-role access for workouts, admin objects, notifications, measurements, and profile visibility.",
            "Each file issues `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` plus `CREATE POLICY` statements; admin dashboard uses service role where appropriate.",
        )
    )

    add("#### 🔧 SQL Functions & Triggers")
    add(
        "- Packaged functions and triggers: "
        + ", ".join(f"`{x}`" for x in dbfuncs)
    )
    add(
        "- Marketplace automation (`update_coach_rating`, `update_conversation_last_message`, wallet and pack triggers, "
        "`get_coach_dashboard_stats`, `get_client_progress`, `get_coach_clients`, `sync_user_type_on_profile_create`, "
        "`deduct_session`, and related helpers) live in `database/functions/coach_marketplace_functions.sql` and companion migrations."
    )
    add("- Account deletion RPC: `delete_user_account()` in `database/functions/delete_user_account_function.sql`.")
    add(
        "- Additional migration-defined routines: `get_coach_clients`, `get_client_progress`, `get_conversations_enriched`, "
        "`calculate_workout_session_stats`, `populate_exercise_snapshots`, `is_admin`, `get_admin_user_ids`, `get_storage_url`."
    )
    add("")

    add("#### 🔄 Migrations")
    for s in migrations:
        bn = Path(s).name
        lines.append(
            block(
                f"Migration: {bn}",
                "Backend",
                s,
                "N/A",
                "N/A",
                "N/A",
                "See SQL for affected relations",
                "N/A",
                "PostgreSQL DDL and DML",
                "Versioned schema evolution for Supabase Postgres.",
                "Applies idempotent changes (policies, columns, views, triggers) tracked in repo.",
            )
        )

    add("### 🧰 Tech Stack per Feature Category")
    add("| Category | Libraries / Services |")
    add("|----------|---------------------|")
    add("| Authentication | Supabase Auth, Expo Secure Store, Next `@supabase/ssr` |")
    add("| Database | Supabase Postgres and PostgREST |")
    add("| Chat | Supabase Realtime on `messages` |")
    add("| Video | LiveKit and Edge JWT minting |")
    add("| Push | Expo Push, Edge relay, `push_tokens` table |")
    add("| Storage | Supabase Storage buckets and Cloudflare R2 (`admin-panel/lib/r2.ts`) |")
    add("| AI measurements | Hugging Face pose estimation and Edge `body-measurements` |")
    add("| Mobile UI | React Native, Expo modules, Lucide icons |")
    add("| Admin UI | Next.js App Router and shadcn-style primitives |")
    add("")

    add("### 📁 Full File Index")
    add("#### GoFitMobile/src/screens (`*.tsx`)")
    for s in sorted(mobile_screens):
        add(f"- {s}")
    add("#### GoFitMobile/src/components (`*.tsx`, `*.ts`)")
    for s in sorted(mobile_components):
        add(f"- {s}")
    add("#### GoFitMobile/src/services")
    for s in sorted(mobile_services):
        add(f"- {s}")
    add("#### GoFitMobile/src/store")
    for s in sorted(mobile_stores):
        add(f"- {s}")
    add("#### GoFitMobile/src/navigation")
    for s in sorted(mobile_nav):
        add(f"- {s}")
    add("#### GoFitMobile/src/hooks")
    for s in sorted(mobile_hooks):
        add(f"- {s}")
    add("#### GoFitMobile/src/api")
    add("- GoFitMobile/src/api/client.ts")
    add("#### GoFitMobile/src/utils")
    for s in sorted(mobile_utils):
        add(f"- {s}")
    add("#### GoFitMobile/src/i18n/locales")
    locale_root = ROOT / "GoFitMobile" / "src" / "i18n" / "locales"
    if locale_root.exists():
        for p in sorted(locale_root.glob("*.json")):
            add(f"- {rel(p)}")
    add("#### GoFitMobile root")
    add("- GoFitMobile/App.tsx")
    add("#### admin-panel/app")
    for s in sorted(admin_app):
        add(f"- {s}")
    add("#### admin-panel/components")
    for s in sorted(admin_components):
        add(f"- {s}")
    add("#### admin-panel/lib")
    for s in sorted(admin_lib):
        add(f"- {s}")
    add("- admin-panel/middleware.ts")
    add("#### supabase/functions")
    for s in edge:
        add(f"- {s}")
    add("#### database/schema")
    for s in sorted(schema):
        add(f"- {s}")
    add("#### database/migrations")
    for s in sorted(migrations):
        add(f"- {s}")
    add("#### database/functions")
    for s in sorted(dbfuncs):
        add(f"- {s}")

    mc = mco = ad = bk = tot = 0
    try:
        ti = lines.index(TABLE_MARKER)
    except ValueError:
        ti = -1
    if ti >= 0:
        mc, mco, ad, bk, tot = count_platform_feature_blocks(lines)
        lines[ti : ti + 1] = [
            "| Platform | Feature Count |",
            "|----------|---------------|",
            f"| Mobile — Client | {mc} |",
            f"| Mobile — Coach | {mco} |",
            f"| Admin Panel | {ad} |",
            f"| Backend / Edge Functions | {bk} |",
            f"| **Total** | **{tot}** |",
        ]

    out = ROOT / "FEATURES.md"
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {out} (feature blocks: client={mc}, coach={mco}, admin={ad}, backend={bk}, total={tot})")


if __name__ == "__main__":
    main()
