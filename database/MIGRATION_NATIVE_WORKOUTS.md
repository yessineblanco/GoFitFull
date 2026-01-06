# Migration: Native Workouts to Database

## Overview
Native workouts have been moved from hardcoded app data to the database. This allows for better management, updates without app releases, and consistency with custom workouts.

## Changes Made

### 1. Database Schema
- **New Table**: `native_workouts`
  - Stores pre-built workout templates
  - Similar structure to `custom_workouts` but without `user_id`
  - Contains `exercises` JSONB column with exercise configurations

- **Updated Table**: `workout_sessions`
  - Added `native_workout_id` column (foreign key to `native_workouts`)
  - Added `custom_workout_id` column (for clarity)
  - Maintains backward compatibility with `workout_id`

### 2. Code Changes

#### Services (`src/services/workouts.ts`)
- Added `NativeWorkout` interface
- Added `getNativeWorkouts()` - Get all native workouts
- Added `getNativeWorkoutById()` - Get single native workout
- Added `getNativeWorkoutByName()` - Get native workout by name
- Updated `createWorkoutSession()` to handle `native_workout_id`

#### Screens
- **LibraryScreen**: 
  - Removed `MOCK_WORKOUTS` hardcoded data
  - Added `loadNativeWorkouts()` function
  - Loads native workouts from database on screen focus
  - Updated continue workout logic to load from native_workouts table

- **WorkoutDetailScreen**:
  - Removed hardcoded exercises
  - Added `useEffect` to load workout from database
  - Shows loading state while fetching
  - Passes `nativeWorkoutId` when starting workout

- **WorkoutSessionScreen**:
  - Updated to accept `nativeWorkoutId` from route params
  - Passes `native_workout_id` when creating session

## Migration Steps

### For New Databases
Run the updated `database/schema/create_workouts_tables.sql` which includes:
- Native workouts table creation
- Initial seed data (3 workouts)
- Proper indexes and RLS policies

### For Existing Databases
Run `database/migrations/add_native_workouts_table.sql` which:
1. Creates `native_workouts` table
2. Adds new columns to `workout_sessions`
3. Seeds initial native workouts
4. Links existing native workout sessions to new table (by name matching)

## Benefits

1. **No Hardcoded Data**: All workouts come from database
2. **Easy Updates**: Change workouts without app updates
3. **Consistency**: Native and custom workouts use same structure
4. **Better History**: Proper foreign key relationships
5. **Admin Features**: Can manage workouts via database/admin panel

## Testing Checklist

- [ ] Run migration script on database
- [ ] Verify native workouts appear in Library screen
- [ ] Start a native workout session
- [ ] Verify exercises load correctly
- [ ] Resume an incomplete native workout
- [ ] Complete a native workout
- [ ] Check workout history shows correct data

## Notes

- Exercise IDs in JSONB can be UUIDs (if exercise exists in `exercises` table) or simple strings
- The app will look up exercise details by name if UUID not found
- Native workouts are public (no user_id), unlike custom workouts
- RLS policies ensure only authenticated users can manage native workouts (for admin features)












