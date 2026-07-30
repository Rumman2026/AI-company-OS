import type { ProviderAdapter, ProviderId } from '@ai-company-os/agent-sdk';
import { anthropicAdapter } from './anthropic-adapter';
import { openaiAdapter } from './openai-adapter';
import { zaiGlmAdapter } from './zai-glm-adapter';
import { deepseekAdapter } from './deepseek-adapter';
import { perplexityAdapter } from './perplexity-adapter';
import { geminiAdapter } from './gemini-adapter';
import { kimiAdapter } from './kimi-adapter';

// Exactly the seven approved providers (root CLAUDE.md-equivalent spec /
// DECISIONS.md ADR-0008). Grok/xAI and Sakana AI are intentionally
// absent and must never be added here.
export const providerRegistry: Record<ProviderId, ProviderAdapter> = {
  anthropic: anthropicAdapter,
  openai: openaiAdapter,
  'zai-glm': zaiGlmAdapter,
  deepseek: deepseekAdapter,
  perplexity: perplexityAdapter,
  gemini: geminiAdapter,
  kimi: kimiAdapter,
};

export function getAdapter(providerId: ProviderId): ProviderAdapter {
  return providerRegistry[providerId];
}

export function listEnabledAdapters(): ProviderAdapter[] {
  return Object.values(providerRegistry).filter(
    (adapter) =>
      !adapter.descriptor.killSwitchEnabled && adapter.descriptor.healthStatus !== 'disabled',
  );
}
