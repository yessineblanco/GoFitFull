# Clean Database Design Proposal

## Core Principle
**Exercises are universal** - there are no "native" or "custom" exercises. Only workouts can be native or custom.

## Clean Structure

### 1. `exercises` Table (Master Library)
```sql
exercises (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE,
  category TEXT,
  muscle_groups TEXT[],
  image_url TEXT,
  video_url TEXT,
  instructions TEXT,
  equipment TEXT[],
  difficulty TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
  -- NO default_sets, default_reps, default_rest_time (these are workout-specific!)
)
```

### 2. `workouts` Table (Unified)
```sql
workouts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id), -- NULL for native workouts
  name TEXT,
  difficulty TEXT,
  image_url TEXT,
  workout_type TEXT CHECK (workout_type IN ('native', 'custom')),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
  -- NO exercises JSONB column!
)
```

**Why unified?**
- Native and custom workouts are the same thing, just different ownership
- `user_id = NULL` → native (public)
- `user_id = <uuid>` → custom (user's workout)
- Simpler queries, one table, cleaner design

### 3. `workout_exercises` Table (Single Junction Table)
```sql
workout_exercises (
  id UUID PRIMARY KEY,
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  sets INTEGER NOT NULL DEFAULT 3,        -- Workout-specific!
  reps TEXT NOT NULL DEFAULT '10',        -- Workout-specific!
  rest_time INTEGER NOT NULL DEFAULT 60, -- Workout-specific!
  exercise_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP,
  UNIQUE(workout_id, exercise_id)
)
```

**Why single table?**
- Exercises are the same regardless of workout type
- RLS can check `workouts.user_id` to determine access
- Simpler queries, no need to check which table

### 4. `workout_sessions` Table (Simplified)
```sql
workout_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
  workout_name TEXT, -- Denormalized for history
  workout_type TEXT, -- Denormalized for history
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_minutes INTEGER,
  exercises_completed JSONB, -- Performance data (weights, completed sets)
  notes TEXT,
  created_at TIMESTAMP
  -- NO native_workout_id, NO custom_workout_id - just workout_id!
)
```

## Benefits

✅ **No Duplication**: Exercises stored once  
✅ **Consistent**: One approach (junction tables), no JSONB  
✅ **Correct Defaults**: Sets/reps/rest in junction table (workout-specific)  
✅ **Simpler**: One workouts table, one workout_exercises table  
✅ **Cleaner**: workout_sessions has one workout_id field  

## RLS Policies

### `workouts` Table
- **SELECT**: `user_id IS NULL OR user_id = auth.uid()` (public native OR own custom)
- **INSERT/UPDATE/DELETE**: `user_id = auth.uid()` (only own custom workouts)

### `workout_exercises` Table
- **SELECT**: Check parent workout's `user_id`
- **INSERT/UPDATE/DELETE**: Check parent workout's `user_id`

## Migration Path

1. Create unified `workouts` table
2. Migrate `native_workouts` → `workouts` (with `user_id = NULL`)
3. Migrate `custom_workouts` → `workouts` (keep `user_id`)
4. Create unified `workout_exercises` table
5. Migrate both junction tables → `workout_exercises`
6. Update `workout_sessions` to use single `workout_id`
7. Drop old tables and JSONB columns

## Code Impact

**Service Layer Changes:**
- `getNativeWorkouts()` → `getWorkouts({ type: 'native' })`
- `getCustomWorkouts(userId)` → `getWorkouts({ userId, type: 'custom' })`
- `getNativeWorkoutExercises()` → `getWorkoutExercises(workoutId)`
- `getCustomWorkoutExercises()` → `getWorkoutExercises(workoutId)` (same function!)

**Screens**: Minimal changes (service layer handles it)












