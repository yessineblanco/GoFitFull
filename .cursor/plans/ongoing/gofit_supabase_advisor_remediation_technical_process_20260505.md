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

No SQL fixes were applied in this audit turn. The output is a safe remediation plan so we can reduce warnings without accidentally breaking auth, coach/admin workflows, marketplace RPCs, or profile images.
