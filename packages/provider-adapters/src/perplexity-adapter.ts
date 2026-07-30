import type { ProviderCapabilityDescriptor } from '@ai-company-os/agent-sdk';
import { createPlaceholderAdapter } from './create-placeholder-adapter';

// Model ids are illustrative placeholders pending confirmation at real
// integration time. Cost figures are illustrative relative-tier
// placeholders, not verified pricing.
export const perplexityDescriptor: ProviderCapabilityDescriptor = {
  providerId: 'perplexity',
  displayName: 'Perplexity',
  permittedTaskTypes: ['commercial-prospect-research', 'seo-research'],
  modelAllowlist: ['sonar-pro', 'sonar'],
  capabilityTags: ['web-research', 'summarization'],
  modalitySupport: ['text'],
  inputTokenLimit: 32_000,
  outputTokenLimit: 4_000,
  timeoutMs: 30_000,
  retryPolicy: { maxRetries: 1, backoffMs: 2_000 },
  rateLimit: { requestsPerMinute: 20 },
  budgetLimitUsdPerDay: 8,
  supportsStructuredResult: true,
  supportsConfidenceIndicator: false,
  costPerInputTokenUsd: 0.000001,
  costPerOutputTokenUsd: 0.000003,
  healthStatus: 'unavailable',
  killSwitchEnabled: false,
  fallbackEligible: false,
  // No other approved provider is authorized to perform current web
  // research (see docs/cloud/AI_ROUTING_AND_TOKEN_POLICY.md) — if
  // Perplexity is disabled, web-research tasks must be rejected/queued,
  // not silently answered by another provider without live sources.
  substitutionRules: {
    canBeSubstitutedBy: [],
    canSubstituteFor: [],
  },
};

export const perplexityAdapter = createPlaceholderAdapter(perplexityDescriptor);

// Real integration must require sources and retrieval timestamps in the
// structured result per the approved provider role — not enforced here
// since no real call is made yet.
