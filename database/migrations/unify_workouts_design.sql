-- Migration: Unify workouts design (Clean Architecture)
-- This migration creates a unified, clean design:
-- - Single workouts table (native = user_id NULL, custom = user_id set)
-- - Single workout_exercises junction table
-- - Simplified workout_sessions
-- - Removes JSONB columns and duplicate structures
-- Date: 2024

-- ============================================
-- 1. CREATE UNIFIED WORKOUTS TABLE
-- ============================================
-- Check if workouts table exists, if not create it fresh
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'workouts'
  ) THEN
    -- Table doesn't exist, create it fresh
    CREATE TABLE public.workouts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for native, set for custom
      name TEXT NOT NULL,
      difficulty TEXT CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced', 'Custom')),
      image_url TEXT,
      workout_type TEXT NOT NULL CHECK (workout_type IN ('native', 'custom')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
      
      -- Ensure native workouts have NULL user_id, custom have user_id
      CONSTRAINT check_native_workout CHECK (
        (workout_type = 'native' AND user_id IS NULL) OR
        (workout_type = 'custom' AND user_id IS NOT NULL)
      )
    );
  ELSE
    -- Table exists, ensure all required columns exist
    -- Add missing columns one by one
    
    -- Add name column if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'workouts' 
      AND column_name = 'name'
    ) THEN
      ALTER TABLE public.workouts ADD COLUMN name TEXT;
    END IF;
    
    -- Add difficulty column if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'workouts' 
      AND column_name = 'difficulty'
    ) THEN
      ALTER TABLE public.workouts ADD COLUMN difficulty TEXT;
    END IF;
    
    -- Add image_url column if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'workouts' 
      AND column_name = 'image_url'
    ) THEN
      ALTER TABLE public.workouts ADD COLUMN image_url TEXT;
    END IF;
    
    -- Add workout_type column if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'workouts' 
      AND column_name = 'workout_type'
    ) THEN
      ALTER TABLE public.workouts ADD COLUMN workout_type TEXT;
      
      -- Set default values based on user_id
      UPDATE public.workouts 
      SET workout_type = CASE 
        WHEN user_id IS NULL THEN 'native' 
        ELSE 'custom' 
      END
      WHERE workout_type IS NULL;
      
      -- Make it NOT NULL after setting values
      ALTER TABLE public.workouts 
        ALTER COLUMN workout_type SET NOT NULL;
    END IF;
    
    -- Add created_at column if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'workouts' 
      AND column_name = 'created_at'
    ) THEN
      ALTER TABLE public.workouts 
        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL;
    END IF;
    
    -- Add updated_at column if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'workouts' 
      AND column_name = 'updated_at'
    ) THEN
      ALTER TABLE public.workouts 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL;
    END IF;
    
    -- Add check constraints
    ALTER TABLE public.workouts 
      DROP CONSTRAINT IF EXISTS check_workout_type;
    
    ALTER TABLE public.workouts 
      ADD CONSTRAINT check_workout_type 
      CHECK (workout_type IN ('native', 'custom'));
    
    ALTER TABLE public.workouts 
      DROP CONSTRAINT IF EXISTS check_native_workout;
    
    ALTER TABLE public.workouts 
      ADD CONSTRAINT check_native_workout CHECK (
        (workout_type = 'native' AND user_id IS NULL) OR
        (workout_type = 'custom' AND user_id IS NOT NULL)
      );
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON public.workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_type ON public.workouts(workout_type);
CREATE INDEX IF NOT EXISTS idx_workouts_created_at ON public.workouts(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read native workouts, users can read their own custom workouts
CREATE POLICY "Users can view workouts"
  ON public.workouts
  FOR SELECT
  USING (user_id IS NULL OR user_id = auth.uid());

-- Policy: Only authenticated users can create native workouts (admin)
CREATE POLICY "Authenticated users can create native workouts"
  ON public.workouts
  FOR INSERT
  WITH CHECK (workout_type = 'native' AND user_id IS NULL AND auth.role() = 'authenticated');

-- Policy: Users can create their own custom workouts
CREATE POLICY "Users can create own custom workouts"
  ON public.workouts
  FOR INSERT
  WITH CHECK (workout_type = 'custom' AND user_id = auth.uid());

-- Policy: Only authenticated users can update native workouts (admin)
CREATE POLICY "Authenticated users can update native workouts"
  ON public.workouts
  FOR UPDATE
  USING (workout_type = 'native' AND user_id IS NULL AND auth.role() = 'authenticated')
  WITH CHECK (workout_type = 'native' AND user_id IS NULL AND auth.role() = 'authenticated');

-- Policy: Users can update their own custom workouts
CREATE POLICY "Users can update own custom workouts"
  ON public.workouts
  FOR UPDATE
  USING (workout_type = 'custom' AND user_id = auth.uid())
  WITH CHECK (workout_type = 'custom' AND user_id = auth.uid());

-- Policy: Only authenticated users can delete native workouts (admin)
CREATE POLICY "Authenticated users can delete native workouts"
  ON public.workouts
  FOR DELETE
  USING (workout_type = 'native' AND user_id IS NULL AND auth.role() = 'authenticated');

-- Policy: Users can delete their own custom workouts
CREATE POLICY "Users can delete own custom workouts"
  ON public.workouts
  FOR DELETE
  USING (workout_type = 'custom' AND user_id = auth.uid());

-- ============================================
-- 2. CREATE UNIFIED WORKOUT_EXERCISES JUNCTION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.workout_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  sets INTEGER NOT NULL DEFAULT 3, -- Workout-specific default
  reps TEXT NOT NULL DEFAULT '10', -- Workout-specific default
  rest_time INTEGER NOT NULL DEFAULT 60, -- Workout-specific default (seconds)
  exercise_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Ensure unique exercise per workout
  UNIQUE(workout_id, exercise_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON public.workout_exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise_id ON public.workout_exercises(exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_order ON public.workout_exercises(workout_id, exercise_order);

-- Enable Row Level Security (RLS) - will add policies after data migration
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. MIGRATE DATA FROM OLD TABLES
-- ============================================

-- Migrate native_workouts to workouts (only if native_workouts table exists)
DO $$
DECLARE
  has_date_column BOOLEAN;
  has_type_column BOOLEAN;
  sql_text TEXT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'native_workouts'
  ) THEN
    -- Check if workouts table has required columns
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'workouts' 
      AND column_name = 'name'
    ) THEN
      -- Check if date column exists
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'workouts' 
        AND column_name = 'date'
      ) INTO has_date_column;
      
      -- Check if type column exists
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'workouts' 
        AND column_name = 'type'
      ) INTO has_type_column;
      
      -- Build dynamic INSERT based on which columns exist
      sql_text := 'INSERT INTO public.workouts (id, user_id, name, difficulty, image_url, workout_type, created_at, updated_at';
      
      IF has_date_column THEN
        sql_text := sql_text || ', date';
      END IF;
      
      IF has_type_column THEN
        sql_text := sql_text || ', type';
      END IF;
      
      sql_text := sql_text || ') SELECT id, NULL as user_id, name, difficulty, image_url, ''native'' as workout_type, COALESCE(created_at, NOW()) as created_at, COALESCE(updated_at, NOW()) as updated_at';
      
      IF has_date_column THEN
        sql_text := sql_text || ', COALESCE(created_at::DATE, CURRENT_DATE) as date';
      END IF;
      
      IF has_type_column THEN
        sql_text := sql_text || ', ''native'' as type';
      END IF;
      
      sql_text := sql_text || ' FROM public.native_workouts ON CONFLICT (id) DO NOTHING';
      
      EXECUTE sql_text;
    END IF;
  END IF;
END $$;

-- Migrate custom_workouts to workouts (only if custom_workouts table exists)
DO $$
DECLARE
  has_date_column BOOLEAN;
  has_type_column BOOLEAN;
  sql_text TEXT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'custom_workouts'
  ) THEN
    -- Check if workouts table has required columns
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'workouts' 
      AND column_name = 'name'
    ) THEN
      -- Check if date column exists
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'workouts' 
        AND column_name = 'date'
      ) INTO has_date_column;
      
      -- Check if type column exists
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'workouts' 
        AND column_name = 'type'
      ) INTO has_type_column;
      
      -- Build dynamic INSERT based on which columns exist
      sql_text := 'INSERT INTO public.workouts (id, user_id, name, difficulty, image_url, workout_type, created_at, updated_at';
      
      IF has_date_column THEN
        sql_text := sql_text || ', date';
      END IF;
      
      IF has_type_column THEN
        sql_text := sql_text || ', type';
      END IF;
      
      sql_text := sql_text || ') SELECT id, user_id, name, difficulty, image_url, ''custom'' as workout_type, COALESCE(created_at, NOW()) as created_at, COALESCE(updated_at, NOW()) as updated_at';
      
      IF has_date_column THEN
        sql_text := sql_text || ', COALESCE(created_at::DATE, CURRENT_DATE) as date';
      END IF;
      
      IF has_type_column THEN
        sql_text := sql_text || ', ''custom'' as type';
      END IF;
      
      sql_text := sql_text || ' FROM public.custom_workouts ON CONFLICT (id) DO NOTHING';
      
      EXECUTE sql_text;
    END IF;
  END IF;
END $$;

-- Migrate native_workout_exercises to workout_exercises
INSERT INTO public.workout_exercises (workout_id, exercise_id, sets, reps, rest_time, exercise_order, created_at)
SELECT 
  native_workout_id as workout_id,
  exercise_id,
  sets,
  reps::TEXT, -- Ensure reps is TEXT
  rest_time,
  exercise_order,
  created_at
FROM public.native_workout_exercises
ON CONFLICT (workout_id, exercise_id) DO NOTHING;

-- Migrate custom_workout_exercises to workout_exercises
INSERT INTO public.workout_exercises (workout_id, exercise_id, sets, reps, rest_time, exercise_order, created_at)
SELECT 
  custom_workout_id as workout_id,
  exercise_id,
  sets,
  reps::TEXT, -- Ensure reps is TEXT
  rest_time,
  exercise_order,
  created_at
FROM public.custom_workout_exercises
ON CONFLICT (workout_id, exercise_id) DO NOTHING;

-- ============================================
-- 4. UPDATE WORKOUT_SESSIONS TABLE
-- ============================================

-- Ensure workout_type column exists (in case it doesn't)
ALTER TABLE public.workout_sessions 
  ADD COLUMN IF NOT EXISTS workout_type TEXT;

-- Add unified workout_id if it doesn't exist
ALTER TABLE public.workout_sessions 
  ADD COLUMN IF NOT EXISTS unified_workout_id UUID REFERENCES public.workouts(id) ON DELETE SET NULL;

-- Migrate existing workout_id references
-- For native workouts (check if native_workout_id column exists first)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'workout_sessions' 
    AND column_name = 'native_workout_id'
  ) THEN
    -- Match by native_workout_id and workout type from workouts table
    UPDATE public.workout_sessions ws
    SET unified_workout_id = w.id
    FROM public.workouts w
    WHERE ws.native_workout_id = w.id
      AND w.workout_type = 'native'
      AND (ws.unified_workout_id IS NULL);
  END IF;
END $$;

-- For custom workouts (check if custom_workout_id column exists first)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'workout_sessions' 
    AND column_name = 'custom_workout_id'
  ) THEN
    -- Match by custom_workout_id and workout type from workouts table
    UPDATE public.workout_sessions ws
    SET unified_workout_id = w.id
    FROM public.workouts w
    WHERE ws.custom_workout_id = w.id
      AND w.workout_type = 'custom'
      AND (ws.unified_workout_id IS NULL);
  END IF;
END $$;

-- Also try to migrate using workout_id if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workout_sessions' 
    AND column_name = 'workout_id'
    AND column_name != 'unified_workout_id'
  ) THEN
    UPDATE public.workout_sessions ws
    SET unified_workout_id = w.id
    FROM public.workouts w
    WHERE ws.workout_id = w.id
      AND ws.unified_workout_id IS NULL;
  END IF;
END $$;

-- Create index
CREATE INDEX IF NOT EXISTS idx_workout_sessions_unified_workout_id ON public.workout_sessions(unified_workout_id);

-- ============================================
-- 5. CREATE RLS POLICIES FOR WORKOUT_EXERCISES
-- ============================================
-- Create policies after data migration to ensure workouts table has data
-- Drop existing policies first (if they exist) to avoid conflicts

DROP POLICY IF EXISTS "Users can view workout exercises" ON public.workout_exercises;
DROP POLICY IF EXISTS "Authenticated users can manage native workout exercises" ON public.workout_exercises;
DROP POLICY IF EXISTS "Users can manage own custom workout exercises" ON public.workout_exercises;

-- Policy: Users can view exercises for native workouts or their own custom workouts
CREATE POLICY "Users can view workout exercises"
  ON public.workout_exercises
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workouts
      WHERE workouts.id = workout_exercises.workout_id
      AND (workouts.user_id IS NULL OR workouts.user_id = auth.uid())
    )
  );

-- Policy: Authenticated users can manage exercises for native workouts (admin)
CREATE POLICY "Authenticated users can manage native workout exercises"
  ON public.workout_exercises
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workouts
      WHERE workouts.id = workout_exercises.workout_id
      AND workouts.workout_type = 'native'
      AND workouts.user_id IS NULL
      AND auth.role() = 'authenticated'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workouts
      WHERE workouts.id = workout_exercises.workout_id
      AND workouts.workout_type = 'native'
      AND workouts.user_id IS NULL
      AND auth.role() = 'authenticated'
    )
  );

-- Policy: Users can manage exercises for their own custom workouts
CREATE POLICY "Users can manage own custom workout exercises"
  ON public.workout_exercises
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workouts
      WHERE workouts.id = workout_exercises.workout_id
      AND workouts.workout_type = 'custom'
      AND workouts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workouts
      WHERE workouts.id = workout_exercises.workout_id
      AND workouts.workout_type = 'custom'
      AND workouts.user_id = auth.uid()
    )
  );

-- ============================================
-- 6. CREATE TRIGGER FOR UPDATED_AT
-- ============================================
CREATE TRIGGER set_workouts_updated_at
  BEFORE UPDATE ON public.workouts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 7. GRANT PERMISSIONS
-- ============================================
GRANT SELECT ON public.workouts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workouts TO authenticated; -- RLS will restrict
GRANT SELECT ON public.workout_exercises TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_exercises TO authenticated; -- RLS will restrict

-- ============================================
-- 8. SEED INITIAL NATIVE WORKOUTS (if needed)
-- ============================================
-- Only if native_workouts table is empty or you want to seed fresh data
-- This assumes exercises already exist in exercises table

-- Note: After migration, you can drop old tables:
-- DROP TABLE IF EXISTS public.native_workout_exercises;
-- DROP TABLE IF EXISTS public.custom_workout_exercises;
-- DROP TABLE IF EXISTS public.native_workouts;
-- DROP TABLE IF EXISTS public.custom_workouts;
-- ALTER TABLE public.workout_sessions DROP COLUMN IF EXISTS native_workout_id;
-- ALTER TABLE public.workout_sessions DROP COLUMN IF EXISTS custom_workout_id;
-- ALTER TABLE public.workout_sessions DROP COLUMN IF EXISTS workout_id; -- Old generic one
-- ALTER TABLE public.workout_sessions RENAME COLUMN unified_workout_id TO workout_id;

