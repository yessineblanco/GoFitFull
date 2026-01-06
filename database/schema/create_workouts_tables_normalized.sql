-- Create workouts and exercises tables for GoFit app (NORMALIZED DESIGN)
-- This version uses junction tables instead of JSONB for proper normalization
-- Run this SQL script in your Supabase SQL Editor

-- ============================================
-- 1. EXERCISES TABLE (Exercise Library)
-- ============================================
CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- Chest, Legs, Back, Shoulders, Arms, etc.
  muscle_groups TEXT[], -- Array of muscle groups targeted
  image_url TEXT,
  video_url TEXT,
  instructions TEXT,
  equipment TEXT[], -- Array of required equipment
  difficulty TEXT CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  default_sets INTEGER, -- Default number of sets (can be overridden in workouts)
  default_reps INTEGER, -- Default number of reps (can be overridden in workouts)
  default_rest_time INTEGER, -- Default rest time in seconds (can be overridden in workouts)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index on category for faster filtering
CREATE INDEX IF NOT EXISTS idx_exercises_category ON public.exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_name ON public.exercises(name);

-- Enable Row Level Security (RLS)
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- Create policy: Everyone can read exercises (public exercise library)
CREATE POLICY "Exercises are viewable by everyone"
  ON public.exercises
  FOR SELECT
  USING (true);

-- Only authenticated users can insert/update/delete (for admin features later)
CREATE POLICY "Only authenticated users can manage exercises"
  ON public.exercises
  FOR ALL
  USING (auth.role() = 'authenticated');

-- ============================================
-- 2. NATIVE WORKOUTS TABLE (Pre-built workouts)
-- ============================================
CREATE TABLE IF NOT EXISTS public.native_workouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  difficulty TEXT CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_native_workouts_difficulty ON public.native_workouts(difficulty);
CREATE INDEX IF NOT EXISTS idx_native_workouts_created_at ON public.native_workouts(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.native_workouts ENABLE ROW LEVEL SECURITY;

-- Create policy: Everyone can read native workouts (public workouts)
CREATE POLICY "Native workouts are viewable by everyone"
  ON public.native_workouts
  FOR SELECT
  USING (true);

-- Only authenticated users can insert/update/delete (for admin features later)
CREATE POLICY "Only authenticated users can manage native workouts"
  ON public.native_workouts
  FOR ALL
  USING (auth.role() = 'authenticated');

-- ============================================
-- 3. NATIVE_WORKOUT_EXERCISES JUNCTION TABLE
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
-- 4. CUSTOM WORKOUTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.custom_workouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced', 'Custom')),
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_custom_workouts_user_id ON public.custom_workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_workouts_created_at ON public.custom_workouts(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.custom_workouts ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only view their own workouts
CREATE POLICY "Users can view own workouts"
  ON public.custom_workouts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own workouts
CREATE POLICY "Users can insert own workouts"
  ON public.custom_workouts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own workouts
CREATE POLICY "Users can update own workouts"
  ON public.custom_workouts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can delete their own workouts
CREATE POLICY "Users can delete own workouts"
  ON public.custom_workouts
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 5. CUSTOM_WORKOUT_EXERCISES JUNCTION TABLE
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
-- 6. WORKOUT SESSIONS TABLE (History)
-- ============================================
CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id UUID, -- Can reference custom_workouts OR native_workouts (determined by workout_type)
  native_workout_id UUID REFERENCES public.native_workouts(id) ON DELETE SET NULL, -- For native workouts
  custom_workout_id UUID REFERENCES public.custom_workouts(id) ON DELETE SET NULL, -- For custom workouts
  workout_name TEXT NOT NULL, -- Denormalized for history (in case workout is deleted)
  workout_type TEXT NOT NULL CHECK (workout_type IN ('native', 'custom')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  exercises_completed JSONB, -- Array of completed exercises with actual sets/reps/weight
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON public.workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_workout_id ON public.workout_sessions(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_native_workout_id ON public.workout_sessions(native_workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_custom_workout_id ON public.workout_sessions(custom_workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_started_at ON public.workout_sessions(started_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only view their own workout sessions
CREATE POLICY "Users can view own workout sessions"
  ON public.workout_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own workout sessions
CREATE POLICY "Users can insert own workout sessions"
  ON public.workout_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own workout sessions
CREATE POLICY "Users can update own workout sessions"
  ON public.workout_sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can delete their own workout sessions
CREATE POLICY "Users can delete own workout sessions"
  ON public.workout_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 7. TRIGGERS FOR UPDATED_AT
-- ============================================
-- Create trigger function for exercises
CREATE TRIGGER set_exercises_updated_at
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create trigger function for native_workouts
CREATE TRIGGER set_native_workouts_updated_at
  BEFORE UPDATE ON public.native_workouts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create trigger function for custom_workouts
CREATE TRIGGER set_custom_workouts_updated_at
  BEFORE UPDATE ON public.custom_workouts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 8. GRANT PERMISSIONS
-- ============================================
GRANT SELECT ON public.exercises TO authenticated;
GRANT SELECT ON public.native_workouts TO authenticated;
GRANT SELECT ON public.native_workout_exercises TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_workouts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_workout_exercises TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;

-- ============================================
-- 9. SEED INITIAL EXERCISES
-- ============================================
INSERT INTO public.exercises (name, category, muscle_groups, difficulty, default_sets, default_reps, default_rest_time) VALUES
  ('Bench Press', 'Chest', ARRAY['Chest', 'Triceps', 'Shoulders'], 'Intermediate', 4, 8, 90),
  ('Squat', 'Legs', ARRAY['Quadriceps', 'Glutes', 'Hamstrings'], 'Intermediate', 4, 10, 120),
  ('Deadlift', 'Back', ARRAY['Back', 'Hamstrings', 'Glutes'], 'Advanced', 3, 5, 180),
  ('Shoulder Press', 'Shoulders', ARRAY['Shoulders', 'Triceps'], 'Intermediate', 3, 10, 90),
  ('Bicep Curl', 'Arms', ARRAY['Biceps'], 'Beginner', 3, 12, 60),
  ('Tricep Extension', 'Arms', ARRAY['Triceps'], 'Beginner', 3, 12, 60),
  ('Pull Up', 'Back', ARRAY['Back', 'Biceps'], 'Intermediate', 3, 10, 90),
  ('Leg Press', 'Legs', ARRAY['Quadriceps', 'Glutes'], 'Beginner', 3, 15, 90),
  ('Chest Fly', 'Chest', ARRAY['Chest'], 'Beginner', 3, 12, 60),
  ('Lateral Raise', 'Shoulders', ARRAY['Shoulders'], 'Beginner', 3, 15, 45),
  ('Incline Dumbbell Press', 'Chest', ARRAY['Chest', 'Shoulders'], 'Intermediate', 3, 10, 60),
  ('Barbell Rows', 'Back', ARRAY['Back', 'Biceps'], 'Intermediate', 4, 8, 90)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 10. SEED INITIAL NATIVE WORKOUTS
-- ============================================
-- First create the workouts
INSERT INTO public.native_workouts (name, difficulty, image_url) VALUES
  ('3 Day Split + Full Body Fridays', 'Beginner', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800'),
  ('Upper Body Strength', 'Intermediate', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800'),
  ('Full Body Circuit', 'Advanced', 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800')
ON CONFLICT (name) DO NOTHING;

-- Then add exercises to workouts via junction table
-- Workout 1: 3 Day Split + Full Body Fridays
INSERT INTO public.native_workout_exercises (native_workout_id, exercise_id, sets, reps, rest_time, exercise_order)
SELECT 
  nw.id,
  e.id,
  CASE e.name
    WHEN 'Bench Press' THEN 4
    WHEN 'Incline Dumbbell Press' THEN 3
    WHEN 'Barbell Rows' THEN 4
    WHEN 'Pull Up' THEN 3
    WHEN 'Shoulder Press' THEN 3
    WHEN 'Bicep Curl' THEN 3
    ELSE 3
  END,
  CASE e.name
    WHEN 'Bench Press' THEN '12,10,8,6'
    WHEN 'Incline Dumbbell Press' THEN '10,8,6'
    WHEN 'Barbell Rows' THEN '12,10,8,8'
    WHEN 'Pull Up' THEN '10,8,6'
    WHEN 'Shoulder Press' THEN '12,10,8'
    WHEN 'Bicep Curl' THEN '12,10,8'
    ELSE '10'
  END,
  CASE e.name
    WHEN 'Bench Press' THEN 90
    WHEN 'Incline Dumbbell Press' THEN 60
    WHEN 'Barbell Rows' THEN 90
    WHEN 'Pull Up' THEN 60
    WHEN 'Shoulder Press' THEN 60
    WHEN 'Bicep Curl' THEN 45
    ELSE 60
  END,
  CASE e.name
    WHEN 'Bench Press' THEN 0
    WHEN 'Incline Dumbbell Press' THEN 1
    WHEN 'Barbell Rows' THEN 2
    WHEN 'Pull Up' THEN 3
    WHEN 'Shoulder Press' THEN 4
    WHEN 'Bicep Curl' THEN 5
    ELSE 99
  END
FROM public.native_workouts nw
CROSS JOIN public.exercises e
WHERE nw.name = '3 Day Split + Full Body Fridays'
  AND e.name IN ('Bench Press', 'Incline Dumbbell Press', 'Barbell Rows', 'Pull Up', 'Shoulder Press', 'Bicep Curl')
ON CONFLICT (native_workout_id, exercise_id) DO NOTHING;

-- Workout 2: Upper Body Strength
INSERT INTO public.native_workout_exercises (native_workout_id, exercise_id, sets, reps, rest_time, exercise_order)
SELECT 
  nw.id,
  e.id,
  CASE e.name
    WHEN 'Bench Press' THEN 5
    WHEN 'Barbell Rows' THEN 5
    WHEN 'Shoulder Press' THEN 4
    WHEN 'Pull Up' THEN 4
    ELSE 3
  END,
  CASE e.name
    WHEN 'Bench Press' THEN '8,6,5,5,4'
    WHEN 'Barbell Rows' THEN '8,6,5,5,4'
    WHEN 'Shoulder Press' THEN '8,6,6,5'
    WHEN 'Pull Up' THEN '10,8,6,6'
    ELSE '10'
  END,
  CASE e.name
    WHEN 'Bench Press' THEN 120
    WHEN 'Barbell Rows' THEN 120
    WHEN 'Shoulder Press' THEN 90
    WHEN 'Pull Up' THEN 90
    ELSE 60
  END,
  CASE e.name
    WHEN 'Bench Press' THEN 0
    WHEN 'Barbell Rows' THEN 1
    WHEN 'Shoulder Press' THEN 2
    WHEN 'Pull Up' THEN 3
    ELSE 99
  END
FROM public.native_workouts nw
CROSS JOIN public.exercises e
WHERE nw.name = 'Upper Body Strength'
  AND e.name IN ('Bench Press', 'Barbell Rows', 'Shoulder Press', 'Pull Up')
ON CONFLICT (native_workout_id, exercise_id) DO NOTHING;

-- Workout 3: Full Body Circuit
INSERT INTO public.native_workout_exercises (native_workout_id, exercise_id, sets, reps, rest_time, exercise_order)
SELECT 
  nw.id,
  e.id,
  CASE e.name
    WHEN 'Squat' THEN 5
    WHEN 'Deadlift' THEN 3
    WHEN 'Bench Press' THEN 5
    WHEN 'Barbell Rows' THEN 5
    WHEN 'Shoulder Press' THEN 4
    ELSE 3
  END,
  CASE e.name
    WHEN 'Squat' THEN '5,5,5,5,5'
    WHEN 'Deadlift' THEN '5,5,5'
    WHEN 'Bench Press' THEN '5,5,5,5,5'
    WHEN 'Barbell Rows' THEN '5,5,5,5,5'
    WHEN 'Shoulder Press' THEN '6,6,5,5'
    ELSE '10'
  END,
  CASE e.name
    WHEN 'Squat' THEN 180
    WHEN 'Deadlift' THEN 240
    WHEN 'Bench Press' THEN 180
    WHEN 'Barbell Rows' THEN 180
    WHEN 'Shoulder Press' THEN 120
    ELSE 60
  END,
  CASE e.name
    WHEN 'Squat' THEN 0
    WHEN 'Deadlift' THEN 1
    WHEN 'Bench Press' THEN 2
    WHEN 'Barbell Rows' THEN 3
    WHEN 'Shoulder Press' THEN 4
    ELSE 99
  END
FROM public.native_workouts nw
CROSS JOIN public.exercises e
WHERE nw.name = 'Full Body Circuit'
  AND e.name IN ('Squat', 'Deadlift', 'Bench Press', 'Barbell Rows', 'Shoulder Press')
ON CONFLICT (native_workout_id, exercise_id) DO NOTHING;












