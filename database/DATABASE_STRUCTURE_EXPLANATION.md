# Superseded Database Structure Explanation

This file previously described the older JSONB-heavy workout design and called it the current approach. That is no longer accurate.

The current workout schema is the unified normalized design documented in `database/DATABASE_STRUCTURE.md`:

- `public.workouts` stores both native and custom workout templates.
- Native templates use `workout_type = 'native'` and `user_id IS NULL`.
- Custom templates use `workout_type = 'custom'` and a non-null `user_id`.
- `public.workout_exercises` stores the configured exercises for each workout template.
- `public.workout_sessions` stores user execution history.
- `workout_sessions.exercises_completed` stores the performed-session snapshot, not the template definition.

Use `database/DATABASE_STRUCTURE.md` and `database/migrations/unify_workouts_design.sql` as the source of truth for current database work.
