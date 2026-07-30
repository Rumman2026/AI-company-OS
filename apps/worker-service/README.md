# Worker Service

Agent-worker execution runtime: pulls routed-task jobs from
`packages/job-queue` and executes them through `packages/task-router`.
This app was already documented as the "Background job / worker
processor" placeholder (see [ARCHITECTURE.md](../../ARCHITECTURE.md)) —
per [DECISIONS.md](../../DECISIONS.md) ADR-0008, agent-worker execution
was implemented here rather than in a new, separate `apps/agent-worker`,
to avoid two competing worker apps.

Phase 1 / repository-preparation fidelity: in-memory job queue, no real
provider network call. `src/index.ts` demonstrates one job flowing
end-to-end through the router at startup.
