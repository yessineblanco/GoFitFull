# Migration: Fix Workout Structure

## Overview
This migration fixes the database structure issues identified in the design review:
1. ✅ Removes duplicate fields from `workout_sessions` (workout_name, workout_type)
2. ✅ Adds exercise snapshot fields to `workout_exercises`
3. ✅ Removes duplicate `type` field from `workouts` table
4. ✅ Moves `date` and `calories` from `workouts` to `workout_sessions`
5. ✅ Ensures all FK constraints are explicit

## Status: ✅ COMPLETED

All fixes have been implemented and tested.

## Changes Made

### 1. Workout Sessions
- **Removed:** `workout_name`, `workout_type` (duplicate data)
- **Added:** `date`, `calories` (moved from workouts table)
- **Kept:** `workout_id` (reference to workouts table)

### 2. Workout Exercises
- **Added snapshot fields:**
  - `exercise_name`
  - `exercise_image_url`
  - `exercise_equipment`
  - `exercise_difficulty`
- **Trigger:** Auto-populates snapshots when exercises are created/updated

### 3. Workouts Table
- **Removed:** `type` (duplicate of `workout_type`)
- **Removed:** `date`, `calories` (moved to workout_sessions)
- **Kept:** `workout_type` (standardized naming)

### 4. Foreign Key Constraints
All FK constraints are now explicit:
- `workout_sessions.workout_id` → `workouts.id`
- `workout_sessions.user_id` → `auth.users.id`
- `workouts.user_id` → `auth.users.id`
- `workout_exercises.workout_id` → `workouts.id`
- `workout_exercises.exercise_id` → `exercises.id`

## Migration Steps

1. **Run the migration:**
   ```sql
   database/migrations/fix_workout_structure.sql
   ```

2. **Verify data:**
   - Check that workout_sessions have `date` populated
   - Check that workout_exercises have snapshot fields populated
   - Verify no duplicate `type` field in workouts

3. **Test the app:**
   - Create new workouts
   - Start workout sessions
   - Complete workouts
   - Verify data integrity

## Code Changes

### Service Layer
- Updated `createWorkoutSession()` to only require `workout_id`
- Updated `WorkoutSession` interface to remove `workout_name` and `workout_type`
- Updated `createCustomWorkout()` and `updateCustomWorkout()` to populate exercise snapshots

### Screens
- Updated `LibraryScreen` to fetch workout details from `workouts` table
- Updated `WorkoutSessionScreen` to use `workout_id` only

## Benefits

✅ **No Data Duplication:** workout_name/type removed from sessions  
✅ **Data Integrity:** Exercise snapshots preserve historical data  
✅ **Clean Structure:** Templates (workouts) vs Execution (sessions)  
✅ **Referential Integrity:** All FK constraints enforced  
✅ **Better Performance:** Less redundant data to query  

