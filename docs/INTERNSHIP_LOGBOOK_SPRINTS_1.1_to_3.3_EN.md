# Internship / project logbook — GoFit

**Scope:** Sprints 1.1 through 3.3 only (per `docs/gantt/SPRINT_BREAKDOWN.md` and `docs/gantt/GANTT_SPRINTS.csv`).  
**Period covered:** 26 January 2026 – 6 April 2026.

| Field | Value |
|-------|--------|
| **Intern** | [your name] |
| **Supervisor** | [name] |
| **Organization** | [name] |

---

## Phase 1 — Foundation

### Sprint 1.1 — *Cahier des charges* (26 Jan – 2 Feb 2026)

I clarified the **scope** of the GoFit product with my supervisor: main **user goals**, **user journeys** (e.g. plan a session, follow progress, find exercises), and what was **out of scope** for the first releases. I wrote a short **functional outline** and a list of **open questions** (units, account types, coach vs client) before any heavy implementation. I also aligned with the **Gantt** so my weekly goals matched Sprint 1.1, not later phases.

- **Learned:** Turning a broad “fitness app” idea into **testable requirements** and explicit boundaries.
- **Difficulty:** Feature creep; I kept a single **“must have for v1”** list and parked the rest.
- **Skills:** Analysis, writing, priority discussion, listening in supervision meetings.

---

### Sprint 1.2 — *UI/UX design & mockups* (2–9 Feb 2026)

I worked from the **Figma** files for the mobile app (and noted where the **admin** screens would go). I compared mockups to the requirements from 1.1, listed **missing states** (empty, loading, error), and captured **design tokens** (colors, typography, spacing) for later implementation. I did not code full features this week; the focus was **ready designs** and a **consistency check** with the user journeys.

- **Learned:** A screen that looks “finished” in Figma can still hide **edge cases** in real use.
- **Difficulty:** Reconciling **aesthetic** choices with **readability** during exercise (contrast, tap targets).
- **Skills:** UI review, structured feedback, Figma (navigation / inspect as applicable).

---

### Sprint 1.3 — *Development environment setup* (9–16 Feb 2026)

I installed and verified the **iOS** and **Android** toolchains (Xcode / Android Studio or emulator, as required), with a focus on a **reproducible** setup. I **initialized Git** workflow (branch naming, or team rules) and, where applicable, a **basic CI** hook so future builds are not only “on my laptop.” I documented **one** path for a new machine: required versions, first clone, first run.

- **Learned:** Environment work is part of the **deliverable**, not a side task.
- **Difficulty:** Long downloads, license prompts, and **path** issues on Windows vs macOS; I fixed them once and **wrote the fix** down.
- **Skills:** DevOps basics, attention to version parity, technical writing.

---

## Phase 2 — Stack & authentication

### Sprint 2.1 — *React Native, Next.js, Supabase* (16–23 Feb 2026)

I **bootstrapped** the **Expo / React Native** app and the **Next.js** admin project (per repo layout), and created the **Supabase** project with credentials stored in **environment variables** (not committed). I established **folder structure** and import conventions so the rest of the team could work in the same style. I ran a **smoke test**: app launches, Supabase client connects with anon key, no secret in the bundle.

- **Learned:** How a **monorepo** (or multi-package) project stays organized for mobile + web + backend.
- **Difficulty:** Aligning **SDK versions** and **Expo** config with the team; I used lockfiles and pinned versions.
- **Skills:** TypeScript/JavaScript, Git, security hygiene for config.

---

### Sprint 2.2 — *Authentication & profile* (23 Feb – 2 Mar 2026)

I implemented **sign-up, sign-in, sign-out, and password reset** with **Supabase Auth**, plus **protected navigation** and clear **error messages**. I added a **basic user profile** (read/update) tied to the authenticated user, with validation for sensitive fields. I tested **unhappy paths** (wrong password, email already used, network failure). This matches the Gantt: auth and **profile foundation** before heavy workout features.

- **Learned:** Auth is **state + security + UX** together; a silent failure confuses users more than a strict error.
- **Difficulty:** **Session refresh** and redirect timing after login; I simplified flows and retested on cold start.
- **Skills:** Auth APIs, form validation, navigation guards, light QA.

---

## Phase 3 — Core mobile features (through 3.3)

### Sprint 3.1 — *Workout planner core* — part A (2–9 Mar 2026)

I started the **workout** domain: create and edit a **session**, add **exercises** with **sets and reps**, and a **rest timer** between sets. I defined the **data model** and **saved** sessions to the database (with user-scoped rows / RLS in mind). I built the **minimum UI** to complete one full “planned workout” without polish for every edge case yet.

- **Learned:** **Domain modeling** (session vs exercise instance vs set) is where bugs hide if rushed.
- **Difficulty:** **Timer** behavior when the app goes to background; I documented current behavior and limits for the next iteration.
- **Skills:** State management, async persistence, time-based UI.

---

### Sprint 3.1 — *Workout planner core* — part B (9–16 Mar 2026)

I added the **calendar** view for scheduled sessions: **assign** sessions to days, see **upcoming** workouts, and **open** a session from the calendar. I improved **persistence** (edit/delete, avoid duplicates) and did **manual test passes** for the main flow: create → schedule → start → complete with timer. I closed the sprint with a **short demo** to my supervisor and a **known limitations** list.

- **Learned:** **Calendar** UX is as much about **clarity** (timezone, “today”) as about code.
- **Difficulty:** **Date handling** without off-by-one errors; I used a single date library / strategy across screens.
- **Skills:** Calendars, data sync, testing discipline.

---

### Sprint 3.2 — *Exercise library* — part A (16–23 Mar 2026)

I implemented the **exercise list** with **search and filters** (e.g. muscle group / equipment, as designed). I wired **images** and short **description** per exercise and ensured **list performance** with reasonable batching (avoid N+1 queries). I added **favorites** (or equivalent) for quick access, backed by the database.

- **Learned:** **Content-heavy** screens need **loading and empty** states, not only the success path.
- **Difficulty:** **Image sizing** and **caching** on slow networks; I used fixed aspect ratios and placeholders.
- **Skills:** Lists, search UX, media loading, query design.

---

### Sprint 3.2 — *Exercise library* — part B (23–30 Mar 2026)

I completed **detail** screens: full **instructions**, **animation or video** link if in scope, and navigation from a **workout** to the **library** entry. I verified **accessibility** basics (labels, font scaling where possible) and **consistency** with the design system from Sprint 1.2. I finished with **regression** tests on search + favorite + open from planner.

- **Learned:** The library and planner must use the **same exercise identity** everywhere to avoid confusion.
- **Difficulty:** **Deep linking** or navigation stack when opening detail from different contexts.
- **Skills:** End-to-end thinking, cross-screen consistency.

---

### Sprint 3.3 — *Progress tracking & notifications* (30 Mar – 6 Apr 2026) — **end of this log’s scope**

I implemented **progress** views: **charts or summaries** for **weight** and **measurements** over time, plus **history** of completed sessions or key metrics. I integrated **local or push notifications** (as planned: Expo / FCM / APNs) for **workout reminders**, with user **preferences** (time of day, days). I stored notification-related settings **per user** and tested on at least one **real device** when possible.

- **Learned:** **Charts** need honest **empty data** and **scale**; notifications need **permission** flows and a clear **opt-out**.
- **Difficulty:** **OS permissions** and **testing** on emulators vs devices; I kept a small checklist (grant/deny, reschedule).
- **Skills:** Data visualization, preferences, push/notification APIs, user trust.

**Stopping point:** This logbook does **not** include Sprint **4.1** (MediaPipe) or any later sprints.

---

## Closing synthesis (26 Jan – 6 Apr 2026)

Over Sprints 1.1 through 3.3, the work moved from **requirements and design** to a **working stack** (mobile, web, Supabase), then **auth and profile**, then **workout planning with calendar**, a full **exercise library**, and finally **progress tracking with reminders**. Regular supervision, the project Gantt, and short written notes were used to stay on scope. The main challenges were **environment setup, auth edge cases, date/time in the planner, media performance in the library, and notification permissions**—each addressed with tests, documentation, and incremental demos. The next phase of the plan (Sprint 4.1) covers AI / MediaPipe and is **outside** this logbook by design.

---

## Source schedule

- Detailed sprint definitions: `docs/gantt/SPRINT_BREAKDOWN.md`
- Task dates: `docs/gantt/GANTT_SPRINTS.csv`

**Note:** Personalize names, exact tools, and facts so the text matches your build and your institution’s requirements.
