-- Create workouts and exercises tables for GoFit app
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
  exercises JSONB NOT NULL, -- Array of exercise configurations: [{id, name, sets, reps, restTime}]
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
-- 3. CUSTOM WORKOUTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.custom_workouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced', 'Custom')),
  image_url TEXT,
  exercises JSONB NOT NULL, -- Array of exercise configurations: [{id, name, sets, reps, restTime}]
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
-- 4. WORKOUT SESSIONS TABLE (History)
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
-- 5. TRIGGERS FOR UPDATED_AT
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
-- 6. GRANT PERMISSIONS
-- ============================================
GRANT SELECT ON public.exercises TO authenticated;
GRANT SELECT ON public.native_workouts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_workouts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;

-- ============================================
-- 7. SEED INITIAL EXERCISES (Optional)
-- ============================================
-- Insert some common exercises to get started with default sets/reps
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
  ('Lateral Raise', 'Shoulders', ARRAY['Shoulders'], 'Beginner', 3, 15, 45)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 8. SEED INITIAL NATIVE WORKOUTS (Optional)
-- ============================================
-- Note: Exercise IDs in the JSONB should reference exercises by UUID or name
-- For now, we'll use exercise names and the app will look them up
INSERT INTO public.native_workouts (name, difficulty, image_url, exercises) VALUES
  (
    '3 Day Split + Full Body Fridays',
    'Beginner',
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800',
    '[
      {"id": "bench-press", "name": "Bench Press", "sets": "4", "reps": "12,10,8,6", "restTime": "90"},
      {"id": "incline-dumbbell-press", "name": "Incline Dumbbell Press", "sets": "3", "reps": "10,8,6", "restTime": "60"},
      {"id": "barbell-rows", "name": "Barbell Rows", "sets": "4", "reps": "12,10,8,8", "restTime": "90"},
      {"id": "pull-ups", "name": "Pull Up", "sets": "3", "reps": "10,8,6", "restTime": "60"},
      {"id": "shoulder-press", "name": "Shoulder Press", "sets": "3", "reps": "12,10,8", "restTime": "60"},
      {"id": "bicep-curl", "name": "Bicep Curl", "sets": "3", "reps": "12,10,8", "restTime": "45"}
    ]'::jsonb
  ),
  (
    'Upper Body Strength',
    'Intermediate',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
    '[
      {"id": "bench-press", "name": "Bench Press", "sets": "5", "reps": "8,6,5,5,4", "restTime": "120"},
      {"id": "barbell-rows", "name": "Barbell Rows", "sets": "5", "reps": "8,6,5,5,4", "restTime": "120"},
      {"id": "shoulder-press", "name": "Shoulder Press", "sets": "4", "reps": "8,6,6,5", "restTime": "90"},
      {"id": "pull-ups", "name": "Pull Up", "sets": "4", "reps": "10,8,6,6", "restTime": "90"}
    ]'::jsonb
  ),
  (
    'Full Body Circuit',
    'Advanced',
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800',
    '[
      {"id": "squat", "name": "Squat", "sets": "5", "reps": "5,5,5,5,5", "restTime": "180"},
      {"id": "deadlift", "name": "Deadlift", "sets": "3", "reps": "5,5,5", "restTime": "240"},
      {"id": "bench-press", "name": "Bench Press", "sets": "5", "reps": "5,5,5,5,5", "restTime": "180"},
      {"id": "barbell-rows", "name": "Barbell Rows", "sets": "5", "reps": "5,5,5,5,5", "restTime": "180"},
      {"id": "shoulder-press", "name": "Shoulder Press", "sets": "4", "reps": "6,6,5,5", "restTime": "120"}
    ]'::jsonb
  )
ON CONFLICT (name) DO NOTHING;

