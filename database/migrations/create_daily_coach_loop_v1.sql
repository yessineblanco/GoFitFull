-- Daily Coach Loop v1: user habits, daily habit logs, and deterministic readiness snapshots

CREATE TABLE IF NOT EXISTS public.daily_habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('hydration', 'protein', 'steps', 'sleep', 'mobility', 'nutrition', 'progress_photo', 'weigh_in', 'custom')),
  title text NOT NULL,
  target_value numeric,
  unit text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, type, title)
);

COMMENT ON TABLE public.daily_habits IS 'Daily Coach Loop v1 habits owned by a client user.';

CREATE INDEX IF NOT EXISTS idx_daily_habits_user_active_sort
  ON public.daily_habits (user_id, is_active, sort_order);

ALTER TABLE public.daily_habits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_habits_select_own" ON public.daily_habits;
CREATE POLICY "daily_habits_select_own"
  ON public.daily_habits
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "daily_habits_insert_own" ON public.daily_habits;
CREATE POLICY "daily_habits_insert_own"
  ON public.daily_habits
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "daily_habits_update_own" ON public.daily_habits;
CREATE POLICY "daily_habits_update_own"
  ON public.daily_habits
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "daily_habits_delete_own" ON public.daily_habits;
CREATE POLICY "daily_habits_delete_own"
  ON public.daily_habits
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_habits TO authenticated;

DROP TRIGGER IF EXISTS set_daily_habits_updated_at ON public.daily_habits;
CREATE TRIGGER set_daily_habits_updated_at
  BEFORE UPDATE ON public.daily_habits
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.habit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES public.daily_habits (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  completed_date date NOT NULL DEFAULT CURRENT_DATE,
  value numeric,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (habit_id, completed_date)
);

COMMENT ON TABLE public.habit_logs IS 'Daily completion logs for user habits.';

CREATE INDEX IF NOT EXISTS idx_habit_logs_user_completed_date
  ON public.habit_logs (user_id, completed_date DESC);

ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "habit_logs_select_own" ON public.habit_logs;
CREATE POLICY "habit_logs_select_own"
  ON public.habit_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "habit_logs_insert_own" ON public.habit_logs;
CREATE POLICY "habit_logs_insert_own"
  ON public.habit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "habit_logs_update_own" ON public.habit_logs;
CREATE POLICY "habit_logs_update_own"
  ON public.habit_logs
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "habit_logs_delete_own" ON public.habit_logs;
CREATE POLICY "habit_logs_delete_own"
  ON public.habit_logs
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.habit_logs TO authenticated;

DROP TRIGGER IF EXISTS set_habit_logs_updated_at ON public.habit_logs;
CREATE TRIGGER set_habit_logs_updated_at
  BEFORE UPDATE ON public.habit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.daily_readiness (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  score integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  level text NOT NULL CHECK (level IN ('low', 'moderate', 'high')),
  recommendation text NOT NULL,
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'deterministic_v1',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date, source)
);

COMMENT ON TABLE public.daily_readiness IS 'Daily Coach Loop v1 deterministic readiness snapshots.';

CREATE INDEX IF NOT EXISTS idx_daily_readiness_user_date
  ON public.daily_readiness (user_id, date DESC);

ALTER TABLE public.daily_readiness ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_readiness_select_own" ON public.daily_readiness;
CREATE POLICY "daily_readiness_select_own"
  ON public.daily_readiness
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "daily_readiness_insert_own" ON public.daily_readiness;
CREATE POLICY "daily_readiness_insert_own"
  ON public.daily_readiness
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "daily_readiness_update_own" ON public.daily_readiness;
CREATE POLICY "daily_readiness_update_own"
  ON public.daily_readiness
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.daily_readiness TO authenticated;

DROP TRIGGER IF EXISTS set_daily_readiness_updated_at ON public.daily_readiness;
CREATE TRIGGER set_daily_readiness_updated_at
  BEFORE UPDATE ON public.daily_readiness
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
