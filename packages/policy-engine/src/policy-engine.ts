import type { EscalationReason } from '@ai-company-os/agent-sdk';
import type {
  AuthorityAction,
  AuthorityCheckResult,
  EscalationDecision,
  EscalationThresholds,
  PolicyContext,
} from './types';
import { DEFAULT_ESCALATION_THRESHOLDS } from './types';

/**
 * Evaluates the Escalation Rules from docs/cloud/AI_ROUTING_AND_TOKEN_POLICY.md
 * / DECISIONS.md ADR-0008: escalate to Claude only when a defined
 * condition is met, never as a default chain across every provider.
 */
export function evaluateEscalation(
  context: PolicyContext,
  thresholds: EscalationThresholds = DEFAULT_ESCALATION_THRESHOLDS,
): EscalationDecision {
  const reasons: EscalationReason[] = [];

  if (context.confidence !== null && context.confidence < thresholds.minConfidence) {
    reasons.push('low-confidence');
  }
  if (context.businessFactsConflict) {
    reasons.push('business-facts-conflict');
  }
  if (context.involvesPricingScopeWarrantyOrContract) {
    reasons.push('pricing-scope-warranty-or-contract');
  }
  if (context.customerSentiment === 'upset') {
    reasons.push('customer-upset');
  }
  if (context.isHighValueLead) {
    reasons.push('high-value-lead');
  }
  if (context.providersDisagree) {
    reasons.push('providers-disagree');
  }
  if (context.affectsSecurityAuthInfraOrProduction) {
    reasons.push('security-auth-infra-or-production-code');
  }
  if (context.requestsProductionDeploymentOrDataChange) {
    reasons.push('production-deployment-or-data-change');
  }
  if (context.policyEngineFlagged) {
    reasons.push('policy-engine-flag');
  }
  if (context.ownerApprovalRequired) {
    reasons.push('owner-approval-required');
  }

  return { escalate: reasons.length > 0, reasons };
}

const ALWAYS_BLOCKED_ACTIONS: ReadonlySet<AuthorityAction> = new Set<AuthorityAction>([
  'push-to-main',
  'merge-pull-request',
  'deploy-production',
  'modify-production-data',
  'alter-credentials',
  'disable-tests',
  'disable-security-controls',
  'approve-own-output',
  'access-unrelated-repository',
  'exceed-assigned-budget',
]);

/**
 * Enforces the Authority Rules: no specialist provider (or any
 * non-owner actor) may independently perform these actions, regardless
 * of confidence, escalation outcome, or which provider is asking.
 */
export function checkAuthority(action: AuthorityAction, isOwner: boolean): AuthorityCheckResult {
  if (isOwner) {
    return { allowed: true, blockedReason: null };
  }
  if (ALWAYS_BLOCKED_ACTIONS.has(action)) {
    return {
      allowed: false,
      blockedReason: `Action "${action}" requires explicit owner authorization and cannot be performed by any provider or agent.`,
    };
  }
  return { allowed: true, blockedReason: null };
}
