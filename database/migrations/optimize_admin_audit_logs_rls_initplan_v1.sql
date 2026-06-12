-- Evaluate the caller identity once per statement while preserving the
-- deployed public-role, permissive SELECT policy and admin membership check.
ALTER POLICY "Admins can view all audit logs"
  ON public.admin_audit_logs
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.is_admin = true
    )
  );
