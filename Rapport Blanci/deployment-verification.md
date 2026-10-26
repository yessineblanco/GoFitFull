# Read-only Supabase deployment verification

Checked: 21 October 2026. Initial startup observations below are superseded by the successful ACTIVE_HEALTHY verification recorded in the next section.

## Successful verification after restoration

- Project status: ACTIVE_HEALTHY. The user also supplied a restoration/startup screenshot explaining the earlier incomplete observations.
- Recorded migration history: 60 entries, ranging from version 20260414111922 to 20260612111142. These are history versions, not assertions of sprint dates.
- Live public schema: 40 application tables. The expected GoFit tables are present.
- Local comparison: 101 SQL files under database/migrations; 57 recorded names match local filenames, three recorded names have no exact filename match, and 44 local scripts have no exact recorded-name match. Name comparison does not prove SQL-content equality or identify manually executed scripts.
- The five new persisted concepts in the Sprint 2 proposal have matching live tables and fields. Notification preferences and dietary collections exist on user_profiles and are nullable.
- nutrition_goals has PRIMARY KEY (user_id) and an account foreign key, confirming at most one goals record per account.
- meal_logs has required account/food foreign keys. Body measurements and progress photos reference accounts independently; there is no measurement-to-progress-photo foreign key in the checked structures.
- Sprint 1 ownership and session-reference constraints are confirmed too: account/profile identity, native/custom ownership rules, optional workout_id with ON DELETE SET NULL, and split-day junction uniqueness. Session snapshots remain JSON rather than separate set tables.
- Live workouts also retains legacy nullable columns (including exercise_id, duration, and notes). The approved domain view is deliberately selective; it is not an exhaustive database diagram.

The full history and local-name comparison are in `deployed-migration-inventory.md`. The structured metadata snapshot is `deployed-schema-check.json`. No user records were retrieved; only project and schema metadata were inspected. Deployed schema existence does not establish successful functional tests or exact historical sprint boundaries.

## Project identification

- Project: GoFit, reference `rdozeaacwaisgkpxjycn`.
- The CLI project reference, mobile environment URL, and admin environment URL all identify this project. Secret values were not printed or included in this record.
- Management API reports region `eu-central-1`, PostgreSQL engine 17, and database build `17.6.1.054`.
- Project status remained `COMING_UP` during the checks.

## Observed results

1. The initial migration-history request timed out. An alternative SELECT against migration history was refused while the database was starting.
2. After a bounded wait, the migration-list tool returned an empty migrations array.
3. An information_schema query found none of the requested GoFit application tables.
4. A separate pg_catalog query found no GoFit relations under another schema. The only relation named schema_migrations returned was auth.schema_migrations, which is not the application migration history.
5. A database diagnostic confirmed role postgres, database postgres, server version 17.6, zero public tables, and zero public views. The other visible schemas were Supabase infrastructure schemas.

The project was still marked COMING_UP after those queries. Do not interpret the empty migration list as proof that no local scripts were ever executed, or the missing application schema as proof of data loss. A healthy-state recheck and confirmation that this remains the intended deployment are needed before comparing deployed application constraints with the local models.

## Read-only diagnostic query

```sql
select json_build_object(
  'database', current_database(),
  'role', current_user,
  'default_schema', current_schema(),
  'server_version', current_setting('server_version'),
  'schemas', (
    select json_agg(s)
    from (
      select n.nspname as name,
        count(c.oid) filter (where c.relkind in ('r', 'p')) as tables,
        count(c.oid) filter (where c.relkind in ('v', 'm')) as views
      from pg_namespace n
      left join pg_class c on c.relnamespace = n.oid
      where n.nspname not like 'pg_%'
        and n.nspname <> 'information_schema'
      group by n.nspname order by n.nspname
    ) s
  )
) as diagnostic;
```

## Consequence for report revision

The initial startup observations were inconclusive. The later healthy-state check now supports the relevant Sprint 1 and Sprint 2 schema mappings using live columns and constraints as well as local source. Do not claim that all local scripts are registered migrations or that the deployed schema proves feature testing. Region and PostgreSQL metadata are available for the later architecture correction; other hosting/runtime claims still require their own evidence.

No migration, schema repair, restore, deployment, project lifecycle action, or data mutation was performed.
