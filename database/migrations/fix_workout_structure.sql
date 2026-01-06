-- Migration: Fix workout structure issues
-- This migration addresses:
-- 1. Remove duplicate fields from workout_sessions (workout_name, workout_type)
-- 2. Add exercise snapshots to workout_exercises
-- 3. Remove duplicate type field from workouts
-- 4. Move date/calories from workouts to workout_sessions
-- 5. Ensure all FK constraints are explicit
-- Date: 2024

-- ============================================
-- 1. ADD EXERCISE SNAPSHOT FIELDS TO WORKOUT_EXERCISES
-- ============================================
-- Add snapshot fields to preserve exercise data at time of workout creation
ALTER TABLE public.workout_exercises
  ADD COLUMN IF NOT EXISTS exercise_name TEXT,
  ADD COLUMN IF NOT EXISTS exercise_image_url TEXT,
  ADD COLUMN IF NOT EXISTS exercise_equipment TEXT[],
  ADD COLUMN IF NOT EXISTS exercise_difficulty TEXT;

-- Populate snapshot fields from exercises table for existing records
UPDATE public.workout_exercises we
SET 
  exercise_name = e.name,
  exercise_image_url = e.image_url,
  exercise_equipment = e.equipment,
  exercise_difficulty = e.difficulty
FROM public.exercises e
WHERE we.exercise_id = e.id
  AND (we.exercise_name IS NULL OR we.exercise_image_url IS NULL);

-- ============================================
-- 2. MOVE DATE AND CALORIES FROM WORKOUTS TO WORKOUT_SESSIONS
-- ============================================

-- Add date and calories to workout_sessions if they don't exist
ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS date DATE,
  ADD COLUMN IF NOT EXISTS calories INTEGER;

-- Migrate date from workouts to workout_sessions (if date exists in workouts)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'workouts' 
    AND column_name = 'date'
  ) THEN
    -- Update workout_sessions with date from workouts based on workout_id
    UPDATE public.workout_sessions ws
    SET date = w.date
    FROM public.workouts w
    WHERE ws.workout_id = w.id
      AND ws.date IS NULL
      AND w.date IS NOT NULL;
  END IF;
END $$;

-- Migrate calories from workouts to workout_sessions (if calories exists in workouts)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'workouts' 
    AND column_name = 'calories'
  ) THEN
    -- Update workout_sessions with calories from workouts based on workout_id
    UPDATE public.workout_sessions ws
    SET calories = w.calories
    FROM public.workouts w
    WHERE ws.workout_id = w.id
      AND ws.calories IS NULL
      AND w.calories IS NOT NULL;
  END IF;
END $$;

-- Set default date to started_at if date is still null
UPDATE public.workout_sessions
SET date = started_at::DATE
WHERE date IS NULL
  AND started_at IS NOT NULL;

-- ============================================
-- 3. REMOVE DUPLICATE TYPE FIELD FROM WORKOUTS
-- ============================================
-- Keep workout_type, remove type if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'workouts' 
    AND column_name = 'type'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'workouts' 
    AND column_name = 'workout_type'
  ) THEN
    -- Both exist, ensure type matches workout_type, then drop type
    UPDATE public.workouts
    SET type = workout_type
    WHERE type IS NULL OR type != workout_type;
    
    -- Drop the duplicate type column
    ALTER TABLE public.workouts DROP COLUMN type;
  END IF;
END $$;

-- ============================================
-- 4. REMOVE DUPLICATE FIELDS FROM WORKOUT_SESSIONS
-- ============================================
-- Remove workout_name and workout_type (we have workout_id reference instead)
DO $$
BEGIN
  -- Drop workout_name if it exists (we can get it from workouts table via workout_id)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'workout_sessions' 
    AND column_name = 'workout_name'
  ) THEN
    ALTER TABLE public.workout_sessions DROP COLUMN workout_name;
  END IF;
  
  -- Drop workout_type if it exists (we can get it from workouts table via workout_id)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'workout_sessions' 
    AND column_name = 'workout_type'
  ) THEN
    ALTER TABLE public.workout_sessions DROP COLUMN workout_type;
  END IF;
END $$;

-- ============================================
-- 5. REMOVE DATE AND CALORIES FROM WORKOUTS (TEMPLATES)
-- ============================================
-- These should only be in workout_sessions (execution logs)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'workouts' 
    AND column_name = 'date'
  ) THEN
    ALTER TABLE public.workouts DROP COLUMN date;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'workouts' 
    AND column_name = 'calories'
  ) THEN
    ALTER TABLE public.workouts DROP COLUMN calories;
  END IF;
END $$;

-- ============================================
-- 6. ENSURE ALL FK CONSTRAINTS ARE EXPLICIT
-- ============================================

-- Ensure workout_sessions.workout_id has FK constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'workout_sessions' 
    AND constraint_name = 'workout_sessions_workout_id_fkey'
  ) THEN
    ALTER TABLE public.workout_sessions
      ADD CONSTRAINT workout_sessions_workout_id_fkey
      FOREIGN KEY (workout_id) 
      REFERENCES public.workouts(id) 
      ON DELETE SET NULL;
  END IF;
END $$;

-- Ensure workout_sessions.user_id has FK constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'workout_sessions' 
    AND constraint_name = 'workout_sessions_user_id_fkey'
  ) THEN
    ALTER TABLE public.workout_sessions
      ADD CONSTRAINT workout_sessions_user_id_fkey
      FOREIGN KEY (user_id) 
      REFERENCES auth.users(id) 
      ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure workouts.user_id has FK constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'workouts' 
    AND constraint_name = 'workouts_user_id_fkey'
  ) THEN
    ALTER TABLE public.workouts
      ADD CONSTRAINT workouts_user_id_fkey
      FOREIGN KEY (user_id) 
      REFERENCES auth.users(id) 
      ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure workout_exercises.workout_id has FK constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'workout_exercises' 
    AND constraint_name = 'workout_exercises_workout_id_fkey'
  ) THEN
    ALTER TABLE public.workout_exercises
      ADD CONSTRAINT workout_exercises_workout_id_fkey
      FOREIGN KEY (workout_id) 
      REFERENCES public.workouts(id) 
      ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure workout_exercises.exercise_id has FK constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'workout_exercises' 
    AND constraint_name = 'workout_exercises_exercise_id_fkey'
  ) THEN
    ALTER TABLE public.workout_exercises
      ADD CONSTRAINT workout_exercises_exercise_id_fkey
      FOREIGN KEY (exercise_id) 
      REFERENCES public.exercises(id) 
      ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================
-- 7. CREATE TRIGGER TO AUTO-POPULATE SNAPSHOT FIELDS
-- ============================================
-- Create function to populate exercise snapshots when workout_exercises are created/updated
CREATE OR REPLACE FUNCTION public.populate_exercise_snapshots()
RETURNS TRIGGER AS $$
BEGIN
  -- If snapshot fields are null, populate from exercises table
  IF NEW.exercise_name IS NULL OR NEW.exercise_image_url IS NULL THEN
    SELECT 
      e.name,
      e.image_url,
      e.equipment,
      e.difficulty
    INTO 
      NEW.exercise_name,
      NEW.exercise_image_url,
      NEW.exercise_equipment,
      NEW.exercise_difficulty
    FROM public.exercises e
    WHERE e.id = NEW.exercise_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_populate_exercise_snapshots ON public.workout_exercises;
CREATE TRIGGER trigger_populate_exercise_snapshots
  BEFORE INSERT OR UPDATE ON public.workout_exercises
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_exercise_snapshots();

-- ============================================
-- 8. CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_workout_sessions_date ON public.workout_sessions(date DESC);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id_date ON public.workout_sessions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise_name ON public.workout_exercises(exercise_name);












