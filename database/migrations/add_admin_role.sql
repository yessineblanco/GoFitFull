-- Migration: Add Admin Role Support
-- Description: Adds is_admin column to user_profiles table and creates helper functions
-- Date: 2026-01-18

-- ============================================
-- 1. ADD is_admin COLUMN TO user_profiles
-- ============================================

-- Add is_admin column (default: false)
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false NOT NULL;

-- Create index for faster admin queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin 
ON public.user_profiles(is_admin) 
WHERE is_admin = true;

-- ============================================
-- 2. CREATE FUNCTION TO CHECK ADMIN STATUS
-- ============================================

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
    AND is_admin = true
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================
-- 3. CREATE FUNCTION TO GET ADMIN USER IDS
-- ============================================

-- Function to get all admin user IDs (for admin panel queries)
CREATE OR REPLACE FUNCTION public.get_admin_user_ids()
RETURNS TABLE (user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT up.id as user_id
  FROM public.user_profiles up
  WHERE up.is_admin = true;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_admin_user_ids() TO authenticated;

-- ============================================
-- 4. UPDATE RLS POLICIES FOR ADMIN ACCESS
-- ============================================

-- Allow admins to view all user profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.user_profiles
  FOR SELECT
  USING (
    auth.uid() = id OR public.is_admin()
  );

-- Allow admins to update any user profile (including admin status)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.user_profiles;
CREATE POLICY "Admins can update any profile"
  ON public.user_profiles
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================
-- 5. CREATE AUDIT LOG TABLE (OPTIONAL)
-- ============================================

-- Table to log admin actions for security/compliance
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'login', etc.
  resource_type TEXT NOT NULL, -- 'user', 'exercise', 'workout', etc.
  resource_id UUID, -- ID of the affected resource
  details JSONB, -- Additional context
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for audit log
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_user 
ON public.admin_audit_log(admin_user_id);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_resource 
ON public.admin_audit_log(resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at 
ON public.admin_audit_log(created_at DESC);

-- Enable RLS on audit log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs"
  ON public.admin_audit_log
  FOR SELECT
  USING (public.is_admin());

-- Only admins can insert audit logs
CREATE POLICY "Only admins can insert audit logs"
  ON public.admin_audit_log
  FOR INSERT
  WITH CHECK (public.is_admin());

-- ============================================
-- 6. GRANT PERMISSIONS
-- ============================================

GRANT SELECT, UPDATE ON public.user_profiles TO authenticated;
GRANT SELECT, INSERT ON public.admin_audit_log TO authenticated;

-- ============================================
-- 7. COMMENTS
-- ============================================

COMMENT ON COLUMN public.user_profiles.is_admin IS 'Flag indicating if user has admin privileges';
COMMENT ON FUNCTION public.is_admin() IS 'Returns true if current user is an admin';
COMMENT ON FUNCTION public.get_admin_user_ids() IS 'Returns list of all admin user IDs';
COMMENT ON TABLE public.admin_audit_log IS 'Audit log for admin actions';

-- ============================================
-- 8. VERIFICATION QUERY
-- ============================================

-- Run this to verify the migration was successful:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'user_profiles' AND column_name = 'is_admin';

-- ============================================
-- 9. MAKE FIRST USER AN ADMIN (MANUAL STEP)
-- ============================================

-- After running this migration, manually set your user as admin:
-- UPDATE public.user_profiles 
-- SET is_admin = true 
-- WHERE id = 'YOUR_USER_ID_HERE';
-- 
-- Or use email:
-- UPDATE public.user_profiles 
-- SET is_admin = true 
-- WHERE id = (
--   SELECT id FROM auth.users WHERE email = 'your-admin-email@example.com'
-- );
