# Analytics Dashboard Documentation

## Overview
The Analytics Dashboard provides comprehensive insights into your GoFit platform's performance, user engagement, and content popularity. It features real-time data visualization, engagement metrics, and activity tracking.

---

## 📊 **Features**

### 1. **Engagement Metrics Cards** 📈
Four key performance indicators displayed at the top:

#### Total Users
- **What it shows**: Total number of registered accounts
- **Icon**: Users
- **Purpose**: Track overall platform growth

#### DAU (Daily Active Users)
- **What it shows**: Users who worked out in the last 24 hours
- **Percentage**: DAU as % of total users
- **Icon**: Activity
- **Purpose**: Measure daily engagement

#### WAU (Weekly Active Users)
- **What it shows**: Users who worked out in the last 7 days
- **Percentage**: WAU as % of total users
- **Icon**: TrendingUp
- **Purpose**: Measure weekly engagement trends

#### MAU (Monthly Active Users)
- **What it shows**: Users who worked out in the last 30 days
- **Percentage**: MAU as % of total users
- **Icon**: UserCheck
- **Purpose**: Measure monthly retention

---

### 2. **User Growth Chart** 📈
**Component**: `UserGrowthChart`

Interactive line chart showing user acquisition over time:

#### Features
- **Date Range**: Last 30 days by default
- **Granularity**: Daily intervals
- **View Modes**:
  - **Cumulative**: Total users over time (default)
  - **New Users**: New signups per day
- **Toggle**: Dropdown to switch between views
- **Responsive**: Adapts to screen size

#### Data Source
- Queries `user_profiles` table
- Groups by `created_at` date
- Calculates running totals for cumulative view

---

### 3. **Popular Exercises** 🏆
**Component**: `PopularExercisesCard`

Ranked list of the most-used exercises:

#### Display
- **Top 10 Exercises**: Ranked 1-10
- **Exercise Name**: Bold, primary text
- **Category Badge**: Strength, Cardio, etc.
- **Usage Count**: Large number + "uses" label
- **Ranking Number**: Circular badge with position

#### Calculation
- Counts how many times each exercise appears in `workout_exercises`
- Joins with `exercises` table for details
- Sorts by usage count (descending)
- Limits to top 10

#### Empty State
Shows "No exercise data available" if no workouts exist

---

### 4. **Workout Completion Rates** ✅
**Component**: `WorkoutCompletionCard`

Progress bars showing which workouts get completed:

#### Display
- **Workout Name**: Native workout title
- **Completion Stats**: "X/Y (Z%)"
  - X = Completed sessions
  - Y = Total sessions
  - Z = Completion percentage
- **Progress Bar**: Visual indicator of completion rate
- **Top 10 Workouts**: Sorted by total sessions

#### Calculation
- Queries `workout_sessions` table
- Filters where `workout_id` is not null
- Checks if `completed_at` is set
- Calculates: `(completed / total) * 100`

#### Use Case
- Identify which workouts users finish
- Spot drop-off patterns
- Optimize difficult workouts

---

### 5. **Activity Heatmap** 🔥
**Component**: `ActivityHeatmap`

Visual heatmap showing when users work out:

#### Grid Layout
- **Rows**: Days of the week (Mon-Sun)
- **Columns**: Hours (0-23)
- **Cells**: Color-coded by activity level

#### Color Intensity
- **Gray (muted)**: No activity
- **Light Blue (20%)**: Low activity (1-25% of max)
- **Medium Blue (40%)**: Moderate activity (26-50% of max)
- **Blue (60%)**: High activity (51-75% of max)
- **Dark Blue (80%)**: Peak activity (76-100% of max)

#### Time Range
- Last 7 days of data
- Updates in real-time

#### Hover Effect
- Shows exact count on hover
- Format: "Mon 14:00 - 5 sessions"

#### Use Cases
- Identify peak workout times
- Schedule maintenance during low-activity periods
- Plan promotional campaigns

---

### 6. **Recent Activity Feed** 🕐
**Component**: `RecentActivityFeed`

Live feed of recent user actions:

#### Activity Types
1. **Workout Completed** 🏋️
   - User finished a workout session
   - Shows completion time
   
2. **User Joined** 👤 *(Future)*
   - New user registration
   - Shows signup time
   
3. **Workout Created** ➕ *(Future)*
   - User created custom workout
   - Shows creation time

#### Display Format
- **Avatar**: User's first initial
- **User Name**: Display name from metadata
- **Badge**: Activity type indicator
- **Description**: Action performed
- **Timestamp**: "X minutes/hours/days ago"

#### Data Source
- Queries `workout_sessions` where `completed_at` is set
- Joins with `auth.users` for user details
- Sorts by most recent first
- Limits to 10 activities

---

## 🗂️ **File Structure**

```
admin-panel/
├── lib/
│   └── analytics.ts                          # Data fetching functions
├── components/
│   └── analytics/
│       ├── UserGrowthChart.tsx               # Line chart with view toggle
│       ├── PopularExercisesCard.tsx          # Ranked exercise list
│       ├── WorkoutCompletionCard.tsx         # Progress bars
│       ├── EngagementMetricsCards.tsx        # DAU/WAU/MAU cards
│       ├── ActivityHeatmap.tsx               # Day/hour heatmap
│       └── RecentActivityFeed.tsx            # Activity stream
└── app/
    └── dashboard/
        └── page.tsx                          # Main dashboard page
```

---

## 🔧 **Analytics Functions**

### `getUserGrowthData(days, granularity)`
Fetches user signup data over time.

**Parameters**:
- `days` (number): Number of days to look back (default: 30)
- `granularity` ("daily" | "weekly" | "monthly"): Time intervals (default: "daily")

**Returns**: `UserGrowthData[]`
```typescript
{
  date: string;        // Formatted date
  users: number;       // New users in period
  cumulative: number;  // Total users up to date
}
```

---

### `getPopularExercises(limit)`
Gets most-used exercises ranked by usage.

**Parameters**:
- `limit` (number): Max exercises to return (default: 10)

**Returns**: `PopularExercise[]`
```typescript
{
  id: string;
  name: string;
  category: string;
  usageCount: number;  // Times used in workouts
}
```

---

### `getWorkoutCompletionRates(limit)`
Calculates completion rates for workouts.

**Parameters**:
- `limit` (number): Max workouts to return (default: 10)

**Returns**: `WorkoutCompletionRate[]`
```typescript
{
  workout_id: string;
  workout_name: string;
  total_sessions: number;
  completed_sessions: number;
  completion_rate: number;  // Percentage (0-100)
}
```

---

### `getEngagementMetrics()`
Calculates user engagement metrics.

**Returns**: `EngagementMetrics`
```typescript
{
  dau: number;        // Daily active (last 24h)
  wau: number;        // Weekly active (last 7d)
  mau: number;        // Monthly active (last 30d)
  totalUsers: number; // All registered users
}
```

---

### `getActivityHeatmap()`
Generates heatmap data for last 7 days.

**Returns**: `ActivityHeatmapData[]`
```typescript
{
  hour: number;    // 0-23
  day: string;     // "Mon", "Tue", etc.
  count: number;   // Session count
}
```

---

### `getRecentActivity(limit)`
Fetches recent user activities.

**Parameters**:
- `limit` (number): Max activities to return (default: 10)

**Returns**: `RecentActivity[]`
```typescript
{
  id: string;
  type: "workout_completed" | "user_joined" | "workout_created";
  user_name: string;
  user_email: string;
  description: string;
  timestamp: string;
}
```

---

## 📦 **Dependencies**

### NPM Packages
- **recharts** (^2.x): Charting library for user growth visualization
- **date-fns** (^3.x): Date manipulation and formatting
- **lucide-react**: Icons for all components

### Shadcn/UI Components
- `Card` / `CardHeader` / `CardTitle` / `CardContent`
- `Select` / `SelectTrigger` / `SelectContent` / `SelectItem`
- `Progress`
- `Badge`
- `Avatar` / `AvatarFallback`

---

## 🎨 **Design Decisions**

### Color Scheme
- **Primary Color**: Used for charts, active states
- **Muted Background**: For low-activity cells
- **Progressive Intensity**: 20%, 40%, 60%, 80% opacity levels

### Layout
- **Grid System**: 7-column layout for flexibility
- **Responsive**: Adapts from mobile to desktop
- **Card-Based**: Each metric/chart in its own card

### Performance
- **Server-Side Rendering**: All data fetched on server
- **Parallel Queries**: All analytics fetched simultaneously
- **Error Handling**: Graceful fallbacks for failed queries

---

## 🚀 **Usage Examples**

### Viewing the Dashboard
1. Navigate to `/dashboard`
2. Dashboard loads with all analytics
3. Charts and metrics display automatically

### Interpreting Metrics

#### High DAU but Low MAU
- Users trying the app but not staying
- **Action**: Improve onboarding, add retention features

#### Low Completion Rates
- Workouts may be too difficult
- **Action**: Review workout difficulty, add alternatives

#### Peak Activity Times
- Most users workout at specific hours
- **Action**: Schedule push notifications before peak times

### Toggle View Modes
1. Find "User Growth" chart
2. Click dropdown in top-right
3. Select "New Users" or "Cumulative"
4. Chart updates instantly

---

## 🔒 **Security & Performance**

### Data Access
- Uses `createAdminClient()` with service role
- Bypasses RLS for aggregated stats (no personal data exposed)
- Protected by middleware (admin-only access)

### Query Optimization
- Parallel data fetching with `Promise.all()`
- Selective field queries (`select("id")` for counts)
- Indexed queries on `created_at`, `started_at`

### Caching
- Server components cache automatically
- Revalidate on navigation/refresh
- No client-side state management needed

---

## 🐛 **Troubleshooting**

### "No data available" messages
- **Cause**: New database with no users/workouts
- **Fix**: Add test data or wait for real users

### Chart not displaying
- **Cause**: Missing recharts dependency
- **Fix**: `npm install recharts date-fns`

### Slow dashboard loading
- **Cause**: Large dataset or slow queries
- **Fix**: Add database indexes on:
  - `user_profiles.created_at`
  - `workout_sessions.started_at`
  - `workout_sessions.user_id`

### Incorrect engagement metrics
- **Cause**: Timezone mismatches
- **Fix**: Ensure database uses UTC timestamps

---

## 🎯 **Future Enhancements**

### Planned Features
- [ ] **Custom Date Ranges**: Select specific time periods
- [ ] **Export to PDF/CSV**: Download analytics reports
- [ ] **Goal Tracking**: Track platform KPIs vs targets
- [ ] **Cohort Analysis**: User retention by signup month
- [ ] **Revenue Analytics**: If premium features added
- [ ] **Exercise Trends**: Track category popularity over time
- [ ] **User Segments**: Compare beginner vs advanced users
- [ ] **Real-time Updates**: WebSocket for live activity feed

### Enhancement Ideas
- Add filters to popular exercises (by category)
- Compare current period vs previous period
- Add forecasting/predictions
- Email weekly analytics reports
- Mobile-responsive dashboard improvements

---

## 📞 **Contact**

For questions or issues with the Analytics Dashboard:
**Email**: yessine.blanco@esprit.tn

---

## 📝 **Changelog**

### Version 1.0 (Current)
- ✅ User growth chart with view toggle
- ✅ Popular exercises ranking (top 10)
- ✅ Workout completion rates with progress bars
- ✅ Engagement metrics (DAU/WAU/MAU)
- ✅ Activity heatmap (7 days, hourly)
- ✅ Recent activity feed (last 10 activities)
- ✅ Responsive design
- ✅ Server-side data fetching
- ✅ Error handling and empty states
