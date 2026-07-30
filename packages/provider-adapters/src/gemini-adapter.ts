import type { ProviderCapabilityDescriptor } from '@ai-company-os/agent-sdk';
import { createPlaceholderAdapter } from './create-placeholder-adapter';

// Model ids are illustrative placeholders pending confirmation at real
// integration time. Cost figures are illustrative relative-tier
// placeholders, not verified pricing.
export const geminiDescriptor: ProviderCapabilityDescriptor = {
  providerId: 'gemini',
  displayName: 'Gemini',
  permittedTaskTypes: ['photo-review'],
  modelAllowlist: ['gemini-3-pro', 'gemini-3-flash'],
  capabilityTags: ['vision', 'multimodal'],
  modalitySupport: ['text', 'image', 'video'],
  inputTokenLimit: 1_000_000,
  outputTokenLimit: 8_000,
  timeoutMs: 30_000,
  retryPolicy: { maxRetries: 2, backoffMs: 1_500 },
  rateLimit: { requestsPerMinute: 30 },
  budgetLimitUsdPerDay: 10,
  supportsStructuredResult: true,
  supportsConfidenceIndicator: false,
  costPerInputTokenUsd: 0.0000005,
  costPerOutputTokenUsd: 0.000002,
  healthStatus: 'unavailable',
  killSwitchEnabled: false,
  fallbackEligible: false,
  substitutionRules: {
    canBeSubstitutedBy: ['anthropic'],
    canSubstituteFor: [],
  },
};

export const geminiAdapter = createPlaceholderAdapter(geminiDescriptor);
