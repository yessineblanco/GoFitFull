---
name: GoFit n8n Automations v1
overview: Add external n8n workflows for low-risk operational automation around existing GoFit Supabase data. Keep v1 free/self-host friendly, avoid database migrations, and do not add new Edge Functions unless a later workflow needs app-owned business logic.
todos:
  - id: n8n-plan-scaffold
    content: "Create n8n automation plan file and repo docs/workflow folder"
    status: completed
  - id: ai-session-prep-v1
    content: "Part 1: AI Session Prep Automation -- scheduled n8n workflow generates ai_session_notes for upcoming confirmed bookings and creates coach in-app notifications"
    status: completed
  - id: check-in-reminders-v1
    content: "Part 2: Automated Check-in Reminders -- scheduled n8n workflow nudges clients with due check-ins"
    status: completed
  - id: coach-digest-v1
    content: "Part 3: Coach Daily Digest -- summarize missed check-ins, low wellness scores, upcoming bookings, and inactive clients"
    status: completed
  - id: admin-ops-digest-v1
    content: "Part 4: Admin/Ops Digest -- summarize operational activity for admins"
    status: completed
  - id: booking-reminders-v1
    content: "Part 5: Booking Reminder Notifications -- notify coaches and clients for confirmed bookings starting soon"
    status: completed
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
- Returns a summary output item with generated, skipped, repaired-notification, and error counts.
- On rerun with an existing unexpired note, checks for the coach notification and creates it only if missing.

Files:

- Workflow export: `docs/automation/n8n/workflows/ai-session-prep-v1.json`
- Setup notes: `docs/automation/n8n/README.md`
- Canvas notes: sticky-note stage cards document the schedule window, duplicate guard, client context fetch, AI save/notify step, and run summary without changing the executable path.

Verification:

- Import workflow into n8n.
- Run manually against one test confirmed booking in the next 24 hours.
- Confirm exactly one `ai_session_notes` row and one coach notification row are created.
- Rerun and confirm no duplicate note/notification is created while the note is unexpired.

Manual verification completed on 2026-04-30:

- Imported `GoFit AI Session Prep v1` into local n8n as workflow id `GoFitAISessionPrepV1`.
- Patched the export to use n8n Code node `this.helpers.httpRequest` instead of global `fetch`.
- Created one confirmed Supabase test booking for an existing coach/client pair.
- First run generated one `ai_session_notes` row and one `notifications` row.
- Rerun returned `skipped_existing_note` and duplicate counts stayed at one note and one notification.
- Local scheduled/browser execution requires `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` on the n8n container because Code nodes need environment-variable access.
- Follow-up hardening added run summary counts and notification repair for existing-note reruns.
- Follow-up visual polish added sticky-note stage cards and cleaner node positioning on the n8n canvas.

## Part 2: Automated Check-in Reminders

**Goal:** remind clients when a scheduled check-in is due and no response exists for the UTC date.

Workflow behavior:

- Runs every 4 hours.
- Finds enabled `check_in_schedules`.
- Treats a schedule as due when its UTC weekday/time rule has passed.
- Skips schedules with a matching `check_in_responses` row for the same `coach_id + client_id + response_date`.
- Skips existing reminder notifications for the same `user_id + data.kind + schedule_id + response_date`.
- Inserts one client in-app notification:
  - `type = 'booking_reminder'`
  - `title = 'Check-in due'`
  - `data.kind = 'check_in_due'`
- Returns a summary output item with found, due, created, skipped, and error counts.

File:

- Workflow export: `docs/automation/n8n/workflows/check-in-reminders-v1.json`

Manual verification on 2026-04-30:

- Imported `GoFit Check-in Reminders v1` into local n8n as workflow id `GoFitCheckInRemindersV1`.
- Created a temporary manual-test copy in n8n as `GoFitCheckInRemindersV1Manual`.
- Manual run completed successfully with `schedules_found = 0` and `error_count = 0`.
- Supabase currently has no `check_in_schedules` rows, so the notification insert and duplicate-skip path were not exercised.

## Part 3: Coach Daily Digest

**Goal:** give coaches one deterministic daily client-health summary without adding AI or email in v1.

Workflow behavior:

- Runs daily.
- Finds coach profiles with a linked `user_id`.
- Summarizes missed check-ins, low wellness responses, upcoming confirmed bookings, and inactive clients.
- Skips coaches with no useful signal.
- Skips existing digest notifications for the same `user_id + data.kind + digest_date`.
- Inserts one coach in-app notification:
  - `type = 'booking_reminder'`
  - `title = 'Daily client digest'`
  - `data.kind = 'coach_daily_digest'`
- Returns a summary output item with coach, created, skipped, and error counts.

File:

- Workflow export: `docs/automation/n8n/workflows/coach-daily-digest-v1.json`

Manual verification on 2026-04-30:

- Imported `GoFit Coach Daily Digest v1` into local n8n as workflow id `GoFitCoachDailyDigestV1`.
- Created a temporary manual-test copy in n8n as `GoFitCoachDailyDigestV1Manual`.
- First manual run created 3 coach digest `notifications` rows.
- Rerun returned `skipped_existing_digest_count = 3` and `created_count = 0`.
- Supabase confirmed 3 rows with `data.kind = 'coach_daily_digest'` for the UTC digest date.

## Part 4: Admin/Ops Digest

**Goal:** give admins a daily operations summary using existing admin notification surfaces.

Workflow behavior:

- Runs daily.
- Finds admins from `user_profiles.is_admin = true`.
- Summarizes new users, pending coaches, completed/cancelled/no-show bookings, pack purchases, and currently tracked automation failures.
- Uses `automation_failures_count = 0` in v1 because no persisted automation-run table exists yet.
- Skips existing admin digests by deterministic `admin_user_id + title + href`.
- Inserts one `admin_notifications` row per admin:
  - `type = 'info'`
  - `title = 'Daily ops digest'`
  - `href = '/admin/automation/admin-ops-digest?date=YYYY-MM-DD'`
- Returns a summary output item with admin, count, created, skipped, and error fields.

File:

- Workflow export: `docs/automation/n8n/workflows/admin-ops-digest-v1.json`

Manual verification on 2026-04-30:

- Imported `GoFit Admin Ops Digest v1` into local n8n as workflow id `GoFitAdminOpsDigestV1`.
- Created a temporary manual-test copy in n8n as `GoFitAdminOpsDigestV1Manual`.
- First manual run created 1 `admin_notifications` row.
- Rerun returned `skipped_existing_digest_count = 1` and `created_count = 0`.
- Supabase confirmed 1 row with title `Daily ops digest` and the deterministic digest `href`.

## Part 5: Booking Reminder Notifications

**Goal:** remind coaches and clients shortly before confirmed sessions start.

Workflow behavior:

- Runs every 15 minutes.
- Finds `bookings` rows where `status = 'confirmed'` and `scheduled_at` is within the next 60 minutes.
- Creates reminders for both the client and coach user.
- Skips reminders with the same `user_id + data.kind + booking_id + recipient_role + window_minutes`.
- Inserts in-app notifications:
  - `type = 'booking_reminder'`
  - `title = 'Upcoming session'`
  - `data.kind = 'booking_starting_soon'`
- Returns a summary output item with booking, created, skipped, missing-coach-user, and error counts.

File:

- Workflow export: `docs/automation/n8n/workflows/booking-reminders-v1.json`

Manual verification on 2026-04-30:

- Imported `GoFit Booking Reminders v1` into local n8n as workflow id `GoFitBookingRemindersV1`.
- Created a temporary manual-test copy in n8n as `GoFitBookingRemindersV1Manual`.
- First manual run found 1 confirmed booking inside the 60-minute window and created 2 `notifications` rows, one for the client and one for the coach.
- Rerun returned `skipped_existing_notification_count = 2` and `created_count = 0`.
- Supabase confirmed 2 rows with `data.kind = 'booking_starting_soon'` for booking `619944d5-ad84-46ed-b7a9-8085aabfce6c`.
