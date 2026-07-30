import type { ProviderCapabilityDescriptor } from '@ai-company-os/agent-sdk';
import { createPlaceholderAdapter } from './create-placeholder-adapter';

// Model ids are illustrative placeholders pending confirmation at real
// integration time. Cost figures are illustrative relative-tier
// placeholders, not verified pricing.
export const openaiDescriptor: ProviderCapabilityDescriptor = {
  providerId: 'openai',
  displayName: 'OpenAI',
  permittedTaskTypes: ['customer-response', 'photo-review'],
  modelAllowlist: ['gpt-5', 'gpt-5-mini'],
  capabilityTags: ['text-generation', 'structured-tool-use', 'vision', 'voice'],
  modalitySupport: ['text', 'image', 'audio'],
  inputTokenLimit: 128_000,
  outputTokenLimit: 4_000,
  timeoutMs: 20_000,
  retryPolicy: { maxRetries: 2, backoffMs: 1_000 },
  rateLimit: { requestsPerMinute: 60 },
  budgetLimitUsdPerDay: 15,
  supportsStructuredResult: true,
  supportsConfidenceIndicator: false,
  costPerInputTokenUsd: 0.000002,
  costPerOutputTokenUsd: 0.000008,
  healthStatus: 'unavailable',
  killSwitchEnabled: false,
  fallbackEligible: false,
  substitutionRules: {
    canBeSubstitutedBy: ['anthropic'],
    canSubstituteFor: [],
  },
};

export const openaiAdapter = createPlaceholderAdapter(openaiDescriptor);
