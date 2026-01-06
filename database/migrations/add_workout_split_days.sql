-- Migration: Add split days support to workouts
-- This allows workouts to be organized by days (e.g., Day 1, Day 2, Day 3)
-- Date: 2024

-- ============================================
-- 1. ADD DAY FIELD TO WORKOUT_EXERCISES
-- ============================================
ALTER TABLE public.workout_exercises
  ADD COLUMN IF NOT EXISTS day INTEGER DEFAULT 1;

-- Update existing exercises to day 1 (for backward compatibility)
UPDATE public.workout_exercises
SET day = 1
WHERE day IS NULL;

-- Make day NOT NULL after setting defaults
ALTER TABLE public.workout_exercises
  ALTER COLUMN day SET NOT NULL,
  ALTER COLUMN day SET DEFAULT 1;

-- Add check constraint: day must be between 1 and 7 (weekly split)
-- Drop first if exists to allow re-running migration
ALTER TABLE public.workout_exercises
  DROP CONSTRAINT IF EXISTS check_day_range;
  
ALTER TABLE public.workout_exercises
  ADD CONSTRAINT check_day_range CHECK (day >= 1 AND day <= 7);

-- ============================================
-- 2. ADD DAY NAME FIELD TO WORKOUTS (OPTIONAL)
-- ============================================
-- This allows custom day names like "Push Day", "Pull Day", "Leg Day"
ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS split_days JSONB;

-- Example structure for split_days:
-- {
--   "1": "Push Day",
--   "2": "Pull Day", 
--   "3": "Leg Day"
-- }
-- If NULL, defaults to "Day 1", "Day 2", etc.

-- ============================================
-- 3. UPDATE INDEXES
-- ============================================
-- Add index for querying exercises by day
CREATE INDEX IF NOT EXISTS idx_workout_exercises_day 
  ON public.workout_exercises(workout_id, day, exercise_order);

-- ============================================
-- 4. UPDATE UNIQUE CONSTRAINT
-- ============================================
-- Allow same exercise on different days, but not same exercise twice on same day
DO $$
BEGIN
  -- Drop old unique constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'workout_exercises' 
    AND constraint_name = 'workout_exercises_workout_id_exercise_id_key'
  ) THEN
    ALTER TABLE public.workout_exercises
      DROP CONSTRAINT workout_exercises_workout_id_exercise_id_key;
  END IF;
  
  -- Drop new constraint if it already exists (allow re-running)
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'workout_exercises' 
    AND constraint_name = 'workout_exercises_workout_day_exercise_unique'
  ) THEN
    ALTER TABLE public.workout_exercises
      DROP CONSTRAINT workout_exercises_workout_day_exercise_unique;
  END IF;
END $$;

-- New constraint: unique exercise per workout per day
ALTER TABLE public.workout_exercises
  ADD CONSTRAINT workout_exercises_workout_day_exercise_unique 
  UNIQUE(workout_id, day, exercise_id);

-- ============================================
-- 5. UPDATE EXERCISE ORDER
-- ============================================
-- exercise_order is now per-day (resets for each day)
-- So Day 1 can have exercise_order 0,1,2 and Day 2 can also have 0,1,2

