# Unified Normalized Workout Design

The current normalized design uses one workout-template table for both native and custom workouts.

## Current Tables

- `public.exercises`: master exercise library.
- `public.workouts`: native and custom workout templates.
- `public.workout_exercises`: ordered exercise configuration for each workout template.
- `public.workout_sessions`: user execution history and in-progress/completed session data.

## Native vs Custom Workouts

Native workout templates are shared rows in `public.workouts`:

- `workout_type = 'native'`
- `user_id IS NULL`

Custom workout templates are user-owned rows in the same table:

- `workout_type = 'custom'`
- `user_id` references the owning user

The migration `database/migrations/unify_workouts_design.sql` enforces this split with a check constraint and migrates old separate native/custom tables into the unified table.

## Template Exercises

Workout template exercises live in `public.workout_exercises`, not in a JSONB array on the workout row.

Each row links:

- one `workout_id`
- one `exercise_id`
- the exercise order
- configured sets, reps, rest time, and notes

## Session Progress

`public.workout_sessions.exercises_completed` remains JSONB because it stores performed-session data such as weights, reps, completed sets, and progress at execution time. It is not used as the template storage model.

## Superseded Design

Older documentation referred to separate `native_workouts`, `custom_workouts`, `native_workout_exercises`, and `custom_workout_exercises` tables. Those names are historical. Current app code queries `public.workouts` and `public.workout_exercises`.
