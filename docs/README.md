# GoFit Documentation Index

This folder contains project documentation for the GoFit platform. Use this
index as the starting point instead of treating every historical note as live
project status.

## Source Of Truth

For current implementation status, check the code first:

- `GoFitMobile/src/navigation/AppNavigator.tsx` - client mobile routes.
- `GoFitMobile/src/navigation/CoachAppNavigator.tsx` - coach mobile routes.
- `admin-panel/app/` - admin panel pages and API route groups.
- `supabase/functions/` - deployed Edge Function source.
- `database/migrations/` - database change history.

## Canonical Project Docs

- `../README.md` - repository overview and setup.
- `PROJECT_CONTEXT.md` - project background.
- `IMPLEMENTATION_PLAN.md` - broad product roadmap; verify against code before using as live status.
- `architecture/` - shared architecture references.
- `admin-panel/ADVANCED_BI_STAGE0_KPI_CONTRACT.md` - BI dashboard KPI contract.
- `automation/n8n/README.md` - n8n automation setup.

## Active Feature References

- `troubleshooting/BODY_MEASUREMENT_FIX_PLAN.md`
- `troubleshooting/BODY_MEASUREMENT_MEDIAPIPE_POSE_LANDMARKER_SPIKE.md`
- `troubleshooting/BODY_MEASUREMENT_STATISTICAL_MODEL_PLAN.md`
- `troubleshooting/BODY_MEASUREMENT_VALIDATION_PROTOCOL.md`

These remain active because body measurement is a complex feature with both
implementation and validation work.

## Database References

Use the root `database/` folder for database truth:

- `../database/README.md`
- `../database/migrations/`
- `../database/schema/`
- `../database/policies/`
- `../database/functions/`

Migration and production readiness checks should be verified against the
deployed Supabase project, not only against Markdown files.

## Historical / Archive-Only Docs

The following groups are useful for history but should not be used as live
task status without checking the code:

- `GoFitMobile/docs/audit/`
- `GoFitMobile/docs/implementation/REMAINING_TASKS.md`
- `GoFitMobile/docs/implementation/AUDIT_REMAINING.md`
- generated deployment payloads at the repo root
- old progress reports, internship reports, Gantt notes, and forms

Many items in those docs have already been implemented in the app.

## Notion Workspace

The live project operating system is in Notion:

- `GoFit Workboard` - current work and QA.
- `GoFit Feature Map` - app-truth feature status.
- `GoFit Backend Map` - backend/API/database/function surfaces.
- `GoFit Documentation Health` - doc cleanup state.

When docs and Notion disagree, verify the actual app code first.
