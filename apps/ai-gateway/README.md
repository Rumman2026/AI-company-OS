# AI Gateway

Provider-neutral AI routing gateway: the single entry point that wires
`packages/task-router`, `packages/context-builder`,
`packages/semantic-cache`, `packages/policy-engine`,
`packages/cost-controller`, `packages/audit-logger`, and
`packages/provider-adapters` together.

**Distinct from `apps/api-gateway`** (existing, documented as "API
gateway / edge service" for the platform's own APIs) — this app routes
tasks to external AI providers, `api-gateway` does not. See
[DECISIONS.md](../../DECISIONS.md) ADR-0008 and
[docs/cloud/CLOUD_ARCHITECTURE.md](../../docs/cloud/CLOUD_ARCHITECTURE.md).

Phase 1 / repository-preparation fidelity: no HTTP server, no real
provider network call, no credential read. `src/index.ts` demonstrates
the real wiring end-to-end and logs the routing decision.
