# GoFit Project Context

## Product

GoFit combines a member-facing fitness application, coach workflows, an administration panel, Supabase backend services, and n8n automations.

## Architecture

| Area | Current implementation |
| --- | --- |
| Mobile | Expo SDK 54, React Native 0.81, React Navigation stack/tab navigators, TypeScript, React Native `StyleSheet` and shared theme tokens |
| Admin | Next.js 16, React 19, TypeScript, Tailwind CSS 3.4 |
| Backend | Supabase PostgreSQL, Auth, Storage, Realtime, and Edge Functions |
| Automation | n8n workflows for scheduled and event-driven operations |

## Implemented Product Areas

- Member and coach authentication, onboarding, profiles, and role-aware navigation
- Workout planning, exercise logging, progress tracking, body measurements, and health-data persistence
- Nutrition logging, barcode lookup, recipes, saved meals, and coach nutrition review
- Coach discovery, marketplace profiles, booking, messaging, and administrative moderation
- AI-assisted workout, nutrition, recovery, and coach-session workflows
- Admin analytics, BI KPI reporting, user and coach management, marketplace operations, and content administration

Implemented does not mean every workflow is release-complete. Verification, production hardening, payment follow-ups, and advanced AI coaching remain tracked in [ROADMAP.md](ROADMAP.md).

## Security Boundaries

- Mobile and browser code may use only public Supabase configuration.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be committed or exposed through `EXPO_PUBLIC_*` or `NEXT_PUBLIC_*` variables.
- Row Level Security and server-side authorization remain mandatory even when UI access is role-gated.
- Documentation examples must use explicit placeholders rather than live credentials or signed asset URLs.

## Sources Of Truth

1. Executable code and database migrations
2. [ROADMAP.md](ROADMAP.md) for remaining work
3. Current subsystem README files
4. Archived documents only as historical context
