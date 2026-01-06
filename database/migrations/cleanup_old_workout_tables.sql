-- Cleanup: Remove old workout tables and columns
-- Run this AFTER unify_workouts_design.sql and verifying everything works
-- Date: 2024

-- ============================================
-- 1. HANDLE workout_id IN WORKOUT_SESSIONS
-- ============================================
-- Check if unified_workout_id exists and workout_id exists
DO $$
BEGIN
  -- Check if unified_workout_id exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'workout_sessions' 
    AND column_name = 'unified_workout_id'
  ) THEN
    -- Check if workout_id already exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'workout_sessions' 
      AND column_name = 'workout_id'
    ) THEN
      -- Both exist: need to drop old foreign key constraint first
      -- Drop any foreign key constraints on workout_id that point to old tables
      ALTER TABLE public.workout_sessions 
        DROP CONSTRAINT IF EXISTS workout_sessions_workout_id_fkey;
      ALTER TABLE public.workout_sessions 
        DROP CONSTRAINT IF EXISTS workout_sessions_custom_workout_id_fkey;
      ALTER TABLE public.workout_sessions 
        DROP CONSTRAINT IF EXISTS workout_sessions_native_workout_id_fkey;
      
      -- Now update workout_id with values from unified_workout_id
      UPDATE public.workout_sessions
      SET workout_id = unified_workout_id
      WHERE unified_workout_id IS NOT NULL
        AND (workout_id IS NULL OR workout_id != unified_workout_id);
      
      -- Add new foreign key constraint to workouts table
      ALTER TABLE public.workout_sessions
        ADD CONSTRAINT workout_sessions_workout_id_fkey
        FOREIGN KEY (workout_id) 
        REFERENCES public.workouts(id) 
        ON DELETE SET NULL;
      
      -- Drop unified_workout_id since we've copied the values
      ALTER TABLE public.workout_sessions 
        DROP COLUMN unified_workout_id;
    ELSE
      -- unified_workout_id exists but workout_id doesn't: rename it
      ALTER TABLE public.workout_sessions 
        RENAME COLUMN unified_workout_id TO workout_id;
      
      -- Ensure foreign key constraint points to workouts table
      ALTER TABLE public.workout_sessions
        DROP CONSTRAINT IF EXISTS workout_sessions_workout_id_fkey;
      
      ALTER TABLE public.workout_sessions
        ADD CONSTRAINT workout_sessions_workout_id_fkey
        FOREIGN KEY (workout_id) 
        REFERENCES public.workouts(id) 
        ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- ============================================
-- 2. DROP OLD FOREIGN KEY COLUMNS
-- ============================================
ALTER TABLE public.workout_sessions 
  DROP COLUMN IF EXISTS native_workout_id,
  DROP COLUMN IF EXISTS custom_workout_id;

-- Drop old generic workout_id if it exists (keep the new one)
-- Note: Check if old workout_id exists and is different from new one first

-- ============================================
-- 3. DROP OLD JUNCTION TABLES
-- ============================================
DROP TABLE IF EXISTS public.native_workout_exercises CASCADE;
DROP TABLE IF EXISTS public.custom_workout_exercises CASCADE;

-- ============================================
-- 4. DROP OLD WORKOUT TABLES
-- ============================================
DROP TABLE IF EXISTS public.native_workouts CASCADE;
DROP TABLE IF EXISTS public.custom_workouts CASCADE;

-- ============================================
-- 5. REMOVE JSONB COLUMNS (if they still exist)
-- ============================================
-- These should already be gone, but just in case:
-- ALTER TABLE public.workouts DROP COLUMN IF EXISTS exercises;
-- (This won't work since workouts table doesn't have exercises column, but keeping for reference)

-- ============================================
-- 6. REMOVE DEFAULT VALUES FROM EXERCISES TABLE
-- ============================================
-- These should be removed since defaults are now in workout_exercises junction table
-- However, we'll keep them for backward compatibility with any code that might reference them
-- You can drop them later if you want:
-- ALTER TABLE public.exercises 
--   DROP COLUMN IF EXISTS default_sets,
--   DROP COLUMN IF EXISTS default_reps,
--   DROP COLUMN IF EXISTS default_rest_time;

