# GoFit Live Roadmap

**Last verified:** June 10, 2026

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
   - Re-run security and performance advisors.
   - Review exposed `SECURITY DEFINER` functions, profile-picture listing, and
     overlapping workout RLS policies without breaking current clients.

2. **Body-measurement reliability**
   - Calibrate estimator confidence and formulas against repeat measurements.
   - Implement and validate the iOS MediaPipe bridge.
   - Keep the feature clearly labeled as an estimate, not a medical tool.

3. **Quality foundation**
   - Add automated mobile and admin tests for critical services and workflows.
   - Resolve admin lint errors and verify a production build in a networked
     environment.

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
