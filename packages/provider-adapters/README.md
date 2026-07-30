# Provider Adapters Package

Placeholder adapters and capability descriptors for the seven approved
AI providers: Anthropic/Claude, OpenAI, Z.AI/GLM, DeepSeek, Perplexity,
Gemini, and Kimi Code CLI. Grok/xAI and Sakana AI are intentionally never
added here — see [DECISIONS.md](../../DECISIONS.md) ADR-0008 and
[docs/cloud/AI_PROVIDER_INTEGRATION.md](../../docs/cloud/AI_PROVIDER_INTEGRATION.md).

**No adapter in this package makes a real network call.** Every
`invoke()` returns a structured, honest `not-implemented` (or
`disabled-provider`, if kill-switched/unhealthy) error via the shared
`createPlaceholderAdapter()` factory — never a fabricated success. Model
ids and cost figures in each descriptor are illustrative placeholders,
not verified pricing or a confirmed availability list; confirm both
before real integration.

`registry.ts` exports the single `providerRegistry` map that
`packages/task-router` and `apps/ai-gateway` use to resolve a provider —
no call site imports an individual adapter file directly, so
disabling/removing/adding a provider only touches this file.

New, non-duplicating package — no prior art existed for this role.
