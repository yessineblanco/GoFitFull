-- Automated Check-ins v1 — schedules + responses (no notification automation)

CREATE TABLE public.check_in_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly')),
  check_in_days INTEGER[] NOT NULL DEFAULT ARRAY[1]::INTEGER[],
  check_in_time TIME NOT NULL DEFAULT TIME '09:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (coach_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_check_in_schedules_client_id ON public.check_in_schedules (client_id);
CREATE INDEX IF NOT EXISTS idx_check_in_schedules_enabled ON public.check_in_schedules (enabled);

CREATE TABLE public.check_in_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood INTEGER NOT NULL CHECK (mood BETWEEN 1 AND 5),
  energy INTEGER NOT NULL CHECK (energy BETWEEN 1 AND 5),
  soreness INTEGER NOT NULL CHECK (soreness BETWEEN 1 AND 5),
  sleep_quality INTEGER NOT NULL CHECK (sleep_quality BETWEEN 1 AND 5),
  notes TEXT,
  responded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, coach_id, response_date)
);

CREATE INDEX IF NOT EXISTS idx_check_in_responses_coach_client_responded_at
  ON public.check_in_responses (coach_id, client_id, responded_at DESC);
CREATE INDEX IF NOT EXISTS idx_check_in_responses_client_response_date
  ON public.check_in_responses (client_id, response_date DESC);
CREATE INDEX IF NOT EXISTS idx_check_in_responses_coach_responded_at
  ON public.check_in_responses (coach_id, responded_at DESC);

ALTER TABLE public.check_in_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_in_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can select own check_in_schedules"
  ON public.check_in_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles
      WHERE coach_profiles.id = check_in_schedules.coach_id
        AND coach_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can insert own check_in_schedules"
  ON public.check_in_schedules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_profiles
      WHERE coach_profiles.id = check_in_schedules.coach_id
        AND coach_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can update own check_in_schedules"
  ON public.check_in_schedules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles
      WHERE coach_profiles.id = check_in_schedules.coach_id
        AND coach_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can delete own check_in_schedules"
  ON public.check_in_schedules FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles
      WHERE coach_profiles.id = check_in_schedules.coach_id
        AND coach_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can select own check_in_schedules"
  ON public.check_in_schedules FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Clients can select own check_in_responses"
  ON public.check_in_responses FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Clients can insert own check_in_responses"
  ON public.check_in_responses FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update own check_in_responses"
  ON public.check_in_responses FOR UPDATE
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Coaches can select client check_in_responses"
  ON public.check_in_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles
      WHERE coach_profiles.id = check_in_responses.coach_id
        AND coach_profiles.user_id = auth.uid()
    )
  );

CREATE TRIGGER set_check_in_schedules_updated_at
  BEFORE UPDATE ON public.check_in_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_check_in_responses_updated_at
  BEFORE UPDATE ON public.check_in_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.check_in_schedules TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.check_in_responses TO authenticated;
