-- Height (cm) stored per measurement row — reference used for AI scale or manual entry
ALTER TABLE public.body_measurements
  ADD COLUMN IF NOT EXISTS height_cm numeric;

COMMENT ON COLUMN public.body_measurements.height_cm IS 'Reference height in cm for this measurement (profile height at scan time or manual)';

NOTIFY pgrst, 'reload schema';
