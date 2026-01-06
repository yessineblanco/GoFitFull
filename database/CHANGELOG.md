# Database Changelog

## 2024 - Major Refactoring

### Phase 1: Unified Workouts Design
**Migration**: `unify_workouts_design.sql`

- ✅ Created unified `workouts` table (replaces `native_workouts` and `custom_workouts`)
- ✅ Created unified `workout_exercises` junction table
- ✅ Migrated from JSONB to normalized structure
- ✅ Updated `workout_sessions` to use unified `workout_id`

**Impact**: 
- Single workouts table for both native and custom
- Exercises loaded from `exercises` table via junction table
- No more JSONB duplication

---

### Phase 2: Structure Fixes
**Migration**: `fix_workout_structure.sql`

- ✅ Removed duplicate fields from `workout_sessions` (`workout_name`, `workout_type`)
- ✅ Added exercise snapshot fields to `workout_exercises`
- ✅ Removed duplicate `type` field from `workouts`
- ✅ Moved `date` and `calories` from `workouts` to `workout_sessions`
- ✅ Added explicit FK constraints

**Impact**:
- Clean separation: Templates (workouts) vs Execution (sessions)
- Data integrity: Exercise snapshots preserve historical data
- No duplication: Removed redundant fields

---

### Phase 3: Cleanup
**Migration**: `cleanup_old_workout_tables.sql`

- ✅ Dropped old `native_workouts` table
- ✅ Dropped old `custom_workouts` table
- ✅ Dropped old junction tables
- ✅ Removed old columns from `workout_sessions`

**Impact**:
- Clean database structure
- No legacy tables

---

## Current Structure (2024)

### Tables
- `exercises` - Master exercise library
- `workouts` - Unified workout templates (native + custom)
- `workout_exercises` - Junction table with snapshots
- `workout_sessions` - Execution logs

### Key Features
- ✅ Normalized design (no JSONB duplication)
- ✅ Exercise snapshots (preserve historical data)
- ✅ Unified workouts table
- ✅ Explicit FK constraints
- ✅ Clean template/execution separation

---

## Migration Order

For existing databases, run migrations in this order:

1. `unify_workouts_design.sql` - Create unified structure
2. `fix_workout_structure.sql` - Fix design issues
3. `cleanup_old_workout_tables.sql` - Remove old tables (after verification)

For new databases:
- Use `schema/create_workouts_tables_normalized.sql`

---

## Breaking Changes

### Service Layer
- `createWorkoutSession()` now only requires `workout_id` (no `workout_name`/`workout_type`)
- `WorkoutSession` interface: removed `workout_name`, `workout_type`; added `date`, `calories`
- `getNativeWorkouts()` filters empty workouts by default

### Database
- `workout_sessions.workout_name` removed (get from `workouts` via `workout_id`)
- `workout_sessions.workout_type` removed (get from `workouts` via `workout_id`)
- `workouts.date` removed (moved to `workout_sessions`)
- `workouts.calories` removed (moved to `workout_sessions`)
- `workouts.type` removed (use `workout_type` instead)

---

## Future Considerations

### Potential Enhancements
- `workout_session_exercises` table for detailed performance tracking
- Exercise versioning system
- Workout templates with variations
- Advanced analytics queries

### Performance Optimizations
- Materialized views for common queries
- Additional indexes based on usage patterns
- Query optimization for large datasets












