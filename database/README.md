# GoFit Database

The database is managed through versioned Supabase migrations. The migration directory and the live schema are the source of truth; do not rely on old setup summaries or fixed migration counts.

## Workflow

1. Review migrations in `supabase/migrations/`.
2. Apply schema changes through a new migration.
3. Verify Row Level Security, grants, indexes, and function search paths.
4. Run the Supabase security and performance advisors after DDL changes.
5. Update current documentation when a schema change alters a product contract.

## Security

- Public clients use only the project URL and public anon or publishable key.
- The service-role key is restricted to trusted server environments.
- RLS policies and server authorization protect data independently of the UI.
- Committed examples must use placeholders.

Historical database next-step notes are preserved under [../docs/archive/obsolete-status/database/](../docs/archive/obsolete-status/database/). Remaining database work is tracked in [../docs/ROADMAP.md](../docs/ROADMAP.md).
