-- Linear lengths (cm): shoulder→wrist, hip→ankle — complements circumferences on body_measurements
ALTER TABLE public.body_measurements
  ADD COLUMN IF NOT EXISTS left_arm_length numeric,
  ADD COLUMN IF NOT EXISTS right_arm_length numeric,
  ADD COLUMN IF NOT EXISTS left_leg_length numeric,
  ADD COLUMN IF NOT EXISTS right_leg_length numeric;

NOTIFY pgrst, 'reload schema';
