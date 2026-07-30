import type {
  AgentRequest,
  AgentResponse,
  ProviderAdapter,
  ProviderCapabilityDescriptor,
} from '@ai-company-os/agent-sdk';

/**
 * Shared factory for all seven placeholder adapters. No adapter created
 * here makes a network call, reads an environment variable, or requires
 * a credential — invoke() always returns a structured, honest
 * "not-implemented" response. Real per-provider request/response
 * mapping is added when that provider is actually connected (a separate,
 * explicitly authorized future step — see DECISIONS.md ADR-0008).
 */
export function createPlaceholderAdapter(
  descriptor: ProviderCapabilityDescriptor,
): ProviderAdapter {
  return {
    descriptor,

    async invoke(request: AgentRequest): Promise<AgentResponse> {
      if (descriptor.killSwitchEnabled || descriptor.healthStatus === 'disabled') {
        return {
          taskId: request.taskId,
          provider: descriptor.providerId,
          model: request.model,
          status: 'rejected',
          structuredResult: null,
          confidence: null,
          usage: { inputTokens: 0, outputTokens: 0, latencyMs: 0 },
          cost: { estimatedCostUsd: 0, currency: 'USD' },
          error: {
            classification: 'disabled-provider',
            message: `Provider "${descriptor.providerId}" is disabled (kill switch or health status).`,
          },
          healthStatus: descriptor.healthStatus,
        };
      }

      return {
        taskId: request.taskId,
        provider: descriptor.providerId,
        model: request.model,
        status: 'error',
        structuredResult: null,
        confidence: null,
        usage: { inputTokens: 0, outputTokens: 0, latencyMs: 0 },
        cost: { estimatedCostUsd: 0, currency: 'USD' },
        error: {
          classification: 'not-implemented',
          message: `Placeholder adapter for "${descriptor.providerId}" does not make real API calls yet.`,
        },
        healthStatus: descriptor.healthStatus,
      };
    },

    async healthCheck() {
      return { status: descriptor.healthStatus, checkedAtIso: new Date().toISOString() };
    },
  };
}
