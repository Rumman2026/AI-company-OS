# Docker (Hostinger VPS cloud stack templates)

`docker-compose.cloud.yml` is a **template** for the future Hostinger VPS
stack — reverse proxy, PostgreSQL, Redis, n8n, `apps/ai-gateway`,
`apps/worker-service` (agent-worker role), and a monitoring service.
Separate from the root `docker-compose.dev.yml` (local dev services on
ports 3000-3002/4000-4003) — this file is not wired into local dev and is
never invoked by CI.

**Not deployed.** No container from this file has been built, started,
or provisioned anywhere. `.env.cloud.example` contains placeholder
variable names and non-sensitive defaults only — copy it to `.env.cloud`
and fill in real values only at actual provisioning time (a separate,
explicitly authorized future step).

## Design notes

- All application/data services sit on an internal, non-externally-routed
  `backend` network. Only `reverse-proxy` publishes ports to the host.
- `postgres`, `redis`, `n8n`, and `monitoring` use official images that
  already run as non-root, or are given an explicit non-root `user`.
  `ai-gateway` and `agent-worker` run as the `node` user (built into the
  `node:20-alpine` base image).
- `ai-gateway` and `agent-worker` currently run `src/index.ts`'s
  one-shot demonstration entrypoint (see their app READMEs), not a real
  long-running server — `restart: "no"` reflects that honestly. Switch
  to `restart: unless-stopped` once a real long-running gateway/worker
  loop is implemented.
- Named volumes (`postgres_data`, `redis_data`, `n8n_data`,
  `prometheus_data`) persist data across container restarts.
- `infra/backups/backup-postgres.sh.example` documents the intended
  backup hook for the `postgres` volume — not wired in as a running
  sidecar in this template.
- Every service sets `logging.driver: json-file` with `max-size`/
  `max-file` to bound local log growth.
