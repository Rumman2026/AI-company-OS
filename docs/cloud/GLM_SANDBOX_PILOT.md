# GLM Sandbox Pilot — `lead_inquiry_classification`

Status: durable reference covering three stages — (1) AI Provider
Configuration Validation and GLM Sandbox Pilot Preparation, (2) the Real
Z.AI/GLM Sandbox Credential and Single-Call Pilot build-out, and (3) the
actual real-call attempt. **One real, bounded API call has been made**
(see "Real call — actual result" below): authentication succeeded, but
the Z.ai account had no balance, so the call failed closed after bounded
retries with zero cost incurred; the provider was disabled immediately
afterward and verified disabled. No other provider (OpenAI, Anthropic
API, Gemini, DeepSeek, Perplexity, Kimi) is activated by this or any
prior stage.

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

## Real credential and single-call pilot

### Official API facts (docs.z.ai, fetched 2026-08-03)

| Fact                        | Value                                                                 | Category                                                                         |
| --------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Endpoint                    | `https://api.z.ai/api/paas/v4/chat/completions`                       | 1. Confirmed                                                                     |
| Authentication              | `Authorization: Bearer <api-key>` header                              | 1. Confirmed                                                                     |
| Required body fields        | `model`, `messages` (array of `{role, content}`)                      | 1. Confirmed                                                                     |
| Structured/JSON output      | `response_format: { "type": "json_object" }`                          | 1. Confirmed                                                                     |
| Model for this pilot        | `glm-4.5-air`                                                         | 1. Confirmed (see Stage 1 above)                                                 |
| Optional request fields     | `max_tokens`, `stream`, `thinking`, `tools`, `Accept-Language` header | 1. Confirmed (not all used by this pilot)                                        |
| Real per-account rate limit | —                                                                     | 4. Blocked — still not publicly documented; unconfirmable without a real account |

### Code added

- `packages/provider-adapters/src/glm-lead-inquiry/real-client.ts` — the
  transport layer only: builds the exact request (`buildGlmChatCompletionRequestPlan`),
  a strict classification system prompt (`buildClassificationSystemPrompt`),
  redacted headers for logging (`redactedRequestHeaders` — the real key
  never appears), and `callRealGlmChatCompletion()`, which makes exactly
  one HTTP call with an `AbortController`-based timeout and parses
  `id`/`usage.prompt_tokens`/`usage.completion_tokens`/`choices[0].message.content`
  from the response. No safety gate lives here — it is a thin, honest
  transport, nothing more.
- `packages/provider-adapters/src/glm-lead-inquiry/real-pilot-runner.ts` —
  `dryRunRealPilotCall()` (assembles and reports the request plan, zero
  network calls, no credential read or required) and
  `executeRealPilotCall()` (routes through the existing, unmodified
  `classifyLeadInquiry()` — reusing all of Stage 4's hardening
  unchanged — then immediately engages the kill switch and runs a
  verification call proving a second attempt is blocked with zero
  further network access).
- `packages/provider-adapters/scripts/run-glm-real-pilot.ts` — the
  runnable entry point. Defaults to dry-run; requires **both** a real
  `ZAI_GLM_API_KEY` present **and** an explicit `--confirm-real-call`
  flag before making any real call — two independent gates, not one.
  Never logs the credential.
- Schema extended (`types.ts`/`validation.ts`/`fixtures.ts`): added
  `propertyType` and `serviceIntent` as required string fields on
  `LeadInquiryClassificationResult`, both covered by the existing
  forbidden-claim scan.

### Credential checkpoint

Not yet resolved — resume only after the owner confirms local setup.

1. **Environment variable name**: `ZAI_GLM_API_KEY` (already declared,
   empty, in `.env.example` and `config/env/.env.example`).
2. **Local storage location**: a repository-root file named
   `.env.local` (already excluded by `.gitignore` — see verification
   below), containing one line: `ZAI_GLM_API_KEY=<your real key>`. This
   file is loaded automatically by
   `packages/provider-adapters/scripts/run-glm-real-pilot.ts` via
   Node's built-in `process.loadEnvFile('.env.local')` — no new
   dependency required.
3. **Setup command** (run in your own terminal, not through Claude
   Code chat):
   ```
   echo ZAI_GLM_API_KEY=your-real-key-here > .env.local
   ```
   Replace `your-real-key-here` with the real key obtained from your
   Z.ai account dashboard.
4. **Git-exclusion confirmation**: `.gitignore` already lists `.env`,
   `.env.local`, and `.env.*.local` (verified — see the file directly);
   this stage additionally added `.env.cloud`, `*.pem`, `*.key`, `*.log`,
   and `logs/` as defensive coverage for other secret shapes.
5. **Safe existence check** (proves the variable is set without ever
   printing its value):
   ```
   node -e "console.log(process.env.ZAI_GLM_API_KEY ? 'present, length=' + process.env.ZAI_GLM_API_KEY.length : 'missing')"
   ```
6. Resume by telling Claude Code the credential is stored and the
   existence check above returned `present`. Claude Code will not ask
   you to paste the key into chat, will not display or echo it, and
   will run
   `pnpm --filter @ai-company-os/provider-adapters run pilot:glm:real -- --confirm-real-call`
   only after that confirmation.

### Dry-run result (executed, no network call)

```
$ pnpm --filter @ai-company-os/provider-adapters run pilot:glm:real
No ZAI_GLM_API_KEY found in the environment. Running a dry run only (no network call).
{
  "mode": "dry-run",
  "endpoint": "https://api.z.ai/api/paas/v4/chat/completions",
  "model": "glm-4.5-air",
  "outcome": null,
  "realCallMeta": null,
  "auditEventId": null,
  "killSwitchEngagedAfter": false,
  "killSwitchVerified": false
}
```

### Mocked end-to-end proof

`packages/provider-adapters/tests/glm-real-client.test.ts` and
`glm-real-pilot-runner.test.ts` (10 additional tests, 42 total in the
package) exercise the entire real-call pipeline with a mocked
`global.fetch` standing in for the network: correct endpoint/body/
structured-output request; real `usage`/`id` parsing; non-ok-status and
missing-content error handling; timeout abort; and a full
`executeRealPilotCall()` run against the exact HOA Orange County
synthetic inquiry proving exactly one fetch call, correct escalation
(`pricing-scope-warranty-or-contract`, no price ever stated), kill
switch engaged and verified afterward with zero further network access,
and no API key anywhere in the returned report.

### Real call — actual result (2026-08-03)

A real credential was configured by the owner in a local, gitignored
`.env.local` (never displayed, logged, or committed — verified by direct
scan before every commit in this stage) and one real, bounded API call
was made via
`pnpm --filter @ai-company-os/provider-adapters run pilot:glm:real -- --confirm-real-call`
for the exact synthetic HOA Orange County inquiry:

- **Authentication**: succeeded — the request was not rejected as
  unauthorized.
- **Result**: the Z.ai API responded `HTTP 429` with
  `{"error":{"code":"1113","message":"Insufficient balance or no resource package. Please recharge."}}`.
  This is a billing/account-balance condition, not an authentication or
  schema failure.
- **Bounded retry**: retried up to the configured limit (3 attempts
  total — 1 initial + 2 retries), then failed closed to
  `status: 'retry-exhausted'`, per design. No fallback to any other
  provider occurred.
- **Cost**: $0.00 — no tokens were processed on either side, so no real
  spend occurred and no budget was consumed.
- **Kill switch**: engaged immediately after the attempt and verified
  disabled via a follow-up call that was blocked before any further
  network access (`killSwitchEngagedAfter: true`, `killSwitchVerified: true`).
- **Secret exposure**: none — the real key never appeared in any log,
  audit event, or output at any point.
- **Bug found and fixed during this run**: the pilot script resolved
  `.env.local` relative to the process's working directory, which
  `pnpm --filter <pkg> run ...` sets to the package directory, not the
  repo root — causing a silent fallback to dry-run on the first attempt
  (no call made, no harm done). Fixed to resolve the path from the
  script's own file location instead; see the `fix(cloud):` commit.

**Outcome**: the pipeline is fully validated against the real Z.ai API
up to (and including) authentication — the only remaining blocker to a
successful classification is account balance, which is outside this
repository's or Claude Code's control (recharge via the owner's Z.ai
account dashboard). No structured classification result exists yet
because the call never reached the point of returning one.

## Scope note

This document, and everything it describes, is repository preparation
plus one real, bounded, authenticated API call. No Hostinger connection,
no deployment, and no change to `apps/greencal-website` occurred at any
point. The real credential was never displayed, logged, or committed.
The provider was disabled immediately after the one real call and
verified disabled before this stage concluded.
