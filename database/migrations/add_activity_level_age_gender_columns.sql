-- Add activity_level, age, and gender columns to user_profiles table
-- Run this SQL script in your Supabase SQL Editor

-- Add activity_level column
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS activity_level TEXT 
CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'));

-- Add age column
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS age INTEGER 
CHECK (age IS NULL OR (age >= 1 AND age <= 150));

-- Add gender column
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS gender TEXT 
CHECK (gender IS NULL OR gender IN ('male', 'female', 'other', 'prefer_not_to_say'));

-- Add comment for documentation
COMMENT ON COLUMN public.user_profiles.activity_level IS 'User activity level: sedentary, lightly_active, moderately_active, very_active, or extra_active';
COMMENT ON COLUMN public.user_profiles.age IS 'User age in years (1-150)';
COMMENT ON COLUMN public.user_profiles.gender IS 'User gender: male, female, other, or prefer_not_to_say';

