import type { InMemoryCostController } from '@ai-company-os/cost-controller';
import type { AuditLogger } from '@ai-company-os/audit-logger';

// Conservative pilot-specific limits for the lead_inquiry_classification
// GLM pilot only — deliberately tighter than packages/provider-adapters'
// general zaiGlmDescriptor defaults, which remain scoped to GLM's
// broader task types (coding, content-drafting, etc.). See
// docs/cloud/GLM_SANDBOX_PILOT.md Stage 2 for the derivation of each
// value. All configurable — these are the recommended starting point,
// not hardcoded.
export interface GlmPilotBudgetConfig {
  maxInputTokensPerRequest: number;
  maxOutputTokensPerRequest: number;
  maxRequestsPerMinute: number;
  maxRetries: number;
  requestTimeoutMs: number;
  dailySpendLimitUsd: number;
  monthlySpendLimitUsd: number;
  maxSingleTaskCostUsd: number;
  autoShutdownThresholdUsd: number;
  alertThresholdUsd: number;
}

export const GLM_PILOT_BUDGET_DEFAULTS: GlmPilotBudgetConfig = {
  maxInputTokensPerRequest: 2_000,
  maxOutputTokensPerRequest: 500,
  maxRequestsPerMinute: 10,
  maxRetries: 2,
  requestTimeoutMs: 15_000,
  dailySpendLimitUsd: 1.0,
  monthlySpendLimitUsd: 15.0,
  maxSingleTaskCostUsd: 0.02,
  autoShutdownThresholdUsd: 0.9,
  alertThresholdUsd: 0.5,
};

export const GLM_PILOT_BUDGET_SCOPE = {
  scope: 'agent' as const,
  scopeId: 'glm-lead-inquiry-pilot',
};

export function configurePilotBudget(
  costController: InMemoryCostController,
  config: GlmPilotBudgetConfig = GLM_PILOT_BUDGET_DEFAULTS,
): void {
  costController.setBudget(GLM_PILOT_BUDGET_SCOPE.scope, GLM_PILOT_BUDGET_SCOPE.scopeId, {
    dailyLimitUsd: config.dailySpendLimitUsd,
    monthlyLimitUsd: config.monthlySpendLimitUsd,
  });
}

/**
 * Soft watermark: emits an audit alert event once spend crosses
 * `alertThresholdUsd`, without blocking further calls. Distinct from the
 * hard `autoShutdownThresholdUsd` handled by enforceAutoShutdown().
 */
export function checkAlertThreshold(
  costController: InMemoryCostController,
  auditLogger: AuditLogger,
  config: GlmPilotBudgetConfig = GLM_PILOT_BUDGET_DEFAULTS,
): boolean {
  const status = costController.getStatus(
    GLM_PILOT_BUDGET_SCOPE.scope,
    GLM_PILOT_BUDGET_SCOPE.scopeId,
  );
  const alertTriggered = status.spentTodayUsd >= config.alertThresholdUsd;
  if (alertTriggered) {
    auditLogger.record({
      actor: { kind: 'system' },
      action: 'budget-alert',
      taskId: null,
      taskType: null,
      outcome: 'success',
      metadata: {
        scope: GLM_PILOT_BUDGET_SCOPE.scope,
        scopeId: GLM_PILOT_BUDGET_SCOPE.scopeId,
        spentTodayUsd: status.spentTodayUsd,
        alertThresholdUsd: config.alertThresholdUsd,
      },
    });
  }
  return alertTriggered;
}

/**
 * Hard watermark: engages the pilot's kill switch once spend reaches
 * `autoShutdownThresholdUsd`, before the full daily limit is hit. Owner
 * action is required to releaseKillSwitch() afterward — this is a
 * one-way trip, not a self-resetting throttle.
 */
export function enforceAutoShutdown(
  costController: InMemoryCostController,
  auditLogger: AuditLogger,
  config: GlmPilotBudgetConfig = GLM_PILOT_BUDGET_DEFAULTS,
): boolean {
  const status = costController.getStatus(
    GLM_PILOT_BUDGET_SCOPE.scope,
    GLM_PILOT_BUDGET_SCOPE.scopeId,
  );
  const shutdownTriggered =
    !status.killSwitchEngaged && status.spentTodayUsd >= config.autoShutdownThresholdUsd;
  if (shutdownTriggered) {
    costController.engageKillSwitch(GLM_PILOT_BUDGET_SCOPE.scope, GLM_PILOT_BUDGET_SCOPE.scopeId);
    auditLogger.record({
      actor: { kind: 'system' },
      action: 'auto-shutdown',
      taskId: null,
      taskType: null,
      outcome: 'success',
      metadata: {
        scope: GLM_PILOT_BUDGET_SCOPE.scope,
        scopeId: GLM_PILOT_BUDGET_SCOPE.scopeId,
        spentTodayUsd: status.spentTodayUsd,
        autoShutdownThresholdUsd: config.autoShutdownThresholdUsd,
      },
    });
  }
  return shutdownTriggered;
}
