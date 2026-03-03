-- Add display_name to user_profiles if it doesn't exist
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Backfill display_name from auth.users metadata
UPDATE public.user_profiles up
SET display_name = u.raw_user_meta_data->>'display_name'
FROM auth.users u
WHERE up.id = u.id
  AND up.display_name IS NULL
  AND u.raw_user_meta_data->>'display_name' IS NOT NULL;

-- Allow authenticated users to read basic info (name, picture) from any profile
-- This is needed for coaches to see client names and vice versa
CREATE POLICY "Authenticated users can read basic profile info"
  ON public.user_profiles
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Drop the old restrictive SELECT policy if it exists
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
