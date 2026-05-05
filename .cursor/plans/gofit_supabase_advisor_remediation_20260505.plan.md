---
name: GoFit Supabase Advisor Remediation
overview: Group Supabase advisor warnings into safe remediation steps without breaking app/admin behavior. Follow `.cursor/rules/karpathy-behavioral-guidelines.mdc`: inspect first, avoid blind permission changes, and verify after each migration.
todos:
  - id: pull-advisors
    content: "Pull Supabase security and performance advisor warnings"
    status: completed
  - id: group-root-causes
    content: "Group warnings by root cause instead of dashboard row count"
    status: completed
  - id: identify-safe-fixes
    content: "Identify fixes that are low-risk versus fixes that need behavior confirmation"
    status: completed
  - id: write-remediation-doc
    content: "Write remediation process and proposed migration order"
    status: completed
  - id: apply-safe-fixes
    content: "Apply safe fixes in separate verified migrations"
    status: in_progress
isProject: false
---

# GoFit Supabase Advisor Remediation

## Assumptions

- The dashboard warning count is inflated by repeated warnings for the same root causes across roles/actions.
- We should not revoke function access or rewrite RLS policies until we confirm which RPCs and admin workflows are actively used.
- Safe fixes are changes that preserve behavior: adding indexes and setting function `search_path`.

## Root-Cause Groups

### Security

1. `function_search_path_mutable`
   - Several functions in `public` do not set a fixed `search_path`.
   - Safe solution: `ALTER FUNCTION ... SET search_path = public, extensions`.
   - This does not change function bodies or permissions.

2. `anon_security_definer_function_executable` and `authenticated_security_definer_function_executable`
   - Several `SECURITY DEFINER` functions are executable by `anon` and/or `authenticated`.
   - Solution needs intent check per RPC:
     - Public marketplace/read RPCs may intentionally remain callable.
     - Internal/admin/trigger/helper functions should usually revoke `anon`, and sometimes `authenticated`.
   - Risk: revoking blindly can break mobile app, admin panel, coach dashboard, bookings, account deletion, or triggers.

3. `rls_enabled_no_policy`
   - `workout_session_stats` has RLS enabled but no policy.
   - Solution needs usage check:
     - If trigger/internal only, leave blocked from client or create service-only/admin-only pattern.
     - If clients need to read it, add owner/team-based select policy.

4. `rls_policy_always_true`
   - `admin_audit_logs` and `admin_notifications` have `INSERT WITH CHECK true` service-role policies.
   - Solution needs role intent:
     - If only service role inserts, replace broad policy with role-scoped policy.
     - If admin UI inserts directly, add admin-only policy.

5. `public_bucket_allows_listing`
   - `profile-pictures` public bucket has a broad list policy.
   - Safer solution: allow object reads but avoid broad object listing.
   - Needs check against current profile picture display/upload flow.

6. `auth_leaked_password_protection`
   - Supabase Auth leaked password protection is disabled.
   - Dashboard/config setting, not a SQL migration.

### Performance

1. `unindexed_foreign_keys`
   - Missing indexes on several FK columns.
   - Safe solution: add `CREATE INDEX IF NOT EXISTS` indexes.

2. `auth_rls_initplan`
   - Some older RLS policies call `auth.uid()` directly instead of `(SELECT auth.uid())`.
   - Mostly safe but requires recreating policies exactly, so do table-by-table.

3. `multiple_permissive_policies`
   - Older `workouts` and `workout_exercises` policies overlap.
   - Needs careful consolidation because it can change access semantics.

## Recommended Order

1. Apply low-risk migration: function `search_path`.
2. Apply low-risk migration: missing FK indexes.
3. Verify advisors again.
4. Audit RPC/function usage before changing `SECURITY DEFINER` execute grants.
5. Fix `profile-pictures` storage listing after confirming profile image behavior.
6. Consolidate RLS policies only after snapshotting current policy definitions.

## Living Log

### Done

- [x] Pulled Supabase security advisor warnings.
- [x] Pulled Supabase performance advisor warnings.
- [x] Queried function signatures, `SECURITY DEFINER`, and execute grants.
- [x] Queried FK columns involved in performance warnings.
- [x] Reviewed Supabase docs for RLS performance and `auth.uid()` wrapping guidance.
- [x] Separated low-risk fixes from behavior-changing fixes.

### Planned

- [x] Apply function `search_path` migration.
- [x] Apply missing FK index migration.
- [ ] Re-run security and performance advisors.
- [ ] Audit and fix exposed `SECURITY DEFINER` functions one group at a time.
- [ ] Audit and fix profile picture bucket listing.
- [ ] Audit and consolidate overlapping workout policies.
