# Task Router Package

Deterministic-first task routing framework for the AI gateway:
`TaskRouter.routeTask()` checks for a deterministic resolution first,
then selects exactly one primary provider per task type (`routing-policies.ts`),
escalates only when `packages/policy-engine`'s `evaluateEscalation()`
flags a defined condition, and allows at most one bounded fallback
attempt via a provider's `substitutionRules` — never a chain that calls
every provider for the same task.

Also exports `RoutedTaskJob` - the shared job-queue payload shape for
anything that will flow through `routeTask()`, used by both
`apps/agent-orchestrator` (enqueues it, after authorizing which named
agent may handle the task type) and `apps/worker-service` (dequeues and
executes it) - see [DECISIONS.md](../../DECISIONS.md) ADR-0017.

Complements `apps/agent-orchestrator` (documented in
[ARCHITECTURE.md](../../ARCHITECTURE.md) as the "Agent orchestration
engine"): the orchestrator app is the runtime surface that decides which
named agent is authorized for a task before routing; this package is the
routing logic library `apps/worker-service` (and, eventually,
`apps/ai-gateway`) invokes once a task has been queued. New,
non-duplicating package — see [DECISIONS.md](../../DECISIONS.md)
ADR-0008.
