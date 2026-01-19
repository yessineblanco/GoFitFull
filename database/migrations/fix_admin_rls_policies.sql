-- Fix RLS policies to allow service role key to bypass all restrictions
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. UPDATE user_profiles POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.user_profiles;

-- Create new policies that properly handle service role
-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  USING (
    auth.uid() = id
  );

-- Policy 2: Service role can view all profiles (bypasses RLS automatically)
-- Note: Service role key bypasses RLS by default, but we add this for clarity

-- Policy 3: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() = id
  );

-- Policy 4: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 5: Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.is_admin = true
    )
  );

-- Policy 6: Admins can update any profile
CREATE POLICY "Admins can update all profiles"
  ON public.user_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.is_admin = true
    )
  );

-- ============================================
-- 2. GRANT PERMISSIONS TO SERVICE ROLE
-- ============================================

-- Ensure service_role can bypass RLS
-- Note: This is usually set by default, but we explicitly grant it

-- Grant all permissions on user_profiles
GRANT ALL ON public.user_profiles TO service_role;

-- ============================================
-- 3. VERIFICATION
-- ============================================

-- Check that RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_profiles';
-- Should show rowsecurity = true

-- Check policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'user_profiles';
-- Should show all policies

-- ============================================
-- 4. ALTERNATIVE: Temporarily disable RLS for testing
-- ============================================

-- ONLY USE THIS FOR DEBUGGING!
-- Uncomment to disable RLS temporarily:
-- ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- To re-enable:
-- ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
