-- Fix Supabase advisor: unindexed_foreign_keys
-- Adds covering indexes for FK columns reported by the advisor.

CREATE INDEX IF NOT EXISTS idx_ai_session_notes_client_id
  ON public.ai_session_notes (client_id);

CREATE INDEX IF NOT EXISTS idx_bookings_pack_purchase_id
  ON public.bookings (pack_purchase_id);

CREATE INDEX IF NOT EXISTS idx_bookings_rescheduled_from
  ON public.bookings (rescheduled_from);

CREATE INDEX IF NOT EXISTS idx_coach_client_notes_client_id
  ON public.coach_client_notes (client_id);

CREATE INDEX IF NOT EXISTS idx_meal_logs_food_item_id
  ON public.meal_logs (food_item_id);

CREATE INDEX IF NOT EXISTS idx_purchased_packs_pack_id
  ON public.purchased_packs (pack_id);

CREATE INDEX IF NOT EXISTS idx_saved_meal_items_food_item_id
  ON public.saved_meal_items (food_item_id);

CREATE INDEX IF NOT EXISTS idx_transactions_booking_id
  ON public.transactions (booking_id);

CREATE INDEX IF NOT EXISTS idx_workout_plans_session_id
  ON public.workout_plans (session_id);

CREATE INDEX IF NOT EXISTS idx_workout_plans_workout_id
  ON public.workout_plans (workout_id);
