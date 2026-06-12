-- Evaluate caller identity once per statement while preserving the deployed
-- admin-only SELECT, INSERT, UPDATE, and implicit update-check behavior.
ALTER POLICY "Admins can view all settings"
  ON public.admin_settings
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.is_admin = true
    )
  );

ALTER POLICY "Admins can insert settings"
  ON public.admin_settings
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.is_admin = true
    )
  );

ALTER POLICY "Admins can update settings"
  ON public.admin_settings
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.is_admin = true
    )
  );
