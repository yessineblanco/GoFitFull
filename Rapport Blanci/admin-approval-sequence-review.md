# Administrator coach-approval sequence correction

Approved scope applied on 21 October 2026: replace the two coach-approval sequence figures and revise their adjacent use-case table, captions, title, and explanation in `main.tex`. Application code, database state, and unrelated report sections were not modified.

## Evidence ledger

| Topic | Evidence | Correction |
| --- | --- | --- |
| Visible coach list | `admin-panel/app/coaches/page.tsx`; `admin-panel/components/coaches/CoachSearchFilter.tsx:48`, `:150–204` | All statuses initially; administrator chooses Pending. Rows show profile information and CoachActions. No invented separate credential-review page. |
| CV viewing | `admin-panel/components/coaches/CoachActions.tsx:66–77` | Existing cv_url link opened in new tab when present. These components do not generate signed URLs or guarantee document accessibility. |
| Approval UI | `CoachActions.tsx:36–60`, `:79–118` | Confirmation dialog; PATCH /api/coaches with coachProfileId and status; toast and router.refresh on success. Not a server action or revalidatePath call. |
| Rejection and other transitions | `CoachActions.tsx:120–239` | Reject/revoke/re-approve confirmation paths. No required feedback/reason payload. |
| Access checks | `admin-panel/proxy.ts`; `admin-panel/lib/supabase/admin.ts:36–92` | Proxy redirects protected pages and returns API 401/403 as appropriate. Route independently verifies current auth user and user_profiles.is_admin; admin client credentials are server-side. |
| Update route | `admin-panel/app/api/coaches/route.ts` | Validate fields and allowed statuses; privileged coach_profiles update sets status, is_verified based on approval, and timestamp; return JSON record. No audit utility or notification call in handler. |
| Deployed triggers | `admin-approval-trigger-check.json`, read-only live inspection | Enabled timestamp and auto-create-wallet triggers on coach_profiles. Approval transition ensures EUR wallet with ON CONFLICT (coach_id) DO NOTHING. Neither inspected trigger inserts approval audit or coach notifications. |
| Individual certifications | `admin-panel/app/api/coaches/[id]/certifications/route.ts` | Separate protected endpoint updates coach_certifications with verified/rejected/pending and verification timestamp. Not invoked by profile approval. |
| General audit capability | `admin-panel/lib/audit.ts` | Utility exists, but this approval handler does not call it. No immutable approval-audit or automatic coach-message guarantee inferred. |

## Selected figure scope

- `figures/seq_admin_audit_ssd.png`: administrator actor, Coach Management, Pending selection, optional existing CV link, approval confirmation, and successful refreshed status. Filename and figure label retained for reference compatibility; they do not imply an audit-log operation.
- `figures/seq_admin_audit_detailed.png`: successful authorized PATCH route, current-user and admin-flag checks, input validation, update, internal wallet trigger, JSON response, toast, and list refresh. The proxy's earlier checks, timestamp trigger internals, and list-query expansion are described in text rather than additional lifelines. Database trigger is an internal database participant, not an external service. Existing coach wallets are preserved; the trigger is only eligible on transition to approval.

Matching SVGs and `figures/source/build_admin_approval_sequence_diagrams.py` are included. Both use the approved muted palette, thin lines, white background, and no notation legend. The system view includes the administrator stick figure.

Verification: both figures rendered and visually inspected; PNG integrity, SVG parsing, report image references, and unique LaTeX labels checked. Live inspection read trigger metadata and function definitions only; no user rows were inspected and no approval was executed. No runtime browser approval, CV-access, certification, notification-delivery, or report-compilation test was performed. Broader administrative/security claims elsewhere remain subject to the remaining content audit.
