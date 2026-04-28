---
name: GoFit n8n Automations v1
overview: Add external n8n workflows for low-risk operational automation around existing GoFit Supabase data. Keep v1 free/self-host friendly, avoid database migrations, and do not add new Edge Functions unless a later workflow needs app-owned business logic.
todos:
  - id: n8n-plan-scaffold
    content: "Create n8n automation plan file and repo docs/workflow folder"
    status: completed
  - id: ai-session-prep-v1
    content: "Part 1: AI Session Prep Automation -- scheduled n8n workflow generates ai_session_notes for upcoming confirmed bookings and creates coach in-app notifications"
    status: pending
  - id: check-in-reminders-v1
    content: "Part 2: Automated Check-in Reminders -- scheduled n8n workflow nudges clients with due check-ins"
    status: pending
  - id: coach-digest-v1
    content: "Part 3: Coach Daily Digest -- summarize missed check-ins, low wellness scores, upcoming bookings, and inactive clients"
    status: pending
  - id: admin-ops-digest-v1
    content: "Part 4: Admin/Ops Digest -- summarize operational activity for admins"
    status: pending
isProject: false
---

# GoFit n8n Automations v1

## Current State

- The main advanced-features plan is complete at the YAML todo level.
- Part 8 check-ins v1 is implemented in-app, but server/external reminder automation is deferred.
- `ai_session_notes` exists with coach-only app access, and `ai-session-notes` is deployed for coach-initiated generation.
- This plan tracks external n8n workflows only. It must not become a second mobile feature backlog.

## Defaults

- **Hosting:** self-hosted n8n Community Edition for the free path. n8n Cloud can be used for trial/ease, but it is not the permanent-free default.
- **Secrets:** keep `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `GROQ_API_KEY` in n8n environment/credentials only. Never commit them.
- **Delivery:** v1 writes in-app `notifications` rows. Push/email can be layered later.
- **Schema:** no migration for v1. Reuse existing `notifications.type = 'booking_reminder'` with `data.kind = 'ai_session_ready'`.

## Part 1: AI Session Prep Automation

**Goal:** before confirmed coach bookings, prepare the AI briefing that coaches otherwise generate manually.

Workflow behavior:

- Runs every 60 minutes.
- Finds `bookings` rows where `status = 'confirmed'` and `scheduled_at` is between now and the next 24 hours.
- Skips rows when an unexpired `ai_session_notes` row already exists for the same `coach_id + client_id`.
- Fetches client profile, recent completed workout sessions, private coach notes, and recent check-in responses.
- Calls Groq directly from n8n.
- Inserts one `ai_session_notes` row.
- Inserts one coach in-app notification:
  - `type = 'booking_reminder'`
  - `title = 'AI session briefing ready'`
  - `data.kind = 'ai_session_ready'`
  - `data` includes `booking_id`, `client_id`, `coach_id`, `note_id`, and `scheduled_at`.

Files:

- Workflow export: `docs/automation/n8n/workflows/ai-session-prep-v1.json`
- Setup notes: `docs/automation/n8n/README.md`

Verification:

- Import workflow into n8n.
- Run manually against one test confirmed booking in the next 24 hours.
- Confirm exactly one `ai_session_notes` row and one coach notification row are created.
- Rerun and confirm no duplicate note/notification is created while the note is unexpired.

## Part 2: Automated Check-in Reminders

Future workflow after Part 1 is proven:

- Query due `check_in_schedules`.
- Skip schedules where a `check_in_responses` row exists for today.
- Create client in-app notification rows.
- Optionally call push delivery later after token/failure handling is reviewed.

## Part 3: Coach Daily Digest

Future workflow:

- Summarize missed check-ins, low mood/energy, upcoming sessions, and inactive clients per coach.
- Start with in-app notification rows; email is optional later.

## Part 4: Admin/Ops Digest

Future workflow:

- Summarize daily new users, pending coaches, completed bookings, pack sales, and failed automation counts.
- Use existing admin notification surfaces where possible.
