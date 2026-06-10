---
name: Adaptive AI Coach and Android Form Coach
overview: Unify existing readiness and adaptive workout capabilities into a persisted daily coaching workflow, then add a narrow on-device Android form-analysis prototype.
status: future
---

# Adaptive AI Coach and Android Form Coach

## Existing foundation

- Deterministic readiness snapshots already combine recovery, health, habits,
  nutrition, check-ins, and workout history.
- Groq already generates catalog-validated adaptive workouts and respects
  assigned coach programs.
- Android MediaPipe pose infrastructure already exists for body measurements.

## Remaining work

1. Persist one daily plan containing explainable workout, recovery, nutrition,
   and habit actions.
2. Add deterministic fallback, schema validation, caching, model/prompt/policy
   versioning, and AI request observability.
3. Add client accept/reject/complete states and coach approval for material
   changes to assigned programming.
4. Track recommendation adoption, completion, fallback frequency, and approval
   time.
5. Build an Android-only form-analysis prototype for squat, push-up, and biceps
   curl with local rep counting, phase detection, confidence gating, and
   conservative cues. Do not upload raw video.

## Verification

- AI failure returns a useful deterministic plan.
- Coach-assigned programming cannot be replaced without approval.
- Every recommendation exposes its reason and data freshness.
- Low-confidence pose frames produce no corrective cue.
