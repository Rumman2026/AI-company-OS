import type { ProviderCapabilityDescriptor } from '@ai-company-os/agent-sdk';
import type { InMemoryCostController } from '@ai-company-os/cost-controller';
import type { AuditLogger } from '@ai-company-os/audit-logger';
import { redactSecrets } from '@ai-company-os/audit-logger';
import {
  validateLeadInquiryClassificationRequest,
  validateLeadInquiryClassificationResult,
} from './validation';
import type { LeadInquiryClassificationRequest, PilotClassificationOutcome } from './types';
import {
  GLM_PILOT_BUDGET_DEFAULTS,
  GLM_PILOT_BUDGET_SCOPE,
  checkAlertThreshold,
  enforceAutoShutdown,
  type GlmPilotBudgetConfig,
} from './pilot-budget';

export interface ClassifyLeadInquiryDeps {
  /** zaiGlmDescriptor — consulted only for killSwitchEnabled/healthStatus/retryPolicy.backoffMs/cost-per-token. */
  descriptor: ProviderCapabilityDescriptor;
  costController: InMemoryCostController;
  auditLogger: AuditLogger;
  /** Pluggable raw-call function. Tests inject a deterministic mock; a real network call is added at actual integration time, not here. */
  callRawModel: (request: LeadInquiryClassificationRequest) => Promise<unknown>;
  budgetConfig?: GlmPilotBudgetConfig;
  confidenceThreshold?: number;
}

const DEFAULT_CONFIDENCE_THRESHOLD = 0.6;
const TIMEOUT_ERROR_MESSAGE = 'timeout';

const zeroUsage = { inputTokens: 0, outputTokens: 0, latencyMs: 0 };
const zeroCost = { estimatedCostUsd: 0, currency: 'USD' as const };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(TIMEOUT_ERROR_MESSAGE)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      },
    );
  });
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Hardened, validated GLM-only path for the lead_inquiry_classification
 * pilot (docs/cloud/GLM_SANDBOX_PILOT.md). Handles request/response
 * validation, provider-disabled and budget-denied short-circuits,
 * bounded timeout+retry, confidence-threshold escalation, and
 * secret-safe audit logging. Never falls back to another provider —
 * the pilot's scope is GLM-only; on exhaustion it fails to a terminal
 * status for owner attention, per docs/cloud/GLM_SANDBOX_PILOT.md Stage 3.
 */
export async function classifyLeadInquiry(
  deps: ClassifyLeadInquiryDeps,
  request: LeadInquiryClassificationRequest,
): Promise<PilotClassificationOutcome> {
  const budgetConfig = deps.budgetConfig ?? GLM_PILOT_BUDGET_DEFAULTS;
  const confidenceThreshold = deps.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;

  const requestValidation = validateLeadInquiryClassificationRequest(request);
  if (!requestValidation.valid) {
    deps.auditLogger.record({
      actor: { kind: 'system' },
      action: 'classify-lead-inquiry',
      taskId: (request as { taskId?: unknown })?.taskId as string | null,
      taskType: 'lead-qualification',
      outcome: 'rejected',
      metadata: { reason: 'invalid-request', errors: requestValidation.errors },
    });
    return {
      status: 'invalid-request',
      result: null,
      usage: zeroUsage,
      cost: zeroCost,
      attempts: 0,
      error: requestValidation.errors.join('; '),
      costCapExceeded: false,
    };
  }
  const validRequest = requestValidation.value;

  if (deps.descriptor.killSwitchEnabled || deps.descriptor.healthStatus === 'disabled') {
    deps.auditLogger.record({
      actor: { kind: 'provider', providerId: 'zai-glm' },
      action: 'classify-lead-inquiry',
      taskId: validRequest.taskId,
      taskType: 'lead-qualification',
      outcome: 'rejected',
      metadata: { reason: 'provider-disabled' },
    });
    return {
      status: 'provider-disabled',
      result: null,
      usage: zeroUsage,
      cost: zeroCost,
      attempts: 0,
      error: 'zai-glm is disabled (kill switch or health status)',
      costCapExceeded: false,
    };
  }

  const budgetStatus = deps.costController.getStatus(
    GLM_PILOT_BUDGET_SCOPE.scope,
    GLM_PILOT_BUDGET_SCOPE.scopeId,
  );
  if (!budgetStatus.withinBudget) {
    deps.auditLogger.record({
      actor: { kind: 'agent', agentId: GLM_PILOT_BUDGET_SCOPE.scopeId },
      action: 'classify-lead-inquiry',
      taskId: validRequest.taskId,
      taskType: 'lead-qualification',
      outcome: 'policy-blocked',
      metadata: { reason: 'budget-denied', spentTodayUsd: budgetStatus.spentTodayUsd },
    });
    return {
      status: 'budget-denied',
      result: null,
      usage: zeroUsage,
      cost: zeroCost,
      attempts: 0,
      error: 'pilot budget exceeded or kill switch engaged',
      costCapExceeded: false,
    };
  }

  const maxAttempts = budgetConfig.maxRetries + 1;
  let attempts = 0;
  let lastError: string | null = null;
  let rawResponse: unknown;
  let latencyMs = 0;

  while (attempts < maxAttempts) {
    attempts += 1;
    const startedAt = Date.now();
    try {
      rawResponse = await withTimeout(
        deps.callRawModel(validRequest),
        budgetConfig.requestTimeoutMs,
      );
      latencyMs = Date.now() - startedAt;
      lastError = null;
      break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'unknown error';
      if (attempts < maxAttempts) {
        await sleep(deps.descriptor.retryPolicy.backoffMs);
      }
    }
  }

  if (lastError !== null) {
    const status = lastError === TIMEOUT_ERROR_MESSAGE ? 'timeout' : 'retry-exhausted';
    deps.auditLogger.record({
      actor: { kind: 'provider', providerId: 'zai-glm' },
      action: 'classify-lead-inquiry',
      taskId: validRequest.taskId,
      taskType: 'lead-qualification',
      outcome: 'error',
      metadata: { reason: status, attempts, lastError: redactSecrets({ lastError }).lastError },
    });
    return {
      status,
      result: null,
      usage: zeroUsage,
      cost: zeroCost,
      attempts,
      error: lastError,
      costCapExceeded: false,
    };
  }

  const responseValidation = validateLeadInquiryClassificationResult(rawResponse);
  if (!responseValidation.valid) {
    deps.auditLogger.record({
      actor: { kind: 'provider', providerId: 'zai-glm' },
      action: 'classify-lead-inquiry',
      taskId: validRequest.taskId,
      taskType: 'lead-qualification',
      outcome: 'rejected',
      metadata: {
        reason: 'invalid-response',
        errors: responseValidation.errors,
        rawResponse: redactSecrets(rawResponse as Record<string, unknown>),
      },
    });
    return {
      status: 'invalid-response',
      result: null,
      usage: zeroUsage,
      cost: zeroCost,
      attempts,
      error: responseValidation.errors.join('; '),
      costCapExceeded: false,
    };
  }

  let result = responseValidation.value;
  const inputTokens = estimateTokens(validRequest.inquiryText);
  const outputTokens = estimateTokens(JSON.stringify(result));
  const estimatedCostUsd =
    inputTokens * deps.descriptor.costPerInputTokenUsd +
    outputTokens * deps.descriptor.costPerOutputTokenUsd;
  const costCapExceeded = estimatedCostUsd > budgetConfig.maxSingleTaskCostUsd;

  deps.costController.recordSpend(
    GLM_PILOT_BUDGET_SCOPE.scope,
    GLM_PILOT_BUDGET_SCOPE.scopeId,
    'zai-glm',
    estimatedCostUsd,
  );

  let status: PilotClassificationOutcome['status'] = 'success';
  if (result.confidence < confidenceThreshold) {
    status = 'low-confidence-escalated';
    result = {
      ...result,
      requiresEscalation: true,
      escalationReasons: result.escalationReasons.includes('low-confidence')
        ? result.escalationReasons
        : [...result.escalationReasons, 'low-confidence'],
    };
  }

  deps.auditLogger.record({
    actor: { kind: 'provider', providerId: 'zai-glm' },
    action: 'classify-lead-inquiry',
    taskId: validRequest.taskId,
    taskType: 'lead-qualification',
    outcome: status === 'low-confidence-escalated' ? 'escalated' : 'success',
    metadata: {
      attempts,
      costCapExceeded,
      usage: { inputTokens, outputTokens, latencyMs },
      cost: { estimatedCostUsd },
      result: redactSecrets(result as unknown as Record<string, unknown>),
    },
  });

  if (costCapExceeded) {
    deps.auditLogger.record({
      actor: { kind: 'system' },
      action: 'single-task-cost-exceeded',
      taskId: validRequest.taskId,
      taskType: 'lead-qualification',
      outcome: 'success',
      metadata: { estimatedCostUsd, maxSingleTaskCostUsd: budgetConfig.maxSingleTaskCostUsd },
    });
  }

  checkAlertThreshold(deps.costController, deps.auditLogger, budgetConfig);
  enforceAutoShutdown(deps.costController, deps.auditLogger, budgetConfig);

  return {
    status,
    result,
    usage: { inputTokens, outputTokens, latencyMs },
    cost: { estimatedCostUsd, currency: 'USD' },
    attempts,
    error: null,
    costCapExceeded,
  };
}
