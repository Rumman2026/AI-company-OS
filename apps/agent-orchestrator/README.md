# Agent Orchestrator

Jervis's orchestration engine: decides which named agent
(`src/agent-registry.ts`) is authorized to handle a task, before
anything is enqueued for `apps/worker-service` to execute. See
[DECISIONS.md](../../DECISIONS.md) ADR-0017 for the full rationale,
including why this is a distinct concern from `apps/jervis-api`
(owner-facing control: health/budget/kill switches) and
`apps/worker-service` (execution: drains the queue and runs
`packages/task-router`).

## What this app contains

- `src/agent-registry.ts` - the named specialist agents Jervis
  coordinates (Emma + Estimate/Scheduling/Operations/Review/SEO/Media/
  Follow-up agents), each mapped to the subset of `packages/agent-sdk`'s
  existing `TaskType` union it is permitted to handle. No new task types
  were invented - see the ADR for why.
- `src/orchestrator.ts` - `AgentOrchestrator.assignTask()`: rejects an
  unauthorized agent/task-type pairing before it ever reaches the job
  queue or a provider (audit-logged either way); an authorized
  assignment is enqueued onto the same `agent-worker` queue
  `apps/worker-service` already drains, via the shared
  `RoutedTaskJob` type (`packages/task-router`).

Phase 1 / repository-preparation fidelity: in-memory job queue, no real
provider network call anywhere behind this. `src/index.ts` demonstrates
one authorized assignment and one rejected assignment at startup.

## Scripts

- `pnpm run lint` - ESLint
- `pnpm run typecheck` - `tsc --noEmit`
- `pnpm run test` - `tsx --test "tests/**/*.test.ts"`
- `pnpm run dev` - runs `src/index.ts`'s demonstration
- `pnpm run format` - Prettier
