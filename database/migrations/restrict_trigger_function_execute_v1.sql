-- Trigger functions execute through their owning triggers and should not be
-- callable through the public Data API.

REVOKE ALL ON FUNCTION public.auto_create_coach_wallet() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.decrement_pack_session() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_pack_session_on_cancel() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_user_type_on_profile_create() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_coach_rating() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_coach_total_sessions() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_conversation_last_message() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.auto_create_coach_wallet() IS
  'Internal trigger function; direct client execution is intentionally revoked.';
COMMENT ON FUNCTION public.decrement_pack_session() IS
  'Internal trigger function; direct client execution is intentionally revoked.';
COMMENT ON FUNCTION public.refund_pack_session_on_cancel() IS
  'Internal trigger function; direct client execution is intentionally revoked.';
COMMENT ON FUNCTION public.sync_user_type_on_profile_create() IS
  'Internal trigger function; direct client execution is intentionally revoked.';
COMMENT ON FUNCTION public.update_coach_rating() IS
  'Internal trigger function; direct client execution is intentionally revoked.';
COMMENT ON FUNCTION public.update_coach_total_sessions() IS
  'Internal trigger function; direct client execution is intentionally revoked.';
COMMENT ON FUNCTION public.update_conversation_last_message() IS
  'Internal trigger function; direct client execution is intentionally revoked.';
