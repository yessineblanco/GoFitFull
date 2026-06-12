-- These RPCs are used only by authenticated mobile/admin workflows. Remove
-- the default PUBLIC grant, then restore the intended authenticated and
-- service-role execution explicitly.

REVOKE ALL ON FUNCTION public.deduct_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deduct_session(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_admin_user_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_user_ids() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_client_progress(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_client_progress(uuid, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_coach_clients(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_coach_clients(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_coach_dashboard_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_coach_dashboard_stats(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
