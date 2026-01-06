# Storage Architecture - GoFit App

## Current Storage Implementation

### 📱 **Local Storage (AsyncStorage)**
Currently used for:
- ✅ **Custom Workouts** (`@gofit_custom_workouts`) - User-created workouts
- ✅ **Onboarding Data** - Temporary onboarding form data
- ✅ **Remember Me** - Email/credentials for "Remember Me" feature
- ✅ **Form Persistence** - Temporary form data
- ✅ **Rate Limiting** - API rate limit tracking
- ✅ **Theme Preferences** - Theme settings (via Zustand + SecureStore)
- ✅ **Text Size Preferences** - Text size settings (via Zustand + SecureStore)

### 🔐 **Secure Storage (expo-secure-store)**
Currently used for:
- ✅ **Supabase Auth Tokens** - Session tokens (encrypted, secure)
- ✅ **Theme Store** - Theme preferences (via Zustand persistence)
- ✅ **Text Size Store** - Text size preferences (via Zustand persistence)

### ☁️ **Supabase Database**
Currently used for:
- ✅ **User Authentication** - Auth.users table (managed by Supabase)
- ✅ **User Profiles** (`user_profiles` table):
  - Weight, height, units
  - Fitness goals
  - Activity level
  - Age, gender
  - Profile picture
  - Notification preferences
  - Created/updated timestamps

## Current Workout Data Storage

### ❌ **NOT in Supabase (Yet)**
- Custom Workouts - Currently in AsyncStorage only
- Exercise Library - Currently mock data (hardcoded)
- Workout History - Not implemented yet
- Workout Sessions - Not implemented yet
- Exercise Progress - Not implemented yet

## Recommended Storage Strategy

### 🎯 **Should Move to Supabase:**

#### 1. **Custom Workouts** (High Priority)
**Why:** 
- User data should be synced across devices
- Backup and restore capability
- Multi-device access

**Table Structure:**
```sql
CREATE TABLE custom_workouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  difficulty TEXT,
  image_url TEXT,
  exercises JSONB NOT NULL, -- Array of exercise configs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. **Exercise Library** (Medium Priority)
**Why:**
- Centralized exercise database
- Can be shared across all users
- Admin can manage exercises
- Can add images, videos, instructions

**Table Structure:**
```sql
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- Chest, Legs, Back, etc.
  muscle_groups TEXT[], -- Array of muscle groups
  image_url TEXT,
  video_url TEXT,
  instructions TEXT,
  equipment TEXT[], -- Array of required equipment
  difficulty TEXT, -- Beginner, Intermediate, Advanced
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3. **Workout History** (High Priority)
**Why:**
- Track user progress over time
- Analytics and insights
- Personal records (PRs)

**Table Structure:**
```sql
CREATE TABLE workout_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id UUID REFERENCES custom_workouts(id) ON DELETE SET NULL, -- NULL for native workouts
  workout_name TEXT NOT NULL, -- Denormalized for history
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  exercises_completed JSONB, -- Array of completed exercises with sets/reps
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 4. **Exercise Progress** (Medium Priority)
**Why:**
- Track personal records per exercise
- Progress charts and analytics
- Strength progression tracking

**Table Structure:**
```sql
CREATE TABLE exercise_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  workout_session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE,
  sets INTEGER,
  reps INTEGER,
  weight NUMERIC(5,2), -- Weight used (if applicable)
  rest_time_seconds INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 📱 **Can Stay Local (AsyncStorage):**

#### 1. **Temporary/Cache Data**
- Form persistence (temporary)
- Rate limiting (temporary)
- Onboarding temporary data

#### 2. **App Preferences** (Can stay local or move to Supabase)
- Theme preferences (currently SecureStore - fine)
- Text size preferences (currently SecureStore - fine)
- Remember Me (can stay local)

## Migration Plan

### Phase 1: Move Custom Workouts to Supabase
1. Create `custom_workouts` table
2. Create migration service to move existing AsyncStorage data
3. Update `WorkoutBuilderScreen` to save to Supabase
4. Update `LibraryScreen` to load from Supabase
5. Add sync logic for offline support

### Phase 2: Create Exercise Library in Supabase
1. Create `exercises` table
2. Seed with initial exercise data
3. Update `ExerciseSelectionScreen` to load from Supabase
4. Add admin panel for managing exercises (future)

### Phase 3: Implement Workout History
1. Create `workout_sessions` table
2. Create workout session screen
3. Save completed workouts to Supabase
4. Create history/analytics screen

### Phase 4: Exercise Progress Tracking
1. Create `exercise_progress` table
2. Track progress during workout sessions
3. Create progress charts and analytics

## Benefits of Moving to Supabase

✅ **Multi-device sync** - Access workouts from any device
✅ **Backup & restore** - Data is safe in the cloud
✅ **Offline support** - Can implement offline-first with sync
✅ **Scalability** - Can handle large amounts of data
✅ **Analytics** - Can run queries and generate insights
✅ **Sharing** - Future: share workouts with other users
✅ **Admin features** - Manage exercise library centrally

## Current Status

- ✅ User profiles: **In Supabase**
- ✅ Authentication: **In Supabase**
- ❌ Custom workouts: **AsyncStorage only** (should migrate)
- ❌ Exercise library: **Mock data** (should migrate)
- ❌ Workout history: **Not implemented** (should add)
- ❌ Exercise progress: **Not implemented** (should add)

