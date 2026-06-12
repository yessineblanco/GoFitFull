-- Preserve coach owner access while caching auth.uid() once per statement.
-- Marketplace and admin policies are intentionally unchanged.

DROP POLICY IF EXISTS "Coaches can view own profile" ON public.coach_profiles;
CREATE POLICY "Coaches can view own profile"
  ON public.coach_profiles
  FOR SELECT
  TO public
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Coaches can insert own profile" ON public.coach_profiles;
CREATE POLICY "Coaches can insert own profile"
  ON public.coach_profiles
  FOR INSERT
  TO public
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Coaches can update own profile" ON public.coach_profiles;
CREATE POLICY "Coaches can update own profile"
  ON public.coach_profiles
  FOR UPDATE
  TO public
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
