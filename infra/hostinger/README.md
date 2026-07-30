# Hostinger VPS

Target deployment platform for the reverse proxy, n8n, PostgreSQL,
Redis, `apps/ai-gateway`, `apps/worker-service` (agent-worker role), and
`infra/monitoring`, per [DECISIONS.md](../../DECISIONS.md) ADR-0008.

**Nothing here is provisioned.** No VPS has been created or connected to
from this repository. See
[docs/cloud/HOSTINGER_VPS_SETUP.md](../../docs/cloud/HOSTINGER_VPS_SETUP.md)
for the exact manual steps required once the owner authorizes
provisioning — SSH-key-only access, non-root deployment user, firewall
policy, and the Docker Compose stack in `infra/docker/`.

Phase 1 includes only this planning scaffold.
