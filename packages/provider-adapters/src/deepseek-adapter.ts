import type { ProviderCapabilityDescriptor } from '@ai-company-os/agent-sdk';
import { createPlaceholderAdapter } from './create-placeholder-adapter';

// Model ids are illustrative placeholders pending confirmation at real
// integration time. Cost figures are illustrative relative-tier
// placeholders, not verified pricing.
export const deepseekDescriptor: ProviderCapabilityDescriptor = {
  providerId: 'deepseek',
  displayName: 'DeepSeek',
  permittedTaskTypes: ['crm-summary', 'debugging', 'lead-qualification'],
  modelAllowlist: ['deepseek-v3.2', 'deepseek-r1'],
  capabilityTags: ['text-generation', 'classification', 'code-generation'],
  modalitySupport: ['text', 'code'],
  inputTokenLimit: 64_000,
  outputTokenLimit: 8_000,
  timeoutMs: 30_000,
  retryPolicy: { maxRetries: 2, backoffMs: 1_500 },
  rateLimit: { requestsPerMinute: 60 },
  budgetLimitUsdPerDay: 8,
  supportsStructuredResult: true,
  supportsConfidenceIndicator: false,
  costPerInputTokenUsd: 0.0000003,
  costPerOutputTokenUsd: 0.0000012,
  healthStatus: 'unavailable',
  killSwitchEnabled: false,
  fallbackEligible: true,
  substitutionRules: {
    canBeSubstitutedBy: ['zai-glm', 'anthropic'],
    canSubstituteFor: ['zai-glm'],
  },
};

// Do not call this adapter if packages/task-router already got a
// successful GLM result for the same task — see routing policies.
export const deepseekAdapter = createPlaceholderAdapter(deepseekDescriptor);
