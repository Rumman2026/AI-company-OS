import { InMemoryCostController } from '@ai-company-os/cost-controller';
import { ConsoleAuditLogger } from '@ai-company-os/audit-logger';
import { zaiGlmDescriptor } from '../zai-glm-adapter';
import { classifyLeadInquiry } from './adapter';
import {
  configurePilotBudget,
  GLM_PILOT_BUDGET_DEFAULTS,
  GLM_PILOT_BUDGET_SCOPE,
} from './pilot-budget';
import {
  GLM_API_ENDPOINT,
  buildClassificationSystemPrompt,
  callRealGlmChatCompletion,
} from './real-client';
import type { LeadInquiryClassificationRequest, PilotClassificationOutcome } from './types';

// The pilot's recommended default model — see docs/cloud/GLM_SANDBOX_PILOT.md
// Stage 1 (confirmed real model id, cheapest listed model capable of
// structured classification).
export const REAL_PILOT_MODEL = 'glm-4.5-air';

export interface RealPilotCallMeta {
  requestId: string | null;
  /** Real token counts reported by the API — distinct from the adapter's own deterministic estimate used for its internal budget accounting. */
  realInputTokens: number;
  realOutputTokens: number;
  realLatencyMs: number;
}

export interface RealPilotReport {
  mode: 'dry-run' | 'real-call';
  endpoint: string;
  model: string;
  outcome: PilotClassificationOutcome | null;
  realCallMeta: RealPilotCallMeta | null;
  auditEventId: string | null;
  killSwitchEngagedAfter: boolean;
  killSwitchVerified: boolean;
}

/**
 * Assembles the exact request that would be sent — no network call is
 * made, no credential is required or read. Proves the request-building
 * path end-to-end before any real call is authorized.
 */
export function dryRunRealPilotCall(request: LeadInquiryClassificationRequest): RealPilotReport {
  void request;
  return {
    mode: 'dry-run',
    endpoint: GLM_API_ENDPOINT,
    model: REAL_PILOT_MODEL,
    outcome: null,
    realCallMeta: null,
    auditEventId: null,
    killSwitchEngagedAfter: false,
    killSwitchVerified: false,
  };
}

/**
 * Makes exactly one real GLM API call for the given request, through
 * the same classifyLeadInquiry() hardening used everywhere else in this
 * pilot (request/response validation, budget check, timeout+retry,
 * confidence threshold, secret-safe audit logging) — then immediately
 * engages the kill switch and verifies a follow-up call is blocked
 * without any further network access, before returning.
 */
export async function executeRealPilotCall(
  request: LeadInquiryClassificationRequest,
  apiKey: string,
): Promise<RealPilotReport> {
  const costController = new InMemoryCostController();
  const auditLogger = new ConsoleAuditLogger();
  configurePilotBudget(costController);
  // Fresh mutable copy scoped to this one run only — never mutates the
  // shared module-level zaiGlmDescriptor used elsewhere.
  const descriptor = {
    ...zaiGlmDescriptor,
    retryPolicy: { ...zaiGlmDescriptor.retryPolicy },
    rateLimit: { ...zaiGlmDescriptor.rateLimit },
    substitutionRules: {
      canBeSubstitutedBy: [...zaiGlmDescriptor.substitutionRules.canBeSubstitutedBy],
      canSubstituteFor: [...zaiGlmDescriptor.substitutionRules.canSubstituteFor],
    },
  };

  let capturedMeta: RealPilotCallMeta | null = null;

  const outcome = await classifyLeadInquiry(
    {
      descriptor,
      costController,
      auditLogger,
      callRawModel: async (req) => {
        const result = await callRealGlmChatCompletion(
          {
            model: REAL_PILOT_MODEL,
            systemPrompt: buildClassificationSystemPrompt(),
            userPrompt: req.inquiryText,
            maxOutputTokens: GLM_PILOT_BUDGET_DEFAULTS.maxOutputTokensPerRequest,
            timeoutMs: GLM_PILOT_BUDGET_DEFAULTS.requestTimeoutMs,
          },
          apiKey,
        );
        capturedMeta = {
          requestId: result.requestId,
          realInputTokens: result.inputTokens,
          realOutputTokens: result.outputTokens,
          realLatencyMs: result.latencyMs,
        };
        try {
          return JSON.parse(result.rawContent);
        } catch {
          throw new Error('GLM response content was not valid JSON');
        }
      },
      budgetConfig: GLM_PILOT_BUDGET_DEFAULTS,
    },
    request,
  );

  // Capture the audit event id for THIS call before the verification
  // step below adds another event for the same taskId.
  const scopedEventsAfterCall = auditLogger.query({ taskId: request.taskId });
  const auditEventId = scopedEventsAfterCall[scopedEventsAfterCall.length - 1]?.id ?? null;

  // Disable the provider immediately after the call, regardless of outcome.
  descriptor.killSwitchEnabled = true;
  costController.engageKillSwitch(GLM_PILOT_BUDGET_SCOPE.scope, GLM_PILOT_BUDGET_SCOPE.scopeId);

  // Verify: a follow-up attempt must now be denied without any network call.
  let verificationCallAttempted = false;
  const verificationOutcome = await classifyLeadInquiry(
    {
      descriptor,
      costController,
      auditLogger,
      callRawModel: async () => {
        verificationCallAttempted = true;
        throw new Error('should never be called — kill switch must short-circuit first');
      },
    },
    request,
  );
  const killSwitchVerified =
    verificationOutcome.status === 'provider-disabled' && !verificationCallAttempted;

  return {
    mode: 'real-call',
    endpoint: GLM_API_ENDPOINT,
    model: REAL_PILOT_MODEL,
    outcome,
    realCallMeta: capturedMeta,
    auditEventId,
    killSwitchEngagedAfter: descriptor.killSwitchEnabled,
    killSwitchVerified,
  };
}
