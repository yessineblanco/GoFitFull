-- Wearables v1.1: optional recovery metrics from Health Connect

ALTER TABLE public.health_data
  ADD COLUMN IF NOT EXISTS sleep_minutes integer CHECK (sleep_minutes IS NULL OR sleep_minutes >= 0),
  ADD COLUMN IF NOT EXISTS resting_heart_rate integer CHECK (resting_heart_rate IS NULL OR resting_heart_rate >= 0),
  ADD COLUMN IF NOT EXISTS hrv_rmssd_ms numeric CHECK (hrv_rmssd_ms IS NULL OR hrv_rmssd_ms >= 0);

COMMENT ON COLUMN public.health_data.sleep_minutes IS 'Optional total sleep duration synced from Health Connect, in minutes.';
COMMENT ON COLUMN public.health_data.resting_heart_rate IS 'Optional resting heart rate synced from Health Connect, in beats per minute.';
COMMENT ON COLUMN public.health_data.hrv_rmssd_ms IS 'Optional RMSSD heart rate variability synced from Health Connect, in milliseconds.';
