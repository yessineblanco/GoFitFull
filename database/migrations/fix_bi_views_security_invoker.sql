-- Supabase database linter 0010_security_definer_view:
-- PG15+ views default to owner privileges (security_invoker = false). Set
-- security_invoker so the querying role's RLS and grants apply.

ALTER VIEW public.bi_finance_daily SET (security_invoker = true);
ALTER VIEW public.bi_coach_ops_daily SET (security_invoker = true);
ALTER VIEW public.bi_client_health_daily SET (security_invoker = true);
ALTER VIEW public.bi_user_lifecycle_daily SET (security_invoker = true);
