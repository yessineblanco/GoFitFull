-- Add Database Indexes for GoFit App
-- Run this SQL script in your Supabase SQL Editor after creating the user_profiles table
-- This improves query performance for frequently accessed columns

-- ============================================
-- Indexes for user_profiles table
-- ============================================

-- Index on id (primary key) - Already exists in create_user_profiles_table.sql
-- CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON public.user_profiles(id);

-- Index on created_at for sorting and filtering by creation date
-- Useful for: "Get all profiles created in the last month"
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at 
  ON public.user_profiles(created_at DESC);

-- Index on updated_at for sorting and filtering by last update
-- Useful for: "Get recently updated profiles", "Find stale data"
CREATE INDEX IF NOT EXISTS idx_user_profiles_updated_at 
  ON public.user_profiles(updated_at DESC);

-- Composite index on (id, updated_at) for efficient user profile queries with sorting
-- Useful for: "Get user profile with latest update info"
CREATE INDEX IF NOT EXISTS idx_user_profiles_id_updated_at 
  ON public.user_profiles(id, updated_at DESC);

-- ============================================
-- Notes on Index Usage
-- ============================================

-- When to use indexes:
-- 1. Columns used in WHERE clauses frequently
-- 2. Columns used in ORDER BY clauses
-- 3. Columns used in JOIN conditions
-- 4. Foreign key columns (for referential integrity checks)

-- Index maintenance:
-- - Indexes are automatically maintained by PostgreSQL
-- - They use additional storage space (~20-30% of table size)
-- - They slow down INSERT/UPDATE/DELETE slightly (but speed up SELECT)
-- - For small tables (< 1000 rows), indexes may not be necessary

-- Performance impact:
-- - Without index: O(n) full table scan
-- - With index: O(log n) index lookup
-- - For large tables, this can be 100-1000x faster

-- ============================================
-- Future Indexes (for when you add more tables)
-- ============================================

-- Example indexes for future workout_sessions table:
-- CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id 
--   ON public.workout_sessions(user_id);
-- CREATE INDEX IF NOT EXISTS idx_workout_sessions_date 
--   ON public.workout_sessions(date DESC);
-- CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date 
--   ON public.workout_sessions(user_id, date DESC);

-- Example indexes for future exercises table:
-- CREATE INDEX IF NOT EXISTS idx_exercises_name 
--   ON public.exercises(name);
-- CREATE INDEX IF NOT EXISTS idx_exercises_category 
--   ON public.exercises(category);

-- Example indexes for future progress_measurements table:
-- CREATE INDEX IF NOT EXISTS idx_progress_user_id 
--   ON public.progress_measurements(user_id);
-- CREATE INDEX IF NOT EXISTS idx_progress_date 
--   ON public.progress_measurements(measurement_date DESC);
-- CREATE INDEX IF NOT EXISTS idx_progress_user_date 
--   ON public.progress_measurements(user_id, measurement_date DESC);

-- ============================================
-- Verify Indexes
-- ============================================

-- To check if indexes were created successfully, run:
-- SELECT 
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public' 
--   AND tablename = 'user_profiles'
-- ORDER BY indexname;

-- To see index usage statistics:
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan as index_scans,
--   idx_tup_read as tuples_read,
--   idx_tup_fetch as tuples_fetched
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
--   AND tablename = 'user_profiles'
-- ORDER BY idx_scan DESC;

