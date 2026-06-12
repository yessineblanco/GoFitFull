-- Bind privileged RPC parameters to the authenticated caller. Function
-- signatures stay unchanged so existing mobile clients continue to work.

CREATE OR REPLACE FUNCTION public.deduct_session(p_pack_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  UPDATE public.purchased_packs
  SET sessions_remaining = sessions_remaining - 1,
      status = CASE
        WHEN sessions_remaining - 1 <= 0 THEN 'exhausted'
        ELSE status
      END
  WHERE id = p_pack_id
    AND client_id = v_user_id
    AND sessions_remaining > 0
    AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pack not found, not owned by caller, exhausted, or inactive'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_user_ids()
RETURNS TABLE(user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT up.id
  FROM public.user_profiles up
  WHERE up.is_admin = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_coach_clients(p_coach_id uuid)
RETURNS TABLE(
  client_id uuid,
  display_name text,
  profile_picture_url text,
  last_session_at timestamptz,
  has_active_pack boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.coach_profiles cp
    WHERE cp.id = p_coach_id
      AND cp.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Coach access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH client_ids AS (
    SELECT DISTINCT b.client_id AS cid
    FROM public.bookings b
    WHERE b.coach_id = p_coach_id
    UNION
    SELECT DISTINCT pp.client_id AS cid
    FROM public.purchased_packs pp
    WHERE pp.coach_id = p_coach_id
  ),
  last_sessions AS (
    SELECT b.client_id, MAX(b.scheduled_at) AS last_at
    FROM public.bookings b
    WHERE b.coach_id = p_coach_id
      AND b.status = 'completed'
    GROUP BY b.client_id
  ),
  active_packs AS (
    SELECT DISTINCT pp.client_id
    FROM public.purchased_packs pp
    WHERE pp.coach_id = p_coach_id
      AND pp.status = 'active'
      AND pp.sessions_remaining > 0
      AND (pp.expires_at IS NULL OR pp.expires_at > NOW())
  )
  SELECT
    ci.cid,
    COALESCE(
      u.raw_user_meta_data->>'display_name',
      u.raw_user_meta_data->>'full_name',
      split_part(u.email, '@', 1),
      ci.cid::text
    )::text,
    COALESCE(
      NULLIF(trim(up.profile_picture_url), ''),
      (u.raw_user_meta_data->>'avatar_url')::text
    ),
    ls.last_at,
    (ap.client_id IS NOT NULL)
  FROM client_ids ci
  JOIN auth.users u ON u.id = ci.cid
  LEFT JOIN public.user_profiles up ON up.id = ci.cid
  LEFT JOIN last_sessions ls ON ls.client_id = ci.cid
  LEFT JOIN active_packs ap ON ap.client_id = ci.cid;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_coach_dashboard_stats(p_coach_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_total_earnings numeric;
  v_monthly_earnings numeric;
  v_prev_month_earnings numeric;
  v_total_sessions integer;
  v_upcoming_sessions integer;
  v_active_clients integer;
  v_new_clients_this_month integer;
  v_avg_rating numeric;
  v_total_reviews integer;
BEGIN
  IF v_user_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.coach_profiles cp
    WHERE cp.id = p_coach_id
      AND cp.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Coach access required' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(SUM(t.amount), 0)
  INTO v_total_earnings
  FROM public.transactions t
  JOIN public.wallets w ON w.id = t.wallet_id
  WHERE w.coach_id = p_coach_id
    AND t.type = 'earning';

  SELECT COALESCE(SUM(t.amount), 0)
  INTO v_monthly_earnings
  FROM public.transactions t
  JOIN public.wallets w ON w.id = t.wallet_id
  WHERE w.coach_id = p_coach_id
    AND t.type = 'earning'
    AND t.created_at >= DATE_TRUNC('month', NOW());

  SELECT COALESCE(SUM(t.amount), 0)
  INTO v_prev_month_earnings
  FROM public.transactions t
  JOIN public.wallets w ON w.id = t.wallet_id
  WHERE w.coach_id = p_coach_id
    AND t.type = 'earning'
    AND t.created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
    AND t.created_at < DATE_TRUNC('month', NOW());

  SELECT COUNT(*) INTO v_total_sessions
  FROM public.bookings
  WHERE coach_id = p_coach_id
    AND status = 'completed';

  SELECT COUNT(*) INTO v_upcoming_sessions
  FROM public.bookings
  WHERE coach_id = p_coach_id
    AND status IN ('pending', 'confirmed')
    AND scheduled_at > NOW();

  SELECT COUNT(DISTINCT client_id) INTO v_active_clients
  FROM public.purchased_packs
  WHERE coach_id = p_coach_id
    AND status = 'active';

  SELECT COUNT(DISTINCT client_id) INTO v_new_clients_this_month
  FROM public.purchased_packs
  WHERE coach_id = p_coach_id
    AND purchased_at >= DATE_TRUNC('month', NOW());

  SELECT average_rating, total_reviews
  INTO v_avg_rating, v_total_reviews
  FROM public.coach_profiles
  WHERE id = p_coach_id;

  RETURN jsonb_build_object(
    'total_earnings', v_total_earnings,
    'monthly_earnings', v_monthly_earnings,
    'prev_month_earnings', v_prev_month_earnings,
    'total_sessions', v_total_sessions,
    'upcoming_sessions', v_upcoming_sessions,
    'active_clients', v_active_clients,
    'new_clients_this_month', v_new_clients_this_month,
    'average_rating', v_avg_rating,
    'total_reviews', v_total_reviews
  );
END;
$$;

REVOKE ALL ON FUNCTION public.deduct_session(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_admin_user_ids() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_coach_clients(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_coach_dashboard_stats(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.deduct_session(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_user_ids() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_coach_clients(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_coach_dashboard_stats(uuid) TO authenticated, service_role;
