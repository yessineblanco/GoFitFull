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

The service role key must stay inside n8n. It should not be added to the mobile app, admin panel client code, `.env.example`, or workflow JSON.

## Local Self-host Quick Start

For a first local test:

```powershell
docker volume create n8n_data
docker run --rm -it `
  --name gofit-n8n `
  -p 5678:5678 `
  -v n8n_data:/home/node/.n8n `
  -e SUPABASE_URL="https://<project-ref>.supabase.co" `
  -e SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" `
  -e GROQ_API_KEY="<groq-api-key>" `
  n8nio/n8n
```

Open `http://localhost:5678`, create the owner account, and import `workflows/ai-session-prep-v1.json`.

## Workflow: AI Session Prep v1

File: `workflows/ai-session-prep-v1.json`

Behavior:

- Runs every 60 minutes.
- Finds confirmed bookings scheduled in the next 24 hours.
- Skips a booking when an unexpired `ai_session_notes` row already exists for the same coach/client pair.
- Fetches recent client context from Supabase.
- Calls Groq directly from n8n.
- Inserts an `ai_session_notes` row.
- Inserts one coach in-app notification row using the existing `booking_reminder` type and `data.kind = "ai_session_ready"`.

## Manual Verification

1. Create or find one `bookings` row with `status = 'confirmed'` and `scheduled_at` within the next 24 hours.
2. Run the workflow manually in n8n.
3. Confirm a row appears in `public.ai_session_notes`.
4. Confirm a row appears in `public.notifications` for the coach user.
5. Run the workflow again and confirm it reports the booking as skipped while the note is unexpired.

## Notes

- This workflow intentionally does not call the `ai-session-notes` Edge Function. That function is designed for an authenticated coach action; n8n v1 uses the Supabase service role directly.
- This workflow intentionally does not send push notifications. Push delivery can be added later after token, retry, and failure handling are reviewed.
- Clients never read `ai_session_notes` through normal app access because the table has coach-only RLS for authenticated app users.
