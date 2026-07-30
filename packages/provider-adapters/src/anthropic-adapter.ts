import type { ProviderCapabilityDescriptor } from '@ai-company-os/agent-sdk';
import { createPlaceholderAdapter } from './create-placeholder-adapter';

// Model ids are illustrative placeholders pending confirmation at real
// integration time — do not treat as a verified availability list.
// Cost figures are illustrative relative-tier placeholders, not verified
// pricing; confirm real pricing before enabling.
export const anthropicDescriptor: ProviderCapabilityDescriptor = {
  providerId: 'anthropic',
  displayName: 'Anthropic / Claude',
  permittedTaskTypes: ['high-impact-review', 'coding', 'debugging'],
  modelAllowlist: ['claude-opus-5', 'claude-sonnet-5', 'claude-haiku-4-5-20251001'],
  capabilityTags: ['text-generation', 'code-generation', 'code-review', 'orchestration'],
  modalitySupport: ['text', 'code'],
  inputTokenLimit: 200_000,
  outputTokenLimit: 8_000,
  timeoutMs: 60_000,
  retryPolicy: { maxRetries: 1, backoffMs: 2_000 },
  rateLimit: { requestsPerMinute: 30 },
  budgetLimitUsdPerDay: 20,
  supportsStructuredResult: true,
  supportsConfidenceIndicator: true,
  costPerInputTokenUsd: 0.000003,
  costPerOutputTokenUsd: 0.000015,
  healthStatus: 'unavailable',
  killSwitchEnabled: false,
  fallbackEligible: false,
  substitutionRules: {
    canBeSubstitutedBy: [],
    canSubstituteFor: ['openai', 'zai-glm', 'deepseek', 'perplexity', 'gemini', 'kimi'],
  },
};

export const anthropicAdapter = createPlaceholderAdapter(anthropicDescriptor);
