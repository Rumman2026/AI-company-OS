// Provider-neutral contracts for the AI Company OS gateway/router/agent
// system. See docs/cloud/AI_PROVIDER_INTEGRATION.md and DECISIONS.md
// ADR-0008. Placeholder scope: no real network calls are made anywhere
// behind these types yet.

export type ProviderId =
  'anthropic' | 'openai' | 'zai-glm' | 'deepseek' | 'perplexity' | 'gemini' | 'kimi';

export const APPROVED_PROVIDER_IDS: readonly ProviderId[] = [
  'anthropic',
  'openai',
  'zai-glm',
  'deepseek',
  'perplexity',
  'gemini',
  'kimi',
];

export type TaskType =
  | 'lead-qualification'
  | 'customer-response'
  | 'crm-summary'
  | 'commercial-prospect-research'
  | 'seo-research'
  | 'content-drafting'
  | 'photo-review'
  | 'coding'
  | 'debugging'
  | 'website-monitoring'
  | 'high-impact-review';

export type CapabilityTag =
  | 'text-generation'
  | 'classification'
  | 'summarization'
  | 'structured-tool-use'
  | 'vision'
  | 'multimodal'
  | 'web-research'
  | 'code-generation'
  | 'code-review'
  | 'orchestration'
  | 'voice';

export type Modality = 'text' | 'image' | 'video' | 'audio' | 'code';

export type HealthStatus = 'healthy' | 'degraded' | 'unavailable' | 'disabled';

export type ErrorClassification =
  | 'none'
  | 'timeout'
  | 'rate-limited'
  | 'invalid-request'
  | 'provider-error'
  | 'policy-blocked'
  | 'budget-exceeded'
  | 'disabled-provider'
  | 'not-implemented';

export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
}

export interface RateLimit {
  requestsPerMinute: number;
}

export interface SubstitutionRules {
  canBeSubstitutedBy: ProviderId[];
  canSubstituteFor: ProviderId[];
}

export interface ProviderCapabilityDescriptor {
  providerId: ProviderId;
  displayName: string;
  permittedTaskTypes: TaskType[];
  modelAllowlist: string[];
  capabilityTags: CapabilityTag[];
  modalitySupport: Modality[];
  inputTokenLimit: number;
  outputTokenLimit: number;
  timeoutMs: number;
  retryPolicy: RetryPolicy;
  rateLimit: RateLimit;
  budgetLimitUsdPerDay: number;
  supportsStructuredResult: boolean;
  supportsConfidenceIndicator: boolean;
  costPerInputTokenUsd: number;
  costPerOutputTokenUsd: number;
  healthStatus: HealthStatus;
  killSwitchEnabled: boolean;
  fallbackEligible: boolean;
  substitutionRules: SubstitutionRules;
}

export interface CompactContextPackage {
  taskId: string;
  taskType: TaskType;
  summary: string;
  facts: Record<string, string | number | boolean>;
  relevantRecordIds: string[];
  maxTokensHint: number;
}

export interface AgentRequest {
  taskId: string;
  taskType: TaskType;
  provider: ProviderId;
  model: string;
  context: CompactContextPackage;
  maxInputTokens: number;
  maxOutputTokens: number;
  requestedAtIso: string;
}

export interface UsageMetadata {
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

export interface CostMetadata {
  estimatedCostUsd: number;
  currency: 'USD';
}

export interface AgentResponseError {
  classification: ErrorClassification;
  message: string;
}

export interface AgentResponse {
  taskId: string;
  provider: ProviderId;
  model: string;
  status: 'success' | 'error' | 'escalated' | 'rejected';
  structuredResult: unknown;
  confidence: number | null;
  usage: UsageMetadata;
  cost: CostMetadata;
  error: AgentResponseError | null;
  healthStatus: HealthStatus;
}

export interface ProviderAdapter {
  descriptor: ProviderCapabilityDescriptor;
  invoke(request: AgentRequest): Promise<AgentResponse>;
  healthCheck(): Promise<{ status: HealthStatus; checkedAtIso: string }>;
}

export type EscalationReason =
  | 'low-confidence'
  | 'business-facts-conflict'
  | 'pricing-scope-warranty-or-contract'
  | 'customer-upset'
  | 'high-value-lead'
  | 'providers-disagree'
  | 'security-auth-infra-or-production-code'
  | 'production-deployment-or-data-change'
  | 'policy-engine-flag'
  | 'owner-approval-required';

export interface RoutingDecision {
  taskId: string;
  taskType: TaskType;
  selectedProvider: ProviderId;
  escalated: boolean;
  escalationReasons: EscalationReason[];
  usedDeterministicResolution: boolean;
}
