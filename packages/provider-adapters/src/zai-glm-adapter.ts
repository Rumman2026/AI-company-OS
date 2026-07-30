import type { ProviderCapabilityDescriptor } from '@ai-company-os/agent-sdk';
import { createPlaceholderAdapter } from './create-placeholder-adapter';

// Model ids are illustrative placeholders pending confirmation at real
// integration time. Cost figures are illustrative relative-tier
// placeholders, not verified pricing.
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
  modelAllowlist: ['glm-4.6', 'glm-4.6-air'],
  capabilityTags: ['text-generation', 'classification', 'summarization', 'code-generation'],
  modalitySupport: ['text', 'code'],
  inputTokenLimit: 128_000,
  outputTokenLimit: 8_000,
  timeoutMs: 20_000,
  retryPolicy: { maxRetries: 2, backoffMs: 1_000 },
  rateLimit: { requestsPerMinute: 60 },
  budgetLimitUsdPerDay: 10,
  supportsStructuredResult: true,
  supportsConfidenceIndicator: false,
  costPerInputTokenUsd: 0.0000005,
  costPerOutputTokenUsd: 0.0000015,
  healthStatus: 'unavailable',
  killSwitchEnabled: false,
  fallbackEligible: true,
  substitutionRules: {
    canBeSubstitutedBy: ['deepseek', 'anthropic'],
    canSubstituteFor: [],
  },
};

export const zaiGlmAdapter = createPlaceholderAdapter(zaiGlmDescriptor);
