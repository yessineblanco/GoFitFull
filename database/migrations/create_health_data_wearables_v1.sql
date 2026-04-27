-- GoFit Wearables v1: daily health metrics (steps, active calories) per user and source

CREATE TABLE IF NOT EXISTS public.health_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  date date NOT NULL,
  steps integer NOT NULL DEFAULT 0 CHECK (steps >= 0),
  active_calories integer NOT NULL DEFAULT 0 CHECK (active_calories >= 0),
  source text NOT NULL DEFAULT 'health_connect' CHECK (source IN ('health_connect', 'manual')),
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date, source)
);

COMMENT ON TABLE public.health_data IS 'Wearables v1: aggregated daily steps and active calories per sync source.';

CREATE INDEX IF NOT EXISTS idx_health_data_user_date
  ON public.health_data (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_health_data_user_source_date
  ON public.health_data (user_id, source, date DESC);

ALTER TABLE public.health_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "health_data_select_own" ON public.health_data;
CREATE POLICY "health_data_select_own"
  ON public.health_data
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "health_data_insert_own" ON public.health_data;
CREATE POLICY "health_data_insert_own"
  ON public.health_data
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "health_data_update_own" ON public.health_data;
CREATE POLICY "health_data_update_own"
  ON public.health_data
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "health_data_delete_own" ON public.health_data;
CREATE POLICY "health_data_delete_own"
  ON public.health_data
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_data TO authenticated;

DROP TRIGGER IF EXISTS set_health_data_updated_at ON public.health_data;
CREATE TRIGGER set_health_data_updated_at
  BEFORE UPDATE ON public.health_data
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
