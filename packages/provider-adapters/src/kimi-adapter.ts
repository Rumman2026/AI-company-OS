import type { ProviderCapabilityDescriptor } from '@ai-company-os/agent-sdk';
import { createPlaceholderAdapter } from './create-placeholder-adapter';

// Model ids are illustrative placeholders pending confirmation at real
// integration time. Cost figures are illustrative relative-tier
// placeholders, not verified pricing.
export const kimiDescriptor: ProviderCapabilityDescriptor = {
  providerId: 'kimi',
  displayName: 'Kimi Code CLI',
  permittedTaskTypes: ['coding', 'debugging'],
  modelAllowlist: ['kimi-k2'],
  capabilityTags: ['code-generation', 'code-review'],
  modalitySupport: ['text', 'code'],
  inputTokenLimit: 128_000,
  outputTokenLimit: 8_000,
  timeoutMs: 45_000,
  retryPolicy: { maxRetries: 1, backoffMs: 2_000 },
  rateLimit: { requestsPerMinute: 20 },
  budgetLimitUsdPerDay: 6,
  supportsStructuredResult: true,
  supportsConfidenceIndicator: false,
  costPerInputTokenUsd: 0.0000004,
  costPerOutputTokenUsd: 0.0000016,
  healthStatus: 'unavailable',
  killSwitchEnabled: false,
  fallbackEligible: true,
  substitutionRules: {
    canBeSubstitutedBy: ['zai-glm', 'anthropic'],
    canSubstituteFor: [],
  },
};

// Kimi must only run in isolated Git branches/worktrees and must never
// push to main, merge, deploy, access production credentials/data,
// disable tests, or disable security controls — enforced by
// packages/policy-engine's checkAuthority(), not by this adapter.
export const kimiAdapter = createPlaceholderAdapter(kimiDescriptor);
