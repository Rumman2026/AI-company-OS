# Backup and Recovery

Status: **procedure documented, not yet executable** — depends on the
Hostinger VPS (not provisioned) for the Postgres/n8n/config backups
described in `infra/backups/`. Supabase (the real, currently-live data
store for GreenCal leads) has its own backup story, addressed
separately below since it does not depend on Hostinger at all.

## Supabase (the live lead data store — relevant today)

Supabase automatically manages backups for hosted projects (point-in-
time recovery availability depends on the project's plan tier — this
session has no visibility into which tier the owner's project uses).
**Owner action recommended**: confirm the GreenCal Supabase project's
backup/PITR settings in the Supabase dashboard
(Project → Settings → Database → Backups) and note the retention window
here once confirmed. This is independent of anything in this repository
and does not block launch — Supabase's own infrastructure already
protects this data.

## Hostinger-hosted services (Postgres for n8n, Redis, n8n workflows)

Not yet applicable — no VPS is provisioned. Once it is:

1. `infra/backups/backup-postgres.sh.example` — a template cron script
   for `pg_dump`-based Postgres backups (n8n's own database, not
   GreenCal's Supabase data, which is separate).
2. Schedule via cron on the VPS once provisioned (see
   `docs/cloud/HOSTINGER_VPS_SETUP.md`).
3. **Recovery procedure**: restore the most recent `pg_dump` archive
   into a fresh `postgres` container, verify n8n workflow integrity,
   then bring the rest of the stack up in dependency order (postgres →
   redis → n8n → ai-gateway/agent-worker → monitoring → reverse-proxy).
4. **Backup failure notification**: not yet implemented — recommended
   future work once real backups are running (e.g. a cron job that
   alerts if the expected backup file didn't appear).

## This session's verification

No backup was "run" this session in the literal sense the sprint plan
asked for, because there is no Hostinger Postgres/n8n instance yet to
back up. This is reported honestly rather than fabricating a backup
artifact for infrastructure that doesn't exist. The Supabase data (the
part that actually matters for real leads today) is backed by Supabase's
own managed infrastructure, not anything this repository controls.
