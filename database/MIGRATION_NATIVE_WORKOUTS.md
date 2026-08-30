# Superseded Native Workouts Migration Note

This document used to describe a migration from hardcoded native workouts to a separate `native_workouts` table. That is no longer the current implementation.

The current schema uses a unified workout model:

- Native workout templates are `public.workouts` rows with `workout_type = 'native'` and `user_id IS NULL`.
- Custom workout templates are `public.workouts` rows with `workout_type = 'custom'` and `user_id` set to the owning user.
- Template exercises live in `public.workout_exercises`.
- Executed workout progress lives in `public.workout_sessions.exercises_completed`.

Do not use this file as migration guidance for new work. Use these current references instead:

- `database/NATIVE_WORKOUTS_EXPLANATION.md`
- `database/DATABASE_STRUCTURE.md`
- `database/migrations/unify_workouts_design.sql`

The old separate-table approach is kept here only as a historical note because other archived status documents may mention it.
