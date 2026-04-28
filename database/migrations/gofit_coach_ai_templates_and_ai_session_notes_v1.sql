-- GoFit Coach AI & Productivity v1: custom_program templates + ai_session_notes
-- Applied via Supabase MCP to project rdozeaacwaisgkpxjycn

ALTER TABLE public.custom_programs
  ALTER COLUMN client_id DROP NOT NULL;

ALTER TABLE public.custom_programs
  ADD COLUMN IF NOT EXISTS is_template BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_custom_programs_coach_template_created_at
  ON public.custom_programs (coach_id, is_template, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_custom_programs_client_id
  ON public.custom_programs (client_id);

DROP POLICY IF EXISTS "Clients can view programs assigned to them" ON public.custom_programs;
DROP POLICY IF EXISTS "Coaches can view programs they created" ON public.custom_programs;
DROP POLICY IF EXISTS "Coaches can create programs" ON public.custom_programs;
DROP POLICY IF EXISTS "Coaches can update own programs" ON public.custom_programs;
DROP POLICY IF EXISTS "Coaches can delete own programs" ON public.custom_programs;

CREATE POLICY "Clients can view assigned programs only"
  ON public.custom_programs
  FOR SELECT
  USING (
    auth.uid() = client_id
    AND NOT (is_template AND client_id IS NULL)
  );

CREATE POLICY "Coaches can view own programs and templates"
  ON public.custom_programs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles
      WHERE coach_profiles.id = custom_programs.coach_id
        AND coach_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can insert programs and templates"
  ON public.custom_programs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_profiles
      WHERE coach_profiles.id = custom_programs.coach_id
        AND coach_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can update own programs and templates"
  ON public.custom_programs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles
      WHERE coach_profiles.id = custom_programs.coach_id
        AND coach_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can delete own programs and templates"
  ON public.custom_programs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles
      WHERE coach_profiles.id = custom_programs.coach_id
        AND coach_profiles.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.ai_session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  generated_by TEXT DEFAULT 'groq',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

ALTER TABLE public.ai_session_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can select own ai session notes"
  ON public.ai_session_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles
      WHERE coach_profiles.id = ai_session_notes.coach_id
        AND coach_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can insert own ai session notes"
  ON public.ai_session_notes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_profiles
      WHERE coach_profiles.id = ai_session_notes.coach_id
        AND coach_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can update own ai session notes"
  ON public.ai_session_notes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles
      WHERE coach_profiles.id = ai_session_notes.coach_id
        AND coach_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can delete own ai session notes"
  ON public.ai_session_notes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles
      WHERE coach_profiles.id = ai_session_notes.coach_id
        AND coach_profiles.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_ai_session_notes_coach_client_created_at
  ON public.ai_session_notes (coach_id, client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_session_notes_expires_at
  ON public.ai_session_notes (expires_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_session_notes TO authenticated;
