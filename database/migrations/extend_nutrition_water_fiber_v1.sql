-- Phase 3B: Nutrition Upgrade - water and fiber targets

ALTER TABLE public.food_items
  ADD COLUMN IF NOT EXISTS fiber_g NUMERIC NOT NULL DEFAULT 0 CHECK (fiber_g >= 0 AND fiber_g <= 100);

ALTER TABLE public.nutrition_goals
  ADD COLUMN IF NOT EXISTS fiber_g NUMERIC NOT NULL DEFAULT 25 CHECK (fiber_g >= 0 AND fiber_g <= 150),
  ADD COLUMN IF NOT EXISTS water_ml_goal INTEGER NOT NULL DEFAULT 2500 CHECK (water_ml_goal >= 0 AND water_ml_goal <= 10000);

CREATE TABLE IF NOT EXISTS public.water_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_ml INTEGER NOT NULL CHECK (amount_ml > 0 AND amount_ml <= 5000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_water_logs_user_date
  ON public.water_logs (user_id, logged_date DESC);

ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "water_logs_select_own" ON public.water_logs;
CREATE POLICY "water_logs_select_own"
  ON public.water_logs
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "water_logs_insert_own" ON public.water_logs;
CREATE POLICY "water_logs_insert_own"
  ON public.water_logs
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "water_logs_delete_own" ON public.water_logs;
CREATE POLICY "water_logs_delete_own"
  ON public.water_logs
  FOR DELETE
  USING ((SELECT auth.uid()) = user_id);
