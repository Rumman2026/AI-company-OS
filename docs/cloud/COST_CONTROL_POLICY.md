# Cost Control Policy

Status: durable reference. See [DECISIONS.md](../../DECISIONS.md)
ADR-0008. Describes `packages/cost-controller`'s budget model.

## Budget scopes

`BudgetScope` is one of `global`, `provider`, `agent`, or `business`.
Each scope tracks its own daily and monthly spend independently via
`InMemoryCostController.setBudget()` / `.recordSpend()` / `.getStatus()`.

## Suggested default limits (placeholders — owner sets real values later)

| Scope                                                    | Daily                                                        | Monthly |
| -------------------------------------------------------- | ------------------------------------------------------------ | ------- |
| Global                                                   | $25                                                          | $400    |
| Per business (e.g., GreenCal Pressure Washing)           | $10                                                          | $150    |
| Per agent (e.g., GreenCal Website and Lead Health Agent) | $2                                                           | $30     |
| Per provider                                             | See each `ProviderCapabilityDescriptor.budgetLimitUsdPerDay` | —       |

These are illustrative starting points, not owner-confirmed limits — set
real values through `apps/jervis-api`'s control plane once real spend is
possible.

## Kill switches

`InMemoryCostController.engageKillSwitch(scope, scopeId)` forces
`getStatus().withinBudget` to `false` regardless of remaining budget —
used for an emergency stop on a specific provider, agent, or business
without waiting for the budget to actually run out.
`releaseKillSwitch()` reverses it. Both are owner-only actions exposed
through `apps/jervis-api`.

## Usage and cost logging

Every routed task's `UsageMetadata` (input/output tokens, latency) and
`CostMetadata` (estimated cost, currency) are recorded by
`packages/audit-logger` alongside the routing decision — see
`TaskRouter.routeTask()`'s final `auditLogger.record()` call.

## GLM sandbox pilot budget (`glm-lead-inquiry-pilot`)

A separate, tighter budget scope for the `lead_inquiry_classification`
pilot only — distinct from the general `zai-glm` provider-level default
above, since the pilot is deliberately more conservative than GLM's
broader task types. Configured via `agent` scope, id
`glm-lead-inquiry-pilot`
(`packages/provider-adapters/src/glm-lead-inquiry/pilot-budget.ts`):
$1.00/day, $15.00/month, $0.02 max single-task cost, a $0.90 auto-shutdown
threshold (engages the pilot's kill switch automatically once reached —
owner action required to release it), and a $0.50 alert threshold
(audit-only, does not block calls). See
[docs/cloud/GLM_SANDBOX_PILOT.md](GLM_SANDBOX_PILOT.md) Stage 2 for the
full derivation of each figure from confirmed GLM-4.5-Air pricing.

## What this does not do yet

- No real spend exists — every provider adapter is a placeholder
  returning `estimatedCostUsd: 0`, so `recordSpend()` is never actually
  invoked with a nonzero amount in this stage.
- No persistent ledger — budgets and spend records are in-memory only;
  a Redis/Postgres-backed ledger on the Hostinger VPS is future work.
- No real per-token cost calculation from actual provider usage
  responses — `ProviderCapabilityDescriptor.costPerInputTokenUsd`/
  `.costPerOutputTokenUsd` are illustrative placeholders (see
  [docs/cloud/AI_PROVIDER_INTEGRATION.md](AI_PROVIDER_INTEGRATION.md)).
