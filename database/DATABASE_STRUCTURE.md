# Database Structure Documentation

## Overview

The GoFit database uses a **normalized, unified design** where:
- **Exercises** are stored once in a master table
- **Workouts** are templates (native or custom) that reference exercises
- **Workout Sessions** are execution logs that track user activity
- **Exercise Snapshots** preserve historical data integrity

---

## Core Principles

1. **No Data Duplication**: Exercises stored once, referenced via foreign keys
2. **Templates vs Execution**: Workouts are templates, Sessions are execution logs
3. **Data Integrity**: Exercise snapshots preserve historical data
4. **Unified Design**: Single `workouts` table for both native and custom workouts

---

## Table Structure

### 1. `exercises` Table (Master Exercise Library)

**Purpose**: Central repository for all exercises

```sql
exercises (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  muscle_groups TEXT[],
  image_url TEXT,
  video_url TEXT,
  instructions TEXT,
  equipment TEXT[],
  difficulty TEXT CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

**Key Points**:
- Single source of truth for exercise data
- No default sets/reps (those are workout-specific)
- Public access (everyone can read)

---

### 2. `workouts` Table (Workout Templates)

**Purpose**: Template definitions for workouts (both native and custom)

```sql
workouts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id), -- NULL for native, set for custom
  name TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced', 'Custom')),
  image_url TEXT,
  workout_type TEXT NOT NULL CHECK (workout_type IN ('native', 'custom')),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  
  CONSTRAINT check_native_workout CHECK (
    (workout_type = 'native' AND user_id IS NULL) OR
    (workout_type = 'custom' AND user_id IS NOT NULL)
  )
)
```

**Key Points**:
- **Native workouts**: `user_id = NULL`, `workout_type = 'native'` (public templates)
- **Custom workouts**: `user_id = <uuid>`, `workout_type = 'custom'` (user-created)
- **No session data**: No `date`, `calories`, or execution-specific fields
- **Template only**: Defines structure, not execution

---

### 3. `workout_exercises` Table (Junction Table)

**Purpose**: Links workouts to exercises with workout-specific configuration

```sql
workout_exercises (
  id UUID PRIMARY KEY,
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  sets INTEGER NOT NULL DEFAULT 3,
  reps TEXT NOT NULL DEFAULT '10', -- Can be '10' or '12,10,8,6'
  rest_time INTEGER NOT NULL DEFAULT 60, -- In seconds
  exercise_order INTEGER NOT NULL DEFAULT 0,
  
  -- Snapshot fields (preserve exercise data at time of workout creation)
  exercise_name TEXT,
  exercise_image_url TEXT,
  exercise_equipment TEXT[],
  exercise_difficulty TEXT,
  
  created_at TIMESTAMP,
  
  UNIQUE(workout_id, exercise_id)
)
```

**Key Points**:
- **Workout-specific config**: Sets, reps, rest_time are per-workout
- **Exercise snapshots**: Preserve exercise data even if exercise is updated/deleted
- **Order matters**: `exercise_order` maintains exercise sequence
- **Auto-populated**: Trigger populates snapshots on insert/update

---

### 4. `workout_sessions` Table (Execution Logs)

**Purpose**: Tracks actual workout sessions performed by users

```sql
workout_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
  
  -- Execution data
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  duration_minutes INTEGER,
  date DATE, -- Date of workout (moved from workouts table)
  calories INTEGER, -- Calories burned (moved from workouts table)
  
  -- Performance data
  exercises_completed JSONB, -- Actual sets/reps/weight performed
  notes TEXT,
  
  created_at TIMESTAMP
)
```

**Key Points**:
- **Execution log**: Records what actually happened, not template
- **References template**: `workout_id` links to `workouts` table
- **No duplicate data**: No `workout_name` or `workout_type` (get from `workouts`)
- **Session-specific**: `date`, `calories` are per-session, not per-template

---

## Relationships

### Entity Relationship Diagram

```
exercises (1) ──< (many) workout_exercises (many) >── (1) workouts
                                                              │
                                                              │ (1)
                                                              │
                                                              ▼
                                                      (many) workout_sessions
                                                              │
                                                              │ (many)
                                                              │
                                                              ▼
                                                          auth.users
```

### Foreign Key Constraints

1. **workouts.user_id** → `auth.users.id` (ON DELETE CASCADE)
   - Links custom workouts to users
   - Native workouts have `user_id = NULL`

2. **workout_exercises.workout_id** → `workouts.id` (ON DELETE CASCADE)
   - Links exercises to workouts
   - Cascades delete (if workout deleted, exercises deleted)

3. **workout_exercises.exercise_id** → `exercises.id` (ON DELETE CASCADE)
   - Links to master exercise library
   - Cascades delete (if exercise deleted, removed from workouts)

4. **workout_sessions.user_id** → `auth.users.id` (ON DELETE CASCADE)
   - Links sessions to users
   - Cascades delete (if user deleted, sessions deleted)

5. **workout_sessions.workout_id** → `workouts.id` (ON DELETE SET NULL)
   - Links sessions to workout templates
   - SET NULL (if workout deleted, session remains but workout_id = NULL)

---

## Data Flow

### Creating a Custom Workout

1. **Insert into `workouts`**:
   ```sql
   INSERT INTO workouts (user_id, name, difficulty, workout_type)
   VALUES (<user_id>, 'My Workout', 'Intermediate', 'custom');
   ```

2. **Insert exercises into `workout_exercises`**:
   ```sql
   INSERT INTO workout_exercises (workout_id, exercise_id, sets, reps, rest_time, exercise_order)
   VALUES 
     (<workout_id>, <exercise_id_1>, 3, '12', 60, 0),
     (<workout_id>, <exercise_id_2>, 4, '10,8,6', 90, 1);
   ```
   - Trigger automatically populates snapshot fields

### Starting a Workout Session

1. **Insert into `workout_sessions`**:
   ```sql
   INSERT INTO workout_sessions (user_id, workout_id, started_at, date)
   VALUES (<user_id>, <workout_id>, NOW(), CURRENT_DATE);
   ```

2. **No need for `workout_name` or `workout_type`** - get from `workouts` table via `workout_id`

### Completing a Workout Session

1. **Update `workout_sessions`**:
   ```sql
   UPDATE workout_sessions
   SET 
     completed_at = NOW(),
     duration_minutes = EXTRACT(EPOCH FROM (NOW() - started_at)) / 60,
     exercises_completed = '[...]'::JSONB,
     calories = 350
   WHERE id = <session_id>;
   ```

---

## Exercise Snapshots

### Why Snapshots?

If an exercise is updated or deleted, old workouts would break without snapshots.

**Example**:
- User creates workout with "Bench Press" in 2024
- Admin updates "Bench Press" image in 2025
- Without snapshots: Old workout shows new image (wrong!)
- With snapshots: Old workout shows original image (correct!)

### Snapshot Fields

Stored in `workout_exercises`:
- `exercise_name` - Name at time of workout creation
- `exercise_image_url` - Image at time of workout creation
- `exercise_equipment` - Equipment at time of workout creation
- `exercise_difficulty` - Difficulty at time of workout creation

### Auto-Population

Trigger `trigger_populate_exercise_snapshots` automatically populates snapshots:
- On INSERT: If snapshot fields are NULL, populate from `exercises` table
- On UPDATE: Only populate if still NULL (preserve existing snapshots)

---

## Row Level Security (RLS)

### `exercises` Table
- **SELECT**: Everyone (public exercise library)
- **INSERT/UPDATE/DELETE**: Authenticated users only (admin)

### `workouts` Table
- **SELECT**: 
  - Native workouts: Everyone (`user_id IS NULL`)
  - Custom workouts: Own workouts only (`user_id = auth.uid()`)
- **INSERT/UPDATE/DELETE**: 
  - Native: Authenticated users (admin)
  - Custom: Own workouts only

### `workout_exercises` Table
- **SELECT**: Based on parent workout's RLS
- **INSERT/UPDATE/DELETE**: Based on parent workout's RLS

### `workout_sessions` Table
- **All operations**: Own sessions only (`user_id = auth.uid()`)

---

## Indexes

### Performance Indexes

```sql
-- workouts
idx_workouts_user_id ON workouts(user_id);
idx_workouts_type ON workouts(workout_type);
idx_workouts_created_at ON workouts(created_at DESC);

-- workout_exercises
idx_workout_exercises_workout_id ON workout_exercises(workout_id);
idx_workout_exercises_exercise_id ON workout_exercises(exercise_id);
idx_workout_exercises_order ON workout_exercises(workout_id, exercise_order);
idx_workout_exercises_exercise_name ON workout_exercises(exercise_name);

-- workout_sessions
idx_workout_sessions_user_id ON workout_sessions(user_id);
idx_workout_sessions_workout_id ON workout_sessions(workout_id);
idx_workout_sessions_date ON workout_sessions(date DESC);
idx_workout_sessions_user_id_date ON workout_sessions(user_id, date DESC);
```

---

## Migration History

### 1. Initial Structure (Denormalized)
- `native_workouts` and `custom_workouts` with `exercises JSONB`
- Duplicated exercise data

### 2. Unified Design (`unify_workouts_design.sql`)
- Created unified `workouts` table
- Created `workout_exercises` junction table
- Migrated from JSONB to normalized structure

### 3. Structure Fixes (`fix_workout_structure.sql`)
- Removed duplicate fields from `workout_sessions`
- Added exercise snapshots to `workout_exercises`
- Moved `date`/`calories` from `workouts` to `workout_sessions`
- Removed duplicate `type` field from `workouts`
- Added explicit FK constraints

---

## Best Practices

### ✅ DO

1. **Always use `workout_id`** - Don't store `workout_name`/`workout_type` in sessions
2. **Populate snapshots** - Always populate exercise snapshots when creating workouts
3. **Use junction tables** - Never store exercises as JSONB in workouts
4. **Check FK constraints** - Ensure all relationships are valid
5. **Filter empty workouts** - Don't show workouts without exercises

### ❌ DON'T

1. **Don't duplicate data** - No `workout_name` in `workout_sessions`
2. **Don't store session data in templates** - No `date`/`calories` in `workouts`
3. **Don't skip snapshots** - Always populate exercise snapshots
4. **Don't use JSONB for exercises** - Use junction tables instead
5. **Don't ignore FK constraints** - Always validate relationships

---

## Common Queries

### Get Workout with Exercises
```sql
SELECT 
  w.*,
  json_agg(
    json_build_object(
      'id', e.id,
      'name', COALESCE(we.exercise_name, e.name),
      'sets', we.sets,
      'reps', we.reps,
      'rest_time', we.rest_time
    ) ORDER BY we.exercise_order
  ) as exercises
FROM workouts w
JOIN workout_exercises we ON w.id = we.workout_id
JOIN exercises e ON we.exercise_id = e.id
WHERE w.id = <workout_id>
GROUP BY w.id;
```

### Get User's Workout History
```sql
SELECT 
  ws.*,
  w.name as workout_name,
  w.workout_type,
  w.difficulty
FROM workout_sessions ws
LEFT JOIN workouts w ON ws.workout_id = w.id
WHERE ws.user_id = <user_id>
ORDER BY ws.date DESC, ws.started_at DESC;
```

### Get Workouts with Exercise Count
```sql
SELECT 
  w.*,
  COUNT(we.id) as exercise_count
FROM workouts w
LEFT JOIN workout_exercises we ON w.id = we.workout_id
WHERE w.workout_type = 'native' OR w.user_id = <user_id>
GROUP BY w.id
HAVING COUNT(we.id) > 0
ORDER BY w.created_at DESC;
```

---

## Troubleshooting

### Issue: Empty workouts showing
**Solution**: Filter workouts with `exercise_count > 0`

### Issue: Missing exercise snapshots
**Solution**: Run trigger or manually populate from `exercises` table

### Issue: Sessions without workout_id
**Solution**: Migrate old sessions or set `workout_id` from `workout_name`

### Issue: Performance slow
**Solution**: Check indexes exist, use `EXPLAIN ANALYZE` on queries

---

## Related Documentation

- `POST_MIGRATION_CHECKLIST.md` - Testing checklist
- `MIGRATION_FIX_WORKOUT_STRUCTURE.md` - Migration details
- `CLEAN_DESIGN_PROPOSAL.md` - Design rationale












