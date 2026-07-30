# AI Provider Integration

Status: durable reference. See [DECISIONS.md](../../DECISIONS.md)
ADR-0008. Describes the provider-neutral contract and capability
descriptor design in `packages/agent-sdk` and `packages/provider-adapters`.
**No real provider account is connected and no real network call exists
anywhere in this repository.**

## Approved providers and roles

| Provider           | `ProviderId` | Role                                                                                                   |
| ------------------ | ------------ | ------------------------------------------------------------------------------------------------------ |
| Anthropic / Claude | `anthropic`  | Orchestration, architecture, security-sensitive review, final high-impact decisions, escalation target |
| OpenAI             | `openai`     | Customer-facing automation, structured tool use, vision, future voice                                  |
| Z.AI / GLM         | `zai-glm`    | Default low-cost text/data/coding worker                                                               |
| DeepSeek           | `deepseek`   | Inexpensive fallback, batch analysis, secondary debugging                                              |
| Perplexity         | `perplexity` | Current web research only (requires sources + retrieval timestamps)                                    |
| Gemini             | `gemini`     | Image/video/multimodal (job-photo review, visual QC)                                                   |
| Kimi Code CLI      | `kimi`       | Restricted secondary coding worker, isolated branches only                                             |

Grok/xAI and Sakana AI are **never** added to `packages/provider-adapters`
— enforced by the `.claude/rules/backend.md` rule and by
`packages/provider-adapters/tests/registry.test.ts` asserting the
registry contains exactly these seven ids.

## Contract shape (`packages/agent-sdk/src/types.ts`)

Every provider is described by a `ProviderCapabilityDescriptor`:
permitted task types, model allowlist, capability tags, modality
support, input/output token limits, timeout, retry policy, rate limit,
daily budget limit, structured-result/confidence-indicator support,
cost-per-token, health status, kill-switch flag, fallback eligibility,
and substitution rules (`canBeSubstitutedBy` / `canSubstituteFor`).

Every call goes through the shared `ProviderAdapter` interface —
`invoke(request: AgentRequest): Promise<AgentResponse>` and
`healthCheck()`. No router or gateway code ever imports a provider SDK
directly; it only ever depends on this interface.

## Placeholder adapters (`packages/provider-adapters`)

Every adapter is built by the shared `createPlaceholderAdapter()`
factory. `invoke()` always returns a structured, honest response with
`error.classification: 'not-implemented'` (or `'disabled-provider'` if
kill-switched/unhealthy) — never a fabricated success. Model ids and
cost-per-token figures in each descriptor are illustrative placeholders
pending confirmation at real integration time; do not treat them as
verified.

## Provider substitution

The task router resolves providers only through
`packages/provider-adapters`'s `providerRegistry` map — disabling one
provider (kill switch or health failure) does not stop the system: the
router either uses that provider's `substitutionRules.canBeSubstitutedBy`
(at most one fallback attempt) or returns a clear rejection for task
types with no authorized substitute (e.g., Perplexity — no other
approved provider may perform current web research). Adding, removing,
or replacing a provider only requires touching `registry.ts`.

## What real integration will require (not done in this stage)

- Real API credentials, added only to `.env`/`.env.cloud` (never
  committed), with names matching the placeholders already in
  `.env.example` / `infra/docker/.env.cloud.example`.
- Real request/response mapping per provider inside each adapter's
  `invoke()`, replacing the placeholder body.
- Confirmed, current model ids and verified per-token pricing, replacing
  the illustrative placeholders in each descriptor.
- Explicit owner authorization before any of the above — see
  `DECISIONS.md` ADR-0008's scope note.
