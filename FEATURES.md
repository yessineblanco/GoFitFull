# GoFit — Complete Feature Documentation

Generated: **April 14, 2026** (repository scan).

This document inventories implemented UI surfaces, data services, admin routes, Supabase Edge Functions, SQL artifacts, and supporting modules discovered under the paths requested in the product specification.

| Platform | Feature Count |
|----------|---------------|
| Mobile — Client | 116 |
| Mobile — Coach | 35 |
| Admin Panel | 55 |
| Backend / Edge Functions | 43 |
| **Total** | **249** |

> **How counts were computed:** The summary table lists **exact** counts of feature blocks (each `####` heading immediately followed by the standard `| Field | Detail |` table) under the sections **Mobile — Client App**, **Mobile — Coach App**, **Admin Panel**, and **Backend & Infrastructure**. Everything from **Tech Stack per Feature Category** onward (including the file index) is excluded. Re-run `python scripts/generate_features_md.py` to refresh.

### 📱 Mobile — Client App

#### Application shell, splash, fonts, and global providers
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | GoFitMobile/App.tsx |
| Components | `SplashScreen`, `ErrorBoundary`, `NotificationBanner`, `CustomDialog` under `GoFitMobile/src/components/shared/` |
| Service | `notifications.ts` (push registration) |
| Store | `authStore`, `onboardingStore`, `coachStore`, `themeStore`, `workoutsStore`, `profileStore`, `deepLinkStore` |
| Supabase Tables | `push_tokens` (registration); Supabase Auth session |
| API Routes | N/A |
| Libraries | Expo (fonts, splash, notifications), React Navigation, Safe Area |

**Description:** Bootstraps the native app, restores session, routes client vs coach experiences, handles deep links and foreground notifications.

**Technical flow:** Fonts and splash gate rendering; `initialize` loads auth; stack switches among Auth, Onboarding, App, and Coach trees; authenticated clients preload workouts and profile in the background.


i18n keys in `GoFitMobile/src/i18n/locales/en.json` (mirrored in `fr.json`) function as the UX contract: `common`, `profile`, `account`, `notifications`, `goals`, `units`, `textSize`, `weightHeight`, `auth`, `onboarding`, `welcome`, `profileFields`, `theme`, `library` (including `workoutSession`, `restTimer`, `workoutSummary`, `daySelection`), `home`, `plan`, `coachOnboarding`, `coachAuth`, `marketplace`, `coachApp`, `sessionPacks`, `programs`, `booking`, `chat`, `clientManagement`, `coachDashboard`, `videoCall`, `review`.

#### 🔐 Authentication & Security
#### ForgotPasswordScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/auth/ForgotPasswordScreen.tsx |
| Components | `GoFitMobile/src/components/auth/*`; `GoFitMobile/src/components/shared/*` |
| Service | `GoFitMobile/src/services/auth.ts` |
| Store | `GoFitMobile/src/store/authStore.ts` |
| Supabase Tables | Supabase Auth; `user_profiles` |
| API Routes | N/A |
| Libraries | Supabase JS; expo-secure-store (via persisted stores) |

**Description:** Client credential flows, OTP reset, and password success UX.

**Technical flow:** User input validated locally → `authService` calls Supabase Auth → `authStore` mirrors session → `App.tsx` swaps navigators.


#### LoginScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/auth/LoginScreen.tsx |
| Components | `GoFitMobile/src/components/auth/*`; `GoFitMobile/src/components/shared/*` |
| Service | `GoFitMobile/src/services/auth.ts` |
| Store | `GoFitMobile/src/store/authStore.ts` |
| Supabase Tables | Supabase Auth; `user_profiles` |
| API Routes | N/A |
| Libraries | Supabase JS; expo-secure-store (via persisted stores) |

**Description:** Client credential flows, OTP reset, and password success UX.

**Technical flow:** User input validated locally → `authService` calls Supabase Auth → `authStore` mirrors session → `App.tsx` swaps navigators.


#### PasswordChangedSuccessScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/auth/PasswordChangedSuccessScreen.tsx |
| Components | `GoFitMobile/src/components/auth/*`; `GoFitMobile/src/components/shared/*` |
| Service | `GoFitMobile/src/services/auth.ts` |
| Store | `GoFitMobile/src/store/authStore.ts` |
| Supabase Tables | Supabase Auth; `user_profiles` |
| API Routes | N/A |
| Libraries | Supabase JS; expo-secure-store (via persisted stores) |

**Description:** Client credential flows, OTP reset, and password success UX.

**Technical flow:** User input validated locally → `authService` calls Supabase Auth → `authStore` mirrors session → `App.tsx` swaps navigators.


#### ResetPasswordScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/auth/ResetPasswordScreen.tsx |
| Components | `GoFitMobile/src/components/auth/*`; `GoFitMobile/src/components/shared/*` |
| Service | `GoFitMobile/src/services/auth.ts` |
| Store | `GoFitMobile/src/store/authStore.ts` |
| Supabase Tables | Supabase Auth; `user_profiles` |
| API Routes | N/A |
| Libraries | Supabase JS; expo-secure-store (via persisted stores) |

**Description:** Client credential flows, OTP reset, and password success UX.

**Technical flow:** User input validated locally → `authService` calls Supabase Auth → `authStore` mirrors session → `App.tsx` swaps navigators.


#### SignupScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/auth/SignupScreen.tsx |
| Components | `GoFitMobile/src/components/auth/*`; `GoFitMobile/src/components/shared/*` |
| Service | `GoFitMobile/src/services/auth.ts` |
| Store | `GoFitMobile/src/store/authStore.ts` |
| Supabase Tables | Supabase Auth; `user_profiles` |
| API Routes | N/A |
| Libraries | Supabase JS; expo-secure-store (via persisted stores) |

**Description:** Client credential flows, OTP reset, and password success UX.

**Technical flow:** User input validated locally → `authService` calls Supabase Auth → `authStore` mirrors session → `App.tsx` swaps navigators.


#### VerifyOtpScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/auth/VerifyOtpScreen.tsx |
| Components | `GoFitMobile/src/components/auth/*`; `GoFitMobile/src/components/shared/*` |
| Service | `GoFitMobile/src/services/auth.ts` |
| Store | `GoFitMobile/src/store/authStore.ts` |
| Supabase Tables | Supabase Auth; `user_profiles` |
| API Routes | N/A |
| Libraries | Supabase JS; expo-secure-store (via persisted stores) |

**Description:** Client credential flows, OTP reset, and password success UX.

**Technical flow:** User input validated locally → `authService` calls Supabase Auth → `authStore` mirrors session → `App.tsx` swaps navigators.


#### WelcomeScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/auth/WelcomeScreen.tsx |
| Components | `GoFitMobile/src/components/auth/*`; `GoFitMobile/src/components/shared/*` |
| Service | `GoFitMobile/src/services/auth.ts` |
| Store | `GoFitMobile/src/store/authStore.ts` |
| Supabase Tables | Supabase Auth; `user_profiles` |
| API Routes | N/A |
| Libraries | Supabase JS; expo-secure-store (via persisted stores) |

**Description:** Client credential flows, OTP reset, and password success UX.

**Technical flow:** User input validated locally → `authService` calls Supabase Auth → `authStore` mirrors session → `App.tsx` swaps navigators.


#### 🚀 Onboarding
#### OnboardingScreen1
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/onboarding/OnboardingScreen1.tsx |
| Components | `GoFitMobile/src/components/onboarding/*`; `GoFitMobile/src/components/shared/*` |
| Service | `GoFitMobile/src/services/userProfile.ts` |
| Store | `GoFitMobile/src/store/onboardingStore.ts`; `GoFitMobile/src/store/profileStore.ts` |
| Supabase Tables | `user_profiles` |
| API Routes | N/A |
| Libraries | zod (inside service); React Navigation |

**Description:** Collects anthropometrics, goals, and personal details after signup.

**Technical flow:** Each step persists partial profile data; completion flag stored per user id in `onboardingStore`.


#### OnboardingScreen2
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/onboarding/OnboardingScreen2.tsx |
| Components | `GoFitMobile/src/components/onboarding/*`; `GoFitMobile/src/components/shared/*` |
| Service | `GoFitMobile/src/services/userProfile.ts` |
| Store | `GoFitMobile/src/store/onboardingStore.ts`; `GoFitMobile/src/store/profileStore.ts` |
| Supabase Tables | `user_profiles` |
| API Routes | N/A |
| Libraries | zod (inside service); React Navigation |

**Description:** Collects anthropometrics, goals, and personal details after signup.

**Technical flow:** Each step persists partial profile data; completion flag stored per user id in `onboardingStore`.


#### OnboardingScreen3
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/onboarding/OnboardingScreen3.tsx |
| Components | `GoFitMobile/src/components/onboarding/*`; `GoFitMobile/src/components/shared/*` |
| Service | `GoFitMobile/src/services/userProfile.ts` |
| Store | `GoFitMobile/src/store/onboardingStore.ts`; `GoFitMobile/src/store/profileStore.ts` |
| Supabase Tables | `user_profiles` |
| API Routes | N/A |
| Libraries | zod (inside service); React Navigation |

**Description:** Collects anthropometrics, goals, and personal details after signup.

**Technical flow:** Each step persists partial profile data; completion flag stored per user id in `onboardingStore`.


#### OnboardingScreen4
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/onboarding/OnboardingScreen4.tsx |
| Components | `GoFitMobile/src/components/onboarding/*`; `GoFitMobile/src/components/shared/*` |
| Service | `GoFitMobile/src/services/userProfile.ts` |
| Store | `GoFitMobile/src/store/onboardingStore.ts`; `GoFitMobile/src/store/profileStore.ts` |
| Supabase Tables | `user_profiles` |
| API Routes | N/A |
| Libraries | zod (inside service); React Navigation |

**Description:** Collects anthropometrics, goals, and personal details after signup.

**Technical flow:** Each step persists partial profile data; completion flag stored per user id in `onboardingStore`.


#### OnboardingScreenPersonalDetails
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/onboarding/OnboardingScreenPersonalDetails.tsx |
| Components | `GoFitMobile/src/components/onboarding/*`; `GoFitMobile/src/components/shared/*` |
| Service | `GoFitMobile/src/services/userProfile.ts` |
| Store | `GoFitMobile/src/store/onboardingStore.ts`; `GoFitMobile/src/store/profileStore.ts` |
| Supabase Tables | `user_profiles` |
| API Routes | N/A |
| Libraries | zod (inside service); React Navigation |

**Description:** Collects anthropometrics, goals, and personal details after signup.

**Technical flow:** Each step persists partial profile data; completion flag stored per user id in `onboardingStore`.


#### 🏠 Home & Dashboard
#### Home dashboard
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/home/HomeScreen.tsx |
| Components | `GoFitMobile/src/components/home/*`; `GoFitMobile/src/components/shared/ScreenHeader.tsx`; `GoFitMobile/src/components/shared/TimerModal.tsx` |
| Service | `GoFitMobile/src/services/workouts.ts`; `workoutStats.ts`; `bodyMeasurements.ts`; `calendar.ts` |
| Store | `workoutsStore`; `profileStore`; `calendarStore`; `timerStore` |
| Supabase Tables | `workout_sessions`, `workouts`, `user_profiles` |
| API Routes | N/A |
| Libraries | date-fns; lucide-react-native; expo-blur; expo-image |

**Description:** Central hub for workouts, marketplace shortcuts, weather, streaks, and articles.

**Technical flow:** Focused hooks pull store data; CTA navigates into nested stacks for sessions, builder, or marketplace.


#### 🏋️ Workout Library
#### ExerciseDetailScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/library/ExerciseDetailScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*`; `GoFitMobile/src/components/workout/*` |
| Service | `workouts.ts`; `exercises.ts`; `workoutSessions.ts`; `workoutDetails.ts` |
| Store | `workoutsStore`; `timerStore` |
| Supabase Tables | `workouts`, `workout_exercises`, `exercises`, `workout_sessions`, `native_workouts` (per deployment) |
| API Routes | N/A |
| Libraries | expo-av (exercise media); i18next |

**Description:** Browse templates, customize sessions, and preview exercise metadata.

**Technical flow:** Library stack screens call workout and exercise services → Zustand caches results → list and detail UI render with filters and selection state.


#### ExerciseSelectionScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/library/ExerciseSelectionScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*`; `GoFitMobile/src/components/workout/*` |
| Service | `workouts.ts`; `exercises.ts`; `workoutSessions.ts`; `workoutDetails.ts` |
| Store | `workoutsStore`; `timerStore` |
| Supabase Tables | `workouts`, `workout_exercises`, `exercises`, `workout_sessions`, `native_workouts` (per deployment) |
| API Routes | N/A |
| Libraries | expo-av (exercise media); i18next |

**Description:** Browse templates, customize sessions, and preview exercise metadata.

**Technical flow:** Library stack screens call workout and exercise services → Zustand caches results → list and detail UI render with filters and selection state.


#### LibraryScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/library/LibraryScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*`; `GoFitMobile/src/components/workout/*` |
| Service | `workouts.ts`; `exercises.ts`; `workoutSessions.ts`; `workoutDetails.ts` |
| Store | `workoutsStore`; `timerStore` |
| Supabase Tables | `workouts`, `workout_exercises`, `exercises`, `workout_sessions`, `native_workouts` (per deployment) |
| API Routes | N/A |
| Libraries | expo-av (exercise media); i18next |

**Description:** Browse templates, customize sessions, and preview exercise metadata.

**Technical flow:** Library stack screens call workout and exercise services → Zustand caches results → list and detail UI render with filters and selection state.


#### WorkoutBuilderScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/library/WorkoutBuilderScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*`; `GoFitMobile/src/components/workout/*` |
| Service | `workouts.ts`; `exercises.ts`; `workoutSessions.ts`; `workoutDetails.ts` |
| Store | `workoutsStore`; `timerStore` |
| Supabase Tables | `workouts`, `workout_exercises`, `exercises`, `workout_sessions`, `native_workouts` (per deployment) |
| API Routes | N/A |
| Libraries | expo-av (exercise media); i18next |

**Description:** Browse templates, customize sessions, and preview exercise metadata.

**Technical flow:** Library stack screens call workout and exercise services → Zustand caches results → list and detail UI render with filters and selection state.


#### WorkoutDetailScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/library/WorkoutDetailScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*`; `GoFitMobile/src/components/workout/*` |
| Service | `workouts.ts`; `exercises.ts`; `workoutSessions.ts`; `workoutDetails.ts` |
| Store | `workoutsStore`; `timerStore` |
| Supabase Tables | `workouts`, `workout_exercises`, `exercises`, `workout_sessions`, `native_workouts` (per deployment) |
| API Routes | N/A |
| Libraries | expo-av (exercise media); i18next |

**Description:** Browse templates, customize sessions, and preview exercise metadata.

**Technical flow:** Library stack screens call workout and exercise services → Zustand caches results → list and detail UI render with filters and selection state.


#### WorkoutSessionScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/library/WorkoutSessionScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*`; `GoFitMobile/src/components/workout/*` |
| Service | `workouts.ts`; `exercises.ts`; `workoutSessions.ts`; `workoutDetails.ts` |
| Store | `workoutsStore`; `timerStore` |
| Supabase Tables | `workouts`, `workout_exercises`, `exercises`, `workout_sessions`, `native_workouts` (per deployment) |
| API Routes | N/A |
| Libraries | expo-av (exercise media); i18next |

**Description:** Browse templates, customize sessions, and preview exercise metadata.

**Technical flow:** Library stack screens call workout and exercise services → Zustand caches results → list and detail UI render with filters and selection state.


#### WorkoutSummaryScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/library/WorkoutSummaryScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*`; `GoFitMobile/src/components/workout/*` |
| Service | `workouts.ts`; `exercises.ts`; `workoutSessions.ts`; `workoutDetails.ts` |
| Store | `workoutsStore`; `timerStore` |
| Supabase Tables | `workouts`, `workout_exercises`, `exercises`, `workout_sessions`, `native_workouts` (per deployment) |
| API Routes | N/A |
| Libraries | expo-av (exercise media); i18next |

**Description:** Browse templates, customize sessions, and preview exercise metadata.

**Technical flow:** Library stack screens call workout and exercise services → Zustand caches results → list and detail UI render with filters and selection state.


#### 🔨 Workout Builder
Implemented primarily by `ExerciseSelectionScreen.tsx` and `WorkoutBuilderScreen.tsx` (see Workout Library entries). Users pick exercises, configure sets, reps, and rest, then save custom workouts owned by their profile.

#### 💪 Active Workout Session
`WorkoutSessionScreen.tsx` orchestrates set logging, pause and resume, and rest intervals using `GoFitMobile/src/components/workout/EnhancedRestTimer.tsx`, `RestTimerSettings.tsx`, and `GoFitMobile/src/hooks/useRestTimer.ts`. `WorkoutSummaryScreen.tsx` surfaces aggregates after completion. Data persists through `workoutSessions` and `workouts` services into `workout_sessions`.

#### 📊 Progress & Statistics
#### BodyMeasurementsScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/progress/BodyMeasurementsScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*` |
| Service | `workoutStats.ts`; `bodyMeasurements.ts` |
| Store | `profileStore` |
| Supabase Tables | `workout_sessions`; `body_measurements` |
| API Routes | Edge `body-measurements` for pose-derived measurements (optional path) |
| Libraries | Supabase JS; in-screen charts |

**Description:** Historical stats, PR detail, consistency heatmaps, manual measurements.

**Technical flow:** Services aggregate session rows or call measurement Edge function → UI charts update.


#### ConsistencyScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/progress/ConsistencyScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*` |
| Service | `workoutStats.ts`; `bodyMeasurements.ts` |
| Store | `profileStore` |
| Supabase Tables | `workout_sessions`; `body_measurements` |
| API Routes | Edge `body-measurements` for pose-derived measurements (optional path) |
| Libraries | Supabase JS; in-screen charts |

**Description:** Historical stats, PR detail, consistency heatmaps, manual measurements.

**Technical flow:** Services aggregate session rows or call measurement Edge function → UI charts update.


#### RecordDetailsScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/progress/RecordDetailsScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*` |
| Service | `workoutStats.ts`; `bodyMeasurements.ts` |
| Store | `profileStore` |
| Supabase Tables | `workout_sessions`; `body_measurements` |
| API Routes | Edge `body-measurements` for pose-derived measurements (optional path) |
| Libraries | Supabase JS; in-screen charts |

**Description:** Historical stats, PR detail, consistency heatmaps, manual measurements.

**Technical flow:** Services aggregate session rows or call measurement Edge function → UI charts update.


#### WorkoutStatisticsScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/progress/WorkoutStatisticsScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*` |
| Service | `workoutStats.ts`; `bodyMeasurements.ts` |
| Store | `profileStore` |
| Supabase Tables | `workout_sessions`; `body_measurements` |
| API Routes | Edge `body-measurements` for pose-derived measurements (optional path) |
| Libraries | Supabase JS; in-screen charts |

**Description:** Historical stats, PR detail, consistency heatmaps, manual measurements.

**Technical flow:** Services aggregate session rows or call measurement Edge function → UI charts update.


#### 🗓️ Workout Plans & Calendar
#### CalendarView
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/plan/CalendarView.tsx |
| Components | `GoFitMobile/src/components/plan/*` |
| Service | `workoutPlans.ts`; `workouts.ts` |
| Store | `workoutPlansStore`; `calendarStore`; `sessionsStore` |
| Supabase Tables | `workout_plans`; `workout_sessions` |
| API Routes | N/A |
| Libraries | date-fns; expo-haptics in calendar UI |

**Description:** Plan workouts on the calendar, adjust times, open gym bag modal.

**Technical flow:** `WorkoutsScreen` composes `Timeline`, `MyWorkouts`, and `CalendarView` to mutate `workout_plans` rows.


#### MyWorkouts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/plan/MyWorkouts.tsx |
| Components | `GoFitMobile/src/components/plan/*` |
| Service | `workoutPlans.ts`; `workouts.ts` |
| Store | `workoutPlansStore`; `calendarStore`; `sessionsStore` |
| Supabase Tables | `workout_plans`; `workout_sessions` |
| API Routes | N/A |
| Libraries | date-fns; expo-haptics in calendar UI |

**Description:** Plan workouts on the calendar, adjust times, open gym bag modal.

**Technical flow:** `WorkoutsScreen` composes `Timeline`, `MyWorkouts`, and `CalendarView` to mutate `workout_plans` rows.


#### Timeline
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/plan/Timeline.tsx |
| Components | `GoFitMobile/src/components/plan/*` |
| Service | `workoutPlans.ts`; `workouts.ts` |
| Store | `workoutPlansStore`; `calendarStore`; `sessionsStore` |
| Supabase Tables | `workout_plans`; `workout_sessions` |
| API Routes | N/A |
| Libraries | date-fns; expo-haptics in calendar UI |

**Description:** Plan workouts on the calendar, adjust times, open gym bag modal.

**Technical flow:** `WorkoutsScreen` composes `Timeline`, `MyWorkouts`, and `CalendarView` to mutate `workout_plans` rows.


#### WorkoutsScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/plan/WorkoutsScreen.tsx |
| Components | `GoFitMobile/src/components/plan/*` |
| Service | `workoutPlans.ts`; `workouts.ts` |
| Store | `workoutPlansStore`; `calendarStore`; `sessionsStore` |
| Supabase Tables | `workout_plans`; `workout_sessions` |
| API Routes | N/A |
| Libraries | date-fns; expo-haptics in calendar UI |

**Description:** Plan workouts on the calendar, adjust times, open gym bag modal.

**Technical flow:** `WorkoutsScreen` composes `Timeline`, `MyWorkouts`, and `CalendarView` to mutate `workout_plans` rows.


#### 🛒 Coach Marketplace
#### BookSessionScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/marketplace/BookSessionScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*` |
| Service | `marketplace.ts`; `bookings.ts` |
| Store | `marketplaceStore` |
| Supabase Tables | `coach_profiles`, `coach_certifications`, `coach_reviews`, `user_profiles`, `session_packs` |
| API Routes | N/A |
| Libraries | Supabase JS |

**Description:** Discover coaches, inspect profiles, initiate bookings.

**Technical flow:** Marketplace service composes joins for certifications and reviews; navigation passes ids into booking screens.


#### CoachDetailScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/marketplace/CoachDetailScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*` |
| Service | `marketplace.ts`; `bookings.ts` |
| Store | `marketplaceStore` |
| Supabase Tables | `coach_profiles`, `coach_certifications`, `coach_reviews`, `user_profiles`, `session_packs` |
| API Routes | N/A |
| Libraries | Supabase JS |

**Description:** Discover coaches, inspect profiles, initiate bookings.

**Technical flow:** Marketplace service composes joins for certifications and reviews; navigation passes ids into booking screens.


#### MarketplaceScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/marketplace/MarketplaceScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*` |
| Service | `marketplace.ts`; `bookings.ts` |
| Store | `marketplaceStore` |
| Supabase Tables | `coach_profiles`, `coach_certifications`, `coach_reviews`, `user_profiles`, `session_packs` |
| API Routes | N/A |
| Libraries | Supabase JS |

**Description:** Discover coaches, inspect profiles, initiate bookings.

**Technical flow:** Marketplace service composes joins for certifications and reviews; navigation passes ids into booking screens.


#### 📅 Bookings
Client booking surfaces: `GoFitMobile/src/screens/marketplace/BookSessionScreen.tsx` and `GoFitMobile/src/screens/profile/MyBookingsScreen.tsx` (see their rows under Marketplace and Profile).

#### 💬 Real-time Chat
#### ConversationsListScreen (client stacks)
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/coach-app/ConversationsListScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*` |
| Service | `chat.ts` |
| Store | `chatStore` |
| Supabase Tables | `conversations`, `messages`, `coach_profiles` |
| API Routes | N/A |
| Libraries | Supabase Realtime; expo-image-picker |

**Description:** DM threads between clients and coaches.

**Technical flow:** Initial fetch plus channel subscription updates Zustand → inverted list renders attachments.


#### ChatScreen (client stacks)
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/coach-app/ChatScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*` |
| Service | `chat.ts` |
| Store | `chatStore` |
| Supabase Tables | `conversations`, `messages`, `coach_profiles` |
| API Routes | N/A |
| Libraries | Supabase Realtime; expo-image-picker |

**Description:** DM threads between clients and coaches.

**Technical flow:** Initial fetch plus channel subscription updates Zustand → inverted list renders attachments.


#### 📹 Video Calls
#### VideoCallScreen (client stacks)
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/coach-app/VideoCallScreen.tsx (registered in `AppNavigator` Home and Profile stacks) |
| Components | Shared UI primitives |
| Service | `videoCall.ts` |
| Store | N/A |
| Supabase Tables | `bookings` |
| API Routes | Edge `generate-video-token` |
| Libraries | livekit-client; Expo dev build requirement (per `en.json`) |

**Description:** Securely joins LiveKit rooms scoped to bookings.

**Technical flow:** Loads booking metadata → POST Edge function for JWT → LiveKit SDK connects using token and URL.


#### 🔔 Notifications
#### NotificationsSettingsScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/profile/NotificationsSettingsScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*` |
| Service | `notifications.ts`; `notificationInbox.ts` |
| Store | `profileStore` |
| Supabase Tables | `user_profiles.notification_preferences`; `notifications`; `push_tokens` |
| API Routes | Edge `send-push-notification` |
| Libraries | expo-notifications |

**Description:** Preference center plus transactional inbox and test notification UI.

**Technical flow:** Settings persist JSON on profile; inbox queries `notifications`; `App.tsx` shows `NotificationBanner` for foreground events.


#### NotificationInboxScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/profile/NotificationInboxScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*` |
| Service | `notifications.ts`; `notificationInbox.ts` |
| Store | `profileStore` |
| Supabase Tables | `user_profiles.notification_preferences`; `notifications`; `push_tokens` |
| API Routes | Edge `send-push-notification` |
| Libraries | expo-notifications |

**Description:** Preference center plus transactional inbox and test notification UI.

**Technical flow:** Settings persist JSON on profile; inbox queries `notifications`; `App.tsx` shows `NotificationBanner` for foreground events.


#### 📦 Programs & Session Packs
#### MyPacksScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/profile/MyPacksScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*` |
| Service | `programs.ts`; `sessionPacks.ts` |
| Store | `programsStore`; `packsStore` |
| Supabase Tables | `custom_programs`, `session_packs`, `purchased_packs` |
| API Routes | N/A |
| Libraries | Supabase JS |

**Description:** Client-visible programs and purchased packs from coaches.

**Technical flow:** Stores hydrate from Supabase → detail screens render structured day, meal, and workout content.


#### MyProgramsScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/profile/MyProgramsScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*` |
| Service | `programs.ts`; `sessionPacks.ts` |
| Store | `programsStore`; `packsStore` |
| Supabase Tables | `custom_programs`, `session_packs`, `purchased_packs` |
| API Routes | N/A |
| Libraries | Supabase JS |

**Description:** Client-visible programs and purchased packs from coaches.

**Technical flow:** Stores hydrate from Supabase → detail screens render structured day, meal, and workout content.


#### ProgramDetailScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/profile/ProgramDetailScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*` |
| Service | `programs.ts`; `sessionPacks.ts` |
| Store | `programsStore`; `packsStore` |
| Supabase Tables | `custom_programs`, `session_packs`, `purchased_packs` |
| API Routes | N/A |
| Libraries | Supabase JS |

**Description:** Client-visible programs and purchased packs from coaches.

**Technical flow:** Stores hydrate from Supabase → detail screens render structured day, meal, and workout content.


#### 👤 Profile & Settings
#### AccountInformationScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/profile/AccountInformationScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*`; `GoFitMobile/src/components/auth/*` (password flows) |
| Service | `userProfile.ts`; `auth.ts` |
| Store | `profileStore`; `themeStore`; `languageStore`; `textSizeStore` |
| Supabase Tables | `user_profiles`; bucket `profile-pictures` |
| API Routes | N/A |
| Libraries | i18next; zod; expo-image-picker |

**Description:** Profile editing, preferences, legal, sign-out and delete.

**Technical flow:** Validated mutations via `userProfileService` and Supabase Storage for avatars.


#### EditProfileScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/profile/EditProfileScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*`; `GoFitMobile/src/components/auth/*` (password flows) |
| Service | `userProfile.ts`; `auth.ts` |
| Store | `profileStore`; `themeStore`; `languageStore`; `textSizeStore` |
| Supabase Tables | `user_profiles`; bucket `profile-pictures` |
| API Routes | N/A |
| Libraries | i18next; zod; expo-image-picker |

**Description:** Profile editing, preferences, legal, sign-out and delete.

**Technical flow:** Validated mutations via `userProfileService` and Supabase Storage for avatars.


#### EditWeightHeightScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/profile/EditWeightHeightScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*`; `GoFitMobile/src/components/auth/*` (password flows) |
| Service | `userProfile.ts`; `auth.ts` |
| Store | `profileStore`; `themeStore`; `languageStore`; `textSizeStore` |
| Supabase Tables | `user_profiles`; bucket `profile-pictures` |
| API Routes | N/A |
| Libraries | i18next; zod; expo-image-picker |

**Description:** Profile editing, preferences, legal, sign-out and delete.

**Technical flow:** Validated mutations via `userProfileService` and Supabase Storage for avatars.


#### GoalsScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/profile/GoalsScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*`; `GoFitMobile/src/components/auth/*` (password flows) |
| Service | `userProfile.ts`; `auth.ts` |
| Store | `profileStore`; `themeStore`; `languageStore`; `textSizeStore` |
| Supabase Tables | `user_profiles`; bucket `profile-pictures` |
| API Routes | N/A |
| Libraries | i18next; zod; expo-image-picker |

**Description:** Profile editing, preferences, legal, sign-out and delete.

**Technical flow:** Validated mutations via `userProfileService` and Supabase Storage for avatars.


#### LanguageSettingsScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/profile/LanguageSettingsScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*`; `GoFitMobile/src/components/auth/*` (password flows) |
| Service | `userProfile.ts`; `auth.ts` |
| Store | `profileStore`; `themeStore`; `languageStore`; `textSizeStore` |
| Supabase Tables | `user_profiles`; bucket `profile-pictures` |
| API Routes | N/A |
| Libraries | i18next; zod; expo-image-picker |

**Description:** Profile editing, preferences, legal, sign-out and delete.

**Technical flow:** Validated mutations via `userProfileService` and Supabase Storage for avatars.


#### MyBookingsScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/profile/MyBookingsScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*`; `GoFitMobile/src/components/auth/*` (password flows) |
| Service | `userProfile.ts`; `auth.ts` |
| Store | `profileStore`; `themeStore`; `languageStore`; `textSizeStore` |
| Supabase Tables | `user_profiles`; bucket `profile-pictures` |
| API Routes | N/A |
| Libraries | i18next; zod; expo-image-picker |

**Description:** Profile editing, preferences, legal, sign-out and delete.

**Technical flow:** Validated mutations via `userProfileService` and Supabase Storage for avatars.


#### PrivacyPolicyScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/profile/PrivacyPolicyScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*`; `GoFitMobile/src/components/auth/*` (password flows) |
| Service | `userProfile.ts`; `auth.ts` |
| Store | `profileStore`; `themeStore`; `languageStore`; `textSizeStore` |
| Supabase Tables | `user_profiles`; bucket `profile-pictures` |
| API Routes | N/A |
| Libraries | i18next; zod; expo-image-picker |

**Description:** Profile editing, preferences, legal, sign-out and delete.

**Technical flow:** Validated mutations via `userProfileService` and Supabase Storage for avatars.


#### ProfileScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/profile/ProfileScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*`; `GoFitMobile/src/components/auth/*` (password flows) |
| Service | `userProfile.ts`; `auth.ts` |
| Store | `profileStore`; `themeStore`; `languageStore`; `textSizeStore` |
| Supabase Tables | `user_profiles`; bucket `profile-pictures` |
| API Routes | N/A |
| Libraries | i18next; zod; expo-image-picker |

**Description:** Profile editing, preferences, legal, sign-out and delete.

**Technical flow:** Validated mutations via `userProfileService` and Supabase Storage for avatars.


#### TermsOfServiceScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/profile/TermsOfServiceScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*`; `GoFitMobile/src/components/auth/*` (password flows) |
| Service | `userProfile.ts`; `auth.ts` |
| Store | `profileStore`; `themeStore`; `languageStore`; `textSizeStore` |
| Supabase Tables | `user_profiles`; bucket `profile-pictures` |
| API Routes | N/A |
| Libraries | i18next; zod; expo-image-picker |

**Description:** Profile editing, preferences, legal, sign-out and delete.

**Technical flow:** Validated mutations via `userProfileService` and Supabase Storage for avatars.


#### TextSizeSettingsScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/profile/TextSizeSettingsScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*`; `GoFitMobile/src/components/auth/*` (password flows) |
| Service | `userProfile.ts`; `auth.ts` |
| Store | `profileStore`; `themeStore`; `languageStore`; `textSizeStore` |
| Supabase Tables | `user_profiles`; bucket `profile-pictures` |
| API Routes | N/A |
| Libraries | i18next; zod; expo-image-picker |

**Description:** Profile editing, preferences, legal, sign-out and delete.

**Technical flow:** Validated mutations via `userProfileService` and Supabase Storage for avatars.


#### ThemeSettingsScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/profile/ThemeSettingsScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*`; `GoFitMobile/src/components/auth/*` (password flows) |
| Service | `userProfile.ts`; `auth.ts` |
| Store | `profileStore`; `themeStore`; `languageStore`; `textSizeStore` |
| Supabase Tables | `user_profiles`; bucket `profile-pictures` |
| API Routes | N/A |
| Libraries | i18next; zod; expo-image-picker |

**Description:** Profile editing, preferences, legal, sign-out and delete.

**Technical flow:** Validated mutations via `userProfileService` and Supabase Storage for avatars.


#### UnitPreferencesScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/profile/UnitPreferencesScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*`; `GoFitMobile/src/components/auth/*` (password flows) |
| Service | `userProfile.ts`; `auth.ts` |
| Store | `profileStore`; `themeStore`; `languageStore`; `textSizeStore` |
| Supabase Tables | `user_profiles`; bucket `profile-pictures` |
| API Routes | N/A |
| Libraries | i18next; zod; expo-image-picker |

**Description:** Profile editing, preferences, legal, sign-out and delete.

**Technical flow:** Validated mutations via `userProfileService` and Supabase Storage for avatars.


#### 🌍 Internationalization (EN/FR)
#### i18n bootstrap
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | Imported in `GoFitMobile/App.tsx` (`./src/i18n`) |
| Components | All screens using `react-i18next` / `AppText` |
| Service | N/A |
| Store | `languageStore` |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | i18next; react-i18next; `en.json`; `fr.json` |

**Description:** Localized copy for every major module including marketplace and coach flows.

**Technical flow:** `languageStore` changes language → tree re-renders; some strings remind users to restart for full effect.


#### ♿ Accessibility (text size, haptics)
#### Dynamic typography and haptics
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | `TextSizeSettingsScreen.tsx`; various screens import `expo-haptics` |
| Components | `GoFitMobile/src/components/shared/AppText.tsx` |
| Service | N/A |
| Store | `textSizeStore` |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | expo-haptics; persisted multiplier |

**Description:** Improves readability and tactile confirmations.

**Technical flow:** `AppText` multiplies font sizes; interactive controls trigger `Haptics.selectionAsync` patterns.


#### 🔗 Deep Linking
#### Coach profile deep links
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | `GoFitMobile/App.tsx` linking config and `Linking` listeners |
| Components | N/A |
| Service | N/A |
| Store | `deepLinkStore` |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | React Navigation deep linking (`gofit://`) |

**Description:** Queues `gofit://coach/:coachId` until a logged-in client finishes onboarding.

**Technical flow:** `parseGoFitUrl` captures UUID → `setPending` → after session and onboarding `consumePending` navigates to `Home/CoachDetail`.


#### ⚙️ Utilities & Hooks
#### Service: auth.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (shared by surfaces) |
| Screen / Route | Referenced throughout screens and stores |
| Components | N/A |
| Service | GoFitMobile/src/services/auth.ts |
| Store | Multiple stores |
| Supabase Tables | Inspect `.from(` usage inside file |
| API Routes | Optional Edge calls per service |
| Libraries | Supabase JS; zod when used |

**Description:** Domain-specific Supabase orchestration.

**Technical flow:** Exports async helpers consumed by UI layers; centralizes retries and errors when paired with `apiClient`.


#### Service: bodyMeasurements.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (shared by surfaces) |
| Screen / Route | Referenced throughout screens and stores |
| Components | N/A |
| Service | GoFitMobile/src/services/bodyMeasurements.ts |
| Store | Multiple stores |
| Supabase Tables | Inspect `.from(` usage inside file |
| API Routes | Optional Edge calls per service |
| Libraries | Supabase JS; zod when used |

**Description:** Domain-specific Supabase orchestration.

**Technical flow:** Exports async helpers consumed by UI layers; centralizes retries and errors when paired with `apiClient`.


#### Service: bookings.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (shared by surfaces) |
| Screen / Route | Referenced throughout screens and stores |
| Components | N/A |
| Service | GoFitMobile/src/services/bookings.ts |
| Store | Multiple stores |
| Supabase Tables | Inspect `.from(` usage inside file |
| API Routes | Optional Edge calls per service |
| Libraries | Supabase JS; zod when used |

**Description:** Domain-specific Supabase orchestration.

**Technical flow:** Exports async helpers consumed by UI layers; centralizes retries and errors when paired with `apiClient`.


#### Service: calendar.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (shared by surfaces) |
| Screen / Route | Referenced throughout screens and stores |
| Components | N/A |
| Service | GoFitMobile/src/services/calendar.ts |
| Store | Multiple stores |
| Supabase Tables | Inspect `.from(` usage inside file |
| API Routes | Optional Edge calls per service |
| Libraries | Supabase JS; zod when used |

**Description:** Domain-specific Supabase orchestration.

**Technical flow:** Exports async helpers consumed by UI layers; centralizes retries and errors when paired with `apiClient`.


#### Service: chat.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (shared by surfaces) |
| Screen / Route | Referenced throughout screens and stores |
| Components | N/A |
| Service | GoFitMobile/src/services/chat.ts |
| Store | Multiple stores |
| Supabase Tables | Inspect `.from(` usage inside file |
| API Routes | Optional Edge calls per service |
| Libraries | Supabase JS; zod when used |

**Description:** Domain-specific Supabase orchestration.

**Technical flow:** Exports async helpers consumed by UI layers; centralizes retries and errors when paired with `apiClient`.


#### Service: clientManagement.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (shared by surfaces) |
| Screen / Route | Referenced throughout screens and stores |
| Components | N/A |
| Service | GoFitMobile/src/services/clientManagement.ts |
| Store | Multiple stores |
| Supabase Tables | Inspect `.from(` usage inside file |
| API Routes | Optional Edge calls per service |
| Libraries | Supabase JS; zod when used |

**Description:** Domain-specific Supabase orchestration.

**Technical flow:** Exports async helpers consumed by UI layers; centralizes retries and errors when paired with `apiClient`.


#### Service: coachProfile.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (shared by surfaces) |
| Screen / Route | Referenced throughout screens and stores |
| Components | N/A |
| Service | GoFitMobile/src/services/coachProfile.ts |
| Store | Multiple stores |
| Supabase Tables | Inspect `.from(` usage inside file |
| API Routes | Optional Edge calls per service |
| Libraries | Supabase JS; zod when used |

**Description:** Domain-specific Supabase orchestration.

**Technical flow:** Exports async helpers consumed by UI layers; centralizes retries and errors when paired with `apiClient`.


#### Service: exercises.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (shared by surfaces) |
| Screen / Route | Referenced throughout screens and stores |
| Components | N/A |
| Service | GoFitMobile/src/services/exercises.ts |
| Store | Multiple stores |
| Supabase Tables | Inspect `.from(` usage inside file |
| API Routes | Optional Edge calls per service |
| Libraries | Supabase JS; zod when used |

**Description:** Domain-specific Supabase orchestration.

**Technical flow:** Exports async helpers consumed by UI layers; centralizes retries and errors when paired with `apiClient`.


#### Service: marketplace.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (shared by surfaces) |
| Screen / Route | Referenced throughout screens and stores |
| Components | N/A |
| Service | GoFitMobile/src/services/marketplace.ts |
| Store | Multiple stores |
| Supabase Tables | Inspect `.from(` usage inside file |
| API Routes | Optional Edge calls per service |
| Libraries | Supabase JS; zod when used |

**Description:** Domain-specific Supabase orchestration.

**Technical flow:** Exports async helpers consumed by UI layers; centralizes retries and errors when paired with `apiClient`.


#### Service: notificationInbox.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (shared by surfaces) |
| Screen / Route | Referenced throughout screens and stores |
| Components | N/A |
| Service | GoFitMobile/src/services/notificationInbox.ts |
| Store | Multiple stores |
| Supabase Tables | Inspect `.from(` usage inside file |
| API Routes | Optional Edge calls per service |
| Libraries | Supabase JS; zod when used |

**Description:** Domain-specific Supabase orchestration.

**Technical flow:** Exports async helpers consumed by UI layers; centralizes retries and errors when paired with `apiClient`.


#### Service: notifications.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (shared by surfaces) |
| Screen / Route | Referenced throughout screens and stores |
| Components | N/A |
| Service | GoFitMobile/src/services/notifications.ts |
| Store | Multiple stores |
| Supabase Tables | Inspect `.from(` usage inside file |
| API Routes | Optional Edge calls per service |
| Libraries | Supabase JS; zod when used |

**Description:** Domain-specific Supabase orchestration.

**Technical flow:** Exports async helpers consumed by UI layers; centralizes retries and errors when paired with `apiClient`.


#### Service: programs.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (shared by surfaces) |
| Screen / Route | Referenced throughout screens and stores |
| Components | N/A |
| Service | GoFitMobile/src/services/programs.ts |
| Store | Multiple stores |
| Supabase Tables | Inspect `.from(` usage inside file |
| API Routes | Optional Edge calls per service |
| Libraries | Supabase JS; zod when used |

**Description:** Domain-specific Supabase orchestration.

**Technical flow:** Exports async helpers consumed by UI layers; centralizes retries and errors when paired with `apiClient`.


#### Service: pushNotification.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (shared by surfaces) |
| Screen / Route | Referenced throughout screens and stores |
| Components | N/A |
| Service | GoFitMobile/src/services/pushNotification.ts |
| Store | Multiple stores |
| Supabase Tables | Inspect `.from(` usage inside file |
| API Routes | Optional Edge calls per service |
| Libraries | Supabase JS; zod when used |

**Description:** Domain-specific Supabase orchestration.

**Technical flow:** Exports async helpers consumed by UI layers; centralizes retries and errors when paired with `apiClient`.


#### Service: sessionPacks.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (shared by surfaces) |
| Screen / Route | Referenced throughout screens and stores |
| Components | N/A |
| Service | GoFitMobile/src/services/sessionPacks.ts |
| Store | Multiple stores |
| Supabase Tables | Inspect `.from(` usage inside file |
| API Routes | Optional Edge calls per service |
| Libraries | Supabase JS; zod when used |

**Description:** Domain-specific Supabase orchestration.

**Technical flow:** Exports async helpers consumed by UI layers; centralizes retries and errors when paired with `apiClient`.


#### Service: userProfile.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (shared by surfaces) |
| Screen / Route | Referenced throughout screens and stores |
| Components | N/A |
| Service | GoFitMobile/src/services/userProfile.ts |
| Store | Multiple stores |
| Supabase Tables | Inspect `.from(` usage inside file |
| API Routes | Optional Edge calls per service |
| Libraries | Supabase JS; zod when used |

**Description:** Domain-specific Supabase orchestration.

**Technical flow:** Exports async helpers consumed by UI layers; centralizes retries and errors when paired with `apiClient`.


#### Service: videoCall.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (shared by surfaces) |
| Screen / Route | Referenced throughout screens and stores |
| Components | N/A |
| Service | GoFitMobile/src/services/videoCall.ts |
| Store | Multiple stores |
| Supabase Tables | Inspect `.from(` usage inside file |
| API Routes | Optional Edge calls per service |
| Libraries | Supabase JS; zod when used |

**Description:** Domain-specific Supabase orchestration.

**Technical flow:** Exports async helpers consumed by UI layers; centralizes retries and errors when paired with `apiClient`.


#### Service: wallet.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (shared by surfaces) |
| Screen / Route | Referenced throughout screens and stores |
| Components | N/A |
| Service | GoFitMobile/src/services/wallet.ts |
| Store | Multiple stores |
| Supabase Tables | Inspect `.from(` usage inside file |
| API Routes | Optional Edge calls per service |
| Libraries | Supabase JS; zod when used |

**Description:** Domain-specific Supabase orchestration.

**Technical flow:** Exports async helpers consumed by UI layers; centralizes retries and errors when paired with `apiClient`.


#### Service: workoutDetails.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (shared by surfaces) |
| Screen / Route | Referenced throughout screens and stores |
| Components | N/A |
| Service | GoFitMobile/src/services/workoutDetails.ts |
| Store | Multiple stores |
| Supabase Tables | Inspect `.from(` usage inside file |
| API Routes | Optional Edge calls per service |
| Libraries | Supabase JS; zod when used |

**Description:** Domain-specific Supabase orchestration.

**Technical flow:** Exports async helpers consumed by UI layers; centralizes retries and errors when paired with `apiClient`.


#### Service: workoutPlans.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (shared by surfaces) |
| Screen / Route | Referenced throughout screens and stores |
| Components | N/A |
| Service | GoFitMobile/src/services/workoutPlans.ts |
| Store | Multiple stores |
| Supabase Tables | Inspect `.from(` usage inside file |
| API Routes | Optional Edge calls per service |
| Libraries | Supabase JS; zod when used |

**Description:** Domain-specific Supabase orchestration.

**Technical flow:** Exports async helpers consumed by UI layers; centralizes retries and errors when paired with `apiClient`.


#### Service: workouts.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (shared by surfaces) |
| Screen / Route | Referenced throughout screens and stores |
| Components | N/A |
| Service | GoFitMobile/src/services/workouts.ts |
| Store | Multiple stores |
| Supabase Tables | Inspect `.from(` usage inside file |
| API Routes | Optional Edge calls per service |
| Libraries | Supabase JS; zod when used |

**Description:** Domain-specific Supabase orchestration.

**Technical flow:** Exports async helpers consumed by UI layers; centralizes retries and errors when paired with `apiClient`.


#### Service: workoutSessions.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (shared by surfaces) |
| Screen / Route | Referenced throughout screens and stores |
| Components | N/A |
| Service | GoFitMobile/src/services/workoutSessions.ts |
| Store | Multiple stores |
| Supabase Tables | Inspect `.from(` usage inside file |
| API Routes | Optional Edge calls per service |
| Libraries | Supabase JS; zod when used |

**Description:** Domain-specific Supabase orchestration.

**Technical flow:** Exports async helpers consumed by UI layers; centralizes retries and errors when paired with `apiClient`.


#### Service: workoutStats.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (shared by surfaces) |
| Screen / Route | Referenced throughout screens and stores |
| Components | N/A |
| Service | GoFitMobile/src/services/workoutStats.ts |
| Store | Multiple stores |
| Supabase Tables | Inspect `.from(` usage inside file |
| API Routes | Optional Edge calls per service |
| Libraries | Supabase JS; zod when used |

**Description:** Domain-specific Supabase orchestration.

**Technical flow:** Exports async helpers consumed by UI layers; centralizes retries and errors when paired with `apiClient`.


#### Store: authStore.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | N/A |
| Components | N/A |
| Service | N/A |
| Store | GoFitMobile/src/store/authStore.ts |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | zustand (persist middleware for applicable stores) |

**Description:** Composable client state.

**Technical flow:** Selectors and actions defined with `create`; persisted slices hydrate from async storage.


#### Store: bookingsStore.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | N/A |
| Components | N/A |
| Service | N/A |
| Store | GoFitMobile/src/store/bookingsStore.ts |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | zustand (persist middleware for applicable stores) |

**Description:** Composable client state.

**Technical flow:** Selectors and actions defined with `create`; persisted slices hydrate from async storage.


#### Store: calendarStore.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | N/A |
| Components | N/A |
| Service | N/A |
| Store | GoFitMobile/src/store/calendarStore.ts |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | zustand (persist middleware for applicable stores) |

**Description:** Composable client state.

**Technical flow:** Selectors and actions defined with `create`; persisted slices hydrate from async storage.


#### Store: chatStore.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | N/A |
| Components | N/A |
| Service | N/A |
| Store | GoFitMobile/src/store/chatStore.ts |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | zustand (persist middleware for applicable stores) |

**Description:** Composable client state.

**Technical flow:** Selectors and actions defined with `create`; persisted slices hydrate from async storage.


#### Store: clientManagementStore.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | N/A |
| Components | N/A |
| Service | N/A |
| Store | GoFitMobile/src/store/clientManagementStore.ts |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | zustand (persist middleware for applicable stores) |

**Description:** Composable client state.

**Technical flow:** Selectors and actions defined with `create`; persisted slices hydrate from async storage.


#### Store: coachStore.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | N/A |
| Components | N/A |
| Service | N/A |
| Store | GoFitMobile/src/store/coachStore.ts |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | zustand (persist middleware for applicable stores) |

**Description:** Composable client state.

**Technical flow:** Selectors and actions defined with `create`; persisted slices hydrate from async storage.


#### Store: deepLinkStore.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | N/A |
| Components | N/A |
| Service | N/A |
| Store | GoFitMobile/src/store/deepLinkStore.ts |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | zustand (persist middleware for applicable stores) |

**Description:** Composable client state.

**Technical flow:** Selectors and actions defined with `create`; persisted slices hydrate from async storage.


#### Store: languageStore.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | N/A |
| Components | N/A |
| Service | N/A |
| Store | GoFitMobile/src/store/languageStore.ts |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | zustand (persist middleware for applicable stores) |

**Description:** Composable client state.

**Technical flow:** Selectors and actions defined with `create`; persisted slices hydrate from async storage.


#### Store: marketplaceStore.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | N/A |
| Components | N/A |
| Service | N/A |
| Store | GoFitMobile/src/store/marketplaceStore.ts |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | zustand (persist middleware for applicable stores) |

**Description:** Composable client state.

**Technical flow:** Selectors and actions defined with `create`; persisted slices hydrate from async storage.


#### Store: onboardingStore.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | N/A |
| Components | N/A |
| Service | N/A |
| Store | GoFitMobile/src/store/onboardingStore.ts |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | zustand (persist middleware for applicable stores) |

**Description:** Composable client state.

**Technical flow:** Selectors and actions defined with `create`; persisted slices hydrate from async storage.


#### Store: packsStore.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | N/A |
| Components | N/A |
| Service | N/A |
| Store | GoFitMobile/src/store/packsStore.ts |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | zustand (persist middleware for applicable stores) |

**Description:** Composable client state.

**Technical flow:** Selectors and actions defined with `create`; persisted slices hydrate from async storage.


#### Store: profileStore.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | N/A |
| Components | N/A |
| Service | N/A |
| Store | GoFitMobile/src/store/profileStore.ts |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | zustand (persist middleware for applicable stores) |

**Description:** Composable client state.

**Technical flow:** Selectors and actions defined with `create`; persisted slices hydrate from async storage.


#### Store: programsStore.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | N/A |
| Components | N/A |
| Service | N/A |
| Store | GoFitMobile/src/store/programsStore.ts |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | zustand (persist middleware for applicable stores) |

**Description:** Composable client state.

**Technical flow:** Selectors and actions defined with `create`; persisted slices hydrate from async storage.


#### Store: sessionsStore.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | N/A |
| Components | N/A |
| Service | N/A |
| Store | GoFitMobile/src/store/sessionsStore.ts |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | zustand (persist middleware for applicable stores) |

**Description:** Composable client state.

**Technical flow:** Selectors and actions defined with `create`; persisted slices hydrate from async storage.


#### Store: textSizeStore.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | N/A |
| Components | N/A |
| Service | N/A |
| Store | GoFitMobile/src/store/textSizeStore.ts |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | zustand (persist middleware for applicable stores) |

**Description:** Composable client state.

**Technical flow:** Selectors and actions defined with `create`; persisted slices hydrate from async storage.


#### Store: themeStore.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | N/A |
| Components | N/A |
| Service | N/A |
| Store | GoFitMobile/src/store/themeStore.ts |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | zustand (persist middleware for applicable stores) |

**Description:** Composable client state.

**Technical flow:** Selectors and actions defined with `create`; persisted slices hydrate from async storage.


#### Store: timerStore.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | N/A |
| Components | N/A |
| Service | N/A |
| Store | GoFitMobile/src/store/timerStore.ts |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | zustand (persist middleware for applicable stores) |

**Description:** Composable client state.

**Technical flow:** Selectors and actions defined with `create`; persisted slices hydrate from async storage.


#### Store: uiStore.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | N/A |
| Components | N/A |
| Service | N/A |
| Store | GoFitMobile/src/store/uiStore.ts |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | zustand (persist middleware for applicable stores) |

**Description:** Composable client state.

**Technical flow:** Selectors and actions defined with `create`; persisted slices hydrate from async storage.


#### Store: workoutPlansStore.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | N/A |
| Components | N/A |
| Service | N/A |
| Store | GoFitMobile/src/store/workoutPlansStore.ts |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | zustand (persist middleware for applicable stores) |

**Description:** Composable client state.

**Technical flow:** Selectors and actions defined with `create`; persisted slices hydrate from async storage.


#### Store: workoutsStore.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | N/A |
| Components | N/A |
| Service | N/A |
| Store | GoFitMobile/src/store/workoutsStore.ts |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | zustand (persist middleware for applicable stores) |

**Description:** Composable client state.

**Technical flow:** Selectors and actions defined with `create`; persisted slices hydrate from async storage.


#### Hook: useRestTimer.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/hooks/useRestTimer.ts |
| Components | N/A |
| Service | N/A |
| Store | `timerStore` (when used for rest timing) |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | React hooks API |

**Description:** Encapsulates timer and scroll behaviors for workouts and tab bars.

**Technical flow:** Custom hook isolates intervals and gesture handlers from screen files.


#### Hook: useTabScroll.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/hooks/useTabScroll.ts |
| Components | N/A |
| Service | N/A |
| Store | `timerStore` (when used for rest timing) |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | React hooks API |

**Description:** Encapsulates timer and scroll behaviors for workouts and tab bars.

**Technical flow:** Custom hook isolates intervals and gesture handlers from screen files.


#### Util: animations.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | N/A |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | Various (expo-av, and so on) |

**Description:** Low-level helpers shared across modules.

**Technical flow:** Pure functions and constants imported where needed.


#### Util: audioManager.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | N/A |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | Various (expo-av, and so on) |

**Description:** Low-level helpers shared across modules.

**Technical flow:** Pure functions and constants imported where needed.


#### Util: colorUtils.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | N/A |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | Various (expo-av, and so on) |

**Description:** Low-level helpers shared across modules.

**Technical flow:** Pure functions and constants imported where needed.


#### Util: constants.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | N/A |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | Various (expo-av, and so on) |

**Description:** Low-level helpers shared across modules.

**Technical flow:** Pure functions and constants imported where needed.


#### Util: exerciseTranslations.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | N/A |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | Various (expo-av, and so on) |

**Description:** Low-level helpers shared across modules.

**Technical flow:** Pure functions and constants imported where needed.


#### Util: formPersistence.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | N/A |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | Various (expo-av, and so on) |

**Description:** Low-level helpers shared across modules.

**Technical flow:** Pure functions and constants imported where needed.


#### Util: isWorkoutStartable.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | N/A |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | Various (expo-av, and so on) |

**Description:** Low-level helpers shared across modules.

**Technical flow:** Pure functions and constants imported where needed.


#### Util: logger.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | N/A |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | Various (expo-av, and so on) |

**Description:** Low-level helpers shared across modules.

**Technical flow:** Pure functions and constants imported where needed.


#### Util: passwordStrength.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | N/A |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | Various (expo-av, and so on) |

**Description:** Low-level helpers shared across modules.

**Technical flow:** Pure functions and constants imported where needed.


#### Util: rateLimiter.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | N/A |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | Various (expo-av, and so on) |

**Description:** Low-level helpers shared across modules.

**Technical flow:** Pure functions and constants imported where needed.


#### Util: responsive.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | N/A |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | Various (expo-av, and so on) |

**Description:** Low-level helpers shared across modules.

**Technical flow:** Pure functions and constants imported where needed.


#### Util: sanitize.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | N/A |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | Various (expo-av, and so on) |

**Description:** Low-level helpers shared across modules.

**Technical flow:** Pure functions and constants imported where needed.


#### Util: secureStorage.ts
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | N/A |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | Various (expo-av, and so on) |

**Description:** Low-level helpers shared across modules.

**Technical flow:** Pure functions and constants imported where needed.


#### Supabase API client (`apiClient`)
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client / Coach) |
| Screen / Route | N/A |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | Generic PostgREST tables |
| API Routes | N/A |
| Libraries | @supabase/supabase-js |

**Description:** Timeout, retry, and error normalization for database calls.

**Technical flow:** `executeQuery` wraps builder callbacks with `withTimeout`, `withRetry`, and `ApiError` mapping.


API module path: `GoFitMobile/src/api/client.ts`

#### Mobile navigators (client)
#### AuthNavigator
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/navigation/AuthNavigator.tsx |
| Components | Imports all client stack screens |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | @react-navigation/stack; bottom-tabs |

**Description:** Defines auth, onboarding, and tabbed client navigation graphs.

**Technical flow:** `AppNavigator` nests Home, Workouts, Library, Progress, and Profile stacks with shared chat and video routes.


#### OnboardingNavigator
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/navigation/OnboardingNavigator.tsx |
| Components | Imports all client stack screens |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | @react-navigation/stack; bottom-tabs |

**Description:** Defines auth, onboarding, and tabbed client navigation graphs.

**Technical flow:** `AppNavigator` nests Home, Workouts, Library, Progress, and Profile stacks with shared chat and video routes.


#### AppNavigator
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/navigation/AppNavigator.tsx |
| Components | Imports all client stack screens |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | @react-navigation/stack; bottom-tabs |

**Description:** Defines auth, onboarding, and tabbed client navigation graphs.

**Technical flow:** `AppNavigator` nests Home, Workouts, Library, Progress, and Profile stacks with shared chat and video routes.


#### types
| Field | Detail |
|-------|--------|
| Platform | Mobile (Client) |
| Screen / Route | GoFitMobile/src/navigation/types.ts |
| Components | Imports all client stack screens |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | @react-navigation/stack; bottom-tabs |

**Description:** Defines auth, onboarding, and tabbed client navigation graphs.

**Technical flow:** `AppNavigator` nests Home, Workouts, Library, Progress, and Profile stacks with shared chat and video routes.


### 🏋️ Mobile — Coach App
#### 🔐 Coach Authentication
#### CoachLoginScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Coach) |
| Screen / Route | GoFitMobile/src/screens/coach-auth/CoachLoginScreen.tsx |
| Components | `GoFitMobile/src/components/auth/*` |
| Service | `auth.ts` |
| Store | `authStore` |
| Supabase Tables | Supabase Auth (`user_type` metadata) |
| API Routes | N/A |
| Libraries | Supabase JS |

**Description:** Coach-specific credential entry.

**Technical flow:** `signUp` passes coach user type; navigator parallels client auth.


#### CoachSignupScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Coach) |
| Screen / Route | GoFitMobile/src/screens/coach-auth/CoachSignupScreen.tsx |
| Components | `GoFitMobile/src/components/auth/*` |
| Service | `auth.ts` |
| Store | `authStore` |
| Supabase Tables | Supabase Auth (`user_type` metadata) |
| API Routes | N/A |
| Libraries | Supabase JS |

**Description:** Coach-specific credential entry.

**Technical flow:** `signUp` passes coach user type; navigator parallels client auth.


#### CoachWelcomeScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Coach) |
| Screen / Route | GoFitMobile/src/screens/coach-auth/CoachWelcomeScreen.tsx |
| Components | `GoFitMobile/src/components/auth/*` |
| Service | `auth.ts` |
| Store | `authStore` |
| Supabase Tables | Supabase Auth (`user_type` metadata) |
| API Routes | N/A |
| Libraries | Supabase JS |

**Description:** Coach-specific credential entry.

**Technical flow:** `signUp` passes coach user type; navigator parallels client auth.


#### Coach stack: ForgotPasswordScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Coach) |
| Screen / Route | GoFitMobile/src/screens/auth/ForgotPasswordScreen.tsx |
| Components | Shared auth components |
| Service | `auth.ts` |
| Store | `authStore` |
| Supabase Tables | Supabase Auth |
| API Routes | N/A |
| Libraries | Supabase JS |

**Description:** Password reset UX reused from client implementation.

**Technical flow:** Registered inside `CoachAuthNavigator` after coach login routes.


#### Coach stack: VerifyOtpScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Coach) |
| Screen / Route | GoFitMobile/src/screens/auth/VerifyOtpScreen.tsx |
| Components | Shared auth components |
| Service | `auth.ts` |
| Store | `authStore` |
| Supabase Tables | Supabase Auth |
| API Routes | N/A |
| Libraries | Supabase JS |

**Description:** Password reset UX reused from client implementation.

**Technical flow:** Registered inside `CoachAuthNavigator` after coach login routes.


#### Coach stack: ResetPasswordScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Coach) |
| Screen / Route | GoFitMobile/src/screens/auth/ResetPasswordScreen.tsx |
| Components | Shared auth components |
| Service | `auth.ts` |
| Store | `authStore` |
| Supabase Tables | Supabase Auth |
| API Routes | N/A |
| Libraries | Supabase JS |

**Description:** Password reset UX reused from client implementation.

**Technical flow:** Registered inside `CoachAuthNavigator` after coach login routes.


#### Coach stack: PasswordChangedSuccessScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Coach) |
| Screen / Route | GoFitMobile/src/screens/auth/PasswordChangedSuccessScreen.tsx |
| Components | Shared auth components |
| Service | `auth.ts` |
| Store | `authStore` |
| Supabase Tables | Supabase Auth |
| API Routes | N/A |
| Libraries | Supabase JS |

**Description:** Password reset UX reused from client implementation.

**Technical flow:** Registered inside `CoachAuthNavigator` after coach login routes.


#### 🚀 Coach Onboarding
#### CoachCVUploadScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Coach) |
| Screen / Route | GoFitMobile/src/screens/coach-onboarding/CoachCVUploadScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*` |
| Service | `coachProfile.ts` |
| Store | `coachStore` |
| Supabase Tables | `coach_profiles`, `coach_certifications`, bucket `coach-documents` |
| API Routes | N/A |
| Libraries | expo-document-picker; Supabase Storage |

**Description:** Guided verification workflow for new coaches.

**Technical flow:** Uploads and metadata persisted via coach profile service until pending state.


#### CoachCertificationsScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Coach) |
| Screen / Route | GoFitMobile/src/screens/coach-onboarding/CoachCertificationsScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*` |
| Service | `coachProfile.ts` |
| Store | `coachStore` |
| Supabase Tables | `coach_profiles`, `coach_certifications`, bucket `coach-documents` |
| API Routes | N/A |
| Libraries | expo-document-picker; Supabase Storage |

**Description:** Guided verification workflow for new coaches.

**Technical flow:** Uploads and metadata persisted via coach profile service until pending state.


#### CoachOnboardingScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Coach) |
| Screen / Route | GoFitMobile/src/screens/coach-onboarding/CoachOnboardingScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*` |
| Service | `coachProfile.ts` |
| Store | `coachStore` |
| Supabase Tables | `coach_profiles`, `coach_certifications`, bucket `coach-documents` |
| API Routes | N/A |
| Libraries | expo-document-picker; Supabase Storage |

**Description:** Guided verification workflow for new coaches.

**Technical flow:** Uploads and metadata persisted via coach profile service until pending state.


#### CoachPendingScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Coach) |
| Screen / Route | GoFitMobile/src/screens/coach-onboarding/CoachPendingScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*` |
| Service | `coachProfile.ts` |
| Store | `coachStore` |
| Supabase Tables | `coach_profiles`, `coach_certifications`, bucket `coach-documents` |
| API Routes | N/A |
| Libraries | expo-document-picker; Supabase Storage |

**Description:** Guided verification workflow for new coaches.

**Technical flow:** Uploads and metadata persisted via coach profile service until pending state.


#### CoachProfilePreviewScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Coach) |
| Screen / Route | GoFitMobile/src/screens/coach-onboarding/CoachProfilePreviewScreen.tsx |
| Components | `GoFitMobile/src/components/shared/*` |
| Service | `coachProfile.ts` |
| Store | `coachStore` |
| Supabase Tables | `coach_profiles`, `coach_certifications`, bucket `coach-documents` |
| API Routes | N/A |
| Libraries | expo-document-picker; Supabase Storage |

**Description:** Guided verification workflow for new coaches.

**Technical flow:** Uploads and metadata persisted via coach profile service until pending state.


#### 📊 Coach Dashboard
#### CoachDashboardScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Coach) |
| Screen / Route | GoFitMobile/src/screens/coach-app/CoachDashboardScreen.tsx |
| Components | Shared UI |
| Service | `bookings.ts` (plus RPC when deployed) |
| Store | `coachStore` |
| Supabase Tables | `bookings`; `get_coach_dashboard_stats` |
| API Routes | N/A |
| Libraries | Supabase JS |

**Description:** Operational snapshot for coaches.

**Technical flow:** Pulls aggregates for sessions, clients, packs, and ratings.


#### Dashboard notification inbox
| Field | Detail |
|-------|--------|
| Platform | Mobile (Coach) |
| Screen / Route | GoFitMobile/src/screens/profile/NotificationInboxScreen.tsx (stacked from coach dashboard) |
| Components | Shared UI |
| Service | `notificationInbox.ts` |
| Store | `profileStore` |
| Supabase Tables | `notifications` |
| API Routes | N/A |
| Libraries | Supabase JS |

**Description:** Same inbox component as clients, mounted under coach dashboard stack.

**Technical flow:** Queries `notifications` filtered to authenticated coach user id.


#### 👥 Client Management
#### ClientsListScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Coach) |
| Screen / Route | GoFitMobile/src/screens/coach-app/ClientsListScreen.tsx |
| Components | Shared UI |
| Service | `clientManagement.ts`; `workoutStats.ts` |
| Store | `clientManagementStore` |
| Supabase Tables | `coach_client_notes`, `bookings`, `custom_programs`, `workout_sessions` |
| API Routes | N/A |
| Libraries | Supabase JS |

**Description:** CRM-style tools for roster, notes, and progress.

**Technical flow:** Uses RPC `get_coach_clients` and targeted queries for detail panes.


#### ClientDetailScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Coach) |
| Screen / Route | GoFitMobile/src/screens/coach-app/ClientDetailScreen.tsx |
| Components | Shared UI |
| Service | `clientManagement.ts`; `workoutStats.ts` |
| Store | `clientManagementStore` |
| Supabase Tables | `coach_client_notes`, `bookings`, `custom_programs`, `workout_sessions` |
| API Routes | N/A |
| Libraries | Supabase JS |

**Description:** CRM-style tools for roster, notes, and progress.

**Technical flow:** Uses RPC `get_coach_clients` and targeted queries for detail panes.


#### ClientNotesScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Coach) |
| Screen / Route | GoFitMobile/src/screens/coach-app/ClientNotesScreen.tsx |
| Components | Shared UI |
| Service | `clientManagement.ts`; `workoutStats.ts` |
| Store | `clientManagementStore` |
| Supabase Tables | `coach_client_notes`, `bookings`, `custom_programs`, `workout_sessions` |
| API Routes | N/A |
| Libraries | Supabase JS |

**Description:** CRM-style tools for roster, notes, and progress.

**Technical flow:** Uses RPC `get_coach_clients` and targeted queries for detail panes.


#### ClientProgressScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Coach) |
| Screen / Route | GoFitMobile/src/screens/coach-app/ClientProgressScreen.tsx |
| Components | Shared UI |
| Service | `clientManagement.ts`; `workoutStats.ts` |
| Store | `clientManagementStore` |
| Supabase Tables | `coach_client_notes`, `bookings`, `custom_programs`, `workout_sessions` |
| API Routes | N/A |
| Libraries | Supabase JS |

**Description:** CRM-style tools for roster, notes, and progress.

**Technical flow:** Uses RPC `get_coach_clients` and targeted queries for detail panes.


#### CoachClientsScreen (dormant)
| Field | Detail |
|-------|--------|
| Platform | Mobile (Coach) |
| Screen / Route | GoFitMobile/src/screens/coach-app/CoachClientsScreen.tsx |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | N/A |

**Description:** Exported screen with no navigator import in the scanned tree; likely superseded by `ClientsListScreen`.

**Technical flow:** Safe to wire into navigation or remove after product confirmation.


#### 📋 Program Builder
#### ProgramBuilderScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Coach) |
| Screen / Route | GoFitMobile/src/screens/coach-app/ProgramBuilderScreen.tsx |
| Components | Shared UI |
| Service | `programs.ts`; `exercises.ts` |
| Store | `programsStore` |
| Supabase Tables | `custom_programs` |
| API Routes | N/A |
| Libraries | Supabase JS |

**Description:** Authoring tools for multi-day programs.

**Technical flow:** CRUD JSON structures stored in `custom_programs`.


#### ProgramsListScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Coach) |
| Screen / Route | GoFitMobile/src/screens/coach-app/ProgramsListScreen.tsx |
| Components | Shared UI |
| Service | `programs.ts`; `exercises.ts` |
| Store | `programsStore` |
| Supabase Tables | `custom_programs` |
| API Routes | N/A |
| Libraries | Supabase JS |

**Description:** Authoring tools for multi-day programs.

**Technical flow:** CRUD JSON structures stored in `custom_programs`.


#### ProgramDetailScreen (shared)
| Field | Detail |
|-------|--------|
| Platform | Mobile (Coach) / Mobile (Client) |
| Screen / Route | GoFitMobile/src/screens/profile/ProgramDetailScreen.tsx |
| Components | Shared UI |
| Service | `programs.ts` |
| Store | `programsStore` |
| Supabase Tables | `custom_programs` |
| API Routes | N/A |
| Libraries | Supabase JS |

**Description:** Detailed program viewer reused in coach client stack and client profile stack.

**Technical flow:** Same component file mounted in both navigators with different entry params.


#### 📦 Session Packs
#### SessionPacksScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Coach) |
| Screen / Route | GoFitMobile/src/screens/coach-app/SessionPacksScreen.tsx |
| Components | Shared UI |
| Service | `sessionPacks.ts` |
| Store | `packsStore` |
| Supabase Tables | `session_packs` |
| API Routes | N/A |
| Libraries | Supabase JS |

**Description:** Configure sellable bundles of sessions.

**Technical flow:** Validates business fields then upserts rows scoped to coach id.


#### CreatePackScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Coach) |
| Screen / Route | GoFitMobile/src/screens/coach-app/CreatePackScreen.tsx |
| Components | Shared UI |
| Service | `sessionPacks.ts` |
| Store | `packsStore` |
| Supabase Tables | `session_packs` |
| API Routes | N/A |
| Libraries | Supabase JS |

**Description:** Configure sellable bundles of sessions.

**Technical flow:** Validates business fields then upserts rows scoped to coach id.


#### 🗓️ Calendar & Availability
#### CoachCalendarScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Coach) |
| Screen / Route | GoFitMobile/src/screens/coach-app/CoachCalendarScreen.tsx |
| Components | Shared UI |
| Service | `bookings.ts` |
| Store | N/A |
| Supabase Tables | `coach_availability`, `bookings` |
| API Routes | N/A |
| Libraries | Supabase JS |

**Description:** Manage coach-wide calendar plus slot templates.

**Technical flow:** Reads and writes availability rows and surfaces upcoming bookings.


#### CoachAvailabilityScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Coach) |
| Screen / Route | GoFitMobile/src/screens/coach-app/CoachAvailabilityScreen.tsx |
| Components | Shared UI |
| Service | `bookings.ts` |
| Store | N/A |
| Supabase Tables | `coach_availability`, `bookings` |
| API Routes | N/A |
| Libraries | Supabase JS |

**Description:** Manage coach-wide calendar plus slot templates.

**Technical flow:** Reads and writes availability rows and surfaces upcoming bookings.


#### 💬 Chat with Clients
#### Coach chat tab
| Field | Detail |
|-------|--------|
| Platform | Mobile (Coach) |
| Screen / Route | `GoFitMobile/src/navigation/CoachAppNavigator.tsx` (Chat stack) |
| Components | Reuses messaging screens |
| Service | `chat.ts` |
| Store | `chatStore` |
| Supabase Tables | `conversations`, `messages` |
| API Routes | N/A |
| Libraries | Supabase Realtime |

**Description:** Dedicated tab mirroring client chat implementation.

**Technical flow:** Hosts `ConversationsListScreen` and `ChatScreen` for coach role.


#### CoachChatScreen (dormant)
| Field | Detail |
|-------|--------|
| Platform | Mobile (Coach) |
| Screen / Route | GoFitMobile/src/screens/coach-app/CoachChatScreen.tsx |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | N/A |

**Description:** Alternate chat screen not wired into navigators.

**Technical flow:** Retain only if product plans a bespoke coach-only composer.


#### 📹 Video Calls
#### VideoCallScreen (coach calendar stack)
| Field | Detail |
|-------|--------|
| Platform | Mobile (Coach) |
| Screen / Route | GoFitMobile/src/screens/coach-app/VideoCallScreen.tsx |
| Components | Shared UI |
| Service | `videoCall.ts` |
| Store | N/A |
| Supabase Tables | `bookings` |
| API Routes | Edge `generate-video-token` |
| Libraries | livekit-client |

**Description:** Coach joins the same LiveKit rooms as clients from calendar stack.

**Technical flow:** Navigation supplies booking id → service validates window → token minted.


#### 👤 Coach Profile
#### CoachProfileScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Coach) |
| Screen / Route | GoFitMobile/src/screens/coach-app/CoachProfileScreen.tsx |
| Components | Shared UI |
| Service | `wallet.ts`; `coachProfile.ts`; `auth.ts` |
| Store | `coachStore`; `authStore` |
| Supabase Tables | `wallets`, `transactions`, `coach_profiles` |
| API Routes | N/A |
| Libraries | Supabase JS |

**Description:** Coach profile hub, payouts, and operational settings.

**Technical flow:** Wallet service reads balances and ledger; settings may expose toggles and sign-out.


#### CoachWalletScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Coach) |
| Screen / Route | GoFitMobile/src/screens/coach-app/CoachWalletScreen.tsx |
| Components | Shared UI |
| Service | `wallet.ts`; `coachProfile.ts`; `auth.ts` |
| Store | `coachStore`; `authStore` |
| Supabase Tables | `wallets`, `transactions`, `coach_profiles` |
| API Routes | N/A |
| Libraries | Supabase JS |

**Description:** Coach profile hub, payouts, and operational settings.

**Technical flow:** Wallet service reads balances and ledger; settings may expose toggles and sign-out.


#### CoachSettingsScreen
| Field | Detail |
|-------|--------|
| Platform | Mobile (Coach) |
| Screen / Route | GoFitMobile/src/screens/coach-app/CoachSettingsScreen.tsx |
| Components | Shared UI |
| Service | `wallet.ts`; `coachProfile.ts`; `auth.ts` |
| Store | `coachStore`; `authStore` |
| Supabase Tables | `wallets`, `transactions`, `coach_profiles` |
| API Routes | N/A |
| Libraries | Supabase JS |

**Description:** Coach profile hub, payouts, and operational settings.

**Technical flow:** Wallet service reads balances and ledger; settings may expose toggles and sign-out.


#### Coach navigators
#### CoachAuthNavigator
| Field | Detail |
|-------|--------|
| Platform | Mobile (Coach) |
| Screen / Route | GoFitMobile/src/navigation/CoachAuthNavigator.tsx |
| Components | Imports coach stacks |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | React Navigation |

**Description:** Parallel navigation graphs for the coach persona.

**Technical flow:** `CoachAppNavigator` defines Dashboard, Clients, Calendar, Chat, and Profile tabs with nested stacks.


#### CoachOnboardingNavigator
| Field | Detail |
|-------|--------|
| Platform | Mobile (Coach) |
| Screen / Route | GoFitMobile/src/navigation/CoachOnboardingNavigator.tsx |
| Components | Imports coach stacks |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | React Navigation |

**Description:** Parallel navigation graphs for the coach persona.

**Technical flow:** `CoachAppNavigator` defines Dashboard, Clients, Calendar, Chat, and Profile tabs with nested stacks.


#### CoachAppNavigator
| Field | Detail |
|-------|--------|
| Platform | Mobile (Coach) |
| Screen / Route | GoFitMobile/src/navigation/CoachAppNavigator.tsx |
| Components | Imports coach stacks |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | React Navigation |

**Description:** Parallel navigation graphs for the coach persona.

**Technical flow:** `CoachAppNavigator` defines Dashboard, Clients, Calendar, Chat, and Profile tabs with nested stacks.


### 🖥️ Admin Panel
Foundational UI chrome lives in `admin-panel/components/layout/Sidebar.tsx`, `Navbar.tsx`, `MobileSidebar.tsx`, `ThemeToggle.tsx`, plus skeleton and analytics building blocks referenced from pages.

#### 🔐 Authentication & Middleware
#### Middleware — SSR session and admin enforcement
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/middleware.ts |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | `user_profiles.is_admin` |
| API Routes | N/A |
| Libraries | @supabase/ssr |

**Description:** Protects dashboard modules; redirects anonymous or non-admin users.

**Technical flow:** `createServerClient` reads cookies → `auth.getUser` → fetches `is_admin` flag before continuing request.


#### 📊 Analytics Dashboard
The default signed-in landing experience is `admin-panel/app/dashboard/page.tsx` (see Admin pages below). It composes `admin-panel/components/analytics/*` and reads aggregates via `admin-panel/lib/analytics.ts`.

#### 👥 User Management
User administration uses `admin-panel/app/users/page.tsx` and `users/[id]/page.tsx` with `UserSearchFilter`, `ExportUsersButton`, `DeleteUserButton`, and `ToggleAdminButton` (see Admin pages below).

#### 🏋️ Coach Management
`admin-panel/app/coaches/page.tsx` pairs with `CoachSearchFilter`, `CoachActions`, and `app/api/coaches/[id]/certifications/route.ts` (see Admin pages below).

#### 📚 Exercise Library
`app/exercises/page.tsx`, `exercises/new/page.tsx`, and `exercises/[id]/page.tsx` mount the exercise CRUD experience backed by `components/exercises/*` (see Admin pages below).

#### 💪 Workout Management
`app/workouts/page.tsx`, `workouts/new/page.tsx`, and `workouts/[id]/page.tsx` mount workout CRUD, preview, and import or export flows via `components/workouts/*` (see Admin pages below).

#### 💳 Transactions
`admin-panel/app/transactions/page.tsx` reads ledger data through `app/api/transactions/route.ts` (see Admin pages below).

#### 📜 Audit & Activity Logs
`admin-panel/app/activity-logs/page.tsx` renders `ActivityLogsTable.tsx` and loads `app/api/audit-logs/route.ts` (see Admin pages below).

#### 🔔 Notification Management
Notification center UI is composed from `components/notifications/NotificationCenter.tsx` while mutations hit `app/api/notifications/*` routes (see API Routes and Admin pages below).

#### ⚙️ Settings
`admin-panel/app/settings/page.tsx` persists admin configuration through `app/api/settings/route.ts` with schemas from `lib/validation` (see Admin pages below).

#### 📄 Admin App Router pages (`page.tsx`)
#### Admin page: activity-logs
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/activity-logs/page.tsx |
| Components | `activity-logs/ActivityLogsTable.tsx` |
| Service | `admin-panel/lib/supabase/server.ts` or `client.ts` (per page implementation) |
| Store | N/A |
| Supabase Tables | `admin_audit_logs` |
| API Routes | N/A |
| Libraries | Next.js App Router; React Server or Client Components; Tailwind or shadcn UI primitives |

**Description:** Immutable audit history viewer.

**Technical flow:** Middleware guarantees `is_admin` → page loader queries Supabase with SSR helpers → interactive components call `/api/*` routes for mutations.


#### Admin page: coaches
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/coaches/page.tsx |
| Components | `coaches/*` |
| Service | `admin-panel/lib/supabase/server.ts` or `client.ts` (per page implementation) |
| Store | N/A |
| Supabase Tables | `coach_profiles`, `user_profiles` |
| API Routes | N/A |
| Libraries | Next.js App Router; React Server or Client Components; Tailwind or shadcn UI primitives |

**Description:** Coach directory and moderation actions.

**Technical flow:** Middleware guarantees `is_admin` → page loader queries Supabase with SSR helpers → interactive components call `/api/*` routes for mutations.


#### Admin page: dashboard
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/dashboard/page.tsx |
| Components | `admin-panel/components/analytics/*`, skeletons |
| Service | `admin-panel/lib/supabase/server.ts` or `client.ts` (per page implementation) |
| Store | N/A |
| Supabase Tables | Varies by page (see Supabase queries in page and `lib/*`) |
| API Routes | N/A |
| Libraries | Next.js App Router; React Server or Client Components; Tailwind or shadcn UI primitives |

**Description:** Analytics landing: KPI cards, charts, heatmaps, and recent activity.

**Technical flow:** Middleware guarantees `is_admin` → page loader queries Supabase with SSR helpers → interactive components call `/api/*` routes for mutations.


#### Admin page: exercises/[id]
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/exercises/[id]/page.tsx |
| Components | `exercises/*` |
| Service | `admin-panel/lib/supabase/server.ts` or `client.ts` (per page implementation) |
| Store | N/A |
| Supabase Tables | `exercises` |
| API Routes | N/A |
| Libraries | Next.js App Router; React Server or Client Components; Tailwind or shadcn UI primitives |

**Description:** Exercise CRUD, bulk import or export, and media fields.

**Technical flow:** Middleware guarantees `is_admin` → page loader queries Supabase with SSR helpers → interactive components call `/api/*` routes for mutations.


#### Admin page: exercises/new
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/exercises/new/page.tsx |
| Components | `exercises/*` |
| Service | `admin-panel/lib/supabase/server.ts` or `client.ts` (per page implementation) |
| Store | N/A |
| Supabase Tables | `exercises` |
| API Routes | N/A |
| Libraries | Next.js App Router; React Server or Client Components; Tailwind or shadcn UI primitives |

**Description:** Exercise CRUD, bulk import or export, and media fields.

**Technical flow:** Middleware guarantees `is_admin` → page loader queries Supabase with SSR helpers → interactive components call `/api/*` routes for mutations.


#### Admin page: exercises
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/exercises/page.tsx |
| Components | `exercises/*` |
| Service | `admin-panel/lib/supabase/server.ts` or `client.ts` (per page implementation) |
| Store | N/A |
| Supabase Tables | `exercises` |
| API Routes | N/A |
| Libraries | Next.js App Router; React Server or Client Components; Tailwind or shadcn UI primitives |

**Description:** Exercise CRUD, bulk import or export, and media fields.

**Technical flow:** Middleware guarantees `is_admin` → page loader queries Supabase with SSR helpers → interactive components call `/api/*` routes for mutations.


#### Admin page: login
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/login/page.tsx |
| Components | `admin-panel/components/ui/*` inputs; branding from layout |
| Service | `admin-panel/lib/supabase/server.ts` or `client.ts` (per page implementation) |
| Store | N/A |
| Supabase Tables | `user_profiles` (post-auth admin check via middleware) |
| API Routes | N/A |
| Libraries | Next.js App Router; React Server or Client Components; Tailwind or shadcn UI primitives |

**Description:** Email and password sign-in for administrators.

**Technical flow:** Middleware guarantees `is_admin` → page loader queries Supabase with SSR helpers → interactive components call `/api/*` routes for mutations.


#### Admin page: page.tsx
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/page.tsx |
| Components | `admin-panel/components/**` (module-specific imports inside the page) |
| Service | `admin-panel/lib/supabase/server.ts` or `client.ts` (per page implementation) |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | Next.js App Router; React Server or Client Components; Tailwind or shadcn UI primitives |

**Description:** Root route that immediately redirects to `/login` or `/dashboard`.

**Technical flow:** Middleware guarantees `is_admin` → page loader queries Supabase with SSR helpers → interactive components call `/api/*` routes for mutations.


#### Admin page: settings
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/settings/page.tsx |
| Components | settings form components |
| Service | `admin-panel/lib/supabase/server.ts` or `client.ts` (per page implementation) |
| Store | N/A |
| Supabase Tables | `admin_settings` |
| API Routes | N/A |
| Libraries | Next.js App Router; React Server or Client Components; Tailwind or shadcn UI primitives |

**Description:** Mutable global admin configuration.

**Technical flow:** Middleware guarantees `is_admin` → page loader queries Supabase with SSR helpers → interactive components call `/api/*` routes for mutations.


#### Admin page: transactions
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/transactions/page.tsx |
| Components | `transactions` layout chrome |
| Service | `admin-panel/lib/supabase/server.ts` or `client.ts` (per page implementation) |
| Store | N/A |
| Supabase Tables | `transactions`, `wallets` |
| API Routes | N/A |
| Libraries | Next.js App Router; React Server or Client Components; Tailwind or shadcn UI primitives |

**Description:** Financial ledger review.

**Technical flow:** Middleware guarantees `is_admin` → page loader queries Supabase with SSR helpers → interactive components call `/api/*` routes for mutations.


#### Admin page: users/[id]
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/users/[id]/page.tsx |
| Components | `users/*` table components, filters, export |
| Service | `admin-panel/lib/supabase/server.ts` or `client.ts` (per page implementation) |
| Store | N/A |
| Supabase Tables | `user_profiles` |
| API Routes | N/A |
| Libraries | Next.js App Router; React Server or Client Components; Tailwind or shadcn UI primitives |

**Description:** List or detail view for end users with admin actions.

**Technical flow:** Middleware guarantees `is_admin` → page loader queries Supabase with SSR helpers → interactive components call `/api/*` routes for mutations.


#### Admin page: users
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/users/page.tsx |
| Components | `users/*` table components, filters, export |
| Service | `admin-panel/lib/supabase/server.ts` or `client.ts` (per page implementation) |
| Store | N/A |
| Supabase Tables | `user_profiles` |
| API Routes | N/A |
| Libraries | Next.js App Router; React Server or Client Components; Tailwind or shadcn UI primitives |

**Description:** List or detail view for end users with admin actions.

**Technical flow:** Middleware guarantees `is_admin` → page loader queries Supabase with SSR helpers → interactive components call `/api/*` routes for mutations.


#### Admin page: workouts/[id]
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/workouts/[id]/page.tsx |
| Components | `workouts/*` |
| Service | `admin-panel/lib/supabase/server.ts` or `client.ts` (per page implementation) |
| Store | N/A |
| Supabase Tables | `workouts`, `workout_exercises`, `exercises` |
| API Routes | N/A |
| Libraries | Next.js App Router; React Server or Client Components; Tailwind or shadcn UI primitives |

**Description:** Workout templates, duplication, and previews.

**Technical flow:** Middleware guarantees `is_admin` → page loader queries Supabase with SSR helpers → interactive components call `/api/*` routes for mutations.


#### Admin page: workouts/new
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/workouts/new/page.tsx |
| Components | `workouts/*` |
| Service | `admin-panel/lib/supabase/server.ts` or `client.ts` (per page implementation) |
| Store | N/A |
| Supabase Tables | `workouts`, `workout_exercises`, `exercises` |
| API Routes | N/A |
| Libraries | Next.js App Router; React Server or Client Components; Tailwind or shadcn UI primitives |

**Description:** Workout templates, duplication, and previews.

**Technical flow:** Middleware guarantees `is_admin` → page loader queries Supabase with SSR helpers → interactive components call `/api/*` routes for mutations.


#### Admin page: workouts
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/workouts/page.tsx |
| Components | `workouts/*` |
| Service | `admin-panel/lib/supabase/server.ts` or `client.ts` (per page implementation) |
| Store | N/A |
| Supabase Tables | `workouts`, `workout_exercises`, `exercises` |
| API Routes | N/A |
| Libraries | Next.js App Router; React Server or Client Components; Tailwind or shadcn UI primitives |

**Description:** Workout templates, duplication, and previews.

**Technical flow:** Middleware guarantees `is_admin` → page loader queries Supabase with SSR helpers → interactive components call `/api/*` routes for mutations.


#### 🌙 Dark Mode
#### Theme toggle
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | `admin-panel/components/layout/ThemeToggle.tsx`; `components/theme-provider.tsx` |
| Components | Layout |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | next-themes (per project dependency) |

**Description:** Persists admin color scheme.

**Technical flow:** Toggles CSS variables or classes at the document root.


#### 📁 File Uploads (R2)
#### Upload API
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/api/upload/route.ts |
| Components | Forms with file inputs |
| Service | `admin-panel/lib/r2.ts` |
| Store | N/A |
| Supabase Tables | Cloudflare R2 objects |
| API Routes | `/api/upload` |
| Libraries | AWS or R2 SDK per implementation |

**Description:** Secure media uploads for admin-managed assets.

**Technical flow:** Authenticates admin → signs upload → returns instructions to browser.


#### 🔌 API Routes
#### HTTP handler: app/api/audit-logs/route.ts
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/api/audit-logs/route.ts |
| Components | Various action components |
| Service | `admin-panel/lib/supabase/admin.ts`; validation helpers |
| Store | N/A |
| Supabase Tables | Depends on handler |
| API Routes | Self-referential fetch to `/api/...` |
| Libraries | Next.js Route Handlers |

**Description:** Implements REST verbs for CRUD, bulk operations, notifications, audits, and health checks.

**Technical flow:** Validates payload → uses service-role Supabase client → returns JSON.


#### HTTP handler: app/api/coaches/[id]/certifications/route.ts
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/api/coaches/[id]/certifications/route.ts |
| Components | Various action components |
| Service | `admin-panel/lib/supabase/admin.ts`; validation helpers |
| Store | N/A |
| Supabase Tables | Depends on handler |
| API Routes | Self-referential fetch to `/api/...` |
| Libraries | Next.js Route Handlers |

**Description:** Implements REST verbs for CRUD, bulk operations, notifications, audits, and health checks.

**Technical flow:** Validates payload → uses service-role Supabase client → returns JSON.


#### HTTP handler: app/api/coaches/route.ts
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/api/coaches/route.ts |
| Components | Various action components |
| Service | `admin-panel/lib/supabase/admin.ts`; validation helpers |
| Store | N/A |
| Supabase Tables | Depends on handler |
| API Routes | Self-referential fetch to `/api/...` |
| Libraries | Next.js Route Handlers |

**Description:** Implements REST verbs for CRUD, bulk operations, notifications, audits, and health checks.

**Technical flow:** Validates payload → uses service-role Supabase client → returns JSON.


#### HTTP handler: app/api/exercises/[id]/route.ts
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/api/exercises/[id]/route.ts |
| Components | Various action components |
| Service | `admin-panel/lib/supabase/admin.ts`; validation helpers |
| Store | N/A |
| Supabase Tables | Depends on handler |
| API Routes | Self-referential fetch to `/api/...` |
| Libraries | Next.js Route Handlers |

**Description:** Implements REST verbs for CRUD, bulk operations, notifications, audits, and health checks.

**Technical flow:** Validates payload → uses service-role Supabase client → returns JSON.


#### HTTP handler: app/api/exercises/bulk/route.ts
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/api/exercises/bulk/route.ts |
| Components | Various action components |
| Service | `admin-panel/lib/supabase/admin.ts`; validation helpers |
| Store | N/A |
| Supabase Tables | Depends on handler |
| API Routes | Self-referential fetch to `/api/...` |
| Libraries | Next.js Route Handlers |

**Description:** Implements REST verbs for CRUD, bulk operations, notifications, audits, and health checks.

**Technical flow:** Validates payload → uses service-role Supabase client → returns JSON.


#### HTTP handler: app/api/exercises/route.ts
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/api/exercises/route.ts |
| Components | Various action components |
| Service | `admin-panel/lib/supabase/admin.ts`; validation helpers |
| Store | N/A |
| Supabase Tables | Depends on handler |
| API Routes | Self-referential fetch to `/api/...` |
| Libraries | Next.js Route Handlers |

**Description:** Implements REST verbs for CRUD, bulk operations, notifications, audits, and health checks.

**Technical flow:** Validates payload → uses service-role Supabase client → returns JSON.


#### HTTP handler: app/api/health/route.ts
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/api/health/route.ts |
| Components | Various action components |
| Service | `admin-panel/lib/supabase/admin.ts`; validation helpers |
| Store | N/A |
| Supabase Tables | Depends on handler |
| API Routes | Self-referential fetch to `/api/...` |
| Libraries | Next.js Route Handlers |

**Description:** Implements REST verbs for CRUD, bulk operations, notifications, audits, and health checks.

**Technical flow:** Validates payload → uses service-role Supabase client → returns JSON.


#### HTTP handler: app/api/notifications/[id]/route.ts
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/api/notifications/[id]/route.ts |
| Components | Various action components |
| Service | `admin-panel/lib/supabase/admin.ts`; validation helpers |
| Store | N/A |
| Supabase Tables | Depends on handler |
| API Routes | Self-referential fetch to `/api/...` |
| Libraries | Next.js Route Handlers |

**Description:** Implements REST verbs for CRUD, bulk operations, notifications, audits, and health checks.

**Technical flow:** Validates payload → uses service-role Supabase client → returns JSON.


#### HTTP handler: app/api/notifications/read-all/route.ts
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/api/notifications/read-all/route.ts |
| Components | Various action components |
| Service | `admin-panel/lib/supabase/admin.ts`; validation helpers |
| Store | N/A |
| Supabase Tables | Depends on handler |
| API Routes | Self-referential fetch to `/api/...` |
| Libraries | Next.js Route Handlers |

**Description:** Implements REST verbs for CRUD, bulk operations, notifications, audits, and health checks.

**Technical flow:** Validates payload → uses service-role Supabase client → returns JSON.


#### HTTP handler: app/api/notifications/route.ts
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/api/notifications/route.ts |
| Components | Various action components |
| Service | `admin-panel/lib/supabase/admin.ts`; validation helpers |
| Store | N/A |
| Supabase Tables | Depends on handler |
| API Routes | Self-referential fetch to `/api/...` |
| Libraries | Next.js Route Handlers |

**Description:** Implements REST verbs for CRUD, bulk operations, notifications, audits, and health checks.

**Technical flow:** Validates payload → uses service-role Supabase client → returns JSON.


#### HTTP handler: app/api/settings/route.ts
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/api/settings/route.ts |
| Components | Various action components |
| Service | `admin-panel/lib/supabase/admin.ts`; validation helpers |
| Store | N/A |
| Supabase Tables | Depends on handler |
| API Routes | Self-referential fetch to `/api/...` |
| Libraries | Next.js Route Handlers |

**Description:** Implements REST verbs for CRUD, bulk operations, notifications, audits, and health checks.

**Technical flow:** Validates payload → uses service-role Supabase client → returns JSON.


#### HTTP handler: app/api/transactions/route.ts
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/api/transactions/route.ts |
| Components | Various action components |
| Service | `admin-panel/lib/supabase/admin.ts`; validation helpers |
| Store | N/A |
| Supabase Tables | Depends on handler |
| API Routes | Self-referential fetch to `/api/...` |
| Libraries | Next.js Route Handlers |

**Description:** Implements REST verbs for CRUD, bulk operations, notifications, audits, and health checks.

**Technical flow:** Validates payload → uses service-role Supabase client → returns JSON.


#### HTTP handler: app/api/upload/route.ts
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/api/upload/route.ts |
| Components | Various action components |
| Service | `admin-panel/lib/supabase/admin.ts`; validation helpers |
| Store | N/A |
| Supabase Tables | Depends on handler |
| API Routes | Self-referential fetch to `/api/...` |
| Libraries | Next.js Route Handlers |

**Description:** Implements REST verbs for CRUD, bulk operations, notifications, audits, and health checks.

**Technical flow:** Validates payload → uses service-role Supabase client → returns JSON.


#### HTTP handler: app/api/users/[id]/route.ts
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/api/users/[id]/route.ts |
| Components | Various action components |
| Service | `admin-panel/lib/supabase/admin.ts`; validation helpers |
| Store | N/A |
| Supabase Tables | Depends on handler |
| API Routes | Self-referential fetch to `/api/...` |
| Libraries | Next.js Route Handlers |

**Description:** Implements REST verbs for CRUD, bulk operations, notifications, audits, and health checks.

**Technical flow:** Validates payload → uses service-role Supabase client → returns JSON.


#### HTTP handler: app/api/users/[id]/toggle-admin/route.ts
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/api/users/[id]/toggle-admin/route.ts |
| Components | Various action components |
| Service | `admin-panel/lib/supabase/admin.ts`; validation helpers |
| Store | N/A |
| Supabase Tables | Depends on handler |
| API Routes | Self-referential fetch to `/api/...` |
| Libraries | Next.js Route Handlers |

**Description:** Implements REST verbs for CRUD, bulk operations, notifications, audits, and health checks.

**Technical flow:** Validates payload → uses service-role Supabase client → returns JSON.


#### HTTP handler: app/api/workouts/[id]/duplicate/route.ts
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/api/workouts/[id]/duplicate/route.ts |
| Components | Various action components |
| Service | `admin-panel/lib/supabase/admin.ts`; validation helpers |
| Store | N/A |
| Supabase Tables | Depends on handler |
| API Routes | Self-referential fetch to `/api/...` |
| Libraries | Next.js Route Handlers |

**Description:** Implements REST verbs for CRUD, bulk operations, notifications, audits, and health checks.

**Technical flow:** Validates payload → uses service-role Supabase client → returns JSON.


#### HTTP handler: app/api/workouts/[id]/route.ts
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/api/workouts/[id]/route.ts |
| Components | Various action components |
| Service | `admin-panel/lib/supabase/admin.ts`; validation helpers |
| Store | N/A |
| Supabase Tables | Depends on handler |
| API Routes | Self-referential fetch to `/api/...` |
| Libraries | Next.js Route Handlers |

**Description:** Implements REST verbs for CRUD, bulk operations, notifications, audits, and health checks.

**Technical flow:** Validates payload → uses service-role Supabase client → returns JSON.


#### HTTP handler: app/api/workouts/bulk/route.ts
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/api/workouts/bulk/route.ts |
| Components | Various action components |
| Service | `admin-panel/lib/supabase/admin.ts`; validation helpers |
| Store | N/A |
| Supabase Tables | Depends on handler |
| API Routes | Self-referential fetch to `/api/...` |
| Libraries | Next.js Route Handlers |

**Description:** Implements REST verbs for CRUD, bulk operations, notifications, audits, and health checks.

**Technical flow:** Validates payload → uses service-role Supabase client → returns JSON.


#### HTTP handler: app/api/workouts/route.ts
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/api/workouts/route.ts |
| Components | Various action components |
| Service | `admin-panel/lib/supabase/admin.ts`; validation helpers |
| Store | N/A |
| Supabase Tables | Depends on handler |
| API Routes | Self-referential fetch to `/api/...` |
| Libraries | Next.js Route Handlers |

**Description:** Implements REST verbs for CRUD, bulk operations, notifications, audits, and health checks.

**Technical flow:** Validates payload → uses service-role Supabase client → returns JSON.


#### Admin layouts and shells
#### Layout: app/activity-logs/layout.tsx
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/activity-logs/layout.tsx |
| Components | Sidebar, Navbar, Toaster children |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | Next.js layouts |

**Description:** Wraps segment-specific UI with shared navigation chrome.

**Technical flow:** Nested layouts inherit providers for theme and Supabase SSR.


#### Layout: app/coaches/layout.tsx
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/coaches/layout.tsx |
| Components | Sidebar, Navbar, Toaster children |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | Next.js layouts |

**Description:** Wraps segment-specific UI with shared navigation chrome.

**Technical flow:** Nested layouts inherit providers for theme and Supabase SSR.


#### Layout: app/dashboard/layout.tsx
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/dashboard/layout.tsx |
| Components | Sidebar, Navbar, Toaster children |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | Next.js layouts |

**Description:** Wraps segment-specific UI with shared navigation chrome.

**Technical flow:** Nested layouts inherit providers for theme and Supabase SSR.


#### Layout: app/exercises/layout.tsx
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/exercises/layout.tsx |
| Components | Sidebar, Navbar, Toaster children |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | Next.js layouts |

**Description:** Wraps segment-specific UI with shared navigation chrome.

**Technical flow:** Nested layouts inherit providers for theme and Supabase SSR.


#### Layout: app/layout.tsx
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/layout.tsx |
| Components | Sidebar, Navbar, Toaster children |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | Next.js layouts |

**Description:** Wraps segment-specific UI with shared navigation chrome.

**Technical flow:** Nested layouts inherit providers for theme and Supabase SSR.


#### Layout: app/settings/layout.tsx
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/settings/layout.tsx |
| Components | Sidebar, Navbar, Toaster children |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | Next.js layouts |

**Description:** Wraps segment-specific UI with shared navigation chrome.

**Technical flow:** Nested layouts inherit providers for theme and Supabase SSR.


#### Layout: app/transactions/layout.tsx
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/transactions/layout.tsx |
| Components | Sidebar, Navbar, Toaster children |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | Next.js layouts |

**Description:** Wraps segment-specific UI with shared navigation chrome.

**Technical flow:** Nested layouts inherit providers for theme and Supabase SSR.


#### Layout: app/users/layout.tsx
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/users/layout.tsx |
| Components | Sidebar, Navbar, Toaster children |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | Next.js layouts |

**Description:** Wraps segment-specific UI with shared navigation chrome.

**Technical flow:** Nested layouts inherit providers for theme and Supabase SSR.


#### Layout: app/workouts/layout.tsx
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/workouts/layout.tsx |
| Components | Sidebar, Navbar, Toaster children |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | Next.js layouts |

**Description:** Wraps segment-specific UI with shared navigation chrome.

**Technical flow:** Nested layouts inherit providers for theme and Supabase SSR.


#### Admin loading states
#### Loading UI: app/dashboard/loading.tsx
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/dashboard/loading.tsx |
| Components | Skeleton components |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | React suspense skeletons |

**Description:** Shows placeholder shimmer while RSC or streaming resolves.

**Technical flow:** Next.js automatically swaps once data is ready.


#### Loading UI: app/exercises/[id]/loading.tsx
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/exercises/[id]/loading.tsx |
| Components | Skeleton components |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | React suspense skeletons |

**Description:** Shows placeholder shimmer while RSC or streaming resolves.

**Technical flow:** Next.js automatically swaps once data is ready.


#### Loading UI: app/exercises/loading.tsx
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/exercises/loading.tsx |
| Components | Skeleton components |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | React suspense skeletons |

**Description:** Shows placeholder shimmer while RSC or streaming resolves.

**Technical flow:** Next.js automatically swaps once data is ready.


#### Loading UI: app/exercises/new/loading.tsx
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/exercises/new/loading.tsx |
| Components | Skeleton components |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | React suspense skeletons |

**Description:** Shows placeholder shimmer while RSC or streaming resolves.

**Technical flow:** Next.js automatically swaps once data is ready.


#### Loading UI: app/users/[id]/loading.tsx
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/users/[id]/loading.tsx |
| Components | Skeleton components |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | React suspense skeletons |

**Description:** Shows placeholder shimmer while RSC or streaming resolves.

**Technical flow:** Next.js automatically swaps once data is ready.


#### Loading UI: app/users/loading.tsx
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/users/loading.tsx |
| Components | Skeleton components |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | React suspense skeletons |

**Description:** Shows placeholder shimmer while RSC or streaming resolves.

**Technical flow:** Next.js automatically swaps once data is ready.


#### Loading UI: app/workouts/[id]/loading.tsx
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/workouts/[id]/loading.tsx |
| Components | Skeleton components |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | React suspense skeletons |

**Description:** Shows placeholder shimmer while RSC or streaming resolves.

**Technical flow:** Next.js automatically swaps once data is ready.


#### Loading UI: app/workouts/loading.tsx
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/workouts/loading.tsx |
| Components | Skeleton components |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | React suspense skeletons |

**Description:** Shows placeholder shimmer while RSC or streaming resolves.

**Technical flow:** Next.js automatically swaps once data is ready.


#### Loading UI: app/workouts/new/loading.tsx
| Field | Detail |
|-------|--------|
| Platform | Web (Admin) |
| Screen / Route | admin-panel/app/workouts/new/loading.tsx |
| Components | Skeleton components |
| Service | N/A |
| Store | N/A |
| Supabase Tables | N/A |
| API Routes | N/A |
| Libraries | React suspense skeletons |

**Description:** Shows placeholder shimmer while RSC or streaming resolves.

**Technical flow:** Next.js automatically swaps once data is ready.


### ⚙️ Backend & Infrastructure
#### 🔁 Edge Functions
#### Edge function: _shared/cors.ts
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | supabase/functions/_shared/cors.ts |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | Varies per function |
| API Routes | HTTPS callable |
| Libraries | Deno and Supabase Edge runtime |

**Description:** Implements privileged operations (push relay, LiveKit JWT, pose estimation proxy).

**Technical flow:** Validates JSON input → uses secrets → returns JSON.


#### Edge function: send-push-notification/index.ts
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | supabase/functions/send-push-notification/index.ts |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | Varies per function |
| API Routes | HTTPS callable |
| Libraries | Deno and Supabase Edge runtime |

**Description:** Implements privileged operations (push relay, LiveKit JWT, pose estimation proxy).

**Technical flow:** Validates JSON input → uses secrets → returns JSON.


#### Edge function: generate-video-token/index.ts
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | supabase/functions/generate-video-token/index.ts |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | Varies per function |
| API Routes | HTTPS callable |
| Libraries | Deno and Supabase Edge runtime |

**Description:** Implements privileged operations (push relay, LiveKit JWT, pose estimation proxy).

**Technical flow:** Validates JSON input → uses secrets → returns JSON.


#### Edge function: body-measurements/index.ts
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | supabase/functions/body-measurements/index.ts |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | Varies per function |
| API Routes | HTTPS callable |
| Libraries | Deno and Supabase Edge runtime |

**Description:** Implements privileged operations (push relay, LiveKit JWT, pose estimation proxy).

**Technical flow:** Validates JSON input → uses secrets → returns JSON.


#### 🗃️ Database Schema & Tables
#### Schema bundle: create_coach_marketplace_tables.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/schema/create_coach_marketplace_tables.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See file for CREATE TABLE statements |
| API Routes | N/A |
| Libraries | PostgreSQL DDL |

**Description:** Canonical schema snapshots for workouts, profiles, and marketplace.

**Technical flow:** Intended for manual or CI application before incremental migrations.


#### Schema bundle: create_user_profiles_table.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/schema/create_user_profiles_table.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See file for CREATE TABLE statements |
| API Routes | N/A |
| Libraries | PostgreSQL DDL |

**Description:** Canonical schema snapshots for workouts, profiles, and marketplace.

**Technical flow:** Intended for manual or CI application before incremental migrations.


#### Schema bundle: create_workouts_tables.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/schema/create_workouts_tables.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See file for CREATE TABLE statements |
| API Routes | N/A |
| Libraries | PostgreSQL DDL |

**Description:** Canonical schema snapshots for workouts, profiles, and marketplace.

**Technical flow:** Intended for manual or CI application before incremental migrations.


#### Schema bundle: create_workouts_tables_normalized.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/schema/create_workouts_tables_normalized.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See file for CREATE TABLE statements |
| API Routes | N/A |
| Libraries | PostgreSQL DDL |

**Description:** Canonical schema snapshots for workouts, profiles, and marketplace.

**Technical flow:** Intended for manual or CI application before incremental migrations.


#### 🔒 Row Level Security Policies
#### RLS coverage (representative migrations)
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | See `database/migrations/unify_workouts_design.sql`, `add_workout_exercises_junction_tables.sql`, `add_native_workouts_table.sql`, `create_body_measurements.sql`, `create_admin_audit_logs.sql`, `create_admin_notifications.sql`, `create_admin_settings.sql`, `fix_admin_rls_policies.sql`, `add_get_client_progress.sql`, `add_notifications_insert_policy.sql`, `add_display_name_and_public_read.sql`, `add_user_type_column.sql` |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | All tables touched inside those files |
| API Routes | N/A |
| Libraries | PostgreSQL policies |

**Description:** Enforces per-role access for workouts, admin objects, notifications, measurements, and profile visibility.

**Technical flow:** Each file issues `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` plus `CREATE POLICY` statements; admin dashboard uses service role where appropriate.


#### 🔧 SQL Functions & Triggers
- Packaged functions and triggers: `database/functions/coach_marketplace_functions.sql`, `database/functions/delete_user_account_function.sql`
- Marketplace automation (`update_coach_rating`, `update_conversation_last_message`, wallet and pack triggers, `get_coach_dashboard_stats`, `get_client_progress`, `get_coach_clients`, `sync_user_type_on_profile_create`, `deduct_session`, and related helpers) live in `database/functions/coach_marketplace_functions.sql` and companion migrations.
- Account deletion RPC: `delete_user_account()` in `database/functions/delete_user_account_function.sql`.
- Additional migration-defined routines: `get_coach_clients`, `get_client_progress`, `get_conversations_enriched`, `calculate_workout_session_stats`, `populate_exercise_snapshots`, `is_admin`, `get_admin_user_ids`, `get_storage_url`.

#### 🔄 Migrations
#### Migration: add_activity_level_age_gender_columns.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/migrations/add_activity_level_age_gender_columns.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See SQL for affected relations |
| API Routes | N/A |
| Libraries | PostgreSQL DDL and DML |

**Description:** Versioned schema evolution for Supabase Postgres.

**Technical flow:** Applies idempotent changes (policies, columns, views, triggers) tracked in repo.


#### Migration: add_admin_role.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/migrations/add_admin_role.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See SQL for affected relations |
| API Routes | N/A |
| Libraries | PostgreSQL DDL and DML |

**Description:** Versioned schema evolution for Supabase Postgres.

**Technical flow:** Applies idempotent changes (policies, columns, views, triggers) tracked in repo.


#### Migration: add_conversations_enriched_view.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/migrations/add_conversations_enriched_view.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See SQL for affected relations |
| API Routes | N/A |
| Libraries | PostgreSQL DDL and DML |

**Description:** Versioned schema evolution for Supabase Postgres.

**Technical flow:** Applies idempotent changes (policies, columns, views, triggers) tracked in repo.


#### Migration: add_display_name_and_public_read.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/migrations/add_display_name_and_public_read.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See SQL for affected relations |
| API Routes | N/A |
| Libraries | PostgreSQL DDL and DML |

**Description:** Versioned schema evolution for Supabase Postgres.

**Technical flow:** Applies idempotent changes (policies, columns, views, triggers) tracked in repo.


#### Migration: add_exercise_images.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/migrations/add_exercise_images.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See SQL for affected relations |
| API Routes | N/A |
| Libraries | PostgreSQL DDL and DML |

**Description:** Versioned schema evolution for Supabase Postgres.

**Technical flow:** Applies idempotent changes (policies, columns, views, triggers) tracked in repo.


#### Migration: add_get_client_progress.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/migrations/add_get_client_progress.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See SQL for affected relations |
| API Routes | N/A |
| Libraries | PostgreSQL DDL and DML |

**Description:** Versioned schema evolution for Supabase Postgres.

**Technical flow:** Applies idempotent changes (policies, columns, views, triggers) tracked in repo.


#### Migration: add_native_workouts_table.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/migrations/add_native_workouts_table.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See SQL for affected relations |
| API Routes | N/A |
| Libraries | PostgreSQL DDL and DML |

**Description:** Versioned schema evolution for Supabase Postgres.

**Technical flow:** Applies idempotent changes (policies, columns, views, triggers) tracked in repo.


#### Migration: add_native_workouts_with_day_splits.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/migrations/add_native_workouts_with_day_splits.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See SQL for affected relations |
| API Routes | N/A |
| Libraries | PostgreSQL DDL and DML |

**Description:** Versioned schema evolution for Supabase Postgres.

**Technical flow:** Applies idempotent changes (policies, columns, views, triggers) tracked in repo.


#### Migration: add_notification_preferences_column.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/migrations/add_notification_preferences_column.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See SQL for affected relations |
| API Routes | N/A |
| Libraries | PostgreSQL DDL and DML |

**Description:** Versioned schema evolution for Supabase Postgres.

**Technical flow:** Applies idempotent changes (policies, columns, views, triggers) tracked in repo.


#### Migration: add_notifications_insert_policy.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/migrations/add_notifications_insert_policy.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See SQL for affected relations |
| API Routes | N/A |
| Libraries | PostgreSQL DDL and DML |

**Description:** Versioned schema evolution for Supabase Postgres.

**Technical flow:** Applies idempotent changes (policies, columns, views, triggers) tracked in repo.


#### Migration: add_profile_picture_column.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/migrations/add_profile_picture_column.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See SQL for affected relations |
| API Routes | N/A |
| Libraries | PostgreSQL DDL and DML |

**Description:** Versioned schema evolution for Supabase Postgres.

**Technical flow:** Applies idempotent changes (policies, columns, views, triggers) tracked in repo.


#### Migration: add_rest_timer_preferences.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/migrations/add_rest_timer_preferences.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See SQL for affected relations |
| API Routes | N/A |
| Libraries | PostgreSQL DDL and DML |

**Description:** Versioned schema evolution for Supabase Postgres.

**Technical flow:** Applies idempotent changes (policies, columns, views, triggers) tracked in repo.


#### Migration: add_user_type_column.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/migrations/add_user_type_column.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See SQL for affected relations |
| API Routes | N/A |
| Libraries | PostgreSQL DDL and DML |

**Description:** Versioned schema evolution for Supabase Postgres.

**Technical flow:** Applies idempotent changes (policies, columns, views, triggers) tracked in repo.


#### Migration: add_workout_exercises_junction_tables.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/migrations/add_workout_exercises_junction_tables.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See SQL for affected relations |
| API Routes | N/A |
| Libraries | PostgreSQL DDL and DML |

**Description:** Versioned schema evolution for Supabase Postgres.

**Technical flow:** Applies idempotent changes (policies, columns, views, triggers) tracked in repo.


#### Migration: add_workout_split_days.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/migrations/add_workout_split_days.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See SQL for affected relations |
| API Routes | N/A |
| Libraries | PostgreSQL DDL and DML |

**Description:** Versioned schema evolution for Supabase Postgres.

**Technical flow:** Applies idempotent changes (policies, columns, views, triggers) tracked in repo.


#### Migration: cleanup_old_workout_tables.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/migrations/cleanup_old_workout_tables.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See SQL for affected relations |
| API Routes | N/A |
| Libraries | PostgreSQL DDL and DML |

**Description:** Versioned schema evolution for Supabase Postgres.

**Technical flow:** Applies idempotent changes (policies, columns, views, triggers) tracked in repo.


#### Migration: create_admin_audit_logs.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/migrations/create_admin_audit_logs.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See SQL for affected relations |
| API Routes | N/A |
| Libraries | PostgreSQL DDL and DML |

**Description:** Versioned schema evolution for Supabase Postgres.

**Technical flow:** Applies idempotent changes (policies, columns, views, triggers) tracked in repo.


#### Migration: create_admin_notifications.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/migrations/create_admin_notifications.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See SQL for affected relations |
| API Routes | N/A |
| Libraries | PostgreSQL DDL and DML |

**Description:** Versioned schema evolution for Supabase Postgres.

**Technical flow:** Applies idempotent changes (policies, columns, views, triggers) tracked in repo.


#### Migration: create_admin_settings.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/migrations/create_admin_settings.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See SQL for affected relations |
| API Routes | N/A |
| Libraries | PostgreSQL DDL and DML |

**Description:** Versioned schema evolution for Supabase Postgres.

**Technical flow:** Applies idempotent changes (policies, columns, views, triggers) tracked in repo.


#### Migration: create_body_measurements.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/migrations/create_body_measurements.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See SQL for affected relations |
| API Routes | N/A |
| Libraries | PostgreSQL DDL and DML |

**Description:** Versioned schema evolution for Supabase Postgres.

**Technical flow:** Applies idempotent changes (policies, columns, views, triggers) tracked in repo.


#### Migration: enable_realtime_messages.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/migrations/enable_realtime_messages.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See SQL for affected relations |
| API Routes | N/A |
| Libraries | PostgreSQL DDL and DML |

**Description:** Versioned schema evolution for Supabase Postgres.

**Technical flow:** Applies idempotent changes (policies, columns, views, triggers) tracked in repo.


#### Migration: ensure_conversations_enriched_view.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/migrations/ensure_conversations_enriched_view.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See SQL for affected relations |
| API Routes | N/A |
| Libraries | PostgreSQL DDL and DML |

**Description:** Versioned schema evolution for Supabase Postgres.

**Technical flow:** Applies idempotent changes (policies, columns, views, triggers) tracked in repo.


#### Migration: extend_get_coach_clients.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/migrations/extend_get_coach_clients.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See SQL for affected relations |
| API Routes | N/A |
| Libraries | PostgreSQL DDL and DML |

**Description:** Versioned schema evolution for Supabase Postgres.

**Technical flow:** Applies idempotent changes (policies, columns, views, triggers) tracked in repo.


#### Migration: fix_admin_rls_policies.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/migrations/fix_admin_rls_policies.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See SQL for affected relations |
| API Routes | N/A |
| Libraries | PostgreSQL DDL and DML |

**Description:** Versioned schema evolution for Supabase Postgres.

**Technical flow:** Applies idempotent changes (policies, columns, views, triggers) tracked in repo.


#### Migration: fix_calculate_workout_session_stats_reps.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/migrations/fix_calculate_workout_session_stats_reps.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See SQL for affected relations |
| API Routes | N/A |
| Libraries | PostgreSQL DDL and DML |

**Description:** Versioned schema evolution for Supabase Postgres.

**Technical flow:** Applies idempotent changes (policies, columns, views, triggers) tracked in repo.


#### Migration: fix_conversations_enriched_security.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/migrations/fix_conversations_enriched_security.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See SQL for affected relations |
| API Routes | N/A |
| Libraries | PostgreSQL DDL and DML |

**Description:** Versioned schema evolution for Supabase Postgres.

**Technical flow:** Applies idempotent changes (policies, columns, views, triggers) tracked in repo.


#### Migration: fix_function_search_path.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/migrations/fix_function_search_path.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See SQL for affected relations |
| API Routes | N/A |
| Libraries | PostgreSQL DDL and DML |

**Description:** Versioned schema evolution for Supabase Postgres.

**Technical flow:** Applies idempotent changes (policies, columns, views, triggers) tracked in repo.


#### Migration: fix_get_client_progress_relationship.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/migrations/fix_get_client_progress_relationship.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See SQL for affected relations |
| API Routes | N/A |
| Libraries | PostgreSQL DDL and DML |

**Description:** Versioned schema evolution for Supabase Postgres.

**Technical flow:** Applies idempotent changes (policies, columns, views, triggers) tracked in repo.


#### Migration: fix_workout_session_stats_reps_parsing.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/migrations/fix_workout_session_stats_reps_parsing.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See SQL for affected relations |
| API Routes | N/A |
| Libraries | PostgreSQL DDL and DML |

**Description:** Versioned schema evolution for Supabase Postgres.

**Technical flow:** Applies idempotent changes (policies, columns, views, triggers) tracked in repo.


#### Migration: fix_workout_session_stats_trigger.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/migrations/fix_workout_session_stats_trigger.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See SQL for affected relations |
| API Routes | N/A |
| Libraries | PostgreSQL DDL and DML |

**Description:** Versioned schema evolution for Supabase Postgres.

**Technical flow:** Applies idempotent changes (policies, columns, views, triggers) tracked in repo.


#### Migration: fix_workout_structure.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/migrations/fix_workout_structure.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See SQL for affected relations |
| API Routes | N/A |
| Libraries | PostgreSQL DDL and DML |

**Description:** Versioned schema evolution for Supabase Postgres.

**Technical flow:** Applies idempotent changes (policies, columns, views, triggers) tracked in repo.


#### Migration: migrate_add_exercise_defaults.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/migrations/migrate_add_exercise_defaults.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See SQL for affected relations |
| API Routes | N/A |
| Libraries | PostgreSQL DDL and DML |

**Description:** Versioned schema evolution for Supabase Postgres.

**Technical flow:** Applies idempotent changes (policies, columns, views, triggers) tracked in repo.


#### Migration: remove_old_audit_log_table.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/migrations/remove_old_audit_log_table.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See SQL for affected relations |
| API Routes | N/A |
| Libraries | PostgreSQL DDL and DML |

**Description:** Versioned schema evolution for Supabase Postgres.

**Technical flow:** Applies idempotent changes (policies, columns, views, triggers) tracked in repo.


#### Migration: unify_workouts_design.sql
| Field | Detail |
|-------|--------|
| Platform | Backend |
| Screen / Route | database/migrations/unify_workouts_design.sql |
| Components | N/A |
| Service | N/A |
| Store | N/A |
| Supabase Tables | See SQL for affected relations |
| API Routes | N/A |
| Libraries | PostgreSQL DDL and DML |

**Description:** Versioned schema evolution for Supabase Postgres.

**Technical flow:** Applies idempotent changes (policies, columns, views, triggers) tracked in repo.


### 🧰 Tech Stack per Feature Category
| Category | Libraries / Services |
|----------|---------------------|
| Authentication | Supabase Auth, Expo Secure Store, Next `@supabase/ssr` |
| Database | Supabase Postgres and PostgREST |
| Chat | Supabase Realtime on `messages` |
| Video | LiveKit and Edge JWT minting |
| Push | Expo Push, Edge relay, `push_tokens` table |
| Storage | Supabase Storage buckets and Cloudflare R2 (`admin-panel/lib/r2.ts`) |
| AI measurements | Hugging Face pose estimation and Edge `body-measurements` |
| Mobile UI | React Native, Expo modules, Lucide icons |
| Admin UI | Next.js App Router and shadcn-style primitives |

### 📁 Full File Index
#### GoFitMobile/src/screens (`*.tsx`)
- GoFitMobile/src/screens/auth/ForgotPasswordScreen.tsx
- GoFitMobile/src/screens/auth/LoginScreen.tsx
- GoFitMobile/src/screens/auth/PasswordChangedSuccessScreen.tsx
- GoFitMobile/src/screens/auth/ResetPasswordScreen.tsx
- GoFitMobile/src/screens/auth/SignupScreen.tsx
- GoFitMobile/src/screens/auth/VerifyOtpScreen.tsx
- GoFitMobile/src/screens/auth/WelcomeScreen.tsx
- GoFitMobile/src/screens/coach-app/ChatScreen.tsx
- GoFitMobile/src/screens/coach-app/ClientDetailScreen.tsx
- GoFitMobile/src/screens/coach-app/ClientNotesScreen.tsx
- GoFitMobile/src/screens/coach-app/ClientProgressScreen.tsx
- GoFitMobile/src/screens/coach-app/ClientsListScreen.tsx
- GoFitMobile/src/screens/coach-app/CoachAvailabilityScreen.tsx
- GoFitMobile/src/screens/coach-app/CoachCalendarScreen.tsx
- GoFitMobile/src/screens/coach-app/CoachDashboardScreen.tsx
- GoFitMobile/src/screens/coach-app/CoachProfileScreen.tsx
- GoFitMobile/src/screens/coach-app/CoachSettingsScreen.tsx
- GoFitMobile/src/screens/coach-app/CoachWalletScreen.tsx
- GoFitMobile/src/screens/coach-app/ConversationsListScreen.tsx
- GoFitMobile/src/screens/coach-app/CreatePackScreen.tsx
- GoFitMobile/src/screens/coach-app/ProgramBuilderScreen.tsx
- GoFitMobile/src/screens/coach-app/ProgramsListScreen.tsx
- GoFitMobile/src/screens/coach-app/SessionPacksScreen.tsx
- GoFitMobile/src/screens/coach-app/VideoCallScreen.tsx
- GoFitMobile/src/screens/coach-auth/CoachLoginScreen.tsx
- GoFitMobile/src/screens/coach-auth/CoachSignupScreen.tsx
- GoFitMobile/src/screens/coach-auth/CoachWelcomeScreen.tsx
- GoFitMobile/src/screens/coach-onboarding/CoachCVUploadScreen.tsx
- GoFitMobile/src/screens/coach-onboarding/CoachCertificationsScreen.tsx
- GoFitMobile/src/screens/coach-onboarding/CoachOnboardingScreen.tsx
- GoFitMobile/src/screens/coach-onboarding/CoachPendingScreen.tsx
- GoFitMobile/src/screens/coach-onboarding/CoachProfilePreviewScreen.tsx
- GoFitMobile/src/screens/home/HomeScreen.tsx
- GoFitMobile/src/screens/library/ExerciseDetailScreen.tsx
- GoFitMobile/src/screens/library/ExerciseSelectionScreen.tsx
- GoFitMobile/src/screens/library/LibraryScreen.tsx
- GoFitMobile/src/screens/library/WorkoutBuilderScreen.tsx
- GoFitMobile/src/screens/library/WorkoutDetailScreen.tsx
- GoFitMobile/src/screens/library/WorkoutSessionScreen.tsx
- GoFitMobile/src/screens/library/WorkoutSummaryScreen.tsx
- GoFitMobile/src/screens/marketplace/BookSessionScreen.tsx
- GoFitMobile/src/screens/marketplace/CoachDetailScreen.tsx
- GoFitMobile/src/screens/marketplace/MarketplaceScreen.tsx
- GoFitMobile/src/screens/onboarding/OnboardingScreen1.tsx
- GoFitMobile/src/screens/onboarding/OnboardingScreen2.tsx
- GoFitMobile/src/screens/onboarding/OnboardingScreen3.tsx
- GoFitMobile/src/screens/onboarding/OnboardingScreen4.tsx
- GoFitMobile/src/screens/onboarding/OnboardingScreenPersonalDetails.tsx
- GoFitMobile/src/screens/plan/CalendarView.tsx
- GoFitMobile/src/screens/plan/MyWorkouts.tsx
- GoFitMobile/src/screens/plan/Timeline.tsx
- GoFitMobile/src/screens/plan/WorkoutsScreen.tsx
- GoFitMobile/src/screens/profile/AccountInformationScreen.tsx
- GoFitMobile/src/screens/profile/EditProfileScreen.tsx
- GoFitMobile/src/screens/profile/EditWeightHeightScreen.tsx
- GoFitMobile/src/screens/profile/GoalsScreen.tsx
- GoFitMobile/src/screens/profile/LanguageSettingsScreen.tsx
- GoFitMobile/src/screens/profile/MyBookingsScreen.tsx
- GoFitMobile/src/screens/profile/MyPacksScreen.tsx
- GoFitMobile/src/screens/profile/MyProgramsScreen.tsx
- GoFitMobile/src/screens/profile/NotificationInboxScreen.tsx
- GoFitMobile/src/screens/profile/NotificationsSettingsScreen.tsx
- GoFitMobile/src/screens/profile/PrivacyPolicyScreen.tsx
- GoFitMobile/src/screens/profile/ProfileScreen.tsx
- GoFitMobile/src/screens/profile/ProgramDetailScreen.tsx
- GoFitMobile/src/screens/profile/TermsOfServiceScreen.tsx
- GoFitMobile/src/screens/profile/TextSizeSettingsScreen.tsx
- GoFitMobile/src/screens/profile/ThemeSettingsScreen.tsx
- GoFitMobile/src/screens/profile/UnitPreferencesScreen.tsx
- GoFitMobile/src/screens/progress/BodyMeasurementsScreen.tsx
- GoFitMobile/src/screens/progress/ConsistencyScreen.tsx
- GoFitMobile/src/screens/progress/RecordDetailsScreen.tsx
- GoFitMobile/src/screens/progress/WorkoutStatisticsScreen.tsx
#### GoFitMobile/src/components (`*.tsx`, `*.ts`)
- GoFitMobile/src/components/auth/Checkbox.tsx
- GoFitMobile/src/components/auth/CustomButton.tsx
- GoFitMobile/src/components/auth/CustomInput.tsx
- GoFitMobile/src/components/auth/PasswordStrengthIndicator.tsx
- GoFitMobile/src/components/auth/SocialButton.tsx
- GoFitMobile/src/components/auth/index.ts
- GoFitMobile/src/components/home/ActionCard.tsx
- GoFitMobile/src/components/home/ArticlesFeed.tsx
- GoFitMobile/src/components/home/Banner.tsx
- GoFitMobile/src/components/home/GlassCalendar.tsx
- GoFitMobile/src/components/home/HomeHeader.tsx
- GoFitMobile/src/components/home/QuickActions.tsx
- GoFitMobile/src/components/home/RecentActivity.tsx
- GoFitMobile/src/components/home/SectionHeader.tsx
- GoFitMobile/src/components/home/StatsSummaryBar.tsx
- GoFitMobile/src/components/home/TopTrainers.tsx
- GoFitMobile/src/components/home/TopWorkouts.tsx
- GoFitMobile/src/components/home/WeeklyActivityChart.tsx
- GoFitMobile/src/components/home/WeeklyCalendar.tsx
- GoFitMobile/src/components/home/WeeklyStatus.tsx
- GoFitMobile/src/components/home/YourPrograms.tsx
- GoFitMobile/src/components/index.ts
- GoFitMobile/src/components/onboarding/OnboardingNavigationButtons.tsx
- GoFitMobile/src/components/onboarding/OnboardingProgressBar.tsx
- GoFitMobile/src/components/onboarding/WeightScale.tsx
- GoFitMobile/src/components/onboarding/index.ts
- GoFitMobile/src/components/plan/GymBagModal.tsx
- GoFitMobile/src/components/plan/TimePickerPill.tsx
- GoFitMobile/src/components/plan/WeatherWidget.tsx
- GoFitMobile/src/components/shared/AnimatedBackground.tsx
- GoFitMobile/src/components/shared/AppText.tsx
- GoFitMobile/src/components/shared/Button.tsx
- GoFitMobile/src/components/shared/CoachTabBar.tsx
- GoFitMobile/src/components/shared/CustomDialog.tsx
- GoFitMobile/src/components/shared/CustomTabBar.tsx
- GoFitMobile/src/components/shared/EmptyState.tsx
- GoFitMobile/src/components/shared/ErrorBoundary.tsx
- GoFitMobile/src/components/shared/ErrorState.tsx
- GoFitMobile/src/components/shared/GradientBackground.tsx
- GoFitMobile/src/components/shared/GradientText.tsx
- GoFitMobile/src/components/shared/KeyboardDismissView.tsx
- GoFitMobile/src/components/shared/Logo.tsx
- GoFitMobile/src/components/shared/NotificationBanner.tsx
- GoFitMobile/src/components/shared/RouteErrorBoundary.tsx
- GoFitMobile/src/components/shared/ScreenContainer.tsx
- GoFitMobile/src/components/shared/ScreenHeader.tsx
- GoFitMobile/src/components/shared/Shimmer.tsx
- GoFitMobile/src/components/shared/SplashScreen.tsx
- GoFitMobile/src/components/shared/TabBadge.tsx
- GoFitMobile/src/components/shared/TimerModal.tsx
- GoFitMobile/src/components/shared/Toast.tsx
- GoFitMobile/src/components/shared/index.ts
- GoFitMobile/src/components/workout/EnhancedRestTimer.tsx
- GoFitMobile/src/components/workout/RestTimerSettings.tsx
- GoFitMobile/src/components/workout/index.ts
#### GoFitMobile/src/services
- GoFitMobile/src/services/auth.ts
- GoFitMobile/src/services/bodyMeasurements.ts
- GoFitMobile/src/services/bookings.ts
- GoFitMobile/src/services/calendar.ts
- GoFitMobile/src/services/chat.ts
- GoFitMobile/src/services/clientManagement.ts
- GoFitMobile/src/services/coachProfile.ts
- GoFitMobile/src/services/exercises.ts
- GoFitMobile/src/services/marketplace.ts
- GoFitMobile/src/services/notificationInbox.ts
- GoFitMobile/src/services/notifications.ts
- GoFitMobile/src/services/programs.ts
- GoFitMobile/src/services/pushNotification.ts
- GoFitMobile/src/services/sessionPacks.ts
- GoFitMobile/src/services/userProfile.ts
- GoFitMobile/src/services/videoCall.ts
- GoFitMobile/src/services/wallet.ts
- GoFitMobile/src/services/workoutDetails.ts
- GoFitMobile/src/services/workoutPlans.ts
- GoFitMobile/src/services/workoutSessions.ts
- GoFitMobile/src/services/workoutStats.ts
- GoFitMobile/src/services/workouts.ts
#### GoFitMobile/src/store
- GoFitMobile/src/store/authStore.ts
- GoFitMobile/src/store/bookingsStore.ts
- GoFitMobile/src/store/calendarStore.ts
- GoFitMobile/src/store/chatStore.ts
- GoFitMobile/src/store/clientManagementStore.ts
- GoFitMobile/src/store/coachStore.ts
- GoFitMobile/src/store/deepLinkStore.ts
- GoFitMobile/src/store/languageStore.ts
- GoFitMobile/src/store/marketplaceStore.ts
- GoFitMobile/src/store/onboardingStore.ts
- GoFitMobile/src/store/packsStore.ts
- GoFitMobile/src/store/profileStore.ts
- GoFitMobile/src/store/programsStore.ts
- GoFitMobile/src/store/sessionsStore.ts
- GoFitMobile/src/store/textSizeStore.ts
- GoFitMobile/src/store/themeStore.ts
- GoFitMobile/src/store/timerStore.ts
- GoFitMobile/src/store/uiStore.ts
- GoFitMobile/src/store/workoutPlansStore.ts
- GoFitMobile/src/store/workoutsStore.ts
#### GoFitMobile/src/navigation
- GoFitMobile/src/navigation/AppNavigator.tsx
- GoFitMobile/src/navigation/AuthNavigator.tsx
- GoFitMobile/src/navigation/CoachAppNavigator.tsx
- GoFitMobile/src/navigation/CoachAuthNavigator.tsx
- GoFitMobile/src/navigation/CoachOnboardingNavigator.tsx
- GoFitMobile/src/navigation/OnboardingNavigator.tsx
#### GoFitMobile/src/hooks
- GoFitMobile/src/hooks/useRestTimer.ts
- GoFitMobile/src/hooks/useTabScroll.ts
#### GoFitMobile/src/api
- GoFitMobile/src/api/client.ts
#### GoFitMobile/src/utils
- GoFitMobile/src/utils/animations.ts
- GoFitMobile/src/utils/audioManager.ts
- GoFitMobile/src/utils/colorUtils.ts
- GoFitMobile/src/utils/constants.ts
- GoFitMobile/src/utils/exerciseTranslations.ts
- GoFitMobile/src/utils/formPersistence.ts
- GoFitMobile/src/utils/isWorkoutStartable.ts
- GoFitMobile/src/utils/logger.ts
- GoFitMobile/src/utils/passwordStrength.ts
- GoFitMobile/src/utils/rateLimiter.ts
- GoFitMobile/src/utils/responsive.ts
- GoFitMobile/src/utils/sanitize.ts
- GoFitMobile/src/utils/secureStorage.ts
#### GoFitMobile/src/i18n/locales
- GoFitMobile/src/i18n/locales/en.json
- GoFitMobile/src/i18n/locales/fr.json
#### GoFitMobile root
- GoFitMobile/App.tsx
#### admin-panel/app
- admin-panel/app/activity-logs/layout.tsx
- admin-panel/app/activity-logs/page.tsx
- admin-panel/app/api/audit-logs/route.ts
- admin-panel/app/api/coaches/[id]/certifications/route.ts
- admin-panel/app/api/coaches/route.ts
- admin-panel/app/api/exercises/[id]/route.ts
- admin-panel/app/api/exercises/bulk/route.ts
- admin-panel/app/api/exercises/route.ts
- admin-panel/app/api/health/route.ts
- admin-panel/app/api/notifications/[id]/route.ts
- admin-panel/app/api/notifications/read-all/route.ts
- admin-panel/app/api/notifications/route.ts
- admin-panel/app/api/settings/route.ts
- admin-panel/app/api/transactions/route.ts
- admin-panel/app/api/upload/route.ts
- admin-panel/app/api/users/[id]/route.ts
- admin-panel/app/api/users/[id]/toggle-admin/route.ts
- admin-panel/app/api/workouts/[id]/duplicate/route.ts
- admin-panel/app/api/workouts/[id]/route.ts
- admin-panel/app/api/workouts/bulk/route.ts
- admin-panel/app/api/workouts/route.ts
- admin-panel/app/coaches/layout.tsx
- admin-panel/app/coaches/page.tsx
- admin-panel/app/dashboard/layout.tsx
- admin-panel/app/dashboard/loading.tsx
- admin-panel/app/dashboard/page.tsx
- admin-panel/app/exercises/[id]/loading.tsx
- admin-panel/app/exercises/[id]/page.tsx
- admin-panel/app/exercises/layout.tsx
- admin-panel/app/exercises/loading.tsx
- admin-panel/app/exercises/new/loading.tsx
- admin-panel/app/exercises/new/page.tsx
- admin-panel/app/exercises/page.tsx
- admin-panel/app/layout.tsx
- admin-panel/app/login/page.tsx
- admin-panel/app/page.tsx
- admin-panel/app/settings/layout.tsx
- admin-panel/app/settings/page.tsx
- admin-panel/app/transactions/layout.tsx
- admin-panel/app/transactions/page.tsx
- admin-panel/app/users/EmptyUsersState.tsx
- admin-panel/app/users/[id]/loading.tsx
- admin-panel/app/users/[id]/page.tsx
- admin-panel/app/users/layout.tsx
- admin-panel/app/users/loading.tsx
- admin-panel/app/users/page.tsx
- admin-panel/app/workouts/[id]/loading.tsx
- admin-panel/app/workouts/[id]/page.tsx
- admin-panel/app/workouts/layout.tsx
- admin-panel/app/workouts/loading.tsx
- admin-panel/app/workouts/new/loading.tsx
- admin-panel/app/workouts/new/page.tsx
- admin-panel/app/workouts/page.tsx
#### admin-panel/components
- admin-panel/components/actions/QuickActions.tsx
- admin-panel/components/activity-logs/ActivityLogsTable.tsx
- admin-panel/components/analytics/ActivityHeatmap.tsx
- admin-panel/components/analytics/EngagementMetricsCards.tsx
- admin-panel/components/analytics/PopularExercisesCard.tsx
- admin-panel/components/analytics/RecentActivityFeed.tsx
- admin-panel/components/analytics/UserGrowthChart.tsx
- admin-panel/components/analytics/WorkoutCompletionCard.tsx
- admin-panel/components/coaches/CoachActions.tsx
- admin-panel/components/coaches/CoachSearchFilter.tsx
- admin-panel/components/exercises/BulkDeleteButton.tsx
- admin-panel/components/exercises/DeleteExerciseButton.tsx
- admin-panel/components/exercises/ExerciseForm.tsx
- admin-panel/components/exercises/ExerciseSearchFilter.tsx
- admin-panel/components/exercises/ExportExercisesButton.tsx
- admin-panel/components/exercises/ImportExercisesButton.tsx
- admin-panel/components/exercises/MultiExerciseForm.tsx
- admin-panel/components/health/SystemHealth.tsx
- admin-panel/components/keyboard/KeyboardShortcuts.tsx
- admin-panel/components/layout/MobileSidebar.tsx
- admin-panel/components/layout/Navbar.tsx
- admin-panel/components/layout/Sidebar.tsx
- admin-panel/components/layout/ThemeToggle.tsx
- admin-panel/components/notifications/NotificationCenter.tsx
- admin-panel/components/search/GlobalSearch.tsx
- admin-panel/components/skeletons/DashboardSkeleton.tsx
- admin-panel/components/skeletons/TableSkeleton.tsx
- admin-panel/components/skeletons/UserDetailSkeleton.tsx
- admin-panel/components/skeletons/WorkoutCardSkeleton.tsx
- admin-panel/components/theme-provider.tsx
- admin-panel/components/ui/alert-dialog.tsx
- admin-panel/components/ui/alert.tsx
- admin-panel/components/ui/avatar.tsx
- admin-panel/components/ui/badge.tsx
- admin-panel/components/ui/button.tsx
- admin-panel/components/ui/calendar.tsx
- admin-panel/components/ui/card.tsx
- admin-panel/components/ui/checkbox.tsx
- admin-panel/components/ui/collapsible.tsx
- admin-panel/components/ui/command.tsx
- admin-panel/components/ui/date-range-picker.tsx
- admin-panel/components/ui/dialog.tsx
- admin-panel/components/ui/dropdown-menu.tsx
- admin-panel/components/ui/empty-state.tsx
- admin-panel/components/ui/form-field.tsx
- admin-panel/components/ui/input.tsx
- admin-panel/components/ui/kbd.tsx
- admin-panel/components/ui/label.tsx
- admin-panel/components/ui/popover.tsx
- admin-panel/components/ui/progress.tsx
- admin-panel/components/ui/scroll-area.tsx
- admin-panel/components/ui/select.tsx
- admin-panel/components/ui/skeleton.tsx
- admin-panel/components/ui/sonner.tsx
- admin-panel/components/ui/spinner.tsx
- admin-panel/components/ui/switch.tsx
- admin-panel/components/ui/textarea.tsx
- admin-panel/components/ui/toast.tsx
- admin-panel/components/ui/toaster.tsx
- admin-panel/components/users/DeleteUserButton.tsx
- admin-panel/components/users/ExportUsersButton.tsx
- admin-panel/components/users/ToggleAdminButton.tsx
- admin-panel/components/users/UserSearchFilter.tsx
- admin-panel/components/workouts/BulkDeleteButton.tsx
- admin-panel/components/workouts/DeleteWorkoutButton.tsx
- admin-panel/components/workouts/DuplicateWorkoutButton.tsx
- admin-panel/components/workouts/EmptyWorkoutsState.tsx
- admin-panel/components/workouts/ExportWorkoutsButton.tsx
- admin-panel/components/workouts/ImportWorkoutsButton.tsx
- admin-panel/components/workouts/WorkoutForm.tsx
- admin-panel/components/workouts/WorkoutPreviewModal.tsx
- admin-panel/components/workouts/WorkoutSearchFilter.tsx
#### admin-panel/lib
- admin-panel/lib/analytics.ts
- admin-panel/lib/audit.ts
- admin-panel/lib/debug.ts
- admin-panel/lib/export.ts
- admin-panel/lib/r2.ts
- admin-panel/lib/supabase/admin.ts
- admin-panel/lib/supabase/client.ts
- admin-panel/lib/supabase/server.ts
- admin-panel/lib/utils.ts
- admin-panel/lib/validation.ts
- admin-panel/middleware.ts
#### supabase/functions
- supabase/functions/_shared/cors.ts
- supabase/functions/send-push-notification/index.ts
- supabase/functions/generate-video-token/index.ts
- supabase/functions/body-measurements/index.ts
#### database/schema
- database/schema/create_coach_marketplace_tables.sql
- database/schema/create_user_profiles_table.sql
- database/schema/create_workouts_tables.sql
- database/schema/create_workouts_tables_normalized.sql
#### database/migrations
- database/migrations/add_activity_level_age_gender_columns.sql
- database/migrations/add_admin_role.sql
- database/migrations/add_conversations_enriched_view.sql
- database/migrations/add_display_name_and_public_read.sql
- database/migrations/add_exercise_images.sql
- database/migrations/add_get_client_progress.sql
- database/migrations/add_native_workouts_table.sql
- database/migrations/add_native_workouts_with_day_splits.sql
- database/migrations/add_notification_preferences_column.sql
- database/migrations/add_notifications_insert_policy.sql
- database/migrations/add_profile_picture_column.sql
- database/migrations/add_rest_timer_preferences.sql
- database/migrations/add_user_type_column.sql
- database/migrations/add_workout_exercises_junction_tables.sql
- database/migrations/add_workout_split_days.sql
- database/migrations/cleanup_old_workout_tables.sql
- database/migrations/create_admin_audit_logs.sql
- database/migrations/create_admin_notifications.sql
- database/migrations/create_admin_settings.sql
- database/migrations/create_body_measurements.sql
- database/migrations/enable_realtime_messages.sql
- database/migrations/ensure_conversations_enriched_view.sql
- database/migrations/extend_get_coach_clients.sql
- database/migrations/fix_admin_rls_policies.sql
- database/migrations/fix_calculate_workout_session_stats_reps.sql
- database/migrations/fix_conversations_enriched_security.sql
- database/migrations/fix_function_search_path.sql
- database/migrations/fix_get_client_progress_relationship.sql
- database/migrations/fix_workout_session_stats_reps_parsing.sql
- database/migrations/fix_workout_session_stats_trigger.sql
- database/migrations/fix_workout_structure.sql
- database/migrations/migrate_add_exercise_defaults.sql
- database/migrations/remove_old_audit_log_table.sql
- database/migrations/unify_workouts_design.sql
#### database/functions
- database/functions/coach_marketplace_functions.sql
- database/functions/delete_user_account_function.sql
