# Database Structure Explanation (OUTDATED)

> ⚠️ **This document is OUTDATED and describes the old denormalized JSONB design.**
> 
> **Current Design**: The database now uses a **normalized design** with junction tables.
> 
> **See**: [`DATABASE_STRUCTURE.md`](./DATABASE_STRUCTURE.md) for the current structure.

---

## Overview (Historical Reference)

The GoFit app **previously** used a **denormalized JSONB approach** for storing exercise data in workouts and sessions. This document explains the old design for reference.

---

## Tables Structure

### 1. `exercises` Table (Reference Library)
```
exercises
├── id (UUID) - Primary Key
├── name (TEXT) - Unique exercise name
├── category, muscle_groups, difficulty, etc.
└── default_sets, default_reps, default_rest_time
```

**Purpose**: This is a **reference/catalog table** containing all available exercises in the app. Think of it as a "library" of exercises.

**Key Point**: This table is **standalone** - it doesn't have foreign keys pointing to workouts or sessions.

---

### 2. `custom_workouts` Table
```
custom_workouts
├── id (UUID) - Primary Key
├── user_id (UUID) - Foreign Key to auth.users
├── name, difficulty, image_url
└── exercises (JSONB) ← This is the key!
```

**The `exercises` JSONB Column** stores an array like this:
```json
[
  {
    "id": "uuid-of-exercise",
    "name": "Bench Press",
    "sets": "4",
    "reps": "8",
    "restTime": "90",
    "image": "https://..."
  },
  {
    "id": "another-uuid",
    "name": "Squat",
    "sets": "4",
    "reps": "10",
    "restTime": "120"
  }
]
```

**Why JSONB instead of Foreign Keys?**
- ✅ **Flexibility**: Can store exercise configurations (sets/reps) that are specific to THIS workout
- ✅ **Denormalization**: Preserves workout structure even if an exercise is deleted from the library
- ✅ **Performance**: Single query gets all exercise data (no JOINs needed)
- ✅ **Simplicity**: No need for a junction table like `workout_exercises`

---

### 3. `workout_sessions` Table (History)
```
workout_sessions
├── id (UUID) - Primary Key
├── user_id (UUID) - Foreign Key to auth.users
├── workout_id (UUID) - Optional FK to custom_workouts (NULL for native workouts)
├── workout_name, workout_type, started_at, completed_at
└── exercises_completed (JSONB) ← This stores ACTUAL performance data!
```

**The `exercises_completed` JSONB Column** stores an array like this:
```json
[
  {
    "id": "uuid-of-exercise",
    "name": "Bench Press",
    "sets": 4,
    "reps": 8,
    "weights": [60, 65, 70, 70],  // Weight per set
    "completedSets": [true, true, true, true],
    "restTime": 90
  },
  {
    "id": "another-uuid",
    "name": "Squat",
    "sets": 4,
    "reps": 10,
    "weights": [100, 105, 110, 110],
    "completedSets": [true, true, true, false],  // Last set not completed
    "restTime": 120
  }
]
```

**Why JSONB instead of Foreign Keys?**
- ✅ **Historical Accuracy**: Preserves exactly what was done, even if workout/exercise is deleted
- ✅ **Performance Data**: Stores actual weights, completed sets, etc. (not just references)
- ✅ **Native Workouts**: Can store exercises that don't exist in the `exercises` table
- ✅ **Performance**: Single query gets all session data

---

## Data Flow

### Creating a Custom Workout
1. User selects exercises from the `exercises` library
2. User configures sets/reps/rest for each exercise
3. **Data is stored in `custom_workouts.exercises` JSONB** as an array of exercise configs
4. The exercise `id` and `name` are copied into the JSONB (denormalized)

### Starting a Workout Session
1. Load workout from `custom_workouts` (or use native workout data)
2. Read the `exercises` JSONB array
3. Create a new `workout_sessions` record with `exercises_completed` initialized (empty or with defaults)

### Completing a Workout Session
1. User tracks sets, reps, weights during the workout
2. **Data is saved to `workout_sessions.exercises_completed` JSONB**
3. This preserves the exact performance data for that session

---

## Why No Foreign Key Relationships?

### Traditional Approach (NOT used):
```
custom_workouts
  └── workout_exercises (junction table)
        ├── workout_id → custom_workouts.id
        └── exercise_id → exercises.id
```

**Problems with this approach:**
- ❌ Need a junction table (`workout_exercises`)
- ❌ Can't easily store workout-specific configs (sets/reps per workout)
- ❌ If exercise is deleted, workout breaks
- ❌ More complex queries (JOINs required)
- ❌ Can't handle "native workouts" that don't use the exercises table

### JSONB Approach (Current):
```
custom_workouts
  └── exercises (JSONB) - Contains full exercise data
```

**Benefits:**
- ✅ Single column stores all exercise data
- ✅ Can store custom configs per workout
- ✅ Survives exercise deletions
- ✅ Simple queries (no JOINs)
- ✅ Flexible for native workouts

---

## Example Queries

### Get a Custom Workout with Exercises
```typescript
const workout = await supabase
  .from('custom_workouts')
  .select('*')
  .eq('id', workoutId)
  .single();

// workout.exercises is already an array - no JOIN needed!
workout.exercises.forEach(ex => {
  console.log(ex.name, ex.sets, ex.reps);
});
```

### Get Workout Session History
```typescript
const sessions = await supabase
  .from('workout_sessions')
  .select('*')
  .eq('user_id', userId);

// sessions[0].exercises_completed contains all performance data
sessions[0].exercises_completed.forEach(ex => {
  console.log(ex.name, ex.weights, ex.completedSets);
});
```

---

## Summary

| Aspect | Traditional FK | JSONB Approach |
|--------|---------------|----------------|
| **Structure** | Junction tables | Single JSONB column |
| **Flexibility** | Rigid relationships | Flexible, denormalized |
| **Performance** | Requires JOINs | Single query |
| **Data Preservation** | Breaks if exercise deleted | Survives deletions |
| **Custom Configs** | Hard to store | Easy (part of JSON) |
| **Native Workouts** | Can't handle | Works perfectly |

**The JSONB approach is perfect for this use case** because:
1. Workout data needs to be **self-contained** (survive deletions)
2. Each workout has **custom configurations** (sets/reps)
3. Sessions need to store **actual performance data** (weights, completed sets)
4. The app supports **native workouts** that don't use the exercises table

---

## When to Use Each Approach

**Use Foreign Keys when:**
- Data must always reference existing records
- Relationships are strict and mandatory
- You need database-level referential integrity
- Data is normalized and frequently updated

**Use JSONB when:**
- Data needs to be self-contained (like workout history)
- You need flexible, denormalized structures
- Performance is critical (fewer queries)
- Data should survive deletions of referenced records

In GoFit, **JSONB is the right choice** for workouts and sessions! 🎯

