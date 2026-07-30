# Agent SDK Package

Shared AI agent interfaces and provider-neutral plugin contracts for AI
Company OS: `ProviderId`, `TaskType`, `ProviderCapabilityDescriptor`,
`ProviderAdapter`, `AgentRequest`/`AgentResponse`, and routing/escalation
types. See `src/types.ts`.

Per [DECISIONS.md](../../DECISIONS.md) ADR-0008, this package is the
single home for agent/provider contracts — a separate `agent-contracts`
package was considered and rejected to avoid two packages claiming the
same documented purpose.

Consumed by `packages/provider-adapters`, `packages/task-router`,
`packages/context-builder`, `packages/policy-engine`,
`packages/cost-controller`, `packages/audit-logger`, `apps/ai-gateway`,
`apps/jervis-api`, and `apps/worker-service` (agent-worker role).

No network calls originate from this package — it is types only.
