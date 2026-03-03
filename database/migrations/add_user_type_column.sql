-- Add user_type column to user_profiles for coach/client role separation
-- Run this SQL script in your Supabase SQL Editor

-- Add user_type column (default 'client' for backward compatibility)
ALTER TABLE public.user_profiles 
  ADD COLUMN IF NOT EXISTS user_type TEXT NOT NULL DEFAULT 'client' 
  CHECK (user_type IN ('client', 'coach'));

-- Index for filtering by user_type
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_type 
  ON public.user_profiles(user_type);

-- Update RLS: admins can view all profiles (needed for coach verification)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.user_profiles
  FOR SELECT
  USING (public.is_admin());

COMMENT ON COLUMN public.user_profiles.user_type IS 'User role: client or coach. Set during signup via auth metadata.';
