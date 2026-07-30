import type { EscalationReason } from '@ai-company-os/agent-sdk';

export interface PolicyContext {
  confidence: number | null;
  businessFactsConflict: boolean;
  involvesPricingScopeWarrantyOrContract: boolean;
  customerSentiment: 'neutral' | 'upset';
  isHighValueLead: boolean;
  providersDisagree: boolean;
  affectsSecurityAuthInfraOrProduction: boolean;
  requestsProductionDeploymentOrDataChange: boolean;
  policyEngineFlagged: boolean;
  ownerApprovalRequired: boolean;
}

export interface EscalationThresholds {
  minConfidence: number;
}

export const DEFAULT_ESCALATION_THRESHOLDS: EscalationThresholds = {
  minConfidence: 0.7,
};

export interface EscalationDecision {
  escalate: boolean;
  reasons: EscalationReason[];
}

export type AuthorityAction =
  | 'push-to-main'
  | 'merge-pull-request'
  | 'deploy-production'
  | 'modify-production-data'
  | 'alter-credentials'
  | 'disable-tests'
  | 'disable-security-controls'
  | 'approve-own-output'
  | 'access-unrelated-repository'
  | 'exceed-assigned-budget';

export interface AuthorityCheckResult {
  allowed: boolean;
  blockedReason: string | null;
}
