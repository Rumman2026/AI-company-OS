# Hostinger VPS Setup

Status: durable reference — **manual steps documented, none executed**.
See [DECISIONS.md](../../DECISIONS.md) ADR-0008. No Hostinger account has
been connected from this repository; no VPS has been provisioned.

## Prerequisites (owner-side, not automatable from this repository)

1. Purchase/provision a Hostinger VPS plan sized for: reverse proxy,
   n8n, PostgreSQL, Redis, `apps/ai-gateway`, `apps/worker-service`
   (agent-worker role), and `infra/monitoring` running concurrently.
   Start with the smallest plan that fits these six containers'
   `mem_limit`/`cpus` values in `infra/docker/docker-compose.cloud.yml`
   (roughly 2 GB RAM / 2 vCPU as a starting estimate — confirm against
   actual measured usage before committing to a plan).
2. A domain or subdomain to point at the VPS (separate from
   `www.greencalpressurewashing.com`, which stays on Vercel per
   ADR-0006 — this VPS does not host any public website).

## Manual provisioning steps (future, explicitly authorized only)

1. **SSH-key-only access**: disable password authentication in `sshd_config`;
   add only the owner's public key(s) to `~/.ssh/authorized_keys`.
2. **Non-root deployment user**: create a dedicated user (e.g.
   `deploy`) with membership in the `docker` group; never run the stack
   as `root`.
3. **Firewall policy**: allow inbound only on SSH (restricted to known
   IPs if possible), and the reverse proxy's published ports (80/443,
   per `infra/docker/docker-compose.cloud.yml`). Deny all other inbound
   by default.
4. **Install Docker Engine + Docker Compose plugin** (official Docker
   install script or distribution package, matching the VPS OS).
5. **Clone this repository** (or a deploy-only export of
   `infra/docker/`) onto the VPS under the non-root deploy user's home
   directory.
6. **Copy `.env.cloud.example` to `.env.cloud`** and fill in real,
   never-committed values (database password, n8n encryption key,
   provider API keys per `docs/cloud/AI_PROVIDER_INTEGRATION.md`, budget
   limits per `docs/cloud/COST_CONTROL_POLICY.md`).
7. **Copy `reverse-proxy.conf.example` to `reverse-proxy.conf`** and
   `prometheus.yml.example` to `prometheus.yml`, filling in real routes/
   targets once the AI gateway and Jervis API have real HTTP servers.
8. **Run `docker compose -f infra/docker/docker-compose.cloud.yml up -d`**
   only after the above steps are complete and explicitly authorized.
9. **Configure the backup schedule**: install
   `infra/backups/backup-postgres.sh.example` (renamed, without the
   `.example` suffix) as a cron job on the VPS; verify a restore before
   relying on it in production.
10. **Point DNS** at the VPS only after the stack is verified healthy
    locally on the VPS (health checks passing, logs clean).

## Recovery procedure

Restore the most recent `pg_dump` archive (see
`infra/backups/README.md`) into a fresh `postgres` container, verify n8n
workflow integrity, then bring up the remaining services in dependency
order (`postgres` → `redis` → `n8n` → `ai-gateway`/`agent-worker` →
`monitoring` → `reverse-proxy`).

## Emergency shutdown

`docker compose -f infra/docker/docker-compose.cloud.yml down` stops the
entire stack. For a narrower stop, use `apps/jervis-api`'s
`ControlPlane.engageProviderKillSwitch()` / `engageAgentKillSwitch()`
instead of stopping containers.

## Not done by this document

This document describes steps; it does not perform them. No credential,
DNS record, or container has been created as a result of writing this
file.
