-- Migration: Add junction tables for workout exercises (Normalized Design)
-- This replaces the JSONB approach with proper foreign key relationships
-- Run this AFTER add_native_workouts_table.sql
-- Date: 2024

-- ============================================
-- 1. CREATE NATIVE_WORKOUT_EXERCISES JUNCTION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.native_workout_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  native_workout_id UUID NOT NULL REFERENCES public.native_workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  sets INTEGER NOT NULL DEFAULT 3,
  reps TEXT NOT NULL, -- Can be "10" or "12,10,8,6" for progressive sets
  rest_time INTEGER NOT NULL DEFAULT 60, -- Rest time in seconds
  exercise_order INTEGER NOT NULL DEFAULT 0, -- Order of exercise in workout
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Ensure unique exercise per workout (can't have same exercise twice in one workout)
  UNIQUE(native_workout_id, exercise_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_native_workout_exercises_workout_id ON public.native_workout_exercises(native_workout_id);
CREATE INDEX IF NOT EXISTS idx_native_workout_exercises_exercise_id ON public.native_workout_exercises(exercise_id);
CREATE INDEX IF NOT EXISTS idx_native_workout_exercises_order ON public.native_workout_exercises(native_workout_id, exercise_order);

-- Enable Row Level Security (RLS)
ALTER TABLE public.native_workout_exercises ENABLE ROW LEVEL SECURITY;

-- Create policy: Everyone can read native workout exercises
CREATE POLICY "Native workout exercises are viewable by everyone"
  ON public.native_workout_exercises
  FOR SELECT
  USING (true);

-- Only authenticated users can manage (for admin features)
CREATE POLICY "Only authenticated users can manage native workout exercises"
  ON public.native_workout_exercises
  FOR ALL
  USING (auth.role() = 'authenticated');

-- ============================================
-- 2. CREATE CUSTOM_WORKOUT_EXERCISES JUNCTION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.custom_workout_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  custom_workout_id UUID NOT NULL REFERENCES public.custom_workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  sets INTEGER NOT NULL DEFAULT 3,
  reps TEXT NOT NULL, -- Can be "10" or "12,10,8,6" for progressive sets
  rest_time INTEGER NOT NULL DEFAULT 60, -- Rest time in seconds
  exercise_order INTEGER NOT NULL DEFAULT 0, -- Order of exercise in workout
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Ensure unique exercise per workout
  UNIQUE(custom_workout_id, exercise_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_custom_workout_exercises_workout_id ON public.custom_workout_exercises(custom_workout_id);
CREATE INDEX IF NOT EXISTS idx_custom_workout_exercises_exercise_id ON public.custom_workout_exercises(exercise_id);
CREATE INDEX IF NOT EXISTS idx_custom_workout_exercises_order ON public.custom_workout_exercises(custom_workout_id, exercise_order);

-- Enable Row Level Security (RLS)
ALTER TABLE public.custom_workout_exercises ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only view their own custom workout exercises
CREATE POLICY "Users can view own custom workout exercises"
  ON public.custom_workout_exercises
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_workouts
      WHERE custom_workouts.id = custom_workout_exercises.custom_workout_id
      AND custom_workouts.user_id = auth.uid()
    )
  );

-- Create policy: Users can insert their own custom workout exercises
CREATE POLICY "Users can insert own custom workout exercises"
  ON public.custom_workout_exercises
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.custom_workouts
      WHERE custom_workouts.id = custom_workout_exercises.custom_workout_id
      AND custom_workouts.user_id = auth.uid()
    )
  );

-- Create policy: Users can update their own custom workout exercises
CREATE POLICY "Users can update own custom workout exercises"
  ON public.custom_workout_exercises
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_workouts
      WHERE custom_workouts.id = custom_workout_exercises.custom_workout_id
      AND custom_workouts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.custom_workouts
      WHERE custom_workouts.id = custom_workout_exercises.custom_workout_id
      AND custom_workouts.user_id = auth.uid()
    )
  );

-- Create policy: Users can delete their own custom workout exercises
CREATE POLICY "Users can delete own custom workout exercises"
  ON public.custom_workout_exercises
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_workouts
      WHERE custom_workouts.id = custom_workout_exercises.custom_workout_id
      AND custom_workouts.user_id = auth.uid()
    )
  );

-- ============================================
-- 3. MIGRATE EXISTING JSONB DATA TO JUNCTION TABLES
-- ============================================

-- Migrate native_workouts.exercises JSONB to native_workout_exercises
DO $$
DECLARE
  workout_record RECORD;
  exercise_item JSONB;
  exercise_uuid UUID;
  exercise_order INTEGER := 0;
BEGIN
  FOR workout_record IN SELECT id, exercises FROM public.native_workouts LOOP
    exercise_order := 0;
    
    FOR exercise_item IN SELECT * FROM jsonb_array_elements(workout_record.exercises) LOOP
      -- Try to find exercise by name first
      SELECT id INTO exercise_uuid
      FROM public.exercises
      WHERE name = exercise_item->>'name'
      LIMIT 1;
      
      -- If found, insert into junction table
      IF exercise_uuid IS NOT NULL THEN
        INSERT INTO public.native_workout_exercises (
          native_workout_id,
          exercise_id,
          sets,
          reps,
          rest_time,
          exercise_order
        ) VALUES (
          workout_record.id,
          exercise_uuid,
          COALESCE((exercise_item->>'sets')::INTEGER, 3),
          COALESCE(exercise_item->>'reps', '10'),
          COALESCE((exercise_item->>'restTime')::INTEGER, 60),
          exercise_order
        )
        ON CONFLICT (native_workout_id, exercise_id) DO NOTHING;
      END IF;
      
      exercise_order := exercise_order + 1;
    END LOOP;
  END LOOP;
END $$;

-- Migrate custom_workouts.exercises JSONB to custom_workout_exercises
DO $$
DECLARE
  workout_record RECORD;
  exercise_item JSONB;
  exercise_uuid UUID;
  exercise_order INTEGER := 0;
BEGIN
  FOR workout_record IN SELECT id, exercises FROM public.custom_workouts LOOP
    exercise_order := 0;
    
    FOR exercise_item IN SELECT * FROM jsonb_array_elements(workout_record.exercises) LOOP
      -- Try to find exercise by UUID first, then by name
      IF exercise_item->>'id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        SELECT id INTO exercise_uuid
        FROM public.exercises
        WHERE id::text = exercise_item->>'id'
        LIMIT 1;
      END IF;
      
      -- If not found by UUID, try by name
      IF exercise_uuid IS NULL THEN
        SELECT id INTO exercise_uuid
        FROM public.exercises
        WHERE name = exercise_item->>'name'
        LIMIT 1;
      END IF;
      
      -- If found, insert into junction table
      IF exercise_uuid IS NOT NULL THEN
        INSERT INTO public.custom_workout_exercises (
          custom_workout_id,
          exercise_id,
          sets,
          reps,
          rest_time,
          exercise_order
        ) VALUES (
          workout_record.id,
          exercise_uuid,
          COALESCE((exercise_item->>'sets')::INTEGER, 3),
          COALESCE(exercise_item->>'reps', '10'),
          COALESCE((exercise_item->>'restTime')::INTEGER, 60),
          exercise_order
        )
        ON CONFLICT (custom_workout_id, exercise_id) DO NOTHING;
      END IF;
      
      exercise_order := exercise_order + 1;
    END LOOP;
  END LOOP;
END $$;

-- ============================================
-- 4. GRANT PERMISSIONS
-- ============================================
GRANT SELECT ON public.native_workout_exercises TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_workout_exercises TO authenticated;

-- ============================================
-- 5. NOTE: Keep JSONB columns for backward compatibility
-- ============================================
-- The exercises JSONB columns are kept in native_workouts and custom_workouts
-- for backward compatibility, but new code should use the junction tables.
-- You can drop them later once everything is migrated:
-- ALTER TABLE public.native_workouts DROP COLUMN exercises;
-- ALTER TABLE public.custom_workouts DROP COLUMN exercises;












