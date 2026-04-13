# GoFit - Complete Project Context

## What is GoFit?

GoFit is a **fitness platform** consisting of three main parts:

1. **GoFitMobile** - A React Native (Expo) mobile app for clients and coaches
2. **admin-panel** - A Next.js web dashboard for administrators
3. **Supabase backend** - Postgres database, Auth, Storage, and Edge Functions

The platform connects **fitness clients** with **coaches** through a marketplace, while also providing standalone workout tracking, exercise libraries, and progress monitoring. It supports two languages (English and French).

---

## Repository Structure

```
GoFit/
├── GoFitMobile/              # Expo / React Native mobile app
│   ├── App.tsx               # Entry point - font loading, auth routing, deep links
│   ├── app.json              # Expo config (SDK 54, New Architecture, LiveKit plugin)
│   ├── eas.json              # EAS Build profiles (dev, preview, production)
│   ├── package.json
│   ├── tsconfig.json          # Path alias: @/* → ./src/*
│   ├── babel.config.js
│   ├── metro.config.js        # Mirrors @/* alias
│   ├── assets/
│   ├── templates/             # Email HTML templates
│   └── src/
│       ├── api/               # Centralized Supabase API client with retries/timeouts
│       ├── components/        # auth, home, onboarding, plan, shared, workout
│       ├── config/            # supabase.ts (client with expo-secure-store sessions)
│       ├── constants/
│       ├── hooks/
│       ├── i18n/              # i18next setup + locales (en.json, fr.json)
│       ├── lib/
│       ├── navigation/        # 6 navigators (see Navigation section)
│       ├── screens/           # All screens organized by feature
│       ├── services/          # 20 domain service modules
│       ├── store/             # 20 Zustand stores
│       ├── theme/             # Custom theme system
│       ├── types/
│       └── utils/
│
├── admin-panel/              # Next.js admin web app
│   ├── app/                  # App Router pages + API routes
│   ├── components/           # analytics, layout, ui (shadcn), users, exercises, etc.
│   ├── lib/                  # Supabase clients, R2, audit, analytics, validation
│   ├── middleware.ts          # Auth guard + admin role check
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts    # shadcn CSS variables, dark mode
│   └── tsconfig.json
│
├── database/                 # Shared SQL files
│   ├── schema/               # Baseline table definitions
│   ├── migrations/           # Incremental SQL migrations (~58 files)
│   ├── policies/             # RLS policies
│   ├── indexes/              # Performance indexes
│   ├── functions/            # SQL RPC functions
│   ├── DATABASE_STRUCTURE.md # Core data model documentation
│   └── README.md
│
├── supabase/
│   └── functions/            # Deno Edge Functions
│       ├── send-push-notification/   # Expo push via push_tokens table
│       ├── generate-video-token/     # LiveKit JWT token issuance
│       └── _shared/cors.ts
│
├── docs/                     # Shared project documentation
│   ├── PROJECT_REPORT_GOFIT.md
│   ├── RAPPORT_PROJET_GOFIT.md
│   ├── PRESENTATION_SLIDES.txt
│   ├── architecture/
│   ├── admin-panel/
│   ├── database/
│   ├── formulaire/
│   ├── gantt/
│   └── troubleshooting/
│
└── README.md                 # Monorepo overview
```

---

## Tech Stack

### Mobile App (GoFitMobile)

| Category | Technology |
|----------|-----------|
| Runtime | Expo SDK 54, React 19.1, React Native 0.81.5 (New Architecture) |
| Language | TypeScript (strict) |
| Navigation | React Navigation (native + stack + bottom tabs) |
| State | Zustand (20 stores) |
| Backend Client | @supabase/supabase-js with expo-secure-store session storage |
| Forms | react-hook-form + @hookform/resolvers + Zod |
| i18n | i18next + react-i18next + expo-localization (EN/FR) |
| Media | expo-av, expo-video (PiP support), expo-image |
| Video Calls | @livekit/react-native + react-native-webrtc + Edge Function for tokens |
| Charts | react-native-chart-kit |
| Icons | lucide-react-native |
| UI | Custom component library with theme system (no NativeWind/Tailwind) |
| Notifications | expo-notifications + Edge Function for push |
| Other Expo | calendar, location, haptics, document-picker, file-system, blur, linear-gradient, splash-screen |

### Admin Panel (admin-panel)

| Category | Technology |
|----------|-----------|
| Framework | Next.js 16.1.3 (App Router) |
| Language | TypeScript (strict) |
| UI | Tailwind CSS 3.4 + Radix UI + shadcn/ui components |
| Tables | @tanstack/react-table |
| Forms | react-hook-form + Zod 4.3 |
| Charts | Recharts |
| Command Palette | cmdk |
| Theme | next-themes (dark mode via CSS class) |
| Toast | Sonner |
| Icons | lucide-react |
| Backend | @supabase/ssr (server) + @supabase/supabase-js (browser) |
| File Upload | @aws-sdk/client-s3 for Cloudflare R2 (optional) |

### Backend (Supabase)

| Category | Technology |
|----------|-----------|
| Database | PostgreSQL (Supabase-hosted) |
| Auth | Supabase Auth (email/password, OTP, password reset) |
| Storage | Supabase Storage (exercise images, coach CVs, profile pictures) |
| Edge Functions | Deno runtime (push notifications, video token generation) |
| Security | Row Level Security (RLS) on all tables |
| Real-time | Supabase Realtime (used for chat) |

---

## Database Schema

### Core Workout Model (Normalized)

```
exercises (1) ──< (many) workout_exercises (many) >── (1) workouts
                                                            │
                                                            │ (1)
                                                            ▼
                                                    (many) workout_sessions
                                                            │
                                                            ▼
                                                        auth.users
```

#### `exercises` - Master exercise library
- `id`, `name` (unique), `category`, `muscle_groups[]`, `image_url`, `video_url`, `instructions`, `equipment[]`, `difficulty` (Beginner/Intermediate/Advanced)
- Public read access, admin write

#### `workouts` - Workout templates
- `id`, `user_id` (NULL for native, set for custom), `name`, `difficulty`, `image_url`, `workout_type` ('native'|'custom')
- Constraint: native must have NULL user_id, custom must have non-NULL user_id
- Templates only - no execution data stored here

#### `workout_exercises` - Junction table with exercise snapshots
- `workout_id`, `exercise_id`, `sets`, `reps` (supports comma-separated like '12,10,8,6'), `rest_time` (seconds), `exercise_order`
- Snapshot fields: `exercise_name`, `exercise_image_url`, `exercise_equipment[]`, `exercise_difficulty` (auto-populated by trigger to preserve historical data)

#### `workout_sessions` - Execution logs
- `user_id`, `workout_id`, `started_at`, `completed_at`, `duration_minutes`, `date`, `calories`, `exercises_completed` (JSONB), `notes`

### Coach Marketplace Tables

#### `coach_profiles`
- `user_id` (unique, references auth.users), `bio`, `specialties[]`, `hourly_rate`, `cv_url`, `profile_picture_url`
- `is_verified`, `average_rating`, `total_reviews`, `total_sessions`
- `status` ('pending'|'approved'|'rejected'), `cancellation_policy` ('flexible'|'moderate'|'strict')
- `stripe_account_id`
- RLS: public can view verified+approved coaches; coaches manage own; admins manage all

#### `coach_certifications`
- Certification documents linked to coach profiles

#### Other marketplace tables (defined in `create_coach_marketplace_tables.sql`)
- Bookings, reviews, messaging/conversations, session packs, programs, availability, notifications, push tokens

### User Profiles

#### `user_profiles`
- Extended profile data beyond Supabase auth
- `is_admin` boolean field used by admin panel middleware for access control
- `handle_updated_at` trigger for automatic timestamp updates

### Key RLS Patterns
- Exercises: public read, authenticated admin write
- Workouts: native workouts public read, custom workouts owner-only
- Sessions: owner-only for all operations
- Coach profiles: verified+approved public read, owner manage, admin full access
- Admin check via `public.is_admin()` SQL function

---

## Mobile App Architecture

### Entry Point (App.tsx)
- Loads custom fonts (Barlow family)
- Controls splash screen
- Sets up notification listeners and deep link handling (`gofit://` scheme)
- Renders global dialog
- Routes to the correct root navigator based on auth/onboarding/coach state:
  - `AuthNavigator` → `OnboardingNavigator` → `AppNavigator` (client flow)
  - `CoachAuthNavigator` → `CoachOnboardingNavigator` → `CoachAppNavigator` (coach flow)

### Navigation Structure

**Client App (AppNavigator)** - 5 bottom tabs:
| Tab | Key Screens |
|-----|------------|
| Home | HomeScreen, MarketplaceScreen, CoachDetailScreen, BookSessionScreen, ChatScreen, VideoCallScreen |
| Workouts | WorkoutsScreen (plan/timeline/calendar) |
| Library | LibraryScreen, WorkoutBuilderScreen, ExerciseSelectionScreen, ExerciseDetailScreen, WorkoutDetailScreen, WorkoutSessionScreen (active workout), WorkoutSummaryScreen |
| Progress | WorkoutStatisticsScreen, ConsistencyScreen, RecordDetailsScreen |
| Profile | ProfileScreen, EditProfileScreen, GoalsScreen, EditWeightHeightScreen, UnitPreferencesScreen, NotificationsSettingsScreen, ThemeSettingsScreen, LanguageSettingsScreen, TextSizeSettingsScreen, AccountInformationScreen, NotificationInboxScreen, MyBookingsScreen, MyPacksScreen, MyProgramsScreen, ProgramDetailScreen, PrivacyPolicyScreen, TermsOfServiceScreen |

**Coach App (CoachAppNavigator)** - 5 bottom tabs:
| Tab | Key Screens |
|-----|------------|
| Dashboard | CoachDashboardScreen |
| Clients | CoachClientsScreen, ClientsListScreen, ClientDetailScreen, ClientNotesScreen, ClientProgressScreen |
| Calendar | CoachCalendarScreen, CoachAvailabilityScreen |
| Chat | ConversationsListScreen, CoachChatScreen, VideoCallScreen |
| Profile | CoachProfileScreen, ProgramsListScreen, ProgramBuilderScreen, SessionPacksScreen, CreatePackScreen |

**Auth Flows:**
- Client: WelcomeScreen → LoginScreen / SignupScreen → VerifyOtpScreen → ForgotPasswordScreen → ResetPasswordScreen → PasswordChangedSuccessScreen
- Coach: CoachWelcomeScreen → CoachLoginScreen / CoachSignupScreen
- Coach Onboarding: CoachOnboardingScreen → CoachCertificationsScreen → CoachCVUploadScreen → CoachProfilePreviewScreen → CoachPendingScreen

**Deep Linking:** `gofit://` scheme, maps `coach/:coachId` to CoachDetailScreen.

### Services Layer (20 modules)
Each service encapsulates Supabase queries for a domain:

| Service | Purpose |
|---------|---------|
| `auth` | Login, signup, OTP, password reset |
| `userProfile` | Profile CRUD, preferences |
| `exercises` | Exercise library queries |
| `workouts` | Workout template CRUD |
| `workoutDetails` | Workout with exercises (joined queries) |
| `workoutSessions` | Session start/complete/history |
| `workoutPlans` | Plan management |
| `workoutStats` | Statistics and analytics queries |
| `programs` | Training programs |
| `marketplace` | Coach discovery, search, filtering |
| `coachProfile` | Coach profile management |
| `bookings` | Session booking CRUD |
| `sessionPacks` | Session pack purchase/management |
| `calendar` | Calendar events |
| `clientManagement` | Coach-side client management |
| `chat` | Real-time messaging |
| `notificationInbox` | In-app notification reading |
| `notifications` | Notification CRUD |
| `pushNotification` | Push token registration |
| `videoCall` | LiveKit room/token management |

### State Management (20 Zustand stores)

| Store | Purpose |
|-------|---------|
| `authStore` | Auth state, user session, login/logout |
| `onboardingStore` | Onboarding completion state |
| `coachStore` | Coach auth and onboarding state |
| `profileStore` | User profile data |
| `workoutsStore` | Workout templates list |
| `sessionsStore` | Workout sessions |
| `workoutPlansStore` | Workout plans |
| `programsStore` | Training programs |
| `packsStore` | Session packs |
| `bookingsStore` | Bookings |
| `marketplaceStore` | Coach marketplace state |
| `chatStore` | Chat conversations and messages |
| `calendarStore` | Calendar events |
| `clientManagementStore` | Coach's client list |
| `themeStore` | Light/dark theme |
| `languageStore` | EN/FR language preference |
| `textSizeStore` | Accessibility text scaling |
| `uiStore` | UI flags, modals, loading states |
| `timerStore` | Rest timer state |
| `deepLinkStore` | Deep link handling |

### API Client (`src/api/client.ts`)
Centralized Supabase access with:
- Custom `ApiError` class
- Request timeouts
- Automatic retries
- JSDoc documentation

### Internationalization
- i18next with `en.json` and `fr.json` locale files
- expo-localization for device locale detection
- Language persisted via `languageStore`

---

## Admin Panel Architecture

### Middleware (`middleware.ts`)
- Refreshes Supabase session on every request
- Protected routes: `/dashboard`, `/users`, `/coaches`, `/transactions`, `/exercises`, `/workouts`
- Checks `user_profiles.is_admin` field for authorization
- Redirects `/` → `/dashboard` (if admin) or `/login` (if not)

### Pages (App Router)

| Route | Purpose |
|-------|---------|
| `/login` | Admin login |
| `/dashboard` | Analytics dashboard with charts |
| `/users` | User listing and management |
| `/users/[id]` | User detail view |
| `/coaches` | Coach listing and management |
| `/exercises` | Exercise library CRUD |
| `/exercises/new` | Create exercise |
| `/exercises/[id]` | Edit exercise |
| `/workouts` | Workout management |
| `/workouts/new` | Create workout |
| `/workouts/[id]` | Edit workout |
| `/transactions` | Transaction history |
| `/activity-logs` | Audit/activity logs |
| `/settings` | Admin settings |

### API Routes

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/health` | GET | Health check |
| `/api/settings` | GET/POST | App settings |
| `/api/audit-logs` | GET | Audit log retrieval |
| `/api/notifications` | GET/POST | Notification management |
| `/api/notifications/read-all` | POST | Mark all notifications read |
| `/api/notifications/[id]` | PATCH/DELETE | Single notification ops |
| `/api/users/[id]` | GET/PATCH/DELETE | User management |
| `/api/users/[id]/toggle-admin` | POST | Toggle admin role |
| `/api/coaches` | GET | Coach listing |
| `/api/coaches/[id]/certifications` | GET | Coach certifications |
| `/api/exercises` | GET/POST | Exercise CRUD |
| `/api/exercises/[id]` | GET/PATCH/DELETE | Single exercise ops |
| `/api/exercises/bulk` | POST/DELETE | Bulk exercise operations |
| `/api/upload` | POST | File upload (R2) |
| `/api/workouts` | GET/POST | Workout CRUD |
| `/api/workouts/[id]` | GET/PATCH/DELETE | Single workout ops |
| `/api/workouts/[id]/duplicate` | POST | Duplicate workout |
| `/api/workouts/bulk` | POST/DELETE | Bulk workout operations |
| `/api/transactions` | GET | Transaction listing |

### Supabase Clients (admin-panel/lib/supabase/)
- `client.ts` - Browser client (`createBrowserClient`) for client-side operations
- `server.ts` - Server client with cookies for SSR
- `admin.ts` - Service role client for privileged server operations (never exposed to client bundle)

---

## Supabase Edge Functions

### `send-push-notification`
- Reads `push_tokens` table for target user
- Sends push via Expo Push API
- Uses `SUPABASE_SERVICE_ROLE_KEY` for DB access
- Optional `EXPO_ACCESS_TOKEN` for authenticated push

### `generate-video-token`
- Issues LiveKit JWT tokens for video calls
- Uses `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`
- Called by mobile app before joining a video call room

### `_shared/cors.ts`
- Shared CORS headers for Edge Functions

---

## Environment Variables

### GoFitMobile/.env
```
EXPO_PUBLIC_SUPABASE_URL=<supabase_project_url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<supabase_anon_key>
```

### admin-panel/.env.local
```
NEXT_PUBLIC_SUPABASE_URL=<supabase_project_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional - Cloudflare R2 for file uploads
R2_ACCOUNT_ID=<r2_account_id>
R2_ACCESS_KEY_ID=<r2_access_key_id>
R2_SECRET_ACCESS_KEY=<r2_secret_access_key>
R2_BUCKET_NAME=<r2_bucket_name>
R2_PUBLIC_URL=<r2_public_url>
```

### Supabase Edge Function Secrets
```
SUPABASE_URL=<supabase_project_url>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
EXPO_ACCESS_TOKEN=<optional_expo_push_token>
LIVEKIT_API_KEY=<livekit_api_key>
LIVEKIT_API_SECRET=<livekit_api_secret>
LIVEKIT_URL=<livekit_server_url>
```

---

## Key Features Summary

### Client Mobile App
- **Auth**: Email/password login, signup, OTP verification, forgot/reset password
- **Onboarding**: Multi-step wizard for new users
- **Home**: Dashboard with calendar, quick actions, program highlights
- **Workout Library**: Browse exercises, build custom workouts, exercise selection with filters
- **Active Workout Session**: Step-by-step exercise execution with rest timer (audio + haptic feedback)
- **Workout Summary**: Post-session review with stats
- **Workout Plans**: Plan scheduling and timeline view
- **Progress**: Workout statistics, consistency tracking, personal records
- **Profile**: Goals, weight/height, unit preferences (metric/imperial), notification settings, theme (light/dark), language (EN/FR), text size, privacy/terms, account management
- **Coach Marketplace**: Discover coaches, view profiles/reviews/ratings, book sessions
- **Chat**: Real-time messaging with coaches
- **Video Calls**: LiveKit-powered video calls with coaches
- **Notifications**: Push notifications + in-app notification inbox
- **Programs & Packs**: View purchased training programs and session packs
- **Deep Linking**: `gofit://coach/:coachId` opens coach detail

### Coach Mobile App
- **Separate Auth Flow**: Coach-specific signup/login
- **Onboarding**: Profile setup, certifications upload, CV upload, profile preview, pending approval state
- **Dashboard**: Overview of clients, sessions, earnings
- **Client Management**: View clients, client detail, notes, progress tracking
- **Program Builder**: Create training programs for clients
- **Session Packs**: Create and manage session pack offerings
- **Calendar**: View schedule, manage availability slots
- **Chat**: Conversations with clients
- **Video Calls**: LiveKit video sessions with clients
- **Profile**: Coach profile management

### Admin Panel
- **Dashboard**: Analytics charts and KPIs
- **User Management**: List users, view details, toggle admin role, manage accounts
- **Coach Management**: List coaches, view certifications, approve/reject
- **Exercise Library**: Full CRUD, bulk import/export, image upload
- **Workout Management**: Full CRUD, bulk operations, duplicate workouts
- **Transactions**: View transaction history
- **Activity Logs**: Audit trail of admin actions
- **Settings**: Application configuration
- **Dark Mode**: Toggle via next-themes

---

## Build & Deployment

### Mobile (EAS Build)
- **Development**: Dev client, internal distribution
- **Preview**: Internal distribution for testing
- **Production**: Auto-increment version, submitted to stores
- Build profiles defined in `eas.json`

### Admin Panel
- Standard Next.js build: `npm run build` → `npm start`
- Deployable to any Node.js host or Vercel

### Database
- Migrations applied manually via Supabase SQL Editor
- Schema files in `database/schema/` run first
- Migration files in `database/migrations/` run in order
- Edge Functions deployed via Supabase CLI

---

## Prerequisites
- Node.js v18+
- npm
- Supabase account (project with Auth, Storage, Edge Functions)
- Expo CLI (for mobile development)
- EAS CLI (for mobile builds)
- LiveKit server (for video calls)
- Cloudflare R2 account (optional, for admin file uploads)
