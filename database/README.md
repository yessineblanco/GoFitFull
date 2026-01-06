# GoFit Database Documentation

## Quick Start

1. **Initial Setup**: Run `schema/create_workouts_tables_normalized.sql` for fresh databases
2. **Migration**: Run migrations in order:
   - `migrations/unify_workouts_design.sql` (unified structure)
   - `migrations/fix_workout_structure.sql` (structure fixes)
   - `migrations/cleanup_old_workout_tables.sql` (cleanup, after verification)

## Documentation

- **[DATABASE_STRUCTURE.md](./DATABASE_STRUCTURE.md)** - Complete database schema documentation
- **[POST_MIGRATION_CHECKLIST.md](./POST_MIGRATION_CHECKLIST.md)** - Testing checklist after migrations
- **[MIGRATION_FIX_WORKOUT_STRUCTURE.md](./MIGRATION_FIX_WORKOUT_STRUCTURE.md)** - Migration details

## Database Design

### Core Tables

1. **`exercises`** - Master exercise library (single source of truth)
2. **`workouts`** - Workout templates (native or custom)
3. **`workout_exercises`** - Junction table linking workouts to exercises
4. **`workout_sessions`** - Execution logs (user workout history)

### Key Principles

- ✅ **Normalized**: No data duplication
- ✅ **Unified**: Single `workouts` table for native and custom
- ✅ **Snapshots**: Exercise data preserved in workout_exercises
- ✅ **Templates vs Execution**: Clear separation

## Migration Files

### In Order of Execution:

1. `unify_workouts_design.sql` - Creates unified structure
2. `fix_workout_structure.sql` - Fixes design issues
3. `cleanup_old_workout_tables.sql` - Removes old tables (run after verification)

### Legacy Files (Reference Only):

- `add_native_workouts_table.sql` - Initial native workouts migration
- `add_workout_exercises_junction_tables.sql` - Initial junction tables

## Schema Files

- `schema/create_workouts_tables_normalized.sql` - Clean schema for new databases
- `schema/create_workouts_tables.sql` - Legacy schema (reference only)

## Support

For issues or questions:
1. Check `POST_MIGRATION_CHECKLIST.md` for common issues
2. Review `DATABASE_STRUCTURE.md` for schema details
3. Check migration files for specific changes
