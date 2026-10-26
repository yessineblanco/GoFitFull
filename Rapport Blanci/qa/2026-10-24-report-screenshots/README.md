# Report screenshot insertion

24 October 2026. Added **25 retained captures in 13 figure groups** to the existing authoritative main.tex. The existing editor and document are preserved. A List of Figures at the front provides captions and automatically resolved page numbers.

## Where to find the screenshots

| Chapter / nearby subsection | Figure label | Contents |
| --- | --- | --- |
| Chapter 3, Mobile Foundation and Navigation | fig:ui-client-entry | Onboarding introduction, existing-account Home after relaunch, native workout catalog |
| Chapter 3, Workout Core and Rest Timer | fig:ui-workout-configuration | Exercise detail and workout-builder form; no timer execution claim |
| Chapter 4, Progress, Nutrition, and Reminder Features | fig:ui-progress-nutrition | Observed chart state, nutrition diary and selected food/serving form |
| Chapter 4, after AI measurement limitations | fig:ui-measurement-boundary | Cropped capture guidance and camera-denial message; no fresh successful inference claim |
| Chapter 5, Coach Marketplace and Client Follow-up | fig:ui-coaching-availability | Marketplace, coach availability and restored 60-minute duration preference |
| Chapter 5, Coach Marketplace and Client Follow-up | fig:ui-coach-workspace | Calendar, unsubmitted program form and disposable QA private note |
| Chapter 5, Stripe Payment Integration | fig:ui-sandbox-pack | EUR129 Stripe test checkout and pack-purchase success dialog |
| Chapter 5, Stripe Payment Integration | fig:ui-admin-paid-records | Administrative excerpt showing EUR60 session and EUR129 pack, both sandbox-paid |
| Chapter 5, empty-state discussion | fig:ui-conversation-empty | Coach conversation empty state; no successful exchange or video call claim |
| Chapter 5, Administration and Operational Control | fig:ui-admin-exercises | Exercise catalog and management controls |
| Chapter 5, Administration and Operational Control | fig:ui-admin-workout | Reloaded disposable workout editor from the corrected save-path QA |
| Chapter 5, Administration and Operational Control | fig:ui-admin-approval-audit | Cancelled coach-approval confirmation dialog and separate exercise-deletion audit entries |
| Chapter 5, Admin Analytics and BI | fig:ui-admin-dashboard | Dashboard after the profile-count label correction |

Exact page numbers are generated in the report's **List of Figures**. They can shift with later edits; this record therefore uses stable figure labels and section placements.

## Selection and presentation

Original evidence files are unchanged. Screens suitable for inclusion were visually inspected before selection. Some archived names do not match their visible screens; a file named progress-loaded actually displayed Add Food. Such mismatches, old erroneous workout summaries, debug launchers/toasts, email-bearing coach lists and unrelated personal progress photos were not selected.

Mobile captures are grouped in compact panels. Administrative views use wider figures, and smaller confirmation/audit excerpts are stacked for readability. Five report assets are deterministic crops of the originals: measurement guidance, camera-denial response, transaction-record excerpt, coach-approval dialog and audit excerpt. Crops exclude historical biometric rows or identity/network columns where applicable. The payment excerpt retains the purchase, amount, provider-state, session-count and status fields. No interface was generated, retouched, reconstructed or presented as a newer capture. assets.json records original paths, crop rectangles and both source/asset hashes; figures.json maps assets to captions.

Captions and surrounding text identify October development/local-QA observations, sandbox payments, empty forms, cancelled decisions and disposable fixtures. A screenshot does not independently prove persistence, correctness of totals, authorization, timing or complete workflow execution. Existing FR, sprint and final QA rows and the General Conclusion remain unchanged.

## Evidence still unavailable

No successful fresh measurement/review/save or independent accuracy comparison, active-workout/controlled locked-device timer, native standalone payment, two-party video/message exchange or fresh scheduled n8n execution was fabricated or added. The report retains the existing architecture, deployment and automation diagrams with their configuration/evidence limits. A brief Chapter 6 note explains why those diagrams are not execution screenshots.

## Checks

All 25 selected source/asset hashes and image integrity checks passed. All 13 new figure labels are unique and referenced; all graphic paths resolve. The report has 58 graphic references: 33 existing diagram references and 25 new screenshot references. Relevant figure/minipage/table environments balance. Source/caption references and unchanged requirement/QA rows were checked. Compilation uses the same saved document through the built-in compiler; no separate PDF or replacement document was created.

Individual screenshot assets and crops were visually reviewed. Full rendered-PDF page-by-page acceptance is not claimed: native inspection of the current editor preview encountered window-bound/coordinate inconsistencies, so no unsupported visual-layout certification or guessed page numbers are recorded.

insert.py is a one-time insertion helper, not an idempotent maintenance command. main-before.txt and main-revision.diff preserve the source transition. Inspection contact sheets in this folder were used for candidate review and are not included in the report. The added front-matter List of Figures was applied after the initial insertion helper.
