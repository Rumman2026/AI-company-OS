import type { ProviderId, TaskType } from '@ai-company-os/agent-sdk';

export interface RoutingPolicy {
  taskType: TaskType;
  primaryProvider: ProviderId;
  notes: string;
}

// One primary provider per task type — never a chain that calls every
// provider. See docs/cloud/AI_ROUTING_AND_TOKEN_POLICY.md for the full
// rationale behind each assignment.
export const ROUTING_POLICIES: Record<TaskType, RoutingPolicy> = {
  'lead-qualification': {
    taskType: 'lead-qualification',
    primaryProvider: 'zai-glm',
    notes:
      'Routine classification; escalate to Anthropic for high-value leads or conflicting business facts.',
  },
  'customer-response': {
    taskType: 'customer-response',
    primaryProvider: 'openai',
    notes:
      'Customer-facing automation; escalate to Anthropic if the customer is upset or pricing/contract language is involved.',
  },
  'crm-summary': {
    taskType: 'crm-summary',
    primaryProvider: 'zai-glm',
    notes:
      'Routine CRM note summarization; DeepSeek is the fallback if GLM is unavailable — never call both for the same task.',
  },
  'commercial-prospect-research': {
    taskType: 'commercial-prospect-research',
    primaryProvider: 'perplexity',
    notes:
      'Requires current web research with sources and retrieval timestamps; no fallback provider is authorized for this task type.',
  },
  'seo-research': {
    taskType: 'seo-research',
    primaryProvider: 'perplexity',
    notes: 'Current SEO topic research; requires sources and retrieval timestamps.',
  },
  'content-drafting': {
    taskType: 'content-drafting',
    primaryProvider: 'zai-glm',
    notes:
      'Repetitive content drafting; escalate to Anthropic for high-impact or public-facing claims.',
  },
  'photo-review': {
    taskType: 'photo-review',
    primaryProvider: 'gemini',
    notes: 'Job-photo / before-and-after visual quality review.',
  },
  coding: {
    taskType: 'coding',
    primaryProvider: 'zai-glm',
    notes:
      'First-pass coding; Kimi Code CLI is a restricted secondary worker in isolated branches; escalate to Anthropic for security/auth/infra-affecting code.',
  },
  debugging: {
    taskType: 'debugging',
    primaryProvider: 'zai-glm',
    notes:
      'Basic debugging; DeepSeek is the fallback; escalate to Anthropic for security- or production-affecting issues.',
  },
  'website-monitoring': {
    taskType: 'website-monitoring',
    primaryProvider: 'zai-glm',
    notes:
      'Deterministic health checks run first (see tryDeterministicResolution); GLM classifies detected issues; escalate to Anthropic for high-impact findings.',
  },
  'high-impact-review': {
    taskType: 'high-impact-review',
    primaryProvider: 'anthropic',
    notes:
      'Always routes directly to Claude — the final high-impact decision-maker, not a routine default for every task.',
  },
};
