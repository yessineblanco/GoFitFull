-- On-device MoveNet pipeline: explicit cm columns + confidence; extend source enum
ALTER TABLE public.body_measurements
  ADD COLUMN IF NOT EXISTS chest_cm numeric,
  ADD COLUMN IF NOT EXISTS waist_cm numeric,
  ADD COLUMN IF NOT EXISTS hip_cm numeric,
  ADD COLUMN IF NOT EXISTS shoulder_cm numeric,
  ADD COLUMN IF NOT EXISTS measurement_confidence numeric;

ALTER TABLE public.body_measurements
  DROP CONSTRAINT IF EXISTS body_measurements_source_check;

ALTER TABLE public.body_measurements
  ADD CONSTRAINT body_measurements_source_check
  CHECK (source IN ('ai', 'manual', 'ai_ondevice'));

COMMENT ON COLUMN public.body_measurements.chest_cm IS 'On-device estimate (cm)';
COMMENT ON COLUMN public.body_measurements.waist_cm IS 'On-device estimate (cm)';
COMMENT ON COLUMN public.body_measurements.hip_cm IS 'On-device estimate (cm)';
COMMENT ON COLUMN public.body_measurements.shoulder_cm IS 'On-device estimate (cm)';
COMMENT ON COLUMN public.body_measurements.measurement_confidence IS 'Mean keypoint confidence 0–1 for on-device run';

NOTIFY pgrst, 'reload schema';
