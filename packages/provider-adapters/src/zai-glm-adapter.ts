import type { ProviderCapabilityDescriptor } from '@ai-company-os/agent-sdk';
import { createPlaceholderAdapter } from './create-placeholder-adapter';

// Configuration audit (docs/cloud/GLM_SANDBOX_PILOT.md Stage 1) —
// categorized per value below. Source for confirmed values: docs.z.ai
// pricing and GLM-4.6 model pages, fetched 2026-08-03. Re-verify before
// any real activation; prices and model availability change over time
// and this repository has no live connection to re-check them.
//
// CONFIRMED (from docs.z.ai, 2026-08-03):
// - modelAllowlist: glm-4.5-air, glm-4.6, glm-5.2 are real, currently
//   listed model ids.
// - inputTokenLimit / outputTokenLimit: 200,000 / 128,000 — GLM-4.6's
//   documented context window ("expanded from 128K to 200K tokens") and
//   max output.
// - costPerInputTokenUsd / costPerOutputTokenUsd: set to GLM-4.5-Air's
//   confirmed pricing ($0.20 / $1.10 per 1M tokens) — the cheapest
//   listed model capable of structured classification, and the
//   recommended pilot default (see GLM_SANDBOX_PILOT.md). NOTE: this
//   descriptor has one flat cost-per-token pair for the whole provider,
//   but real Z.ai pricing varies per model (e.g. GLM-4.6 is $0.60/$2.20
//   per 1M) — a known simplification, not an error; do not assume this
//   figure applies to every model in modelAllowlist.
//
// SAFE INTERNAL DEFAULT (not provider-confirmed, deliberately
// conservative, configurable):
// - timeoutMs, retryPolicy, rateLimit, budgetLimitUsdPerDay.
//
// BLOCKED FROM LIVE USE (uncertain / account-tier-dependent, not
// publicly documented — do not assume a value here is real):
// - Actual per-account rate limits and quota tiers (Z.ai's public docs
//   do not state a fixed rate limit; it depends on the account/plan).
export const zaiGlmDescriptor: ProviderCapabilityDescriptor = {
  providerId: 'zai-glm',
  displayName: 'Z.AI / GLM',
  permittedTaskTypes: [
    'lead-qualification',
    'crm-summary',
    'content-drafting',
    'coding',
    'debugging',
    'website-monitoring',
  ],
  modelAllowlist: ['glm-4.5-air', 'glm-4.6', 'glm-5.2'],
  capabilityTags: ['text-generation', 'classification', 'summarization', 'code-generation'],
  modalitySupport: ['text', 'code'],
  inputTokenLimit: 200_000,
  outputTokenLimit: 128_000,
  timeoutMs: 20_000,
  retryPolicy: { maxRetries: 2, backoffMs: 1_000 },
  rateLimit: { requestsPerMinute: 60 },
  budgetLimitUsdPerDay: 10,
  supportsStructuredResult: true,
  supportsConfidenceIndicator: false,
  costPerInputTokenUsd: 0.0000002,
  costPerOutputTokenUsd: 0.0000011,
  healthStatus: 'unavailable',
  killSwitchEnabled: false,
  fallbackEligible: true,
  substitutionRules: {
    canBeSubstitutedBy: ['deepseek', 'anthropic'],
    canSubstituteFor: [],
  },
};

export const zaiGlmAdapter = createPlaceholderAdapter(zaiGlmDescriptor);
