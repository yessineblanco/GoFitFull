# GoFit Advanced Features + BI Dashboard -- Implementation Plan

## Overview

Ten work items for GoFit (bugs/fixes first, then new features):

**Fixes & Missing Implementations:**
1. **Bug Fixes & Cleanup** -- fix broken navigation, implement timer modal, remove orphaned screens
2. **Coach Wallet & Settings** -- build the two "Coming Soon" screens in coach profile
3. **AI Body Measurements (MediaPipe)** -- the feature claimed in the presentation slides
4. **Nutrition Tracking** -- meal logging, calorie/macro tracking, daily goals

**New Advanced Features:**
5. **Admin BI Dashboard** -- comprehensive business intelligence page in the admin panel
6. **AI Workout Recommendations** -- personalized workout suggestions in the mobile app
7. **Smart Notifications & Reminders** -- streak tracking, scheduled reminders, inactivity nudges
8. **Wearable Integration** -- Apple Health / Google Fit sync for calories and steps (client)
9. **Progress Photos** -- upload and compare body transformation photos over time (client)
10. **Coach AI & Productivity** -- AI session notes, enhanced client progress dashboard, program templates
11. **Automated Check-ins** -- scheduled mood/energy/soreness logging from clients, visible to coach

---

## Part 0: Bug Fixes & Cleanup

Quick fixes for broken or dead code in the current app.

### 0A: Fix Quick Actions "Create Workout" Navigation

**File:** `GoFitMobile/src/components/home/QuickActions.tsx`

The "Create Workout" quick action navigates to `Library` → `CreateWorkout`, but `CreateWorkout` does not exist in the Library stack. The correct screen name is `WorkoutBuilder` (registered in `AppNavigator.tsx`).

**Fix:** Change the navigation target from `CreateWorkout` to `WorkoutBuilder`.

### 0B: Implement Timer Modal

**File:** `GoFitMobile/src/components/home/QuickActions.tsx`

The Timer quick action currently only triggers haptic feedback with a `TODO: Open standalone timer modal` comment.

**New file:** `GoFitMobile/src/components/shared/TimerModal.tsx`
- A modal/bottom sheet with a countdown timer
- Preset buttons (30s, 60s, 90s, 120s, custom input)
- Start / Pause / Reset controls
- Vibration + sound alert when timer reaches zero
- Visible countdown with circular progress indicator

**Changes:** `QuickActions.tsx` -- open the TimerModal on timer press instead of just haptics.

### 0C: Remove Orphaned Placeholder Screens

Delete these unused "Coming Soon" files that are never referenced in navigation:
- `GoFitMobile/src/screens/coach-app/CoachChatScreen.tsx`
- `GoFitMobile/src/screens/coach-app/CoachClientsScreen.tsx`

### 0D: Fix Presentation Slides Accuracy

**File:** `docs/PRESENTATION_SLIDES.txt`

Update the slides to reflect the actual tech stack:
- Change "Socket.io" to "Supabase Realtime" for messaging (matches actual implementation)

---

## Part 1A: Coach Wallet & Settings Screens

The coach profile screen has "Wallet" and "Settings" entries marked `comingSoon: true` that only trigger haptics. Build real screens for both.

### Coach Wallet Screen

**New file:** `GoFitMobile/src/screens/coach-app/CoachWalletScreen.tsx`

Data from: `wallets`, `transactions`

- **Balance Card:** Current wallet balance with currency, large prominent display
- **Transaction History:** Scrollable list of transactions (earnings from sessions, pack purchases) with date, amount, type, client name
- **Earnings Summary:** Cards showing total earnings this week / this month / all time
- **Withdrawal placeholder:** "Withdraw" button (can show info modal about Stripe payout setup, or be functional if `stripe_account_id` exists)

**Service:** `GoFitMobile/src/services/wallet.ts`
- `getWalletBalance()` -- fetch from `wallets` table
- `getTransactions(limit, offset)` -- paginated fetch from `transactions` table
- `getEarningsSummary()` -- aggregated earnings by period

**Store:** `GoFitMobile/src/stores/walletStore.ts`

**Navigation:** Add `CoachWallet` screen to coach profile stack in `CoachAppNavigator.tsx`. Update `CoachProfileScreen.tsx` to navigate to it (remove `comingSoon: true`).

### Coach Settings Screen

**New file:** `GoFitMobile/src/screens/coach-app/CoachSettingsScreen.tsx`

- **Availability Preferences:** Link to availability management (already exists in calendar)
- **Notification Preferences:** Toggles for booking notifications, message notifications, review notifications
- **Session Defaults:** Default session duration, cancellation policy text
- **Profile Visibility:** Toggle to show/hide profile on marketplace
- **Account:** Change password, email preferences, delete account link

**Navigation:** Add `CoachSettings` screen to coach profile stack. Update `CoachProfileScreen.tsx` to navigate to it (remove `comingSoon: true`).

---

## Part 1B: AI Body Measurements (MediaPipe)

Use MediaPipe Pose Detection to estimate body measurements from photos. This is the feature highlighted in the presentation slides as a key differentiator.

### How It Works

```
User takes a front-facing full-body photo
  →  MediaPipe Pose Landmark Detection runs on-device
  →  Extracts 33 body landmarks (shoulders, hips, knees, etc.)
  →  Calculates estimated measurements using landmark distances + user height as reference
  →  Stores measurements with timestamp
  →  Shows trends over time
```

### Dependencies

New npm package: `@mediapipe/tasks-vision` (or `react-native-mediapipe` if available for RN).
Alternative approach: use `expo-camera` to capture the photo, then send to a Supabase Edge Function that runs MediaPipe server-side via the Python API, returning landmarks.

Recommended approach for reliability: **server-side via Edge Function** since MediaPipe in React Native can be tricky. The edge function receives the image, processes it with MediaPipe, and returns landmarks + estimated measurements.

### Database

**New migration:** `database/migrations/create_body_measurements.sql`

```sql
CREATE TABLE body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  photo_url TEXT,
  -- Estimated measurements (in cm)
  shoulder_width NUMERIC,
  chest NUMERIC,
  waist NUMERIC,
  hips NUMERIC,
  left_arm NUMERIC,
  right_arm NUMERIC,
  left_thigh NUMERIC,
  right_thigh NUMERIC,
  -- Raw landmark data for recalculation
  landmarks JSONB,
  -- Manual overrides (user can correct estimates)
  manual_overrides JSONB,
  source TEXT DEFAULT 'ai', -- 'ai' | 'manual'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Edge Function (if server-side approach)

**New file:** `supabase/functions/body-measurements/index.ts`
- Receives image (base64 or storage URL) + user height
- Runs MediaPipe Pose Landmarker
- Calculates approximate measurements using proportional geometry:
  - Shoulder width = distance between left/right shoulder landmarks × scale factor
  - Waist = distance at hip landmarks × scale factor
  - etc.
- Returns JSON with estimated measurements + raw landmarks

### Mobile App Changes

**New files:**
- `GoFitMobile/src/services/bodyMeasurements.ts` -- upload photo, call edge function, save results, fetch history
- `GoFitMobile/src/stores/bodyMeasurementsStore.ts` -- Zustand store
- `GoFitMobile/src/screens/progress/BodyMeasurementsScreen.tsx` -- main screen:
  - "Take Measurement" button → opens camera with pose guide overlay (silhouette showing how to stand)
  - Latest measurements displayed as a body diagram with numbers
  - Measurement history as line charts (each body part over time)
  - Manual entry option (for users who prefer tape measure)
- `GoFitMobile/src/components/progress/BodyDiagram.tsx` -- SVG body outline with measurement labels
- `GoFitMobile/src/components/progress/MeasurementChart.tsx` -- line chart for a single measurement over time

**Existing file changes:**
- `GoFitMobile/src/navigation/AppNavigator.tsx` -- add `BodyMeasurements` to Progress stack
- `GoFitMobile/src/screens/progress/WorkoutStatisticsScreen.tsx` -- add "Body Measurements" card linking to the new screen

---

## Part 1C: Nutrition Tracking

A meal logging system where clients track daily food intake with calories and macros.

### Database

**New migration:** `database/migrations/create_nutrition_tables.sql`

```sql
-- Food items database (pre-populated + user custom)
CREATE TABLE food_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  serving_size NUMERIC NOT NULL,
  serving_unit TEXT DEFAULT 'g',
  calories NUMERIC NOT NULL,
  protein NUMERIC DEFAULT 0,
  carbs NUMERIC DEFAULT 0,
  fat NUMERIC DEFAULT 0,
  fiber NUMERIC DEFAULT 0,
  is_custom BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily meal logs
CREATE TABLE meal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  food_item_id UUID REFERENCES food_items(id),
  custom_name TEXT, -- for quick-add without food_items lookup
  meal_type TEXT NOT NULL, -- 'breakfast' | 'lunch' | 'dinner' | 'snack'
  servings NUMERIC DEFAULT 1,
  calories NUMERIC NOT NULL,
  protein NUMERIC DEFAULT 0,
  carbs NUMERIC DEFAULT 0,
  fat NUMERIC DEFAULT 0,
  logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily nutrition goals
CREATE TABLE nutrition_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  daily_calories INTEGER DEFAULT 2000,
  daily_protein INTEGER DEFAULT 150,
  daily_carbs INTEGER DEFAULT 250,
  daily_fat INTEGER DEFAULT 65,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Seed Data

A SQL seed file with ~100-200 common food items (chicken breast, rice, eggs, oats, banana, whey protein, etc.) with accurate nutritional data.

### Mobile App Changes

**New files:**
- `GoFitMobile/src/services/nutrition.ts` -- CRUD for meal_logs, food_items search, nutrition_goals, daily summary calculations
- `GoFitMobile/src/stores/nutritionStore.ts` -- Zustand store with today's meals, daily totals, goals, food search results
- `GoFitMobile/src/screens/nutrition/NutritionScreen.tsx` -- main screen (new tab or accessible from home):
  - **Daily Summary** at top: circular progress rings for Calories, Protein, Carbs, Fat (filled amount / goal)
  - **Meal Sections:** Breakfast, Lunch, Dinner, Snacks -- each expandable with logged items and "+ Add Food" button
  - Date picker to view other days
- `GoFitMobile/src/screens/nutrition/AddFoodScreen.tsx` -- search screen:
  - Search bar to find food items from database
  - Recent foods section
  - "Quick Add" option (just enter name + calories + macros manually)
  - Tap food item → set serving count → add to meal
- `GoFitMobile/src/screens/nutrition/NutritionGoalsScreen.tsx` -- set daily calorie and macro targets
- `GoFitMobile/src/components/nutrition/MacroRings.tsx` -- circular progress rings component
- `GoFitMobile/src/components/nutrition/MealSection.tsx` -- expandable meal section component
- `GoFitMobile/src/components/nutrition/FoodSearchItem.tsx` -- search result row

**Navigation:** Either add a new "Nutrition" tab to the bottom tab bar, or add it as a screen accessible from Home and Profile. Adding a tab would require changing the tab layout.

**Existing file changes:**
- `GoFitMobile/src/screens/home/HomeScreen.tsx` -- add a "Today's Nutrition" summary card (calories consumed / goal with a small ring)
- `GoFitMobile/src/navigation/AppNavigator.tsx` -- add nutrition screens to navigation

---

## Part 2: Admin BI Dashboard

The current dashboard at `admin-panel/app/dashboard/page.tsx` has basic analytics (user growth chart, engagement cards, heatmap, workout completion, popular exercises). We will build a **new dedicated BI page** at `/bi-dashboard` with comprehensive business intelligence.

### New Page: `/bi-dashboard`

**File:** `admin-panel/app/bi-dashboard/page.tsx`

A tabbed layout with 4 sections and a **global date range picker** (7d / 30d / 90d / custom) that filters every chart on the page.

### Tab 1: Revenue Analytics

Data from: `transactions`, `purchased_packs`, `session_packs`, `wallets`

- **KPI Cards Row:**
  - Total Revenue (with % change vs previous period)
  - Total Pack Sales
  - Average Revenue Per User (ARPU)
  - Active Subscriptions (packs with remaining sessions)
- **Revenue Over Time** -- Recharts AreaChart with daily/weekly/monthly trend and previous period comparison overlay
- **Revenue by Coach** -- Recharts horizontal BarChart showing top 10 coaches by revenue generated
- **Pack Sales Breakdown** -- Recharts PieChart showing distribution of pack types sold
- **Recent Transactions Table** -- sortable/paginated table with columns: Date, Client, Coach, Pack name, Amount, Status

### Tab 2: Coach Performance

Data from: `coach_profiles`, `bookings`, `coach_reviews`, `purchased_packs`

- **KPI Cards Row:**
  - Total Active Coaches
  - Average Coach Rating
  - Total Bookings (in selected period)
  - Booking Completion Rate (% completed vs total)
- **Top Coaches Ranking** -- table with inline sparklines showing rank, name, rating (stars), total sessions, revenue, 30-day trend
- **Bookings Over Time** -- Recharts multi-line chart with 3 lines: completed, cancelled, pending bookings per day/week
- **Coach Rating Distribution** -- Recharts BarChart histogram of 1-star through 5-star average ratings
- **Coach Utilization** -- grid showing available hours vs booked hours for top coaches

### Tab 3: User Retention & Engagement

Data from: `user_profiles`, `workout_sessions`, `auth.users`

- **KPI Cards Row:**
  - True DAU (distinct users with a session today)
  - True WAU (distinct users, last 7 days)
  - True MAU (distinct users, last 30 days)
  - Churn Rate (% of users active last month but not this month)
- **Retention Cohort Grid** -- color-coded table where rows = signup month, columns = months since signup, cells = % of users from that cohort still active (green = high retention, red = low)
- **User Funnel** -- Signup → Profile Complete → First Workout → 7-Day Active → 30-Day Active (with count and drop-off % at each stage)
- **Session Frequency Distribution** -- Recharts BarChart showing how many users work out 1x/week, 2x/week, 3x/week, etc.
- **Growth vs Churn** -- Recharts ComposedChart with new signups (bars) overlaid with churned users (line) over time

### Tab 4: Platform Overview

- **Gender Distribution** -- Recharts PieChart (Male / Female / Not specified)
- **Age Distribution** -- Recharts BarChart (18-24, 25-34, 35-44, 45-54, 55+)
- **Activity Level** -- Recharts BarChart (Sedentary / Light / Moderate / Active / Very Active)
- **Content Stats** -- stat cards showing total exercises, total workouts (native vs custom), total custom programs
- **Communication Stats** -- stat cards showing messages sent, video calls made, avg coach response time
- **Least Used Content** -- table of workouts/exercises with fewest sessions (helps admin identify dead content)
- **Export Report** -- button to download CSV/PDF summary of all KPIs for the selected date range

### Data Layer

**New file:** `admin-panel/lib/bi-analytics.ts`

All query functions using Supabase admin client:

| Function | What it queries |
|----------|----------------|
| `getRevenueMetrics(startDate, endDate)` | `transactions` + `purchased_packs` for KPI cards |
| `getRevenueTimeSeries(startDate, endDate, granularity)` | Daily/weekly/monthly revenue from `transactions` |
| `getRevenueByCoach(startDate, endDate, limit)` | `transactions` → `wallets` → `coach_profiles` |
| `getPackSalesBreakdown(startDate, endDate)` | `purchased_packs` → `session_packs` |
| `getRecentTransactions(limit)` | `transactions` with coach/client info |
| `getCoachPerformanceMetrics(startDate, endDate)` | `coach_profiles` + `bookings` + `coach_reviews` |
| `getTopCoaches(limit)` | Composite ranking from multiple tables |
| `getBookingsTimeSeries(startDate, endDate)` | `bookings` grouped by status and date |
| `getCoachRatingDistribution()` | `coach_profiles.average_rating` bucketed |
| `getRetentionCohorts(months)` | Cross-tab of `user_profiles.created_at` vs `workout_sessions` by month |
| `getUserFunnelData(startDate, endDate)` | Counts at each funnel stage |
| `getChurnRate(startDate, endDate)` | Users active in previous period but not current |
| `getSessionFrequency(startDate, endDate)` | `workout_sessions` grouped by user, counted per week |
| `getDemographicBreakdown()` | Aggregates from `user_profiles` (gender, age, activity_level) |
| `getContentStats()` | Counts from `exercises`, `workouts`, `custom_programs` |
| `getCommunicationStats(startDate, endDate)` | From `messages` and `bookings` |

### New Components

All under `admin-panel/components/bi-dashboard/`:

- `DateRangePicker.tsx` -- reusable date range selector with presets (7d, 30d, 90d) + custom calendar
- `KPICard.tsx` -- stat card with value, trend arrow (up/down), % change, colored green/red
- `BIDashboardTabs.tsx` -- client component managing tab state
- `RevenueOverTimeChart.tsx` -- AreaChart with period comparison
- `RevenueByCoachChart.tsx` -- horizontal BarChart
- `PackSalesBreakdown.tsx` -- PieChart
- `RecentTransactionsTable.tsx` -- sortable table
- `CoachRankingTable.tsx` -- table with sparklines
- `BookingsChart.tsx` -- multi-line LineChart
- `CoachRatingDistribution.tsx` -- BarChart histogram
- `RetentionCohortGrid.tsx` -- color-coded cohort table
- `UserFunnelChart.tsx` -- funnel visualization
- `SessionFrequencyChart.tsx` -- BarChart
- `GrowthVsChurnChart.tsx` -- ComposedChart
- `DemographicsCharts.tsx` -- pie + bar charts for demographics
- `ExportReportButton.tsx` -- CSV/PDF download

### Sidebar + Middleware

- Add "BI Dashboard" link with `BarChart3` icon to `admin-panel/components/layout/Sidebar.tsx`
- Add `/bi-dashboard` to protected paths in `admin-panel/middleware.ts`

---

## Part 2: AI Workout Recommendations (Mobile App)

An AI-powered recommendation engine that suggests personalized workouts based on user history, goals, and fitness level.

### How It Works

```
Mobile App  →  Supabase Edge Function  →  Fetches user data from DB
                                        →  Sends prompt to Groq (llama-3.3-70b-versatile, free tier)
                                        →  Returns structured recommendations
                                        →  Caches for 24 hours
```

### Database

**New migration:** `database/migrations/create_ai_recommendations.sql`

```sql
CREATE TABLE ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendations JSONB NOT NULL,
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);
```

### Supabase Edge Function

**New file:** `supabase/functions/ai-recommendations/index.ts`

- Receives `user_id` in request
- Fetches from DB:
  - User profile (goal, activity level, age, gender)
  - Last 10 workout sessions (what they did, duration, completion)
  - Available workouts + exercises in the library
- Builds a prompt for Groq (llama-3.3-70b-versatile) asking it to recommend 3-5 workouts from the available library, with reasoning for each
- Returns structured JSON: `{ workout_id, workout_name, reason, match_score }`
- Checks cache first -- only calls Groq if no valid cached result exists (valid = less than 24h old and no new session completed since)
- Groq free tier: 30 requests/min, no credit card needed -- sufficient for a PFE demo

### Mobile App Changes

**New files:**
- `GoFitMobile/src/services/recommendations.ts` -- `getRecommendations()` calls edge function, `dismissRecommendation(id)` lets user dismiss
- `GoFitMobile/src/stores/recommendationsStore.ts` -- Zustand store with recommendations, loading state, last fetched time
- `GoFitMobile/src/screens/home/RecommendationsScreen.tsx` -- full screen showing all AI-recommended workouts as cards with reasoning, "Start Workout" button, "Refresh" button, loading skeleton

**Existing file changes:**
- `GoFitMobile/src/screens/home/HomeScreen.tsx` -- add "Recommended for You" horizontal scroll section showing top 2-3 recommendations with "See All" link
- `GoFitMobile/src/navigation/AppNavigator.tsx` -- add `Recommendations` screen to the Home stack

---

## Part 3: Smart Notifications & Reminders (Mobile App)

A system for streak tracking, scheduled workout reminders, and inactivity nudges.

### How It Works

```
Supabase pg_cron (hourly)  →  Edge Function: smart-notifications
                            →  Queries users + their preferences
                            →  Checks conditions:
                                - Is it their reminder time? → Send push
                                - Inactive > threshold days? → Send nudge
                                - Streak at risk? → Send alert
                            →  Sends via Expo Push Notifications

Mobile App  →  Sets preferences in DB (reminder time, days, toggles)
```

### Database

**New migration:** `database/migrations/create_smart_notifications.sql`

```sql
-- User notification schedule preferences
CREATE TABLE notification_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  workout_reminder_enabled BOOLEAN DEFAULT true,
  reminder_time TIME DEFAULT '09:00',
  reminder_days INTEGER[] DEFAULT '{1,2,3,4,5}',  -- 1=Mon..7=Sun
  inactivity_nudge_enabled BOOLEAN DEFAULT true,
  inactivity_threshold_days INTEGER DEFAULT 3,
  streak_alerts_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track workout streaks
CREATE TABLE user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_workout_date DATE,
  streak_updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Supabase Edge Functions

**File 1:** `supabase/functions/smart-notifications/index.ts`
Runs on a schedule (hourly via pg_cron or external cron). Three notification types:

1. **Scheduled Reminders** -- queries users where `workout_reminder_enabled = true`, current hour matches `reminder_time`, and today is in `reminder_days`. Sends: "Time to train! Your workout is waiting."
2. **Inactivity Nudges** -- queries users whose last `workout_sessions.completed_at` exceeds their `inactivity_threshold_days`. Sends: "You haven't trained in X days -- get back on track!"
3. **Streak Alerts** -- queries `user_streaks` where `last_workout_date` = yesterday and `current_streak >= 3`. Sends: "Don't break your X-day streak! Work out today to keep it going."

**File 2:** `supabase/functions/update-streaks/index.ts`
Called when a workout session is completed:
- If `last_workout_date` is yesterday or today → increment `current_streak`
- If `last_workout_date` is older → reset `current_streak` to 1
- Update `longest_streak` if current exceeds it

### Mobile App Changes

**New files:**
- `GoFitMobile/src/services/notifications-schedule.ts` -- CRUD for `notification_schedules` + `getStreak()`
- `GoFitMobile/src/stores/streakStore.ts` -- Zustand store with current streak, longest streak, loading
- `GoFitMobile/src/components/home/StreakWidget.tsx` -- flame icon with current streak number and "Personal best: X days"

**Existing file changes:**
- Home screen -- add streak widget at the top
- Profile/settings -- add "Workout Reminders" section with:
  - Toggle for workout reminders + time picker + day selector
  - Toggle for inactivity nudges + threshold slider
  - Toggle for streak alerts

---

## Part 4: Wearable Integration -- Apple Health / Google Fit (Client)

Sync steps and calories from the device's health platform into GoFit so clients can see unified fitness data.

### How It Works

```
Apple Health / Google Fit  ←→  react-native-health / Health Connect
                            →  Read steps + calories (daily totals)
                            →  Store in Supabase
                            →  Display on Home + Progress screens
```

### Dependencies

New npm package: `react-native-health` (iOS) and `react-native-health-connect` (Android).
These are Expo-compatible with a config plugin (no bare eject needed).

### Database

**New migration:** `database/migrations/create_health_data.sql`

```sql
CREATE TABLE health_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  steps INTEGER DEFAULT 0,
  calories_burned INTEGER DEFAULT 0,
  source TEXT, -- 'apple_health' | 'google_fit' | 'manual'
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date, source)
);
```

### Mobile App Changes

**New files:**
- `GoFitMobile/src/services/healthSync.ts` -- platform-specific logic:
  - `requestHealthPermissions()` -- request read access to steps + active calories
  - `syncHealthData()` -- read today's and yesterday's data from HealthKit/Health Connect, upsert into `health_data` table
  - `getHealthHistory(days)` -- fetch from Supabase for display
  - Auto-sync on app foreground (via AppState listener)
- `GoFitMobile/src/stores/healthStore.ts` -- Zustand store with today's steps, calories, weekly history, sync status
- `GoFitMobile/src/components/home/HealthWidget.tsx` -- card on home screen showing today's steps (with step icon) and calories burned (with flame icon), tap to expand weekly bar chart

**Existing file changes:**
- `GoFitMobile/src/screens/profile/ProfileScreen.tsx` -- add "Health Sync" toggle in settings section (connect/disconnect Apple Health or Google Fit)
- `GoFitMobile/src/screens/home/HomeScreen.tsx` -- add HealthWidget below the greeting
- `GoFitMobile/src/screens/progress/WorkoutStatisticsScreen.tsx` -- add steps and calories trends alongside workout stats

---

## Part 5: Progress Photos (Client)

Upload body transformation photos with timestamps and compare them side-by-side over time.

### Database

**New migration:** `database/migrations/create_progress_photos.sql`

```sql
CREATE TABLE progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT DEFAULT 'front', -- 'front' | 'side' | 'back'
  notes TEXT,
  taken_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Supabase Storage: new bucket `progress-photos` with RLS policy (user can only access their own photos).

### Mobile App Changes

**New files:**
- `GoFitMobile/src/services/progressPhotos.ts` -- upload photo to Supabase Storage, create DB record, fetch user's photos, delete photo
- `GoFitMobile/src/stores/progressPhotosStore.ts` -- Zustand store with photos grouped by month, loading state
- `GoFitMobile/src/screens/progress/ProgressPhotosScreen.tsx` -- main screen:
  - Timeline grid view (photos grouped by month, most recent first)
  - "Add Photo" FAB button -- opens ImagePicker (camera or library), then category selector (front/side/back) and optional note
  - Tap a photo to view full size
- `GoFitMobile/src/screens/progress/PhotoCompareScreen.tsx` -- side-by-side comparison:
  - Pick two photos from different dates
  - Swipe overlay or split-screen view to compare
  - Date labels on each photo
- `GoFitMobile/src/components/progress/PhotoTimeline.tsx` -- reusable timeline grid component

**Existing file changes:**
- `GoFitMobile/src/navigation/AppNavigator.tsx` -- add `ProgressPhotos` and `PhotoCompare` to the Progress stack
- `GoFitMobile/src/screens/progress/WorkoutStatisticsScreen.tsx` -- add a "Progress Photos" card/button linking to the photos screen

---

## Part 6: Coach AI & Productivity Features

### 6A: AI Session Notes

Auto-summarize a client's recent workout sessions into a briefing the coach can read before a call or session.

**How It Works:**
```
Coach taps "Generate Briefing" on ClientDetailScreen
  →  Edge function fetches client's last 5-10 sessions, notes, check-in data
  →  Groq (llama-3.3-70b-versatile) summarizes: what they trained, consistency, PRs, areas of concern
  →  Returns markdown briefing displayed in-app
```

**New edge function:** `supabase/functions/ai-session-notes/index.ts`
- Receives `coach_id` + `client_id`
- Fetches: recent `workout_sessions` (with exercise details), `coach_client_notes`, `user_streaks`, `check_in_responses` (from Part 7)
- Prompt to Groq: "Summarize this client's recent training for their coach. Highlight consistency, volume trends, any PRs, and areas that may need attention."
- Returns structured markdown text
- Cached in a new `ai_session_notes` table (expires after 24h or new session)

**Database addition** (in same migration as recommendations or separate):
```sql
CREATE TABLE ai_session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);
```

**Mobile changes:**
- `GoFitMobile/src/services/aiSessionNotes.ts` -- `generateBriefing(clientId)`, `getCachedBriefing(clientId)`
- `GoFitMobile/src/screens/coach-app/ClientDetailScreen.tsx` -- add "AI Briefing" button that opens a modal/bottom sheet showing the generated summary with a "Regenerate" option

### 6B: Enhanced Client Progress Dashboard (Coach View)

The current `ClientProgressScreen.tsx` shows basic stats (streak, total workouts, bar chart of recent sessions). Upgrade it with richer visual charts.

**Enhancements to existing `ClientProgressScreen.tsx`:**
- **Volume Over Time** -- Recharts-style line chart (using `react-native-chart-kit` or `victory-native`) showing total sets/reps per week over the last 8 weeks
- **Consistency Calendar** -- monthly calendar heatmap (green = trained, empty = rest day), similar to GitHub contribution graph
- **Personal Records Table** -- list of client's PRs per exercise with date achieved (data from `workoutStats` service which already has `fetchLifetimePRs`)
- **Workout Split Distribution** -- pie chart showing how often client trains each muscle group
- **Session Duration Trend** -- line chart of avg session duration over time

**New files:**
- `GoFitMobile/src/components/coach/ClientVolumeChart.tsx`
- `GoFitMobile/src/components/coach/ConsistencyCalendar.tsx`
- `GoFitMobile/src/components/coach/PRsTable.tsx`
- `GoFitMobile/src/components/coach/MuscleGroupDistribution.tsx`

**New dependency:** `react-native-chart-kit` or `victory-native` for mobile charts (existing app doesn't have a charting library).

### 6C: Program Templates

Allow coaches to duplicate an existing program and reuse it for a different client.

**Changes to existing files:**
- `GoFitMobile/src/services/programs.ts` -- add `duplicateProgram(programId, newClientId?)`:
  - Fetches the original program
  - Creates a copy with `title + " (Copy)"`, optionally assigned to a new client or unassigned (template)
  - Deep-copies `program_data` (days, exercises, meals)
- `GoFitMobile/src/store/programsStore.ts` -- add `duplicateProgram` action
- `GoFitMobile/src/screens/coach-app/ProgramsListScreen.tsx` -- add long-press or "..." menu on each program card with "Duplicate as Template" option
- `GoFitMobile/src/screens/coach-app/ProgramBuilderScreen.tsx` -- when creating from a template, pre-fill all fields from the duplicated program, let coach change client and tweak details

**Database:** No schema changes needed -- `custom_programs` already supports nullable `client_id` (when null = template). Add a `is_template` boolean column if it doesn't exist:
```sql
ALTER TABLE custom_programs ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;
```

---

## Part 7: Automated Check-ins (Coach → Client)

Scheduled push notifications asking clients to log how they feel (mood, energy, soreness). Results visible to their coach.

### Database

**New migration:** `database/migrations/create_check_ins.sql`

```sql
-- Check-in schedule configuration (set by coach per client)
CREATE TABLE check_in_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  frequency TEXT DEFAULT 'daily', -- 'daily' | 'weekdays' | 'custom'
  check_in_days INTEGER[] DEFAULT '{1,2,3,4,5}',
  check_in_time TIME DEFAULT '08:00',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(coach_id, client_id)
);

-- Client check-in responses
CREATE TABLE check_in_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES auth.users(id),
  mood INTEGER CHECK (mood BETWEEN 1 AND 5),        -- 1=terrible, 5=great
  energy INTEGER CHECK (energy BETWEEN 1 AND 5),     -- 1=exhausted, 5=energized
  soreness INTEGER CHECK (soreness BETWEEN 1 AND 5), -- 1=very sore, 5=no soreness
  sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 5),
  notes TEXT,
  responded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Supabase Edge Function

**Enhanced:** `supabase/functions/smart-notifications/index.ts` (same function from Part 3)
Add a 4th notification type:
- **Check-in Reminders** -- queries `check_in_schedules` where `enabled = true` and time/day matches. Sends push to client: "How are you feeling today? Log your check-in." with deep link to check-in screen.

### Mobile App Changes -- Client Side

**New files:**
- `GoFitMobile/src/services/checkIns.ts` -- `submitCheckIn(data)`, `getMyCheckIns(days)`, `getSchedule()`
- `GoFitMobile/src/stores/checkInStore.ts` -- Zustand store
- `GoFitMobile/src/screens/home/CheckInScreen.tsx` -- simple form with:
  - Mood slider (emoji faces from sad to happy, 1-5)
  - Energy slider (battery icons, 1-5)
  - Soreness slider (body icon, 1-5)
  - Sleep quality slider (moon icon, 1-5)
  - Optional notes text input
  - "Submit" button
  - Shows history of past check-ins as a small timeline

**Existing file changes:**
- `GoFitMobile/src/screens/home/HomeScreen.tsx` -- if client has a pending check-in today (not yet submitted), show a prompt card: "How are you feeling today?" that links to CheckInScreen
- `GoFitMobile/src/navigation/AppNavigator.tsx` -- add `CheckIn` screen to Home stack

### Mobile App Changes -- Coach Side

**New files:**
- `GoFitMobile/src/services/coachCheckIns.ts` -- `getClientCheckIns(clientId, days)`, `setupCheckInSchedule(clientId, config)`, `getCheckInSchedule(clientId)`
- `GoFitMobile/src/components/coach/CheckInHistory.tsx` -- chart showing mood/energy/soreness trends over time (line chart with 3 colored lines) + scrollable list of individual responses

**Existing file changes:**
- `GoFitMobile/src/screens/coach-app/ClientDetailScreen.tsx` -- add "Check-ins" section showing latest check-in summary (mood/energy/soreness as colored dots) and a "View All" link, plus a "Configure Check-ins" button to set schedule
- `GoFitMobile/src/screens/coach-app/ClientProgressScreen.tsx` -- add check-in trend chart alongside workout stats (so coach sees training data + wellness data together)

---

## Build Order

**Phase A -- Fixes (do first, quick wins):**
1. **Bug Fixes & Cleanup** (Part 0) -- fix navigation, build timer modal, remove orphans
2. **Coach Wallet & Settings** (Part 1A) -- build the two missing coach screens

**Phase B -- Core Missing Features (promised in slides):**
3. **AI Body Measurements** (Part 1B) -- MediaPipe integration, body diagram, measurement trends
4. **Nutrition Tracking** (Part 1C) -- meal logging, macros, food database

**Phase C -- Admin:**
5. **BI Dashboard** (Part 2) -- entirely in admin panel, no mobile changes, independent

**Phase D -- Advanced Mobile Features:**
6. **Smart Notifications & Streaks** (Part 3) -- DB tables + edge functions, then mobile UI
7. **AI Recommendations** (Part 4) -- Groq edge function, then mobile UI
8. **Progress Photos** (Part 5) -- DB + storage bucket + mobile screens
9. **Wearable Integration** (Part 6) -- new npm packages + health sync service + mobile UI

**Phase E -- Coach Advanced:**
10. **Coach AI & Productivity** (Part 7) -- AI session notes, enhanced progress, program templates
11. **Automated Check-ins** (Part 8) -- DB tables + edge function + client and coach mobile UI

Each feature can be demoed independently as it's completed.
