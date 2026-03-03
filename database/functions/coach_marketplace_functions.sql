-- ============================================
-- GoFit Phase 5: Coach Marketplace Functions
-- Run this SQL script in your Supabase SQL Editor
-- Prerequisite: run create_coach_marketplace_tables.sql first
-- ============================================


-- ============================================
-- 1. AUTO-UPDATE COACH RATING ON REVIEW CHANGES
-- ============================================
CREATE OR REPLACE FUNCTION public.update_coach_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_coach_id UUID;
  new_avg NUMERIC(3, 2);
  new_count INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_coach_id := OLD.coach_id;
  ELSE
    target_coach_id := NEW.coach_id;
  END IF;

  SELECT 
    COALESCE(AVG(rating)::NUMERIC(3, 2), 0),
    COUNT(*)::INTEGER
  INTO new_avg, new_count
  FROM public.coach_reviews
  WHERE coach_id = target_coach_id;

  UPDATE public.coach_profiles
  SET 
    average_rating = new_avg,
    total_reviews = new_count,
    updated_at = TIMEZONE('utc'::text, NOW())
  WHERE id = target_coach_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_coach_rating_insert
  AFTER INSERT ON public.coach_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_coach_rating();

CREATE TRIGGER trigger_update_coach_rating_update
  AFTER UPDATE ON public.coach_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_coach_rating();

CREATE TRIGGER trigger_update_coach_rating_delete
  AFTER DELETE ON public.coach_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_coach_rating();


-- ============================================
-- 2. AUTO-UPDATE CONVERSATION last_message_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_last_message();


-- ============================================
-- 3. AUTO-CREATE WALLET ON COACH PROFILE APPROVAL
-- ============================================
CREATE OR REPLACE FUNCTION public.auto_create_coach_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    INSERT INTO public.wallets (coach_id, currency)
    VALUES (NEW.id, 'EUR')
    ON CONFLICT (coach_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_create_coach_wallet
  AFTER UPDATE ON public.coach_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_coach_wallet();


-- ============================================
-- 4. INCREMENT COACH TOTAL SESSIONS ON BOOKING COMPLETION
-- ============================================
CREATE OR REPLACE FUNCTION public.update_coach_total_sessions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.coach_profiles
    SET 
      total_sessions = total_sessions + 1,
      updated_at = TIMEZONE('utc'::text, NOW())
    WHERE id = NEW.coach_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_coach_total_sessions
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_coach_total_sessions();


-- ============================================
-- 5. DECREMENT PACK SESSIONS ON BOOKING CREATION
-- ============================================
CREATE OR REPLACE FUNCTION public.decrement_pack_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.pack_purchase_id IS NOT NULL THEN
    UPDATE public.purchased_packs
    SET 
      sessions_remaining = sessions_remaining - 1,
      status = CASE 
        WHEN sessions_remaining - 1 <= 0 THEN 'exhausted'
        ELSE status
      END,
      updated_at = TIMEZONE('utc'::text, NOW())
    WHERE id = NEW.pack_purchase_id
    AND sessions_remaining > 0;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No sessions remaining in this pack';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_decrement_pack_session
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_pack_session();


-- ============================================
-- 6. REFUND PACK SESSION ON BOOKING CANCELLATION
-- ============================================
CREATE OR REPLACE FUNCTION public.refund_pack_session_on_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  policy TEXT;
  hours_before NUMERIC;
  should_refund BOOLEAN := false;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' AND NEW.pack_purchase_id IS NOT NULL THEN
    SELECT cp.cancellation_policy INTO policy
    FROM public.coach_profiles cp
    WHERE cp.id = NEW.coach_id;

    hours_before := EXTRACT(EPOCH FROM (OLD.scheduled_at - NOW())) / 3600;

    CASE policy
      WHEN 'flexible' THEN
        should_refund := hours_before >= 2;
      WHEN 'moderate' THEN
        should_refund := hours_before >= 24;
      WHEN 'strict' THEN
        should_refund := hours_before >= 48;
      ELSE
        should_refund := false;
    END CASE;

    IF should_refund THEN
      UPDATE public.purchased_packs
      SET 
        sessions_remaining = sessions_remaining + 1,
        status = 'active',
        updated_at = TIMEZONE('utc'::text, NOW())
      WHERE id = NEW.pack_purchase_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_refund_pack_session_on_cancel
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.refund_pack_session_on_cancel();


-- ============================================
-- 7. RPC: GET COACH DASHBOARD STATS
-- ============================================
CREATE OR REPLACE FUNCTION public.get_coach_dashboard_stats(p_coach_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  v_total_earnings NUMERIC;
  v_monthly_earnings NUMERIC;
  v_prev_month_earnings NUMERIC;
  v_total_sessions INTEGER;
  v_upcoming_sessions INTEGER;
  v_active_clients INTEGER;
  v_new_clients_this_month INTEGER;
  v_avg_rating NUMERIC;
  v_total_reviews INTEGER;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_total_earnings
  FROM public.transactions t
  JOIN public.wallets w ON w.id = t.wallet_id
  WHERE w.coach_id = p_coach_id AND t.type = 'earning';

  SELECT COALESCE(SUM(amount), 0) INTO v_monthly_earnings
  FROM public.transactions t
  JOIN public.wallets w ON w.id = t.wallet_id
  WHERE w.coach_id = p_coach_id 
    AND t.type = 'earning'
    AND t.created_at >= DATE_TRUNC('month', NOW());

  SELECT COALESCE(SUM(amount), 0) INTO v_prev_month_earnings
  FROM public.transactions t
  JOIN public.wallets w ON w.id = t.wallet_id
  WHERE w.coach_id = p_coach_id 
    AND t.type = 'earning'
    AND t.created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
    AND t.created_at < DATE_TRUNC('month', NOW());

  SELECT COUNT(*) INTO v_total_sessions
  FROM public.bookings
  WHERE coach_id = p_coach_id AND status = 'completed';

  SELECT COUNT(*) INTO v_upcoming_sessions
  FROM public.bookings
  WHERE coach_id = p_coach_id 
    AND status IN ('pending', 'confirmed')
    AND scheduled_at > NOW();

  SELECT COUNT(DISTINCT client_id) INTO v_active_clients
  FROM public.purchased_packs
  WHERE coach_id = p_coach_id AND status = 'active';

  SELECT COUNT(DISTINCT client_id) INTO v_new_clients_this_month
  FROM public.purchased_packs
  WHERE coach_id = p_coach_id 
    AND purchased_at >= DATE_TRUNC('month', NOW());

  SELECT average_rating, total_reviews 
  INTO v_avg_rating, v_total_reviews
  FROM public.coach_profiles
  WHERE id = p_coach_id;

  result := jsonb_build_object(
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

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_coach_dashboard_stats(UUID) TO authenticated;


-- ============================================
-- 8. RPC: GET CLIENT PROGRESS (for coaches)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_client_progress(p_client_id UUID, p_coach_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  v_has_relationship BOOLEAN;
  v_total_workouts INTEGER;
  v_current_streak INTEGER;
  v_recent_sessions JSONB;
  v_weekly_consistency NUMERIC;
BEGIN
  -- Match get_coach_clients: allow if client has ANY booking OR purchased_pack with this coach
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

  -- workout_name was removed from workout_sessions; get name from workouts via workout_id
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

  -- Weekly consistency: avg workout days per week over last 4 weeks
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

  -- Use keys expected by client: sessions, streak, weekly_consistency
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


-- ============================================
-- 9. SYNC user_type FROM AUTH METADATA ON PROFILE CREATION
-- ============================================
CREATE OR REPLACE FUNCTION public.sync_user_type_on_profile_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_type TEXT;
BEGIN
  SELECT COALESCE(raw_user_meta_data->>'user_type', 'client')
  INTO v_user_type
  FROM auth.users
  WHERE id = NEW.id;

  NEW.user_type := v_user_type;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_sync_user_type
  BEFORE INSERT ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_type_on_profile_create();

-- ============================================
-- DEDUCT SESSION FROM PURCHASED PACK
-- ============================================
CREATE OR REPLACE FUNCTION public.deduct_session(p_pack_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE purchased_packs
  SET sessions_remaining = sessions_remaining - 1,
      status = CASE WHEN sessions_remaining - 1 <= 0 THEN 'exhausted' ELSE status END
  WHERE id = p_pack_id
    AND sessions_remaining > 0
    AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pack not found, already exhausted, or inactive';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.deduct_session(UUID) TO authenticated;

-- ============================================
-- GET COACH'S CLIENTS WITH NAMES
-- Returns clients who have bookings or purchased packs from this coach
-- Uses SECURITY DEFINER to read auth.users metadata
-- ============================================
CREATE OR REPLACE FUNCTION public.get_coach_clients(p_coach_id UUID)
RETURNS TABLE(client_id UUID, display_name TEXT)
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
  )
  SELECT
    ci.cid AS client_id,
    COALESCE(
      u.raw_user_meta_data->>'display_name',
      split_part(u.email, '@', 1),
      ci.cid::text
    ) AS display_name
  FROM client_ids ci
  JOIN auth.users u ON u.id = ci.cid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_coach_clients(UUID) TO authenticated;
