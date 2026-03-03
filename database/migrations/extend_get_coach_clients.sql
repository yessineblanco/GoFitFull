-- Extend get_coach_clients to include last_session_date and has_active_pack

CREATE OR REPLACE FUNCTION public.get_coach_clients(p_coach_id UUID)
RETURNS TABLE(
  client_id UUID,
  display_name TEXT,
  last_session_at TIMESTAMP WITH TIME ZONE,
  has_active_pack BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH client_ids AS (
    SELECT DISTINCT b.client_id AS cid
    FROM bookings b WHERE b.coach_id = p_coach_id
    UNION
    SELECT DISTINCT pp.client_id AS cid
    FROM purchased_packs pp WHERE pp.coach_id = p_coach_id
  ),
  last_sessions AS (
    SELECT b.client_id, MAX(b.scheduled_at) AS last_at
    FROM bookings b
    WHERE b.coach_id = p_coach_id AND b.status = 'completed'
    GROUP BY b.client_id
  ),
  active_packs AS (
    SELECT DISTINCT pp.client_id
    FROM purchased_packs pp
    WHERE pp.coach_id = p_coach_id
      AND pp.status = 'active'
      AND pp.sessions_remaining > 0
      AND (pp.expires_at IS NULL OR pp.expires_at > NOW())
  )
  SELECT
    ci.cid AS client_id,
    COALESCE(
      u.raw_user_meta_data->>'display_name',
      split_part(u.email, '@', 1),
      ci.cid::text
    )::TEXT AS display_name,
    ls.last_at AS last_session_at,
    (ap.client_id IS NOT NULL) AS has_active_pack
  FROM client_ids ci
  JOIN auth.users u ON u.id = ci.cid
  LEFT JOIN last_sessions ls ON ls.client_id = ci.cid
  LEFT JOIN active_packs ap ON ap.client_id = ci.cid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_coach_clients(UUID) TO authenticated;
