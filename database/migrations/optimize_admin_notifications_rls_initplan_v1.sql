-- Evaluate caller identity once per statement while preserving the deployed
-- public-role policies, commands, recipient ownership, and implicit update check.
ALTER POLICY "Admins can view own notifications"
  ON public.admin_notifications
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.is_admin = true
        AND admin_notifications.admin_user_id = (SELECT auth.uid())
    )
  );

ALTER POLICY "Admins can update own notifications"
  ON public.admin_notifications
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.is_admin = true
        AND admin_notifications.admin_user_id = (SELECT auth.uid())
    )
  );

ALTER POLICY "Admins can delete own notifications"
  ON public.admin_notifications
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.is_admin = true
        AND admin_notifications.admin_user_id = (SELECT auth.uid())
    )
  );
