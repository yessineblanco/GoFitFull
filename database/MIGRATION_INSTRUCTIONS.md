# Migration Instructions - Unified Workouts Design

## Overview
This migration unifies the workout structure into a clean, normalized design:
- Single `workouts` table (native = `user_id NULL`, custom = `user_id set`)
- Single `workout_exercises` junction table
- Simplified `workout_sessions` (single `workout_id`)

## Migration Steps

### Step 1: Run Main Migration
```sql
-- Run this first
database/migrations/unify_workouts_design.sql
```

**What it does:**
- Creates unified `workouts` table
- Creates unified `workout_exercises` junction table
- Migrates data from `native_workouts` and `custom_workouts` to `workouts`
- Migrates data from both junction tables to unified `workout_exercises`
- Updates `workout_sessions` with `unified_workout_id`

### Step 2: Verify Migration
Check that:
- All native workouts have `user_id = NULL` and `workout_type = 'native'`
- All custom workouts have `user_id` set and `workout_type = 'custom'`
- All exercises are in `workout_exercises` junction table
- Workout sessions have `unified_workout_id` set

### Step 3: Test Application
- Load native workouts
- Load custom workouts
- Start a workout session
- Resume a workout session
- Create a custom workout

### Step 4: Run Cleanup (After Verification)
```sql
-- Run this ONLY after verifying everything works
database/migrations/cleanup_old_workout_tables.sql
```

**What it does:**
- Renames `unified_workout_id` to `workout_id` in `workout_sessions`
- Drops old `native_workout_id` and `custom_workout_id` columns
- Drops old `native_workout_exercises` and `custom_workout_exercises` tables
- Drops old `native_workouts` and `custom_workouts` tables

## Rollback Plan

If something goes wrong, you can rollback:

```sql
-- Restore old structure (if needed)
-- Note: This assumes you have backups
```

## Code Changes

The service layer has been updated to use unified methods:
- `getWorkouts({ type: 'native' })` - Get native workouts
- `getWorkouts({ userId, type: 'custom' })` - Get custom workouts
- `getWorkoutById(id)` - Get any workout
- `getWorkoutExercises(id)` - Get exercises for any workout

Legacy methods still work (deprecated wrappers) for backward compatibility.

## Benefits After Migration

✅ **No Duplication**: Exercises stored once  
✅ **Consistent**: One approach (junction tables), no JSONB  
✅ **Correct Defaults**: Sets/reps/rest in junction table (workout-specific)  
✅ **Simpler**: One workouts table, one workout_exercises table  
✅ **Cleaner**: workout_sessions has one workout_id field  












