# GoFit — Full Project Report & Architecture Documentation

**Purpose:** Academic / professional report with architecture, methodology (Scrum / Agile), and diagrams.  
**Last updated:** March 2026.

> **Rendering diagrams:** Mermaid blocks render in GitHub, GitLab, many Markdown viewers, and [mermaid.live](https://mermaid.live). For Word/PDF, export diagrams from mermaid.live as PNG/SVG and insert them.

---

## Table of contents

1. [Executive summary](#1-executive-summary)  
2. [Methodology — Scrum & Agile](#2-methodology--scrum--agile)  
3. [System context & high-level architecture](#3-system-context--high-level-architecture)  
4. [Container & component architecture](#4-container--component-architecture)  
5. [Mobile app architecture](#5-mobile-app-architecture)  
6. [Admin panel architecture](#6-admin-panel-architecture)  
7. [Data & security architecture](#7-data--security-architecture)  
8. [Key user flows (sequences)](#8-key-user-flows-sequences)  
9. [Technology stack](#9-technology-stack)  
10. [Repository structure](#10-repository-structure)  
11. [Sprint roadmap (Gantt)](#11-sprint-roadmap-gantt)  
12. [References](#12-references)

---

## 1. Executive summary

**GoFit** is a fitness platform consisting of:

- A **cross-platform mobile app** (React Native / Expo) for **clients** and **coaches**.
- A **web admin panel** (Next.js) for content and user management.
- A **backend-as-a-service** on **Supabase** (PostgreSQL, Auth, Storage, Realtime).

The project is organized using **Scrum**: fixed-length sprints, a product backlog, and incremental delivery of potentially shippable features.

---

## 2. Methodology — Scrum & Agile

### 2.1 Agile principles applied

- **Iterative delivery:** work is split into time-boxed **sprints** (2 weeks in the project plan).
- **Incremental value:** each sprint aims for a **potentially shippable increment**.
- **Adaptation:** backlog is refined based on stakeholder feedback and technical discovery.
- **Collaboration:** clear roles (Product Owner, Scrum Master, Developers) — adjust names to your team.

### 2.2 Scrum framework — roles, events, artifacts

```mermaid
flowchart TB
  subgraph roles [Scrum Roles]
    PO[Product Owner<br/>Backlog priority]
    SM[Scrum Master<br/>Process facilitation]
    DEV[Developers<br/>Design, build, test]
  end

  subgraph events [Scrum Events]
    SP[Sprint Planning]
    DS[Daily Scrum]
    RV[Sprint Review]
    RT[Sprint Retrospective]
  end

  subgraph artifacts [Scrum Artifacts]
    PB[Product Backlog]
    SB[Sprint Backlog]
    INC[Increment<br/>shippable product]
  end

  PO --> PB
  PB --> SP
  SP --> SB
  SB --> DEV
  DEV --> DS
  DEV --> INC
  INC --> RV
  RV --> RT
  RT --> PB
```

### 2.3 Sprint lifecycle (one iteration)

```mermaid
flowchart LR
  A[Product Backlog<br/>refinement] --> B[Sprint Planning<br/>select PBIs]
  B --> C[Development<br/>2 weeks]
  C --> D[Daily Scrum<br/>sync blockers]
  D --> C
  C --> E[Sprint Review<br/>demo increment]
  E --> F[Retrospective<br/>improve process]
  F --> A
```

### 2.4 Flow from backlog to production increment

```mermaid
flowchart TD
  PBI[Product Backlog Item<br/>User Story / Feature] --> READY[Definition of Ready]
  READY --> SPRINT[Sprint Backlog]
  SPRINT --> BUILD[Develop + Test]
  BUILD --> DOD[Definition of Done]
  DOD --> INC[Increment]
```

### 2.5 How GoFit phases map to Scrum (example)

| Concept | GoFit application |
|--------|------------------|
| Product Backlog | Features from cahier des charges, Phase 5 marketplace, admin, payments |
| Sprint Goal | e.g. “Ship exercise library + progress charts” |
| Increment | Working mobile build + DB migrations + admin pages where applicable |
| Burndown | Tasks closed per sprint (tracked in your tool: Jira, Azure DevOps, Notion, etc.) |

---

## 3. System context & high-level architecture

### 3.1 System context (who uses what)

```mermaid
flowchart TB
  Client[Client User<br/>Mobile App]
  Coach[Coach User<br/>Mobile App]
  Admin[Administrator<br/>Web Browser]
  subgraph GoFit_System [GoFit System]
    Mobile[GoFit Mobile<br/>Expo / React Native]
    Web[Admin Panel<br/>Next.js]
    API[Supabase Platform]
  end
  Client --> Mobile
  Coach --> Mobile
  Admin --> Web
  Mobile --> API
  Web --> API
```

### 3.2 Logical deployment view

```mermaid
flowchart LR
  subgraph clients [User Devices]
    PH[Phones iOS/Android]
    BR[Desktop Browser]
  end
  subgraph cloud [Cloud]
    EX[Expo / EAS Builds]
    V[Next.js Hosting<br/>Vercel or similar]
    SB[(Supabase<br/>Postgres + Auth + Storage + Realtime)]
  end
  PH --> EX
  BR --> V
  EX --> SB
  V --> SB
```

---

## 4. Container & component architecture

### 4.1 Containers communicating with Supabase

```mermaid
flowchart TB
  subgraph mobile [GoFitMobile]
    UI_M[UI Screens & Components]
    NAV_M[React Navigation]
    ST_M[Zustand Stores]
    SVC_M[Services Layer<br/>Supabase client]
  end
  subgraph admin [admin-panel]
    UI_A[React Server/Client Components]
    API_A[Next.js Route Handlers]
    SVC_A[Supabase SSR + Service Role]
  end
  subgraph supa [Supabase]
    AUTH[GoTrue Auth]
    PG[(PostgreSQL + RLS)]
    STOR[Storage Buckets]
    RT[Realtime Channels]
  end
  UI_M --> NAV_M --> ST_M --> SVC_M
  SVC_M --> AUTH
  SVC_M --> PG
  SVC_M --> STOR
  SVC_M --> RT
  UI_A --> API_A --> SVC_A
  SVC_A --> PG
  SVC_A --> STOR
```

### 4.2 Layered architecture (mobile)

```mermaid
flowchart TB
  L1[Presentation Layer<br/>Screens, Components]
  L2[State Layer<br/>Zustand stores]
  L3[Domain / Services<br/>sessionPacks, bookings, chat, auth]
  L4[Infrastructure<br/>Supabase client, SecureStore]
  L1 --> L2 --> L3 --> L4
```

---

## 5. Mobile app architecture

### 5.1 Root navigation decision (client vs coach)

```mermaid
flowchart TD
  START[App Launch] --> AUTH{Session?}
  AUTH -->|No| LOGIN[Auth / CoachAuth]
  AUTH -->|Yes| TYPE{user_type}
  TYPE -->|client| ONB{Onboarding done?}
  ONB -->|No| CO[Client Onboarding]
  ONB -->|Yes| APP[Client AppNavigator]
  TYPE -->|coach| CONB{Coach onboarding done?}
  CONB -->|No| CHO[Coach Onboarding]
  CONB -->|Yes| CAPP[CoachAppNavigator]
```

### 5.2 Client app — tab & stack overview

```mermaid
flowchart LR
  subgraph tabs [Client Tabs]
    H[Home]
    W[Workouts]
    L[Library]
    P[Progress]
    PR[Profile]
  end
  H --> HM[Home Stack:<br/>Marketplace, CoachDetail, BookSession, Chat]
  PR --> PS[Profile Stack:<br/>MyPacks, MyBookings, Conversations, Settings]
```

### 5.3 Coach app — tab overview

```mermaid
flowchart LR
  subgraph ctabs [Coach Tabs]
    D[Dashboard]
    CL[Clients]
    CA[Calendar]
    CH[Chat]
    CP[Profile]
  end
  CL --> CS[Clients Stack:<br/>ClientDetail, Progress, Notes, Programs]
  CH --> CHS[Chat Stack:<br/>ConversationsList, ChatScreen]
```

---

## 6. Admin panel architecture

### 6.1 Main routes (App Router)

```mermaid
flowchart TD
  ROOT[/dashboard] --> U[/users]
  ROOT --> E[/exercises]
  ROOT --> WO[/workouts]
  ROOT --> CO[/coaches]
  ROOT --> TR[/transactions]
  ROOT --> AL[/activity-logs]
  ROOT --> ST[/settings]
  LOGIN[/login] --> ROOT
```

### 6.2 Admin data access pattern

```mermaid
sequenceDiagram
  participant Browser
  participant Next as Next.js Server
  participant Supa as Supabase Service Role
  Browser->>Next: Request protected page / API
  Next->>Supa: Query with service role (bypass RLS where intended)
  Supa-->>Next: Rows / files
  Next-->>Browser: HTML / JSON
```

---

## 7. Data & security architecture

### 7.1 Simplified entity-relationship (core fitness)

```mermaid
erDiagram
  USERS ||--o| USER_PROFILES : has
  USERS ||--o{ WORKOUT_SESSIONS : performs
  WORKOUTS ||--o{ WORKOUT_EXERCISES : contains
  EXERCISES ||--o{ WORKOUT_EXERCISES : referenced_by
  WORKOUTS ||--o{ WORKOUT_SESSIONS : template
  USERS {
    uuid id PK
  }
  USER_PROFILES {
    uuid id PK_FK
    text user_type
  }
  WORKOUTS {
    uuid id PK
    text name
    text workout_type
  }
  WORKOUT_SESSIONS {
    uuid id PK
    uuid user_id FK
    uuid workout_id FK
    timestamptz started_at
  }
  EXERCISES {
    uuid id PK
    text name
  }
```

### 7.2 Marketplace / coaching extension (Phase 5 — simplified)

```mermaid
erDiagram
  COACH_PROFILES ||--o{ SESSION_PACKS : offers
  COACH_PROFILES ||--o{ BOOKINGS : receives
  USERS ||--o{ PURCHASED_PACKS : buys
  SESSION_PACKS ||--o{ PURCHASED_PACKS : instance_of
  COACH_PROFILES ||--o{ CONVERSATIONS : participates
  USERS ||--o{ CONVERSATIONS : participates
  CONVERSATIONS ||--o{ MESSAGES : contains
  COACH_PROFILES {
    uuid id PK
    uuid user_id FK
    text status
  }
  PURCHASED_PACKS {
    uuid id PK
    uuid client_id FK
    uuid pack_id FK
    int sessions_remaining
  }
  BOOKINGS {
    uuid id PK
    uuid coach_id FK
    uuid client_id FK
    timestamptz scheduled_at
  }
```

### 7.3 Row-Level Security (RLS) concept

```mermaid
flowchart LR
  REQ[Client request<br/>JWT with user id] --> API[PostgREST / Supabase]
  API --> RLS{RLS policies}
  RLS -->|Allow| ROW[Return only permitted rows]
  RLS -->|Deny| EMPTY[Empty / error]
```

---

## 8. Key user flows (sequences)

### 8.1 Sign-in and data fetch (mobile)

```mermaid
sequenceDiagram
  participant U as User
  participant App as GoFitMobile
  participant SB as Supabase Auth
  participant DB as PostgreSQL
  U->>App: Email / password
  App->>SB: signInWithPassword
  SB-->>App: Session + JWT
  App->>DB: Query with anon key + RLS
  DB-->>App: user_profiles, workouts...
  App-->>U: Home / Coach dashboard
```

### 8.2 Book session (simplified)

```mermaid
sequenceDiagram
  participant C as Client
  participant App as Mobile App
  participant DB as Supabase
  C->>App: Select slot + confirm
  App->>DB: INSERT bookings
  DB-->>App: Booking created
  App->>DB: Optional RPC deduct_session
  App-->>C: Confirmation UI
```

---

## 9. Technology stack

| Layer | Mobile (`GoFitMobile`) | Admin (`admin-panel`) | Backend |
|-------|------------------------|------------------------|---------|
| UI | React Native, Expo, Lucide | Next.js 16, shadcn/ui, Tailwind | — |
| State | Zustand | React state / Server Components | — |
| API | supabase-js (anon) | supabase-js + SSR, service role in API routes | Supabase |
| DB | — | — | PostgreSQL + RLS |
| Auth | Supabase Auth | Supabase Auth (admin users) | GoTrue |
| i18n | i18next (EN/FR) | — | — |

---

## 10. Repository structure

```
GoFit/
├── GoFitMobile/       # Expo app (App.tsx, src/screens, services, store, navigation)
├── admin-panel/       # Next.js app (app/, components/, app/api/)
├── database/          # schema/, migrations/, functions/*.sql, policies/
├── docs/              # This report, gantt/, architecture/, admin-panel/
└── README.md
```

---

## 11. Sprint roadmap (Gantt)

Aligned with `docs/gantt/SCRUM_SPRINT_BREAKDOWN.md` (13 sprints × 2 weeks).

```mermaid
gantt
  title GoFit — Scrum sprint timeline (from project plan)
  dateFormat  YYYY-MM-DD
  section Foundation
  Sprint 1 Spec & Design           :s1, 2026-01-26, 14d
  Sprint 2 Auth & Setup          :s2, after s1, 14d
  section Core App
  Sprint 3 Workout core & Profile :s3, after s2, 14d
  Sprint 4 Planner & Calendar    :s4, after s3, 14d
  Sprint 5 Library & Progress    :s5, after s4, 14d
  section AI & Coach
  Sprint 6 MediaPipe / IA        :s6, after s5, 14d
  Sprint 7 IA + Coach onboarding :s7, after s6, 14d
  Sprint 8 Marketplace & Packs   :s8, after s7, 14d
  Sprint 9 Video Chat Wallet     :s9, after s8, 14d
  section Admin & Release
  Sprint 10 Admin users/coaches  :s10, after s9, 14d
  Sprint 11 Admin CRUD & tests   :s11, after s10, 14d
  Sprint 12 Perf & bugfix        :s12, after s11, 14d
  Sprint 13 Store release        :s13, after s12, 14d
```

---

## 12. References

| Document | Location |
|----------|----------|
| Monorepo README | `README.md` |
| Mobile guide | `GoFitMobile/PROJECT_GUIDE.md` |
| Database model | `database/DATABASE_STRUCTURE.md` |
| Scrum sprint table | `docs/gantt/SCRUM_SPRINT_BREAKDOWN.md` |
| Admin features | `docs/admin-panel/ADMIN_PANEL_FEATURES.md` |
| Phase 5 scope | `.cursor/plans/gofit_phase_5_plan_*.plan.md` |

---

## Appendix A — Diagram checklist for your report

Use this checklist when building your final PDF/thesis:

| # | Diagram | Section |
|---|---------|---------|
| 1 | Scrum roles / events / artifacts | §2.2 |
| 2 | Sprint lifecycle | §2.3 |
| 3 | Backlog → increment | §2.4 |
| 4 | System context | §3.1 |
| 5 | Deployment view | §3.2 |
| 6 | Containers + Supabase | §4.1 |
| 7 | Mobile layers | §4.2 |
| 8 | Root navigation | §5.1 |
| 9 | Client tabs | §5.2 |
| 10 | Coach tabs | §5.3 |
| 11 | Admin routes | §6.1 |
| 12 | Admin sequence | §6.2 |
| 13 | ER core fitness | §7.1 |
| 14 | ER marketplace | §7.2 |
| 15 | RLS concept | §7.3 |
| 16 | Sign-in sequence | §8.1 |
| 17 | Booking sequence | §8.2 |
| 18 | Gantt sprints | §11 |

---

## Appendix B — License

Private project — adjust per your institution.

---

*If any diagram or statement conflicts with the current codebase or your live Supabase project, prefer the repository and applied migrations as the source of truth.*
