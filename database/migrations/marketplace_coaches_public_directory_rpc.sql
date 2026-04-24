-- Marketplace: expose coach display_name + profile picture without widening user_profiles RLS.
-- Also ensures user_profiles.display_name exists (some projects predate that column); backfills from auth.users.
--
-- SECURITY DEFINER functions read user_profiles + auth.users server-side.

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS display_name TEXT;

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

UPDATE public.user_profiles up
SET display_name = COALESCE(
  NULLIF(trim(up.display_name), ''),
  au.raw_user_meta_data->>'display_name',
  au.raw_user_meta_data->>'full_name',
  split_part(au.email, '@', 1)
)
FROM auth.users au
WHERE au.id = up.id
  AND (up.display_name IS NULL OR trim(up.display_name) = '');

CREATE OR REPLACE FUNCTION public.list_approved_coaches_for_marketplace()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  bio text,
  specialties text[],
  hourly_rate numeric,
  profile_picture_url text,
  is_verified boolean,
  average_rating numeric,
  total_reviews integer,
  total_sessions integer,
  cancellation_policy text,
  created_at timestamptz,
  display_name text,
  user_profile_picture text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    cp.id,
    cp.user_id,
    cp.bio,
    cp.specialties,
    cp.hourly_rate,
    cp.profile_picture_url,
    cp.is_verified,
    cp.average_rating,
    cp.total_reviews,
    cp.total_sessions,
    cp.cancellation_policy::text,
    cp.created_at,
    COALESCE(
      NULLIF(trim(up.display_name), ''),
      au.raw_user_meta_data->>'display_name',
      au.raw_user_meta_data->>'full_name',
      split_part(au.email, '@', 1)
    ) AS display_name,
    COALESCE(
      NULLIF(trim(up.profile_picture_url), ''),
      au.raw_user_meta_data->>'avatar_url'
    ) AS user_profile_picture
  FROM public.coach_profiles cp
  LEFT JOIN public.user_profiles up ON up.id = cp.user_id
  LEFT JOIN auth.users au ON au.id = cp.user_id
  WHERE cp.status = 'approved';
$$;

CREATE OR REPLACE FUNCTION public.get_coach_profile_identity(p_user_id uuid)
RETURNS TABLE (
  display_name text,
  profile_picture_url text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    COALESCE(
      NULLIF(trim(up.display_name), ''),
      au.raw_user_meta_data->>'display_name',
      au.raw_user_meta_data->>'full_name',
      split_part(au.email, '@', 1)
    ) AS display_name,
    COALESCE(
      NULLIF(trim(up.profile_picture_url), ''),
      au.raw_user_meta_data->>'avatar_url'
    ) AS profile_picture_url
  FROM public.coach_profiles cp
  LEFT JOIN public.user_profiles up ON up.id = cp.user_id
  LEFT JOIN auth.users au ON au.id = cp.user_id
  WHERE cp.user_id = p_user_id
    AND cp.status = 'approved'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.list_approved_coaches_for_marketplace() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_coach_profile_identity(uuid) TO anon, authenticated;
