# AI Routing and Token Policy

Status: durable reference. See [DECISIONS.md](../../DECISIONS.md)
ADR-0008. Describes `packages/task-router`'s routing sequence,
escalation rules, and the token-efficiency controls across
`packages/context-builder`, `packages/semantic-cache`, and
`packages/cost-controller`.

## AI routing sequence

Before calling any AI model, every task is routed through, in order:

1. Deterministic rules, approved templates, stored business facts, and
   database retrieval (`tryDeterministicResolution` in `TaskRouter.routeTask()`).
2. Z.AI/GLM for routine low-risk text, classification, summarization,
   CRM notes, and repetitive work.
3. DeepSeek for inexpensive fallback, batch processing, and bounded
   technical analysis — never called if GLM already succeeded.
4. Perplexity only when current web research is required.
5. Gemini for images, videos, visual analysis, and multimodal inputs.
6. OpenAI for customer-facing automation, structured tools, vision, and
   future voice workflows.
7. Kimi Code CLI for isolated coding and repository tasks.
8. Anthropic/Claude only for orchestration, complex reasoning, conflicts,
   high-impact outputs, security-sensitive code, and final review.

`packages/task-router/src/routing-policies.ts` assigns exactly one
primary provider per task type — never a chain that calls every
provider. See that file for the full table (lead qualification, customer
response, CRM summaries, commercial prospect research, SEO research,
content drafting, photo review, coding, debugging, website monitoring,
high-impact review).

## Escalation rules (`packages/policy-engine`'s `evaluateEscalation()`)

Escalate to Claude only when one of these is true: confidence below
threshold (default 0.7), business facts conflict, pricing/scope/
warranty/contract language is involved, the customer is upset, the
opportunity is a high-value lead, providers disagree materially, the
code affects security/auth/infrastructure/production, production
deployment or data modification is requested, the policy engine flags
the task, or owner approval is required. Routine low-risk outputs are
not escalated by default.

## Token-efficiency controls

| Control                                              | Implementation                                                                                                                                            |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Compact context packages                             | `packages/context-builder`'s `buildContextPackage()` — trims facts/summary to configured limits, never forwards a full repo/CRM history/long conversation |
| Exact-response caching                               | `packages/semantic-cache`'s `NormalizedKeyCache` (Phase 1: normalized-key exact match; true embedding similarity is future work)                          |
| Input/output token limits                            | `ProviderCapabilityDescriptor.inputTokenLimit` / `.outputTokenLimit`, enforced per request                                                                |
| Timeout and retry limits                             | `ProviderCapabilityDescriptor.timeoutMs` / `.retryPolicy`                                                                                                 |
| Duplicate-task avoidance                             | At most one primary call + one bounded fallback per task in `TaskRouter.routeTask()`; DeepSeek/GLM ordering explicitly avoids double-calling              |
| Budgets (daily/monthly, per-provider/agent/business) | `packages/cost-controller`'s `InMemoryCostController`                                                                                                     |
| Usage/cost logging                                   | `packages/audit-logger`'s `ConsoleAuditLogger`, recorded by the router on every call                                                                      |
| Structured JSON outputs                              | `AgentResponse.structuredResult`, validated by `validateStructuredResult()`                                                                               |

## GLM-only pilot task: `lead_inquiry_classification`

A narrower, GLM-only pilot task layered on top of the `lead-qualification`
routing policy above — see
[docs/cloud/GLM_SANDBOX_PILOT.md](GLM_SANDBOX_PILOT.md). It does not go
through `TaskRouter`'s general escalation-to-Claude/fallback-to-DeepSeek
path at all: it is a dedicated, hardened function
(`classifyLeadInquiry()` in `packages/provider-adapters/src/glm-lead-inquiry/`)
that only ever calls GLM, and on failure fails to a terminal status for
owner attention rather than escalating automatically to a second paid
provider. This is a deliberate, narrower exception to the general
routing sequence above, scoped to this one low-risk pilot only.

## What this does not do yet

No real token counting, no real provider billing reconciliation, no
persistent (Redis/Postgres-backed) cache or budget ledger — all of the
above run in-memory in this repository-preparation stage. See each
package's README for its specific Phase 1 scope note.
