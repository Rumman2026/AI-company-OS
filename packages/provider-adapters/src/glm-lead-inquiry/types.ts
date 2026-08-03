import type { EscalationReason } from '@ai-company-os/agent-sdk';

// Pilot task identifier for the GLM-only sandbox pilot (see
// docs/cloud/GLM_SANDBOX_PILOT.md). Deliberately not added to the shared
// cross-provider TaskType union in packages/agent-sdk — it is a narrower
// concept layered on top of the existing 'lead-qualification' task type,
// scoped to this one pilot, not a general routing concept yet.
export const PILOT_TASK_TYPE = 'lead_inquiry_classification' as const;

export type ContactChannel = 'quote-form' | 'phone-transcript' | 'email' | 'other';

export type LeadIntentCategory =
  'residential' | 'commercial' | 'hoa' | 'multi-family' | 'unclear' | 'spam' | 'out-of-scope';

// Fixed, deterministic set of approved next-step templates — the pilot
// recommends one of these ids, it never generates free-text customer
// messaging and never sends anything itself (Stage 3 constraint).
export type ApprovedResponseTemplateId =
  | 'template-residential-info-request'
  | 'template-commercial-info-request'
  | 'template-hoa-info-request'
  | 'template-multi-family-info-request'
  | 'template-unclear-needs-more-info'
  | 'template-spam-no-response'
  | 'template-escalate-to-owner';

export interface LeadInquiryClassificationRequest {
  taskId: string;
  inquiryText: string;
  contactChannel: ContactChannel;
}

export interface LeadInquiryClassificationResult {
  intentCategory: LeadIntentCategory;
  summary: string;
  missingInformation: string[];
  recommendedTemplateId: ApprovedResponseTemplateId;
  confidence: number;
  requiresEscalation: boolean;
  escalationReasons: EscalationReason[];
}

export type PilotOutcomeStatus =
  | 'success'
  | 'low-confidence-escalated'
  | 'invalid-request'
  | 'invalid-response'
  | 'timeout'
  | 'provider-disabled'
  | 'budget-denied'
  | 'retry-exhausted';

export interface PilotClassificationOutcome {
  status: PilotOutcomeStatus;
  result: LeadInquiryClassificationResult | null;
  usage: { inputTokens: number; outputTokens: number; latencyMs: number };
  cost: { estimatedCostUsd: number; currency: 'USD' };
  attempts: number;
  error: string | null;
  costCapExceeded: boolean;
}
