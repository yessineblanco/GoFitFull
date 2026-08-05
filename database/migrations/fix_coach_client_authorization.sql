-- Tighten coach/client authorization for security-definer RPCs and check-ins.

CREATE OR REPLACE FUNCTION public.get_coach_clients(p_coach_id UUID)
RETURNS TABLE(
  client_id UUID,
  display_name TEXT,
  profile_picture_url TEXT,
  last_session_at TIMESTAMP WITH TIME ZONE,
  has_active_pack BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.coach_profiles cp
    WHERE cp.id = p_coach_id
      AND cp.user_id = auth.uid()
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH client_ids AS (
    SELECT DISTINCT b.client_id AS cid
    FROM public.bookings b WHERE b.coach_id = p_coach_id
    UNION
    SELECT DISTINCT pp.client_id AS cid
    FROM public.purchased_packs pp WHERE pp.coach_id = p_coach_id
  ),
  last_sessions AS (
    SELECT b.client_id, MAX(b.scheduled_at) AS last_at
    FROM public.bookings b
    WHERE b.coach_id = p_coach_id AND b.status = 'completed'
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
    ci.cid AS client_id,
    COALESCE(
      u.raw_user_meta_data->>'display_name',
      u.raw_user_meta_data->>'full_name',
      split_part(u.email, '@', 1),
      ci.cid::text
    )::TEXT AS display_name,
    COALESCE(
      NULLIF(trim(up.profile_picture_url), ''),
      (u.raw_user_meta_data->>'avatar_url')::TEXT
    ) AS profile_picture_url,
    ls.last_at AS last_session_at,
    (ap.client_id IS NOT NULL) AS has_active_pack
  FROM client_ids ci
  JOIN auth.users u ON u.id = ci.cid
  LEFT JOIN public.user_profiles up ON up.id = ci.cid
  LEFT JOIN last_sessions ls ON ls.client_id = ci.cid
  LEFT JOIN active_packs ap ON ap.client_id = ci.cid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_coach_clients(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_client_progress(p_client_id UUID, p_coach_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  v_has_relationship BOOLEAN;
  v_total_workouts INTEGER;
  v_current_streak INTEGER;
  v_recent_sessions JSONB;
  v_weekly_consistency NUMERIC;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.coach_profiles cp
    WHERE cp.id = p_coach_id
      AND cp.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to view this coach profile';
  END IF;

  SELECT (
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.client_id = p_client_id AND b.coach_id = p_coach_id)
    OR EXISTS (SELECT 1 FROM public.purchased_packs pp WHERE pp.client_id = p_client_id AND pp.coach_id = p_coach_id)
  ) INTO v_has_relationship;

  IF NOT v_has_relationship THEN
    RAISE EXCEPTION 'No active coaching relationship with this client';
  END IF;

  SELECT COUNT(*) INTO v_total_workouts
  FROM public.workout_sessions
  WHERE user_id = p_client_id AND completed_at IS NOT NULL;

  WITH consecutive_days AS (
    SELECT DISTINCT DATE(started_at) as workout_date
    FROM public.workout_sessions
    WHERE user_id = p_client_id AND completed_at IS NOT NULL
    ORDER BY workout_date DESC
  ),
  streaks AS (
    SELECT
      workout_date,
      workout_date - (ROW_NUMBER() OVER (ORDER BY workout_date DESC))::INTEGER * INTERVAL '1 day' as grp
    FROM consecutive_days
  )
  SELECT COUNT(*) INTO v_current_streak
  FROM streaks
  WHERE grp = (SELECT grp FROM streaks LIMIT 1);

  SELECT COALESCE(jsonb_agg(row_to_json(s)), '[]'::jsonb)
  INTO v_recent_sessions
  FROM (
    SELECT ws.id, COALESCE(w.name, 'Workout') AS workout_name, ws.started_at, ws.completed_at, ws.duration_minutes, ws.exercises_completed
    FROM public.workout_sessions ws
    LEFT JOIN public.workouts w ON ws.workout_id = w.id
    WHERE ws.user_id = p_client_id AND ws.completed_at IS NOT NULL
    ORDER BY ws.started_at DESC
    LIMIT 20
  ) s;

  SELECT COALESCE(
    ROUND(
      (SELECT COUNT(DISTINCT DATE(completed_at AT TIME ZONE 'UTC'))::NUMERIC / 4
       FROM public.workout_sessions
       WHERE user_id = p_client_id
         AND completed_at IS NOT NULL
         AND completed_at >= NOW() - INTERVAL '28 days'),
      1
    ),
    0
  ) INTO v_weekly_consistency;

  result := jsonb_build_object(
    'total_workouts', v_total_workouts,
    'streak', v_current_streak,
    'sessions', v_recent_sessions,
    'weekly_consistency', v_weekly_consistency
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_progress(UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS "Coaches can select own check_in_schedules" ON public.check_in_schedules;
DROP POLICY IF EXISTS "Coaches can insert own check_in_schedules" ON public.check_in_schedules;
DROP POLICY IF EXISTS "Coaches can update own check_in_schedules" ON public.check_in_schedules;
DROP POLICY IF EXISTS "Clients can select own check_in_schedules" ON public.check_in_schedules;
DROP POLICY IF EXISTS "Clients can insert own check_in_responses" ON public.check_in_responses;
DROP POLICY IF EXISTS "Clients can update own check_in_responses" ON public.check_in_responses;
DROP POLICY IF EXISTS "Coaches can select client check_in_responses" ON public.check_in_responses;

CREATE POLICY "Coaches can select own check_in_schedules"
  ON public.check_in_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles cp
      WHERE cp.id = check_in_schedules.coach_id
        AND cp.user_id = auth.uid()
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.coach_id = check_in_schedules.coach_id
          AND b.client_id = check_in_schedules.client_id
      )
      OR EXISTS (
        SELECT 1 FROM public.purchased_packs pp
        WHERE pp.coach_id = check_in_schedules.coach_id
          AND pp.client_id = check_in_schedules.client_id
      )
    )
  );

CREATE POLICY "Coaches can insert own check_in_schedules"
  ON public.check_in_schedules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_profiles cp
      WHERE cp.id = check_in_schedules.coach_id
        AND cp.user_id = auth.uid()
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.coach_id = check_in_schedules.coach_id
          AND b.client_id = check_in_schedules.client_id
      )
      OR EXISTS (
        SELECT 1 FROM public.purchased_packs pp
        WHERE pp.coach_id = check_in_schedules.coach_id
          AND pp.client_id = check_in_schedules.client_id
      )
    )
  );

CREATE POLICY "Coaches can update own check_in_schedules"
  ON public.check_in_schedules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles cp
      WHERE cp.id = check_in_schedules.coach_id
        AND cp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_profiles cp
      WHERE cp.id = check_in_schedules.coach_id
        AND cp.user_id = auth.uid()
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.coach_id = check_in_schedules.coach_id
          AND b.client_id = check_in_schedules.client_id
      )
      OR EXISTS (
        SELECT 1 FROM public.purchased_packs pp
        WHERE pp.coach_id = check_in_schedules.coach_id
          AND pp.client_id = check_in_schedules.client_id
      )
    )
  );

CREATE POLICY "Clients can select own check_in_schedules"
  ON public.check_in_schedules FOR SELECT
  USING (
    auth.uid() = client_id
    AND (
      EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.coach_id = check_in_schedules.coach_id
          AND b.client_id = check_in_schedules.client_id
      )
      OR EXISTS (
        SELECT 1 FROM public.purchased_packs pp
        WHERE pp.coach_id = check_in_schedules.coach_id
          AND pp.client_id = check_in_schedules.client_id
      )
    )
  );

CREATE POLICY "Clients can insert own check_in_responses"
  ON public.check_in_responses FOR INSERT
  WITH CHECK (
    auth.uid() = client_id
    AND EXISTS (
      SELECT 1 FROM public.check_in_schedules cis
      WHERE cis.coach_id = check_in_responses.coach_id
        AND cis.client_id = check_in_responses.client_id
        AND cis.enabled
    )
  );

CREATE POLICY "Clients can update own check_in_responses"
  ON public.check_in_responses FOR UPDATE
  USING (auth.uid() = client_id)
  WITH CHECK (
    auth.uid() = client_id
    AND EXISTS (
      SELECT 1 FROM public.check_in_schedules cis
      WHERE cis.coach_id = check_in_responses.coach_id
        AND cis.client_id = check_in_responses.client_id
        AND cis.enabled
    )
  );

CREATE POLICY "Coaches can select client check_in_responses"
  ON public.check_in_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles cp
      WHERE cp.id = check_in_responses.coach_id
        AND cp.user_id = auth.uid()
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.coach_id = check_in_responses.coach_id
          AND b.client_id = check_in_responses.client_id
      )
      OR EXISTS (
        SELECT 1 FROM public.purchased_packs pp
        WHERE pp.coach_id = check_in_responses.coach_id
          AND pp.client_id = check_in_responses.client_id
      )
    )
  );
