# GoFit n8n Automations

This folder contains portable n8n workflow exports for GoFit operational automations.

The v1 default is self-hosted n8n Community Edition because it is the practical free path. n8n Cloud is easier to start with, but should be treated as a trial or paid hosted option.

## Secrets

Do not commit secrets. The workflow export uses environment-variable expressions so it can be imported without leaking credential IDs.

Set these values in the n8n runtime environment or translate them into n8n credentials after import:

```text
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
GROQ_API_KEY=<groq-api-key>
```

`GROQ_API_KEY` is required only for `ai-session-prep-v1.json`. The other v1 workflows use Supabase only.

The service role key must stay inside n8n. It should not be added to the mobile app, admin panel client code, `.env.example`, or workflow JSON.

## Local Self-host Quick Start

For a first local test:

```powershell
docker volume create n8n_data
docker run --rm -it `
  --name gofit-n8n `
  -p 127.0.0.1:18080:5678 `
  -v n8n_data:/home/node/.n8n `
  -e SUPABASE_URL="https://<project-ref>.supabase.co" `
  -e SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" `
  -e GROQ_API_KEY="<groq-api-key>" `
  -e N8N_BLOCK_ENV_ACCESS_IN_NODE=false `
  n8nio/n8n
```

Open `http://localhost:18080`, create the owner account, and import the workflow JSON files from `workflows/`.

## Workflow: AI Session Prep v1

File: `workflows/ai-session-prep-v1.json`

Canvas:

- The exported workflow keeps the executable path small and tested: schedule trigger into one Code node.
- Sticky-note stage cards document the schedule window, duplicate guard, context fetch, AI save/notify step, and run summary on the n8n canvas.

Behavior:

- Runs every 60 minutes.
- Finds confirmed bookings scheduled in the next 24 hours.
- Skips a booking when an unexpired `ai_session_notes` row already exists for the same coach/client pair.
- Fetches recent client context from Supabase.
- Calls Groq directly from n8n.
- Inserts an `ai_session_notes` row.
- Inserts one coach in-app notification row using the existing `booking_reminder` type and `data.kind = "ai_session_ready"`.
- Returns a summary item with generated, skipped, repaired-notification, and error counts.
- If an unexpired note already exists, verifies the coach notification exists instead of creating duplicates.

## Workflow: Check-in Reminders v1

File: `workflows/check-in-reminders-v1.json`

Canvas:

- Schedule trigger into one Code node.
- Sticky-note stage cards document the schedule, due check, skip rules, client notification, and run summary.

Behavior:

- Runs every 4 hours.
- Finds enabled `check_in_schedules`.
- Uses UTC date/time for due checks.
- Skips clients who already submitted a `check_in_responses` row for today.
- Skips duplicate `notifications` rows for the same client, schedule, and response date.
- Inserts one client notification row using `type = "booking_reminder"` and `data.kind = "check_in_due"`.
- Returns a summary item plus one result item per schedule.

## Workflow: Coach Daily Digest v1

File: `workflows/coach-daily-digest-v1.json`

Canvas:

- Schedule trigger into one Code node.
- Sticky-note stage cards document signal collection, duplicate guard, coach notification, and run summary.

Behavior:

- Runs daily.
- Finds coach profiles with a linked `user_id`.
- Counts missed check-ins, low wellness responses, upcoming confirmed bookings, and inactive clients.
- Skips coaches with no useful signal.
- Skips duplicate digest notifications for the same coach user and UTC digest date.
- Inserts one coach notification row using `type = "booking_reminder"` and `data.kind = "coach_daily_digest"`.
- Returns a summary item plus one result item per coach.

## Workflow: Admin Ops Digest v1

File: `workflows/admin-ops-digest-v1.json`

Canvas:

- Schedule trigger into one Code node.
- Sticky-note stage cards document admin discovery, ops counts, duplicate guard, and run summary.

Behavior:

- Runs daily.
- Finds admins with `user_profiles.is_admin = true`.
- Summarizes the last 24 hours of new users, pending coaches, booking outcomes, and pack purchases.
- Uses `automation_failures_count = 0` in v1 because GoFit does not yet persist automation-run failures.
- Skips duplicate admin digests by `admin_user_id`, title, and deterministic date `href`.
- Inserts one `admin_notifications` row per admin using `type = "info"`.
- Returns a summary item plus one result item per admin.

## Workflow: Booking Reminders v1

File: `workflows/booking-reminders-v1.json`

Canvas:

- Schedule trigger into one Code node.
- Sticky-note stage cards document the reminder window, recipients, duplicate guard, notification insert, and run summary.

Behavior:

- Runs every 15 minutes.
- Finds confirmed bookings starting in the next 60 minutes.
- Creates reminders for both the client user and coach user.
- Skips duplicate reminders for the same booking, recipient role, and reminder window.
- Inserts notification rows using `type = "booking_reminder"` and `data.kind = "booking_starting_soon"`.
- Returns a summary item plus one result item per booking recipient.

## Manual Verification

For AI Session Prep:

1. Create or find one `bookings` row with `status = 'confirmed'` and `scheduled_at` within the next 24 hours.
2. Run the workflow manually in n8n.
3. Confirm a row appears in `public.ai_session_notes`.
4. Confirm a row appears in `public.notifications` for the coach user.
5. Run the workflow again and confirm it reports the booking as skipped while the note is unexpired.
6. Check the first output item for the run summary counts.

For Check-in Reminders:

1. Create or find one enabled `check_in_schedules` row due today in UTC.
2. Confirm no `check_in_responses` row exists for the same client, coach, and response date.
3. Run the workflow manually.
4. Confirm one client `notifications` row exists with `data.kind = "check_in_due"`.
5. Run again and confirm no duplicate notification is created.

For Coach Daily Digest:

1. Create or find a coach with at least one digest signal.
2. Run the workflow manually.
3. Confirm one coach `notifications` row exists with `data.kind = "coach_daily_digest"`.
4. Run again and confirm no duplicate digest notification is created for the same UTC date.

For Admin Ops Digest:

1. Confirm at least one `user_profiles` row has `is_admin = true`.
2. Run the workflow manually.
3. Confirm one `admin_notifications` row exists per admin with title `Daily ops digest`.
4. Run again and confirm no duplicate admin digest is created for the same UTC date.

For Booking Reminders:

1. Create or find one confirmed `bookings` row starting within the next 60 minutes.
2. Run the workflow manually.
3. Confirm one client and one coach `notifications` row exist with `data.kind = "booking_starting_soon"`.
4. Run again and confirm no duplicate reminder is created while the same 60-minute window is active.

## Notes

- This workflow intentionally does not call the `ai-session-notes` Edge Function. That function is designed for an authenticated coach action; n8n v1 uses the Supabase service role directly.
- These workflows intentionally do not send push notifications. Push delivery can be added later after token, retry, and failure handling are reviewed.
- Clients never read `ai_session_notes` through normal app access because the table has coach-only RLS for authenticated app users.
- Daily workflows use UTC dates in v1. Timezone-aware scheduling can be layered later if GoFit adds client/coach timezone settings.
