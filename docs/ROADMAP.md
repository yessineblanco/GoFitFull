# GoFit Live Roadmap

**Last verified:** June 12, 2026

This is the canonical remaining-work list. Verify completion against code,
migrations, deployed Supabase functions, and n8n before changing status.

## Current Foundation

GoFit already includes client and coach mobile flows, workout tracking,
nutrition and barcode logging, health synchronization, daily readiness, habits,
progress photos, Android body-measurement pose processing, AI workout
recommendations, coach AI session briefings, automated check-ins, messaging,
video calls, packs and wallets, admin management, advanced BI, and n8n
automations.

## Active Work

1. **Supabase advisor remediation**
   - Security findings reduced from 38 to 13; remaining function warnings are
     reviewed caller-checked RPCs or intentional marketplace reads.
   - Caller-identity checks are implemented for pack, admin, coach dashboard,
     coach-client, and client-progress RPCs.
   - Overlapping workout, wallet, and transaction policies were consolidated
     after proving equivalent access behavior; all 98 initPlan findings are
     resolved and performance findings fell from 296 to 152.
   - Review unused indexes only with query-usage evidence and consolidate
     overlapping policies only after proving equivalent access behavior.
   - Enable leaked-password protection after a Supabase Pro upgrade; the Free
     plan rejected this setting on June 12, 2026.

2. **Body-measurement reliability**
   - Calibrate estimator confidence and formulas against repeat measurements.
   - Implement and validate the iOS MediaPipe bridge.
   - Keep the feature clearly labeled as an estimate, not a medical tool.

3. **Quality foundation**
   - Mobile Jest infrastructure covers utility rules, readiness scoring, rate
     limiting, and auth, booking, and session-pack stores; expand it to more
     services and critical workflows.
   - Admin-panel unit tests now cover admin-route access classification, BI API
     request/CSV boundaries, finance, coach-ops, client-health, and
     user-lifecycle aggregation, validation, import parsing, shared API errors,
     and BI KPI contract integrity; expand remaining BI aggregation coverage.
   - The admin production build passed on June 13, 2026. Admin lint is clean
     with zero errors and zero warnings, down from 114 errors and 41 warnings.

## Next Advanced Features

1. **Adaptive AI Coach workflow**
   - Unify existing readiness and adaptive workout data into a persisted daily
     plan with workout, recovery, nutrition, and habit actions.
   - Add deterministic fallback, caching, strict response validation, versioning,
     and AI observability.
   - Add client feedback and coach approval for material changes to assigned
     programs.

2. **Android Form Coach prototype**
   - Support squat, push-up, and biceps curl using on-device MediaPipe.
   - Add rep counting, phase detection, confidence gating, and conservative
     coaching cues without uploading raw video.

3. **Payment productionization**
   - Add provider integration, webhook reconciliation, refunds, payouts,
     receipts, and a canonical finance ledger.

## Later Candidates

- User-confirmed meal-photo estimates.
- Semantic exercise search.
- AI-assisted coach program drafting.
- Weekly progress narratives.
- Voice workout guidance from approved exercise instructions.

Medical diagnosis, autonomous injury prediction, and unreviewed automatic
program or nutrition prescriptions are out of scope.
