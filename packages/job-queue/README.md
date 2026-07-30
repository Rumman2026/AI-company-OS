# Job Queue Package

Bounded async work handoff between n8n/`apps/ai-gateway` and
`apps/worker-service` (agent-worker execution role). `InMemoryJobQueue`
is a real, tested implementation for this repository-preparation stage;
a Redis-backed implementation on the Hostinger VPS is future work — see
[docs/cloud/CLOUD_ARCHITECTURE.md](../../docs/cloud/CLOUD_ARCHITECTURE.md).

New, non-duplicating package — see [DECISIONS.md](../../DECISIONS.md)
ADR-0008.
