-- Migration: Add native_workouts table
-- Run this if you already have the workouts tables created
-- Date: 2024

-- ============================================
-- 1. CREATE NATIVE WORKOUTS TABLE
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
-- 2. UPDATE WORKOUT_SESSIONS TABLE
-- ============================================
-- Add new columns for better foreign key relationships
ALTER TABLE public.workout_sessions 
  ADD COLUMN IF NOT EXISTS native_workout_id UUID REFERENCES public.native_workouts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS custom_workout_id UUID REFERENCES public.custom_workouts(id) ON DELETE SET NULL;

-- Create indexes for new foreign keys
CREATE INDEX IF NOT EXISTS idx_workout_sessions_native_workout_id ON public.workout_sessions(native_workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_custom_workout_id ON public.workout_sessions(custom_workout_id);

-- Migrate existing data: Set native_workout_id and custom_workout_id based on workout_type
-- For native workouts, we'll need to match by workout_name (since we don't have IDs yet)
-- For custom workouts, workout_id already exists
UPDATE public.workout_sessions
SET custom_workout_id = workout_id
WHERE workout_type = 'custom' AND workout_id IS NOT NULL;

-- Note: For native workouts, we'll set native_workout_id after seeding the native_workouts table
-- This will be done in the seed section below

-- ============================================
-- 3. CREATE TRIGGER FOR UPDATED_AT
-- ============================================
CREATE TRIGGER set_native_workouts_updated_at
  BEFORE UPDATE ON public.native_workouts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 4. GRANT PERMISSIONS
-- ============================================
GRANT SELECT ON public.native_workouts TO authenticated;

-- ============================================
-- 5. SEED INITIAL NATIVE WORKOUTS
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

-- ============================================
-- 6. UPDATE EXISTING WORKOUT SESSIONS
-- ============================================
-- Link existing native workout sessions to the new native_workouts table
-- This matches by workout_name
UPDATE public.workout_sessions ws
SET native_workout_id = nw.id
FROM public.native_workouts nw
WHERE ws.workout_type = 'native'
  AND ws.workout_name = nw.name
  AND ws.native_workout_id IS NULL;












