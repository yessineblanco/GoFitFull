-- Fix Supabase advisor: function_search_path_mutable
-- This preserves function bodies and grants while pinning name resolution.

ALTER FUNCTION public.auto_create_coach_wallet() SET search_path = public, extensions;
ALTER FUNCTION public.calculate_workout_session_stats(uuid) SET search_path = public, extensions;
ALTER FUNCTION public.decrement_pack_session() SET search_path = public, extensions;
ALTER FUNCTION public.delete_user_account() SET search_path = public, auth, extensions;
ALTER FUNCTION public.get_admin_user_ids() SET search_path = public, extensions;
ALTER FUNCTION public.get_client_progress(uuid, uuid) SET search_path = public, extensions;
ALTER FUNCTION public.get_coach_dashboard_stats(uuid) SET search_path = public, extensions;
ALTER FUNCTION public.handle_updated_at() SET search_path = public, extensions;
ALTER FUNCTION public.is_admin() SET search_path = public, extensions;
ALTER FUNCTION public.populate_exercise_snapshots() SET search_path = public, extensions;
ALTER FUNCTION public.refund_pack_session_on_cancel() SET search_path = public, extensions;
ALTER FUNCTION public.sync_user_type_on_profile_create() SET search_path = public, auth, extensions;
ALTER FUNCTION public.trigger_calculate_stats() SET search_path = public, extensions;
ALTER FUNCTION public.trigger_calculate_workout_stats() SET search_path = public, extensions;
ALTER FUNCTION public.update_coach_rating() SET search_path = public, extensions;
ALTER FUNCTION public.update_coach_total_sessions() SET search_path = public, extensions;
ALTER FUNCTION public.update_conversation_last_message() SET search_path = public, extensions;
