# Step 4 — Sprint artifact cross-check

Review date: 24 October 2026. **Approved by the user (“proceed”) before Step 5 began on 24 October 2026.** Compilation remains blocked by the built-in environment's missing Biber executable.

The review compares the actual current report, figure renderer sources, earlier source/schema review records, the frozen Step 2 implementation index and retained October QA. It does not reconstruct internship-period source snapshots or invent sprint completion dates. No application code, database, payment, account or provider state was changed. No fresh application tests were run.

## Issues and corrections

Locations are revised main.tex line numbers; exact before/after text is retained in main-revision.diff and the preceding source is in main-before.txt.

| Location | Inconsistency | Applied correction |
| --- | --- | --- |
| 619–625, Sprint 1 backlog/model explanation | Original targets name a four-step equipment/experience questionnaire, RPE, WorkoutSet, SQLite/conflict handling and complete builder behaviors that the model and source do not establish. | Preserve all original tasks/estimates as planning artifacts. Connect implemented six-screen onboarding, prescription entities, embedded execution snapshots and existing-session completion replay to their source/evidence boundaries. Reorder/cloning remain unverified. |
| 924–928, Sprint 2 backlog/model explanation | Planned entity names, chart-library/slider features, streaming/fallback tests and allergen-safety wording exceed the inspected model or retained execution. | Map nutrition to MealLog/FoodItem/NutritionGoals and profile collections; progress photos remain independent of measurements. Distinguish name matching from safety verification and planned CV/recommendation/notification checks from executed results. |
| 1367–1375, Sprint 3 backlog/model explanation | Webhooks, post-call summaries, VideoSession, ClientCoachAssignment, signed documents and universal approval side effects conflict with inspected records/handlers. | Retain original targets and identify deviations: pre-session/client-context briefings, runtime tokens, programs/check-ins/private notes and existing document URLs. No blanket notification, audit, encryption or independent accreditation claim. |
| 1427–1493, payment use case and four sequence figures | Old USD amounts, fixed session price/duration, client purchase insertion and post-checkout booking insertion contradict the verified October EUR correction. | Replace the obsolete baseline with server-priced pack initialization, server reservation before standalone checkout, verified pack fulfilment and manual capture before paid booking confirmation. Separate pack credits from standalone payment. Explicitly date this as an October implementation projection. |
| 855–860, Sprint 1 tests | All-pass placeholders previously overstated onboarding/session/background/media verification and used unsupported RPE/INSERT expectations. | Six original IDs retained; outcomes now 2 Partial / 4 Pending. Existing-account access is narrower than new onboarding or refresh verification; completion updates an existing session. |
| 1298–1303, Sprint 2 tests | Catalog controls, chart display and permission denial were conflated with complete filter/aggregate/barcode/measurement execution. | Six IDs retained; 2 Partial / 4 Pending. No invented confidence, accuracy, ingredient-safety, provider-lookup or AI-output result. |
| 1794–1799, Sprint 3 tests | Existing coach access and approval-dialog inspection were treated as fresh onboarding/approval; separate payment/booking branches were conflated. | Six IDs retained; 1 scoped pack sandbox pass / 1 Partial / 4 Pending. Pack-credit booking, two-party media and scheduled briefing execution remain unverified. |
| 1814–1844, cross-sprint traceability | Product backlog, 12 sprint stories, selected models/use cases and October evidence lacked one explicit cross-reference. | Add a 12-story mapping to PB/FR domains and M01–M20. State that selected diagrams are not exhaustive tests or dated sprint-end snapshots. |

## Diagram family review

| Family | Cross-check result and limits |
| --- | --- |
| Global and three sprint use-case views | Client, Coach and Administrator associations agree with the report. Shared messaging/video and coach-only briefing remain consistent. Goals and role participation do not certify completion or describe screen navigation order. No redraw needed. |
| Sprint 1 class and workout/authentication sequences | Account versus optional profile, optional workout reference, embedded session snapshots and local timer preferences remain coherent. Session creation precedes completion UPDATE; offline replay requires an existing remote identifier. Client onboarding local completion is distinct from profile persistence. |
| Sprint 2 extension and measurement/nutrition sequences | Earlier workout foundation remains included. Measurements and photos are independent; reviewed drafts are saved separately from local capture/inference. Barcode lookup/catalog insertion precedes meal logging. Nutrition totals derive from servings and food records; preference matching is not clinical allergy protection. |
| Sprint 3 marketplace, communication, follow-up and finance views | Retain the earlier cumulative views and shared identities. Purchases differ from bookings; optional pack reference remains valid. AI notes need not reference a completed consultation. Programs may be unassigned templates. Wallet Transaction is a different ledger from card payment snapshots. Selected-attribute omission does not imply payment columns are absent. |
| Payment sequences | Four PNG/SVG pairs regenerated from the existing renderer in the established restrained style. The client journey, shared initialization, pack verification/replay and reserved-session capture now agree with the current inspected screen/service/handler/RPC boundaries. All four visually inspected; an initially clipped message was shortened and rechecked. |
| Admin approval sequences | Existing CV URL, protected PATCH, profile status/verification flag and wallet trigger remain consistent. Successful approval, signed-document generation and notification delivery are not inferred from confirmation/cancel observations. |

Earlier reviews provide the detailed schema/relationship reasoning: sprint1-class-model-review.md, sprint2-class-model-review.md, sprint3-class-model-review.md, workout-sequence-review.md, auth-onboarding-sequence-review.md, measurement-sequence-review.md, nutrition-sequence-review.md and admin-approval-sequence-review.md in the report folder. The earlier payment-booking-sequence-review.md is a dated historical baseline; **this review and the current renderer supersede its checkout description**. No old review record was silently rewritten.

## Evidence and verification

- 36 original backlog task rows, task IDs and estimates preserved verbatim; 12 stories mapped.
- All 18 sprint test IDs reconciled: **1 Scoped pass, 5 Partial, 12 Pending**. These are scenario verdicts, not a new app-wide test run. validation-rows.json retains each criterion, observation and evidence pointer.
- 62 distinct implementation/renderer source hashes recorded; all 46 source files from the Step 2 index still match its frozen hashes. No application changes were needed for this report correction.
- 33 graphics references (32 distinct figures) resolve and pass image integrity checks; available SVG companions parse. The repeated Sprint 1 foundation is intentional cumulative reuse.
- All source labels are unique; every ref/pageref and local path reference resolves. These static checks do not replace a completed multipass compile or full PDF visual inspection.
- Previously reconciled final QA and General Conclusion remain unchanged.
- The built-in compile_latex_document tool processed the source to a 117-page XDV, then failed when invoking Biber: `error: program not found`. This is **not successful compilation**. compiler-final.json retains the diagnostic; bibliography settings were preserved. Overfull-box and reference/bibliography warnings remain.

verify.py checks static invariants; source-hashes.json and evidence-manifest.json preserve the review trail. revise.py is a one-time source transformation, not an idempotent maintenance command. The maintained figure generator is figures/source/build_booking_sequence_diagrams.py; update_payment_figures.py records the transition and should not be rerun merely to inspect the result.

## Next checkpoint

Await approval before Step 5 (supervisor checklist). Sprint dates, burn-down histories, broader chapter introductions/conclusions and obsolete tables remain in that next scope. Payment recovery, video authorization, iOS parity and other unfinished app behaviors remain limitations; a report consistency correction does not implement them.
