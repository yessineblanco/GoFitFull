# Native Workouts Current Implementation

This is the canonical explanation for native workout templates in the current codebase.

Native workouts are database-backed rows in the unified `public.workouts` table. They are identified by:

- `workouts.workout_type = 'native'`
- `workouts.user_id IS NULL`

Custom user workouts use the same table with `workouts.workout_type = 'custom'` and `workouts.user_id` set to the owning user.

## Verified Implementation

The mobile service loads native workouts from Supabase, not from a hardcoded `MOCK_WORKOUTS` list:

- `GoFitMobile/src/services/workouts.ts` uses `getNativeWorkouts()` to query `.from('workouts')`.
- `getNativeWorkouts()` filters with `.eq('workout_type', 'native')` and `.is('user_id', null)`.
- `getCustomWorkouts(userId)` queries the same `workouts` table with `.eq('user_id', userId)` and `.eq('workout_type', 'custom')`.

Workout exercise templates are stored separately from the workout row:

- `database/migrations/unify_workouts_design.sql` creates `public.workout_exercises`.
- Each `workout_exercises` row links one workout to one exercise and stores ordering, sets, reps, rest time, and optional notes.
- The mobile service loads those rows with `getWorkoutExercises(workoutId)`.

Workout execution history is stored in `public.workout_sessions`:

- `workout_sessions.workout_id` points to `public.workouts.id`.
- `workout_sessions.exercises_completed` is JSONB performance/progress data captured during a session.
- `exercises_completed` is not the source of truth for the workout template; it is the executed-session snapshot.

## Current Data Flow

1. The user opens the workout library.
2. The app calls `workoutService.getNativeWorkouts()`.
3. Supabase returns `workouts` rows where `workout_type = 'native'` and `user_id IS NULL`.
4. Opening a workout loads template exercises from `workout_exercises` joined to `exercises`.
5. Starting a workout creates or resumes a `workout_sessions` row for the selected `workout_id`.
6. During the workout, completed sets, weights, reps, and progress are stored on the session record.

## Superseded Designs

Older documents and migrations referenced:

- Hardcoded mobile `MOCK_WORKOUTS`
- A separate `native_workouts` table
- A separate `custom_workouts` table
- `custom_workouts.exercises` JSONB as template storage

Those are historical designs. The current implementation uses the unified `workouts` plus `workout_exercises` model described above.

## Related Files

- `GoFitMobile/src/services/workouts.ts`
- `database/migrations/unify_workouts_design.sql`
- `database/DATABASE_STRUCTURE.md`
