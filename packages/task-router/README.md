# Task Router Package

Deterministic-first task routing framework for the AI gateway:
`TaskRouter.routeTask()` checks for a deterministic resolution first,
then selects exactly one primary provider per task type (`routing-policies.ts`),
escalates only when `packages/policy-engine`'s `evaluateEscalation()`
flags a defined condition, and allows at most one bounded fallback
attempt via a provider's `substitutionRules` — never a chain that calls
every provider for the same task.

Complements `apps/agent-orchestrator` (documented in
[ARCHITECTURE.md](../../ARCHITECTURE.md) as the "Agent orchestration
engine," still an empty Phase 1 placeholder): the orchestrator app is the
future runtime surface; this package is the routing logic library it
(and `apps/ai-gateway`) will consume. New, non-duplicating package — see
[DECISIONS.md](../../DECISIONS.md) ADR-0008.
