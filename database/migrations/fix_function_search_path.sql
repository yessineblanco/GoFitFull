-- Fix Supabase linter warning: function_search_path_mutable
-- Adding SET search_path = public to all functions that lack it.
-- This prevents search_path manipulation attacks.

ALTER FUNCTION public.update_coach_rating() SET search_path = public;
ALTER FUNCTION public.update_conversation_last_message() SET search_path = public;
ALTER FUNCTION public.auto_create_coach_wallet() SET search_path = public;
ALTER FUNCTION public.update_coach_total_sessions() SET search_path = public;
ALTER FUNCTION public.decrement_pack_session() SET search_path = public;
ALTER FUNCTION public.refund_pack_session_on_cancel() SET search_path = public;
ALTER FUNCTION public.get_coach_dashboard_stats(UUID) SET search_path = public;
ALTER FUNCTION public.get_client_progress(UUID, UUID) SET search_path = public;
ALTER FUNCTION public.sync_user_type_on_profile_create() SET search_path = public;
ALTER FUNCTION public.is_admin() SET search_path = public;
ALTER FUNCTION public.get_admin_user_ids() SET search_path = public;
ALTER FUNCTION public.calculate_workout_session_stats(UUID) SET search_path = public;
ALTER FUNCTION public.populate_exercise_snapshots() SET search_path = public;
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.get_conversations_enriched(TEXT) SET search_path = public;
ALTER FUNCTION public.delete_user_account() SET search_path = public;
