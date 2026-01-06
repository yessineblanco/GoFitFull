-- Migration: Add default sets/reps/rest_time columns to exercises table
-- Run this SQL script in your Supabase SQL Editor if you already have the exercises table

-- Add columns if they don't exist
ALTER TABLE public.exercises 
  ADD COLUMN IF NOT EXISTS default_sets INTEGER,
  ADD COLUMN IF NOT EXISTS default_reps INTEGER,
  ADD COLUMN IF NOT EXISTS default_rest_time INTEGER;

-- Update existing exercises with sensible defaults (optional - you can customize these)
-- These are just examples - adjust based on your needs
UPDATE public.exercises 
SET 
  default_sets = CASE 
    WHEN difficulty = 'Advanced' THEN 3
    WHEN difficulty = 'Intermediate' THEN 4
    ELSE 3
  END,
  default_reps = CASE 
    WHEN difficulty = 'Advanced' THEN 5
    WHEN difficulty = 'Intermediate' THEN 8
    ELSE 12
  END,
  default_rest_time = CASE 
    WHEN difficulty = 'Advanced' THEN 180
    WHEN difficulty = 'Intermediate' THEN 90
    ELSE 60
  END
WHERE default_sets IS NULL OR default_reps IS NULL OR default_rest_time IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.exercises.default_sets IS 'Default number of sets for this exercise (can be overridden in workouts)';
COMMENT ON COLUMN public.exercises.default_reps IS 'Default number of reps for this exercise (can be overridden in workouts)';
COMMENT ON COLUMN public.exercises.default_rest_time IS 'Default rest time in seconds for this exercise (can be overridden in workouts)';

