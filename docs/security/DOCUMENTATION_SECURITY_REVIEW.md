# Documentation Security Review

Review date: 2026-06-10

## Scope

The review covered active documentation, archived documentation, email templates, Cursor plans, and Git history using the repository security and secrets-audit guidance.

## Findings

- No live Supabase service-role key, provider secret, or production API key was found in the current documentation tree.
- JWT-shaped service-role examples were placeholders with an ellipsis. They were replaced with explicit `YOUR_SERVER_ONLY_SERVICE_ROLE_KEY` wording to prevent accidental client-side reuse.
- Two email templates contained a signed Supabase Storage URL for the GoFit logo. The current templates now use `https://YOUR_PUBLIC_ASSET_HOST/gofit-logo.png`.
- The signed logo URL remains in Git history because this cleanup preserves history. Its embedded expiry is `2026-12-06 15:07:36 UTC`.

## Required Follow-Up

If the referenced storage object should not remain accessible until expiry, invalidate that signed access through the Supabase storage and key-management procedure or replace the object. A Git history rewrite was intentionally not performed.

## Configuration Rule

`SUPABASE_SERVICE_ROLE_KEY` is server-only. It must never appear in mobile configuration, browser bundles, `EXPO_PUBLIC_*` variables, or `NEXT_PUBLIC_*` variables. Public examples must use explicit placeholders.
