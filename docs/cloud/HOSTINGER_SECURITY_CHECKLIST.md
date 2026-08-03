# Hostinger Security Checklist

Status: checklist for the owner (or a future session with explicit VPS
access) to work through **at actual provisioning time**. Nothing on
this list has been performed — no VPS exists yet.

- [ ] SSH-key-only authentication; password authentication disabled in
      `sshd_config`.
- [ ] A dedicated non-root deployment user (e.g. `deploy`), member of
      the `docker` group; the stack never runs as `root`.
- [ ] Firewall (`ufw` or provider firewall) allows inbound only on SSH
      (ideally restricted to known IPs) and the reverse proxy's
      published ports (80/443). Everything else denied by default.
- [ ] Automatic security updates enabled (`unattended-upgrades` on
      Ubuntu, or the distribution's equivalent).
- [ ] Docker Engine + Compose plugin installed via the official method
      for the chosen OS.
- [ ] `infra/docker/.env.cloud.example` copied to `.env.cloud` with real
      values, never committed to Git (already covered by `.gitignore`'s
      `.env.cloud` entry).
- [ ] PostgreSQL and Redis are **not** published to any public port —
      only reachable from other containers on the private Docker
      network defined in `docker-compose.cloud.yml`.
- [ ] n8n is reachable only through the reverse proxy over HTTPS, with
      authentication enabled — never exposed directly on its raw port.
- [ ] Monitoring's administration surface (if any) is not publicly
      reachable without authentication.
- [ ] Named volumes used for all persistent data (Postgres, Redis, n8n)
      — verified present in `docker-compose.cloud.yml`.
- [ ] Backup cron job installed and one real backup run performed (see
      `docs/cloud/BACKUP_AND_RECOVERY.md`).
- [ ] Recovery procedure tested at least once in a non-production
      context before relying on it.
- [ ] Emergency shutdown procedure documented and understood
      (`docker compose down`, or the reverse-proxy-level equivalent).

This checklist intentionally duplicates nothing from
`docs/cloud/HOSTINGER_VPS_SETUP.md` in narrative form — it is the
short, actionable verification pass to run through once that setup is
performed.
