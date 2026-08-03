# GLM Sandbox Pilot — `lead_inquiry_classification`

Status: durable reference for the AI Provider Configuration Validation
and GLM Sandbox Pilot Preparation stage. Repository-preparation only —
see the scope note at the end of this document. No real Z.AI/GLM
account is connected, no real API call has been made, and no other
provider (OpenAI, Anthropic API, Gemini, DeepSeek, Perplexity, Kimi) is
activated by this stage.

## Stage 1 — Configuration audit

Every provider-descriptor and routing/budget value used by this pilot,
categorized honestly rather than treated as uniformly "real":

| Value                                                                                                                          | Category                                   | Basis                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GLM model ids (`glm-4.5-air`, `glm-4.6`, `glm-5.2`)                                                                            | 1. Confirmed                               | docs.z.ai pricing/model pages, fetched 2026-08-03                                                                                                                         |
| GLM-4.6 context window: 200,000 input / 128,000 output tokens                                                                  | 1. Confirmed                               | docs.z.ai's GLM-4.6 page, fetched 2026-08-03 ("expanded from 128K to 200K tokens", max output 128K)                                                                       |
| GLM-4.5-Air pricing: $0.20/1M input, $1.10/1M output                                                                           | 1. Confirmed                               | docs.z.ai pricing page, fetched 2026-08-03                                                                                                                                |
| GLM-4.6 pricing: $0.60/1M input, $2.20/1M output                                                                               | 1. Confirmed                               | docs.z.ai pricing page, fetched 2026-08-03 (not the pilot's default model — shown for comparison)                                                                         |
| `zaiGlmDescriptor.costPerInputTokenUsd`/`costPerOutputTokenUsd` (set to GLM-4.5-Air's rate)                                    | 1. Confirmed, for GLM-4.5-Air specifically | See note below — the descriptor has one flat rate for the whole provider; it does not vary per model yet                                                                  |
| `zaiGlmDescriptor.timeoutMs` (20s), `retryPolicy` (2 retries / 1s backoff), `rateLimit` (60 rpm), `budgetLimitUsdPerDay` ($10) | 2. Safe internal default                   | Not provider-confirmed; conservative, configurable, unchanged from the original infrastructure-preparation stage                                                          |
| Pilot budget defaults (Stage 2 below)                                                                                          | 2. Safe internal default                   | Derived from confirmed GLM-4.5-Air pricing; deliberately far below any plausible real limit                                                                               |
| Real per-account rate limit / quota tier                                                                                       | 4. Blocked from live use                   | Z.ai's public docs do not state a fixed rate limit — it is account/plan-dependent and cannot be confirmed without a real account, which does not exist in this repository |
| GLM-4.6V / GLM-OCR / other vision-model pricing                                                                                | Not applicable to this pilot               | Out of scope — this pilot is text-only classification                                                                                                                     |

**Known simplification**: `ProviderCapabilityDescriptor` (packages/agent-sdk)
has a single `costPerInputTokenUsd`/`costPerOutputTokenUsd` pair per
provider, not per model, even though `modelAllowlist` now lists three
real models at three different confirmed price points. The descriptor
is set to GLM-4.5-Air's rate because that is the pilot's recommended
default model (cheapest listed model capable of structured
classification). Extending the descriptor to per-model pricing is
recommended future work, not done in this stage to avoid a wider,
unrequested schema change across all seven provider adapters.

## Stage 2 — Pilot budget policy

Conservative, fully configurable defaults
(`packages/provider-adapters/src/glm-lead-inquiry/pilot-budget.ts`,
`GLM_PILOT_BUDGET_DEFAULTS`), scoped separately from GLM's general
`zaiGlmDescriptor` defaults (which remain broader, covering GLM's other
task types — coding, content-drafting, etc.):

| Limit                     | Value                      | Derivation                                                                                                                                                                    |
| ------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Max input tokens/request  | 2,000                      | Far below GLM-4.6's confirmed 200K window — a lead inquiry is always short                                                                                                    |
| Max output tokens/request | 500                        | A structured classification result is small                                                                                                                                   |
| Max requests/minute       | 10                         | Conservative; real per-account limits are unconfirmed (category 4)                                                                                                            |
| Max retries               | 2                          | Matches the general GLM descriptor's default                                                                                                                                  |
| Request timeout           | 15,000 ms                  | Conservative; tighter than the general 20s default                                                                                                                            |
| Daily spend limit         | $1.00                      | Deliberately tiny for a pilot                                                                                                                                                 |
| Monthly spend limit       | $15.00                     | Deliberately tiny for a pilot                                                                                                                                                 |
| Max single-task cost      | $0.02                      | ~20x a realistic task cost at GLM-4.5-Air pricing (2,000 in + 500 out tokens ≈ $0.0009) — a generous but bounded backstop against a misconfigured or abnormally large request |
| Auto-shutdown threshold   | $0.90 (90% of daily limit) | Engages the pilot's kill switch automatically — a one-way trip, owner must release it                                                                                         |
| Alert threshold           | $0.50 (50% of daily limit) | Emits an audit "budget-alert" event without blocking calls                                                                                                                    |

None of these are unlimited, and none are hardcoded — every value is a
parameter with a documented default, overridable per call.

## Stage 3 — Pilot scope: `lead_inquiry_classification`

Scoped narrowly. The pilot **may**: classify an inquiry's intent
(`residential` / `commercial` / `hoa` / `multi-family` / `unclear` /
`spam` / `out-of-scope`), summarize the request, list missing
information, recommend one of a fixed set of approved next-step
templates, provide a 0–1 confidence indicator, and return strict
structured JSON (`LeadInquiryClassificationResult`).

The pilot **must not**, and is structurally prevented from: quoting
pricing, promising availability, or making guarantees (every free-text
field is scanned for forbidden claim patterns — dollar amounts,
"guarantee", "promise", availability phrasing — and the whole response
is rejected as invalid if any are found); sending messages to customers
(the pilot has no send/notify capability at all — it returns a
classification, nothing more); modifying CRM data (no write path
exists); accessing production systems or credentials (no such
dependency exists in this module); triggering another provider (the
pilot's `classifyLeadInquiry()` only ever calls the one injected GLM
function — no other adapter is imported or reachable); or escalating
automatically to a paid second provider (on failure it fails to a
terminal status — `provider-disabled`, `budget-denied`, `timeout`,
`retry-exhausted`, `invalid-response` — for owner attention, never a
silent handoff to Claude or anyone else).

## Stage 4 — Adapter improvements

`packages/provider-adapters/src/glm-lead-inquiry/`:

- **Strict request/response schema** — `types.ts`, `validation.ts`.
- **Runtime validation** — `validateLeadInquiryClassificationRequest()`/
  `validateLeadInquiryClassificationResult()`; unknown/malformed shapes
  are rejected, never silently coerced.
- **Timeout behavior** — every model call races a configurable deadline
  (`withTimeout()`); a hang never blocks indefinitely.
- **Bounded retry behavior** — up to `maxRetries + 1` attempts with a
  fixed backoff, never unbounded.
- **Secret-safe logging** — every audit event runs through
  `packages/audit-logger`'s existing `redactSecrets()` (reused, not
  reimplemented).
- **Usage tracking / cost-estimation hooks** — deterministic token
  estimation (`estimateTokens()`) feeding `costPerInputTokenUsd`/
  `costPerOutputTokenUsd` from the descriptor.
- **Provider-disabled behavior** — kill switch or `healthStatus:
'disabled'` short-circuits before any call, `status: 'provider-disabled'`.
- **Budget-denied behavior** — checks `packages/cost-controller` before
  calling, `status: 'budget-denied'`, no call made.
- **Invalid-response behavior** — a malformed raw response is rejected
  (`status: 'invalid-response'`), the offending payload is redacted
  before being logged.
- **Confidence-threshold handling** — below-threshold results are
  returned but flagged `status: 'low-confidence-escalated'` with
  `requiresEscalation: true` and `'low-confidence'` added to
  `escalationReasons`.
- **Single-task cost cap** — `costCapExceeded` flag plus a dedicated
  audit event if an individual task's estimated cost exceeds the
  configured ceiling.
- **Deterministic test fixtures** — `fixtures.ts` (all seven scenarios
  plus a malformed/secret-carrying fixture).
- **Mocked integration tests** — see Stage 5.

## Stage 5 — Sandbox harness

`packages/provider-adapters/src/glm-lead-inquiry/sandbox-harness.ts`
(`GlmPilotSandboxHarness`) wires an isolated `InMemoryCostController` +
`ConsoleAuditLogger` + a private descriptor copy around
`classifyLeadInquiry()`, with helper mocks (`fixedResponseMock`,
`hangingMock`, `throwingMock`) and call-count/audit-trail inspection.
Exercised in `packages/provider-adapters/tests/glm-lead-inquiry-sandbox.test.ts`
(32 tests total across both new test files) covering all seven required
scenarios (residential, commercial, HOA, unclear/low-confidence, spam,
angry customer, pricing-request-escalation) plus every required proof
point: correct routing/classification, no other provider ever invoked
(`getDistinctProviderActors()` asserted to be exactly `['zai-glm']`
across scenarios), correct structured output, correct escalation flags,
budget enforcement (denial before any call), kill-switch enforcement
(denial before any call, both via kill switch and via disabled health
status), secret redaction (a fixture's `apiKey` field never appears in
the audit trail), audit logging (every path produces a scoped event),
and deterministic bounded-retry/timeout fallback (fails closed to a
terminal status, never to another provider).

## Stage 6 — CI coverage

No CI changes were needed. `.github/workflows/ci.yml`'s existing step
`pnpm --filter "@ai-company-os/**" --filter "!@ai-company-os/greencal-website" -r --if-present run test`
(added in the prior CI-extension stage) already matches
`packages/provider-adapters/tests/**/*.test.ts` via that package's
existing `test` script — the two new test files run in CI automatically,
with no duplicated or new command.

## Scope note

This document, and everything it describes, is repository preparation
only. No Hostinger connection, no real credential, no paid API call, no
deployment, and no change to `apps/greencal-website` occurred as part of
this stage. See "Exact information required before a real GLM API call"
in the stage completion report for what remains before any real
activation.
