-- Body measurements table for AI-powered (MediaPipe/HuggingFace) and manual tracking
CREATE TABLE IF NOT EXISTS body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  photo_url TEXT,
  shoulder_width NUMERIC,
  chest NUMERIC,
  waist NUMERIC,
  hips NUMERIC,
  left_arm NUMERIC,
  right_arm NUMERIC,
  left_thigh NUMERIC,
  right_thigh NUMERIC,
  landmarks JSONB,
  manual_overrides JSONB,
  source TEXT DEFAULT 'ai' CHECK (source IN ('ai', 'manual')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_body_measurements_user_date ON body_measurements(user_id, measurement_date DESC);

ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own measurements"
  ON body_measurements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own measurements"
  ON body_measurements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own measurements"
  ON body_measurements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own measurements"
  ON body_measurements FOR DELETE
  USING (auth.uid() = user_id);
