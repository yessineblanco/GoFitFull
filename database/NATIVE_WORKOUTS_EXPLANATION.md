# Native Workouts Explanation (UPDATED)

> ✅ **This document has been updated** to reflect the current unified design.
> 
> Native workouts are now stored in the unified `workouts` table with `workout_type = 'native'` and `user_id = NULL`.

---

## Historical Context

Previously, native workouts were hardcoded in the app. They are now loaded from the database.

---

# Native Workouts Explanation

## Answer: No, Native Workouts Do NOT Load from Exercises Table via JSONB

Native workouts are **hardcoded in the app code**, not stored in the database. Here's how they work:

---

## Native Workouts Flow

### 1. **Definition (Hardcoded)**
Native workouts are defined in `src/screens/library/LibraryScreen.tsx`:

```typescript
const MOCK_WORKOUTS = [
  {
    id: '1',  // Simple string ID, NOT a UUID
    name: '3 Day Split + Full Body Fridays',
    difficulty: 'Beginner',
    image: 'https://...',
    type: 'native' as const,
  },
  // ... more workouts
];
```

**Key Point**: These are **hardcoded in the app**, not in the database.

---

### 2. **Exercise Lists (Also Hardcoded)**
When you click on a native workout, `WorkoutDetailScreen.tsx` shows exercises that are **hardcoded**:

```typescript
// In WorkoutDetailScreen.tsx (lines 51-58)
const exercises = [
  { id: '1', name: 'Bench Press', sets: 4, reps: '12,10,8,6', restTime: '90s' },
  { id: '2', name: 'Incline Dumbbell Press', sets: 3, reps: '10,8,6', restTime: '60s' },
  // ... more exercises
];
```

**Key Point**: Exercises are **hardcoded per workout**, not loaded from the `exercises` table.

---

### 3. **Starting a Native Workout Session**

When you click "Start Workout":

1. Exercises are passed via **route params** (not from database):
```typescript
navigation.navigate('WorkoutSession', {
  workoutId: undefined,  // Native workouts don't have workout_id
  workoutName: '3 Day Split + Full Body Fridays',
  workoutType: 'native',
  exercises: [  // ← Hardcoded exercises passed here
    { id: '1', name: 'Bench Press', sets: '4', reps: '12,10,8,6', restTime: '90' },
    // ...
  ],
});
```

2. A new `workout_sessions` record is created:
```sql
INSERT INTO workout_sessions (
  user_id,
  workout_id,        -- NULL for native workouts
  workout_name,      -- '3 Day Split + Full Body Fridays'
  workout_type,      -- 'native'
  exercises_completed -- [] (empty initially)
)
```

**Key Point**: Exercises come from **route params**, not from the database.

---

### 4. **During the Workout**

As you complete sets, the data is saved to `workout_sessions.exercises_completed` JSONB:

```json
[
  {
    "id": "1",
    "name": "Bench Press",
    "sets": "4",
    "reps": "12,10,8,6",
    "weights": [60, 65, 70, 70],
    "completedSets": [true, true, true, true],
    "restTime": "90"
  }
]
```

**Key Point**: This is **performance data**, not a reference to the exercises table.

---

### 5. **Resuming a Native Workout**

When resuming an incomplete session:

1. Load session from `workout_sessions` table
2. Read `exercises_completed` JSONB (contains saved progress)
3. Use that data to restore the workout state

**Key Point**: Exercises come from `exercises_completed` JSONB, **not** from the `exercises` table.

---

## Comparison: Native vs Custom Workouts

| Aspect | Native Workouts | Custom Workouts |
|--------|----------------|-----------------|
| **Definition** | Hardcoded in app | Stored in `custom_workouts` table |
| **Exercise Source** | Hardcoded in `WorkoutDetailScreen` | From `custom_workouts.exercises` JSONB |
| **Starting Session** | Exercises from route params | Exercises from `custom_workouts.exercises` |
| **Resuming Session** | From `workout_sessions.exercises_completed` | From `workout_sessions.exercises_completed` |
| **Exercise IDs** | Simple strings ('1', '2') | UUIDs from exercises table |
| **workout_id** | NULL | References `custom_workouts.id` |

---

## When Does the Exercises Table Get Used?

The `exercises` table is used **optionally** for:

1. **Looking up exercise details** (if name matches):
   ```typescript
   // In WorkoutDetailScreen.tsx
   const foundExercise = await workoutService.getExerciseByName(exercise.name);
   // If found, show details from database
   // If not found, show empty state
   ```

2. **Providing default sets/reps/rest** (if exercise exists in table)

3. **Exercise library** (for creating custom workouts)

**But native workouts don't REQUIRE exercises to exist in the table!**

---

## Visual Flow

### Native Workout Flow:
```
App Code (MOCK_WORKOUTS)
    ↓
WorkoutDetailScreen (hardcoded exercises)
    ↓
Route Params (exercises passed)
    ↓
WorkoutSessionScreen (uses route params)
    ↓
workout_sessions.exercises_completed (JSONB) ← Saved progress
    ↓
Resume: Load from exercises_completed JSONB
```

### Custom Workout Flow:
```
custom_workouts.exercises (JSONB) ← Stored in database
    ↓
Load from database
    ↓
WorkoutSessionScreen (uses database exercises)
    ↓
workout_sessions.exercises_completed (JSONB) ← Saved progress
    ↓
Resume: Load from exercises_completed JSONB
```

---

## Summary

**Native workouts:**
- ❌ Do NOT load from `exercises` table
- ✅ Are hardcoded in app code
- ✅ Exercises passed via route params
- ✅ Progress saved to `workout_sessions.exercises_completed` JSONB
- ✅ Can optionally look up exercise details by name (if exists in table)

**The JSONB in `workout_sessions.exercises_completed` stores the actual workout performance data, not references to the exercises table!**

