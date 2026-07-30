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
