# Use-case diagram corrections

Applied to the global view and the three sprint views, with their captions and adjacent explanations in `main.tex`. The figures show selected functional goals supported by the inspected source; they do not establish historical sprint completion, successful deployment, or runtime validation.

## Modeling rules

- Client, Coach, and Administrator are human roles outside the GoFit system boundary. Backend components belong in the architecture and sequence views rather than being represented as human-facing actors here.
- Ovals describe user goals. Internal processing steps, database operations, and conditional retry paths are described in the sequence analysis.
- Plain associations identify participation, not navigation order. These figures do not replace the mobile interaction sequences.
- Global goals aggregate related activities; sprint views provide selected detail. Neither level claims an exhaustive inventory of every screen or setting.
- Both Sprint 3 panels depict the same system. Separating administration improves readability without implying a separate deployment.
- Authentication is summarized globally; protected activities assume authentication rather than repeating an include relation for every goal.

## Corrections and evidence

| Location | Correction | Source basis and limits |
| --- | --- | --- |
| Global use-case subsection | Three human roles, shared sign-in, broad goal groups | Mobile client and coach navigators; administrator login and management routes. Aggregation is explicitly explained in the report. |
| Sprint 1 use-case subsection | Client onboarding, profile, workout browsing/creation/execution, timer configuration | Source paths and failure behavior documented in `auth-onboarding-sequence-review.md` and `workout-sequence-review.md`. Set recording is within execution; the completion queue is conditional and requires an existing remote session. |
| Sprint 2 use-case subsection | Exercise library, progress, measurement drafts, nutrition targets/logging, barcode lookup, preferences, recommendations, reminders | Client navigator routes; notification settings; sources documented in `measurement-sequence-review.md`, `nutrition-sequence-review.md`, and `sprint2-class-model-review.md`. Drafts do not establish measurement accuracy; dietary preferences do not prove ingredient safety. |
| Sprint 3 client/coach panel | Shared messaging/video, separate client purchases/bookings/programs/check-ins and coach management/briefings | `GoFitMobile/src/navigation/CoachAppNavigator.tsx`, client navigation, coach onboarding navigation, and `GoFitMobile/src/services/aiSessionNotes.ts`. Briefings are coach-facing; the service invokes `ai-session-notes`. Payment and booking limits remain documented in `payment-booking-sequence-review.md`. Participation does not prove call reliability or payment settlement. |
| Sprint 3 administration panel | Accounts, coach-profile approval, catalogs, reports | Administrator routes and prior `admin-approval-sequence-review.md`. Profile approval is not a claim of independent professional accreditation, audit-log insertion, or notification delivery. |

## Global-to-sprint reading

Fitness-profile and workout goals are refined in Sprint 1. Progress and nutrition are refined in Sprint 2. Coaching services, client/program management, and administration are refined in Sprint 3. Workout recommendations relate to planning; coach AI briefings relate to delivering coaching services. The global coaching groups also cover messaging, video, availability, session packs, assigned programs, and check-ins.

## Artifacts and verification

The reproducible renderer is `figures/source/build_use_case_diagrams.py`. Each figure has PNG and editable SVG output. `figures/source/use-case-manifest.json` records goals and associations.

The four views contain respectively 10, 7, 8, and 17 goals, with 12, 7, 8, and 19 associations. Renderer assertions check unique goal identifiers, valid association endpoints, linked goals, shared messaging/video participation, and coach-only briefing participation. PNG integrity, SVG parsing, figure references, and duplicate LaTeX labels are checked separately. All four rendered figures were visually inspected. No LaTeX compilation or application runtime validation is claimed.

The replaced image-only use-case identifiers were not referenced in `main.tex`; the existing figure labels are retained. Backlogs, sprint dates, validation results, and conclusions remain outside this correction batch.
