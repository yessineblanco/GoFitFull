# GoFit Supabase Advisor Remediation Technical Process

## What Was Checked

Supabase MCP was used against project `rdozeaacwaisgkpxjycn` to pull:

- Security advisors.
- Performance advisors.
- Function signatures and `SECURITY DEFINER` status.
- Function execute grants for `anon` and `authenticated`.
- Foreign key columns involved in missing-index warnings.

Supabase docs were checked for RLS performance guidance, especially wrapping `auth.uid()` as `(select auth.uid())` and keeping security-definer functions out of exposed API schemas when possible.

## Why The Dashboard Count Looks High

The warning count is inflated because one design issue can produce many dashboard rows.

Example:

- One `SECURITY DEFINER` function can create one warning for `anon` execute and another for `authenticated` execute.
- One table can produce multiple `multiple_permissive_policies` warnings across roles and actions.

So the right remediation approach is root-cause based, not warning-row based.

## Low-Risk Fixes

### 1. Function Search Path

Several functions have no fixed `search_path`.

Fix:

```sql
ALTER FUNCTION public.function_name(arguments) SET search_path = public, extensions;
```

Why low-risk:

- Does not change function bodies.
- Does not change grants.
- Reduces search-path hijacking risk.

### 2. Missing Foreign Key Indexes

Performance advisors reported unindexed FK columns such as:

- `ai_session_notes.client_id`
- `bookings.pack_purchase_id`
- `bookings.rescheduled_from`
- `coach_client_notes.client_id`
- `meal_logs.food_item_id`
- `purchased_packs.pack_id`
- `saved_meal_items.food_item_id`
- `transactions.booking_id`
- `workout_plans.session_id`
- `workout_plans.workout_id`

Fix:

```sql
CREATE INDEX IF NOT EXISTS idx_table_column ON public.table_name(column_name);
```

Why low-risk:

- Adds indexes only.
- Does not change data or access behavior.

## Fixes That Need Care

### Security Definer Execute Grants

Many `SECURITY DEFINER` functions are executable by `anon` and/or `authenticated`.

Do not blindly revoke all.

Some functions may intentionally be callable:

- Public marketplace/directory RPCs.
- Account deletion RPC.
- Coach dashboard RPCs used by authenticated coaches.

Likely safer rule:

- Revoke `anon` from internal/admin/coach-specific functions.
- Keep or narrowly grant `authenticated` only where the app actually calls the RPC.
- Move internal helper functions to a private schema later if needed.

### `workout_session_stats` RLS Enabled With No Policy

This may be fine if the table is trigger/internal only.

Before adding a policy, confirm whether mobile/admin screens read it directly.

### Broad Admin Insert Policies

`admin_audit_logs` and `admin_notifications` have broad insert checks.

Fix only after confirming whether inserts come from:

- service role only,
- admin dashboard clients,
- edge functions.

### Public Profile Picture Bucket Listing

The bucket can remain public for image URLs, but object listing should usually be narrower.

Before changing, verify avatar display and upload paths.

### Multiple Permissive Policies

`workouts` and `workout_exercises` have overlapping older policies.

This should be fixed by consolidating policies, but only after snapshotting current policy definitions and testing native/custom workout flows.

## Recommended Execution Plan

1. Apply function `search_path` migration.
2. Re-run security advisors.
3. Apply FK index migration.
4. Re-run performance advisors.
5. Audit app/admin usage of RPC functions.
6. Revoke grants or move functions only when usage is known.
7. Audit storage policy and workout RLS separately.

## Current Status

On June 10, 2026, three verified migrations were applied:

1. `restrict_trigger_function_execute_v1`
   - Revoked direct `anon` and `authenticated` execution from seven trigger-only
     functions while preserving their trigger bindings.
2. `fix_advisor_rls_and_storage_policies_v1`
   - Added owner-read access to workout session statistics.
   - Removed client insert access from server-generated admin records.
   - Replaced broad avatar listing and cross-user write/delete policies with
     owner-only object policies that still support upload upserts.
3. `restrict_authenticated_rpc_execute_v1`
   - Removed anonymous execution from account, admin, coach, progress, and pack
     RPCs already documented and used as authenticated-only operations.

Security findings fell from 38 to 13. The remaining function warnings require
body-level review: public marketplace directory reads are intentional, while
authenticated coach/admin/pack RPCs must bind supplied identifiers to
`auth.uid()` before their `SECURITY DEFINER` status can be considered safe.
Leaked-password protection remains a Supabase Auth dashboard setting.

Two follow-up migrations completed that body-level review:

4. `harden_privileged_rpc_callers_v1`
   - Restricts pack deduction to the authenticated pack owner.
   - Restricts coach client and dashboard data to the user who owns the coach
     profile.
   - Restricts admin-ID enumeration to an existing admin.
5. `harden_client_progress_rpc_v1`
   - Requires the caller to own the coach profile and preserves the existing
     coach-client relationship check before returning workout history.

The remaining advisor rows include intentionally public marketplace reads and
authenticated functions that now perform explicit caller checks. The advisor
does not inspect function bodies, so the security warning count remains 13.

On June 11, 2026, direct SQL verification was responsive again and five more
verified migrations were applied:

6. `consolidate_workout_rls_policies_v1`
   - Snapshotted the live policies and proved the old and consolidated boolean
     access rules equivalent with a truth-table query that returned zero
     mismatches.
   - Replaced overlapping `workouts` and `workout_exercises` policies with one
     policy per action while preserving native/global and owner access.
7. `optimize_workout_sessions_rls_initplan_v1`
   - Preserved the existing owner-only policies and wrapped direct `auth.uid()`
     calls in scalar subqueries.
8. `optimize_health_data_rls_initplan_v1`
   - Applied the same behavior-preserving optimization to health data policies.
9. `optimize_meal_logs_rls_initplan_v1`
   - Applied the same optimization while preserving the existing update policy,
     including its original implicit update check behavior.
10. `optimize_progress_photos_rls_initplan_v1`
    - Applied the same optimization to authenticated owner-only photo policies.

11. `optimize_user_profiles_rls_initplan_v1`
    - Preserved public-role owner select, insert, and update checks while
      leaving the separate admin-read policy unchanged.
12. `optimize_coach_profiles_rls_initplan_v1`
    - Preserved coach owner policies while leaving marketplace and admin
      policies unchanged.
13. `optimize_body_measurements_rls_initplan_v1`
    - Preserved owner select, insert, and delete access without adding an update
      policy.
14. `optimize_nutrition_goals_rls_initplan_v1`
    - Preserved owner access and the update policy's implicit check behavior.
15. `optimize_simple_owner_policies_rls_initplan_v1`
    - Preserved notification, push-token, and workout-plan owner policies,
      including their existing implicit or explicit checks.
16. `optimize_coach_certifications_rls_initplan_v1`
    - Preserved coach certification ownership while leaving admin management
      and public verified-certification reads unchanged.
17. `optimize_coach_reviews_rls_initplan_v1`
    - Preserved client review ownership, including the update check that blocks
      ownership reassignment, while leaving public review reads unchanged.
18. `optimize_coach_availability_rls_initplan_v1`
    - Preserved coach-owned availability management, its implicit `FOR ALL`
      check, and public availability reads.
19. `optimize_purchased_packs_rls_initplan_v1`
    - Preserved client-owned insertion and client/coach visibility without
      changing policy roles or commands.
20. `optimize_bookings_rls_initplan_v1`
    - Preserved client booking creation and visibility, coach visibility,
      participant updates, and the existing implicit update check.
21. `optimize_custom_programs_rls_initplan_v1`
    - Preserved coach CRUD access, client assignment visibility, template
      filtering, and the existing implicit update check.
22. `optimize_wallets_rls_initplan_v1`
    - Preserved coach wallet visibility while leaving admin visibility
      unchanged.
23. `optimize_transactions_rls_initplan_v1`
    - Preserved coach transaction visibility through the existing wallet and
      coach-profile join while leaving admin visibility unchanged.
24. `optimize_coach_client_notes_rls_initplan_v1`
    - Preserved the coach-owned `FOR ALL` policy and its implicit check.
25. `optimize_ai_session_notes_rls_initplan_v1`
    - Preserved the four coach-only note policies and the update policy's
      implicit check.
26. `optimize_check_in_responses_rls_initplan_v1`
    - Preserved client select/insert/update checks and coach visibility.
27. `optimize_check_in_schedules_rls_initplan_v1`
    - Preserved coach CRUD access, client visibility, and the coach update
      policy's implicit check.
28. `optimize_exercises_rls_initplan_v1`
    - Preserved the existing all-command policy and its implicit check behavior;
      only `auth.role()` evaluation was moved into a statement-level subquery.
29. `optimize_admin_audit_logs_rls_initplan_v1`
    - Preserved the deployed permissive, public-role, SELECT-only policy and
      its admin membership check while evaluating `auth.uid()` once per
      statement.
30. `optimize_admin_notifications_rls_initplan_v1`
    - Preserved the deployed permissive public-role SELECT, UPDATE, and DELETE
      policies, recipient ownership, and the update policy's implicit check.
31. `optimize_session_packs_rls_initplan_v1`
    - Preserved active-pack public visibility, both coach policies, their
      deployed overlap, public roles, SELECT/ALL commands, and the ALL policy's
      implicit check.
32. `optimize_conversations_rls_initplan_v1`
    - Preserved client/coach participant access, public roles, SELECT/INSERT/
      UPDATE commands, the insert check, and the update policy's implicit check.
33. `optimize_messages_rls_initplan_v1`
    - Preserved conversation membership, sender validation, recipient-only read
      updates, public roles, SELECT/INSERT/UPDATE commands, and the update
      policy's implicit check.
34. `optimize_admin_settings_rls_initplan_v1`
    - Preserved admin-only SELECT, INSERT, and UPDATE policies, public roles,
      the insert check, and the update policy's implicit check.
35. `consolidate_wallet_select_policies_v1`
    - Replaced the separate admin and owning-coach wallet SELECT policies with
      one public permissive policy containing the same predicates joined by
      `OR`.
36. `consolidate_transaction_select_policies_v1`
    - Replaced the separate admin and owning-coach transaction SELECT policies
      with one public permissive policy containing the same predicates and
      existing wallet join, joined by `OR`.

For migrations 25 through 27, the MCP SQL inspection endpoint timed out. The
original applied migration files were checked for exact definitions and later
redefinitions, then matched against the live advisor policy names. The
post-migration advisor runs removed exactly the targeted warnings.

For migration 28, the same endpoint timed out. The canonical exercises schema
definition was checked together with all later SQL for policy redefinitions,
then matched to the exact live advisor policy name. The post-migration advisor
run removed exactly that one targeted warning.

For migration 29, live policy metadata and predicates were captured before and
after the change. Roles, command, permissiveness, and null `WITH CHECK` remained
unchanged, and the advisor removed exactly the targeted audit-log warning.

For migration 30, the same before-and-after live catalog comparison confirmed
that all three notification policies retained their roles, commands,
permissiveness, and null `WITH CHECK`. The advisor removed exactly the three
targeted warnings.

For migration 31, live policy metadata and predicates were captured before and
after the change. The advisor removed exactly the two session-pack initPlan
warnings while `multiple_permissive_policies` remained unchanged by design.

For migration 32, the before-and-after live catalog comparison confirmed that
the INSERT policy retained only `WITH CHECK`, the UPDATE policy retained its
implicit check, and all participant conditions remained equivalent. The
advisor removed exactly the three targeted warnings.

For migration 33, the same live catalog comparison confirmed that message
visibility, sender validation, and recipient-only updates retained their exact
policy forms. The advisor removed exactly the three targeted warnings.

For migration 34, live policy metadata confirmed that SELECT and UPDATE retain
`USING`, INSERT retains only `WITH CHECK`, and the update policy keeps its
implicit check. The final three initPlan warnings were removed.

For migration 35, live policy metadata confirmed one public permissive SELECT
policy with the exact prior `admin OR owning coach` access rule. The five wallet
overlap warnings were removed and security advisor findings were unchanged.

For migration 36, live policy metadata confirmed one public permissive SELECT
policy with the exact prior `admin OR owning coach` transaction rule and wallet
join. The five transaction overlap warnings were removed and security advisor
findings were unchanged.

For migrations 1 through 24, live policy definitions and advisors were checked
after each change. Migrations 25 through 28 used the documented fallbacks above.
Mobile unit tests and TypeScript passed. Performance findings fell from 296 to
152:

- `auth_rls_initplan`: 98 to 0, complete.
- `multiple_permissive_policies`: 131 to 85.
- `unused_index`: unchanged at 67; no index was removed without usage evidence.

The next database work is careful policy consolidation and evidence-based
unused-index review. Leaked-password protection remains a Supabase Auth
dashboard setting rather than a SQL migration.

On June 12, 2026, the remaining important security items were checked again:

- All 40 public tables still had RLS enabled.
- The authenticated `SECURITY DEFINER` RPCs retained explicit caller checks;
  `get_admin_user_ids()` delegates its caller check to `is_admin()`.
- The two anonymous marketplace RPCs return approved coach directory fields by
  design and remain required by the mobile marketplace flow.
- Enabling leaked-password protection was attempted in the Supabase dashboard,
  but Supabase rejected the save because the project is on the Free plan and
  the feature requires Pro. No billing or project configuration changed.

The live security advisor therefore remains at 13 warnings: 12 reviewed
function-execute warnings and one Pro-only leaked-password warning.
