# Backups

Backup schedule and recovery procedure for the Hostinger VPS stack's
PostgreSQL (n8n + infra-owned data) and Redis (if persistence is
enabled). `backup-postgres.sh.example` is a placeholder script template
— not executable in this repository, not scheduled, not run.

**Recovery procedure (documented, not implemented)**: restore the most
recent `pg_dump` archive to a fresh PostgreSQL container, verify n8n
workflow integrity, then resume the reverse proxy and dependent
services. See
[docs/cloud/HOSTINGER_VPS_SETUP.md](../../docs/cloud/HOSTINGER_VPS_SETUP.md)
for the full runbook once provisioning is authorized.

Phase 1 includes only this planning scaffold and template.
