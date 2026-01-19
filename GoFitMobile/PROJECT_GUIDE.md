# GoFit Project Guide

## 📋 Project Overview

GoFit is a React Native fitness application built with Expo, featuring workout tracking, exercise libraries, rest timers, and progress monitoring. The app uses Supabase for backend services (database, authentication, storage).

## 🏗️ Tech Stack

- **Framework:** React Native with Expo SDK 54
- **Navigation:** React Navigation (Stack & Bottom Tabs)
- **State Management:** Zustand (with persistence)
- **Backend:** Supabase (PostgreSQL database, Auth, Storage)
- **UI Libraries:**
  - `expo-linear-gradient` - Gradients
  - `expo-blur` - Blur effects
  - `lucide-react-native` - Icons
  - `expo-av` - Audio/video playback
  - `expo-haptics` - Haptic feedback
  - `react-native-reanimated` - Animations
- **i18n:** react-i18next (English & French)
- **Storage:** AsyncStorage (@react-native-async-storage/async-storage)
- **Fonts:** Custom "Designer" font + Montserrat Alternates

## 📁 Project Structure

```
GoFit/
├── src/
│   ├── components/
│   │   ├── shared/          # Reusable UI components
│   │   └── workout/         # Workout-specific components
│   │       ├── EnhancedRestTimer.tsx    # Main rest timer component
│   │       └── RestTimerSettings.tsx    # Settings modal
│   ├── screens/
│   │   ├── library/         # Workout library screens
│   │   │   ├── LibraryScreen.tsx        # Main library (native/custom workouts)
│   │   │   ├── WorkoutDetailScreen.tsx  # Workout details with day splits
│   │   │   ├── WorkoutSessionScreen.tsx # Active workout session
│   │   │   ├── WorkoutBuilderScreen.tsx # Create/edit custom workouts
│   │   │   └── WorkoutSummaryScreen.tsx # Post-workout summary
│   │   ├── home/            # Home screen
│   │   ├── profile/         # Profile & settings screens
│   │   └── auth/            # Authentication screens
│   ├── services/
│   │   └── workouts.ts      # Supabase workout service layer
│   ├── store/               # Zustand stores
│   │   ├── themeStore.ts    # Theme management (light/dark/system)
│   │   ├── timerStore.ts    # Rest timer state & preferences
│   │   └── ...              # Other stores
│   ├── hooks/
│   │   └── useRestTimer.ts  # Rest timer logic hook
│   ├── utils/
│   │   ├── colorUtils.ts    # Theme-aware color utilities
│   │   ├── exerciseTranslations.ts # Exercise name translations
│   │   └── animations.ts    # Animation utilities
│   ├── theme/
│   │   └── index.ts         # Theme configuration (colors, spacing, etc.)
│   ├── i18n/                # Translation files (en.json, fr.json)
│   └── types/
│       └── index.ts         # TypeScript type definitions
├── database/
│   ├── schema/              # Database schema definitions
│   └── migrations/          # SQL migration scripts
└── assets/                  # Images, fonts, sounds
```

## 🗄️ Database Schema (PostgreSQL/Supabase)

### Core Tables

#### `public.exercises`
- Exercise library with metadata (name, image_url, equipment, difficulty, etc.)
- Contains default sets/reps/rest_time for reference

#### `public.workouts` (Unified Table)
- **Native workouts:** `user_id IS NULL`
- **Custom workouts:** `user_id IS NOT NULL` (references auth.users)
- Fields: `id`, `user_id`, `name`, `difficulty`, `image_url`, `created_at`, `updated_at`
- **No `date`, `type`, `calories`** - these belong in `workout_sessions`

#### `public.workout_exercises` (Junction Table)
- Links workouts to exercises
- Fields: `id`, `workout_id`, `exercise_id`, `sets`, `reps`, `rest_time`, `exercise_order`, `day`
- **Snapshot fields:** `exercise_name`, `exercise_image_url`, `exercise_equipment`, `exercise_difficulty`
  - These preserve historical data if exercises are modified later
- **Day field:** Organizes exercises by day (1-7) for split workouts

#### `public.workout_sessions`
- Records actual workout sessions (user activity logs)
- Fields: `id`, `user_id`, `workout_id`, `started_at`, `completed_at`, `duration_minutes`, `calories`, `notes`
- **Stores progress in JSONB:** `exercises_completed` (sets, reps, weights, rest times)
- **No `workout_name` or `workout_type`** - these come from the `workouts` table via FK

#### `public.user_profiles`
- User profile data
- Contains `rest_timer_preferences` JSONB column for timer settings

### Key Design Principles

1. **Normalized Design:** No JSONB duplication - exercises referenced via FK
2. **Snapshots:** Exercise metadata saved in `workout_exercises` for historical accuracy
3. **Clear Separation:** 
   - `workouts` = Templates
   - `workout_sessions` = Execution logs
4. **Day Splits:** Workouts can be split across multiple days (Push/Pull/Legs, etc.)

### Migration Files

Key migrations (in order):
1. `create_workouts_tables_normalized.sql` - Initial normalized schema
2. `unify_workouts_design.sql` - Unified workouts table
3. `fix_workout_structure.sql` - Final clean structure (removed date/type from workouts)
4. `add_workout_split_days.sql` - Added `day` field to workout_exercises
5. `add_native_workouts_with_day_splits.sql` - Seed native workouts with day splits
6. `fix_calculate_workout_session_stats_reps.sql` - Fixed trigger function to handle string reps
7. `add_rest_timer_preferences.sql` - Added timer preferences to user_profiles

## ✨ Key Features Implemented

### Workout Library Section

1. **Native & Custom Workouts**
   - Native workouts loaded from database (no hardcoding)
   - Custom workout creation/editing
   - Day-based workout splits (e.g., Push/Pull/Legs, Upper/Lower, Bro Split)
   - Workout detail view with day tabs (horizontal scrollable)
   - Day selection modal when starting multi-day workouts

2. **Workout Session Screen**
   - Exercise-by-exercise workout tracking
   - Weight input per set
   - Progressive overload suggestions
   - Previous exercise navigation
   - Workout duration timer
   - Pause/resume functionality
   - Real-time progress saving

3. **Enhanced Rest Timer** ⭐
   - **Large animated timer display** with Designer font
   - **Circular progress indicator** (240px, animated)
   - **Exercise header** with blurred background image showing:
     - Current exercise name (translated)
     - Exercise image (prominent display)
     - Set badge: "Set X / Y" with gradient
   - **Add/Reduce time buttons** (+15s, -15s)
   - **Pause/Resume controls**
   - **Next exercise preview** (fades in after 5 seconds)
   - **Settings modal** with:
     - Audio & haptic toggles
     - Auto-advance toggle
     - Warning interval checkboxes (30s, 20s, 10s, 5s)
     - Default rest time presets (30s, 60s, 90s, 120s, 180s)
   - **Auto-advance:** Automatically moves to next set after countdown
   - **Audio alerts:** Beeps at start, warnings, and completion
   - **Haptic feedback:** Vibration at key moments
   - **Visual warnings:** Timer color changes (green → yellow → orange → red)
   - **Pulse animations:** At warning intervals (more dramatic for lower times)
   - **Background timer:** Continues when app goes to background
   - **Preferences persisted** in AsyncStorage via Zustand

4. **Workout Summary Screen**
   - Post-workout statistics
   - Total sets, reps, duration, calories
   - Exercise breakdown
   - Visual enhancements with cards

5. **Workout Builder Screen**
   - Create/edit custom workouts
   - Day selection for each exercise (1-7)
   - Exercise selection from database
   - Configure sets, reps, rest times

### UI/UX Enhancements

- **Light Mode:** Significantly enhanced with warmer colors, better contrast
- **Designer Font:** Used for headers and large numbers (timer, countdown)
- **Animations:** Smooth 120Hz-optimized animations using react-native-reanimated
- **Shadows & Depth:** Enhanced visual hierarchy with proper shadows
- **Responsive Design:** Uses responsive spacing utilities
- **Accessibility:** Screen reader support, haptic feedback

### Internationalization

- English and French translations
- Exercise name translations (maps English names to i18n keys)
- All UI strings use `useTranslation()` hook

## 🔧 Important Technical Details

### Rest Timer Implementation

The rest timer uses a sophisticated state management approach:

**State Management:**
- `useTimerStore` (Zustand) - Global timer state
- `useRestTimer` hook - Timer logic (intervals, audio, haptics)
- Uses refs to prevent unnecessary effect re-runs (`preferencesRef`, `onCompleteRef`, `currentSecondsRef`)

**Key Files:**
- `src/hooks/useRestTimer.ts` - Core timer logic
- `src/store/timerStore.ts` - Zustand store for timer state
- `src/components/workout/EnhancedRestTimer.tsx` - UI component
- `src/utils/audioManager.ts` - Audio & haptic feedback

**Timer Preferences (JSONB in user_profiles):**
```json
{
  "audio_enabled": true,
  "haptics_enabled": true,
  "auto_advance": false,
  "warnings": [30, 10, 5],
  "default_rest_seconds": 60
}
```

### Workout Session Progress

Progress is stored in `workout_sessions.exercises_completed` as JSONB:
```json
{
  "exercise_id": {
    "sets": "1,1,1",
    "reps": "12,10,8",
    "weights": ["60", "65", "70"],
    "restTime": "90"
  }
}
```

**Important:** `sets`, `reps`, and `restTime` are stored as **strings** to handle comma-separated values (e.g., "12,10,8" for reps across sets).

### Service Layer (`src/services/workouts.ts`)

Key methods:
- `getWorkouts(filterEmpty?: boolean)` - Get all workouts (native + custom)
- `getWorkoutById(id)` - Get workout with exercises
- `getWorkoutExercises(workoutId)` - Get exercises for a workout (ordered by day)
- `getWorkoutExercisesByDay(workoutId)` - Group exercises by day
- `createCustomWorkout()` - Creates workout + workout_exercises entries
- `createWorkoutSession()` - Creates a new session
- `updateWorkoutSession()` - Updates progress (ensures strings for reps/sets)

### Theme System

- Light/Dark/System modes
- Theme-aware color utilities (`getBackgroundColor()`, `getTextColor()`, etc.)
- Enhanced light mode with warmer backgrounds, better contrast
- Shadow utilities that adapt to theme

## 🎨 Design Patterns

1. **Component Organization:**
   - Shared components in `components/shared/`
   - Feature-specific in `components/[feature]/`

2. **State Management:**
   - Zustand for global state
   - Local state for component-specific UI state
   - Persistence via Zustand middleware for user preferences

3. **Navigation:**
   - Stack navigators for feature sections
   - Bottom tabs for main navigation
   - Type-safe navigation with TypeScript

4. **Error Handling:**
   - Error boundaries
   - User-friendly error messages
   - Logging utility

## ⚠️ Known Issues & Gotchas

1. **Web Support:** Not fully functional (import.meta errors with Supabase)
   - Focus is on mobile (iOS/Android)

2. **Timer Interval Management:**
   - Uses refs to prevent interval restart loops
   - `currentSecondsRef` ensures latest value in callbacks

3. **Database Triggers:**
   - `calculate_workout_session_stats` function parses string reps correctly
   - Handles comma-separated values: "12,10,8" → sums to 30

4. **Exercise Snapshots:**
   - Always populate snapshot fields when creating workout_exercises
   - This preserves data even if exercises table changes

5. **Workout Splits:**
   - Always show day sections even if all exercises are on Day 1
   - Allows users to see and modify day assignments

## 📝 Recent Work (Latest Session)

### Rest Timer Enhancements

1. **Fixed timer not starting** - Issue with effect dependencies causing restart loops
2. **Added settings button** - Top-right corner with modal
3. **Added current exercise display** - Shows exercise name, image, and set number
4. **Enhanced UI:**
   - Designer font for timer (96px)
   - Larger progress circle (240px)
   - Blurred image background for exercise header
   - Enhanced shadows and visual depth
   - Better animations (pulse, scale, fade)
5. **Fixed auto-advance** - Now properly moves to next set/exercise
6. **Settings modal scroll padding** - Fixed bottom navigation overlap

### UI Improvements

- Exercise header with prominent image display
- Gradient badges for set numbers
- Enhanced button styling with shadows
- Clock icon next to timer label
- Scale animations for next exercise preview

## 🚀 How to Run

```bash
# Install dependencies
npm install

# Start Expo
npx expo start

# For Android
npx expo start --android

# For iOS
npx expo start --ios
```

## 📚 Key Files to Understand

1. **`src/services/workouts.ts`** - All database interactions for workouts
2. **`src/components/workout/EnhancedRestTimer.tsx`** - Rest timer UI
3. **`src/hooks/useRestTimer.ts`** - Timer logic & state management
4. **`src/screens/library/WorkoutSessionScreen.tsx`** - Main workout flow
5. **`src/store/timerStore.ts`** - Timer preferences & state
6. **`database/migrations/`** - Database schema evolution

## 🔑 Important Constants

- **Designer Font:** Use `fontFamily: 'Designer', fontWeight: 'normal'` for headers
- **Primary Color:** `theme.colors.primary` (brand green)
- **Responsive Utilities:** `getResponsiveSpacing()`, `getScaledFontSize()`
- **Theme Colors:** Use `getBackgroundColor()`, `getTextColor()` utilities

## 💡 Future Enhancement Ideas

- Workout calendar integration
- Exercise videos in detail screens
- Social features (sharing workouts)
- Progress charts and analytics
- Workout templates marketplace
- AI-powered workout recommendations

---

**Last Updated:** Current session focused on rest timer UI/UX enhancements and auto-advance functionality.












