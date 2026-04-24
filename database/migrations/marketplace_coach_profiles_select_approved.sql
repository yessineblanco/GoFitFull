-- Marketplace: allow discovery of all approved coaches (not only PRO-verified).
-- The mobile app and admin list coaches with status = 'approved'. The previous
-- policy required is_verified = true as well, which hid approved coaches from
-- clients and left "Elite Trainers" / marketplace empty or incomplete.
-- PRO / verified badge remains a product signal on is_verified; RLS should not
-- filter the whole roster.

DROP POLICY IF EXISTS "Anyone can view verified coach profiles" ON public.coach_profiles;

CREATE POLICY "Public can view approved coach profiles for marketplace"
  ON public.coach_profiles
  FOR SELECT
  USING (status = 'approved');
