# Normalized Database Design - Workout Exercises

## Overview
The database has been refactored from a denormalized JSONB approach to a proper normalized design using junction tables.

## Benefits of Normalized Design

✅ **No Data Duplication**: Exercises stored once in `exercises` table  
✅ **Easy Updates**: Update exercise once, all workouts reflect changes  
✅ **Efficient Queries**: Can query exercises across all workouts  
✅ **Referential Integrity**: Foreign keys enforce data validity  
✅ **Storage Efficient**: No redundant data storage  
✅ **Better Performance**: Indexed foreign keys for fast lookups  

## Database Structure

### Tables

1. **`exercises`** - Master exercise library
   - Stores all exercise definitions
   - One source of truth

2. **`native_workouts`** - Pre-built workout templates
   - No exercises column (removed JSONB)
   - References exercises via junction table

3. **`native_workout_exercises`** - Junction table
   - Links `native_workouts` to `exercises`
   - Stores workout-specific configs: `sets`, `reps`, `rest_time`, `exercise_order`

4. **`custom_workouts`** - User-created workouts
   - No exercises column (removed JSONB)
   - References exercises via junction table

5. **`custom_workout_exercises`** - Junction table
   - Links `custom_workouts` to `exercises`
   - Stores workout-specific configs: `sets`, `reps`, `rest_time`, `exercise_order`

## Migration Steps

### For Existing Databases:

1. **Run**: `database/migrations/add_workout_exercises_junction_tables.sql`
   - Creates junction tables
   - Migrates existing JSONB data to junction tables
   - Keeps JSONB columns for backward compatibility

2. **Update Code**: Service layer now loads from junction tables

3. **Optional**: After verifying everything works, drop JSONB columns:
   ```sql
   ALTER TABLE public.native_workouts DROP COLUMN exercises;
   ALTER TABLE public.custom_workouts DROP COLUMN exercises;
   ```

### For New Databases:

Run: `database/schema/create_workouts_tables_normalized.sql`

## How It Works

### Loading Exercises for a Workout

**Before (JSONB)**:
```typescript
const workout = await getNativeWorkoutById(id);
const exercises = workout.exercises; // From JSONB
```

**After (Junction Tables)**:
```typescript
const workout = await getNativeWorkoutById(id);
const exercises = await getNativeWorkoutExercises(id); // JOIN query
```

### Query Example

```sql
SELECT 
  e.id,
  e.name,
  e.category,
  nwe.sets,
  nwe.reps,
  nwe.rest_time,
  nwe.exercise_order
FROM native_workout_exercises nwe
JOIN exercises e ON e.id = nwe.exercise_id
WHERE nwe.native_workout_id = $1
ORDER BY nwe.exercise_order;
```

## Code Changes Required

1. **Service Layer** (`src/services/workouts.ts`):
   - Add `getNativeWorkoutExercises(workoutId)`
   - Add `getCustomWorkoutExercises(workoutId)`
   - Update `getNativeWorkoutById()` to load exercises from junction table
   - Update `getCustomWorkouts()` to load exercises from junction table
   - Update `createCustomWorkout()` to insert into junction table

2. **Screens**: No changes needed (service layer handles it)

## Benefits Summary

| Aspect | JSONB (Old) | Junction Tables (New) |
|--------|------------|----------------------|
| **Data Storage** | Duplicated in each workout | Stored once |
| **Updates** | Update 100+ workouts | Update once |
| **Queries** | Can't query efficiently | Fast JOIN queries |
| **Integrity** | No validation | Foreign key constraints |
| **Storage** | Wastes space | Efficient |








