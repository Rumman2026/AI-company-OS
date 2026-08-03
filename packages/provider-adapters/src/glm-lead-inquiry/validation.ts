import type { EscalationReason } from '@ai-company-os/agent-sdk';
import type {
  ApprovedResponseTemplateId,
  ContactChannel,
  LeadInquiryClassificationRequest,
  LeadInquiryClassificationResult,
  LeadIntentCategory,
} from './types';

// Discriminated union (not a plain `{ valid: boolean; value: T | null }`)
// so TypeScript actually narrows `.value` to `T` after an `if (result.valid)`
// check at call sites, instead of leaving it `T | null` everywhere.
export type ValidationResult<T> =
  { valid: true; value: T; errors: [] } | { valid: false; value: null; errors: string[] };

const CONTACT_CHANNELS: ReadonlySet<ContactChannel> = new Set([
  'quote-form',
  'phone-transcript',
  'email',
  'other',
]);

const INTENT_CATEGORIES: ReadonlySet<LeadIntentCategory> = new Set([
  'residential',
  'commercial',
  'hoa',
  'multi-family',
  'unclear',
  'spam',
  'out-of-scope',
]);

const TEMPLATE_IDS: ReadonlySet<ApprovedResponseTemplateId> = new Set([
  'template-residential-info-request',
  'template-commercial-info-request',
  'template-hoa-info-request',
  'template-multi-family-info-request',
  'template-unclear-needs-more-info',
  'template-spam-no-response',
  'template-escalate-to-owner',
]);

const ESCALATION_REASONS: ReadonlySet<EscalationReason> = new Set([
  'low-confidence',
  'business-facts-conflict',
  'pricing-scope-warranty-or-contract',
  'customer-upset',
  'high-value-lead',
  'providers-disagree',
  'security-auth-infra-or-production-code',
  'production-deployment-or-data-change',
  'policy-engine-flag',
  'owner-approval-required',
]);

const MAX_INQUIRY_TEXT_CHARS = 8_000;

export function validateLeadInquiryClassificationRequest(
  input: unknown,
): ValidationResult<LeadInquiryClassificationRequest> {
  const errors: string[] = [];
  if (typeof input !== 'object' || input === null) {
    return { valid: false, value: null, errors: ['request must be an object'] };
  }
  const candidate = input as Record<string, unknown>;

  if (typeof candidate.taskId !== 'string' || candidate.taskId.trim().length === 0) {
    errors.push('taskId must be a non-empty string');
  }
  if (typeof candidate.inquiryText !== 'string' || candidate.inquiryText.trim().length === 0) {
    errors.push('inquiryText must be a non-empty string');
  } else if (candidate.inquiryText.length > MAX_INQUIRY_TEXT_CHARS) {
    errors.push(`inquiryText exceeds ${MAX_INQUIRY_TEXT_CHARS} characters`);
  }
  if (
    typeof candidate.contactChannel !== 'string' ||
    !CONTACT_CHANNELS.has(candidate.contactChannel as ContactChannel)
  ) {
    errors.push(`contactChannel must be one of: ${[...CONTACT_CHANNELS].join(', ')}`);
  }

  if (errors.length > 0) {
    return { valid: false, value: null, errors };
  }
  return {
    valid: true,
    value: candidate as unknown as LeadInquiryClassificationRequest,
    errors: [],
  };
}

// Patterns that must never appear in pilot-generated free text — the
// pilot classifies and summarizes, it never quotes pricing, promises
// availability, or makes guarantees (Stage 3 constraint). Matching text
// makes the whole response invalid, not just the offending field, so a
// hallucinated promise can never silently pass through.
const FORBIDDEN_CLAIM_PATTERNS: RegExp[] = [
  /\$\s?\d/, // a dollar amount
  /\bguarantee(s|d)?\b/i,
  /\bpromise(s|d)?\b/i,
  /\bwe (can|will) (come|arrive|be there)\b/i,
  /\bavailable (today|tomorrow|now|this week)\b/i,
  /\bfree estimate\b/i,
  /\bno obligation\b/i,
];

export function findForbiddenClaims(text: string): string[] {
  return FORBIDDEN_CLAIM_PATTERNS.filter((pattern) => pattern.test(text)).map((pattern) =>
    pattern.toString(),
  );
}

export function validateLeadInquiryClassificationResult(
  input: unknown,
): ValidationResult<LeadInquiryClassificationResult> {
  const errors: string[] = [];
  if (typeof input !== 'object' || input === null) {
    return { valid: false, value: null, errors: ['response must be an object'] };
  }
  const candidate = input as Record<string, unknown>;

  if (
    typeof candidate.intentCategory !== 'string' ||
    !INTENT_CATEGORIES.has(candidate.intentCategory as LeadIntentCategory)
  ) {
    errors.push(`intentCategory must be one of: ${[...INTENT_CATEGORIES].join(', ')}`);
  }
  if (typeof candidate.summary !== 'string' || candidate.summary.trim().length === 0) {
    errors.push('summary must be a non-empty string');
  }
  if (
    !Array.isArray(candidate.missingInformation) ||
    !candidate.missingInformation.every((item) => typeof item === 'string')
  ) {
    errors.push('missingInformation must be an array of strings');
  }
  if (
    typeof candidate.recommendedTemplateId !== 'string' ||
    !TEMPLATE_IDS.has(candidate.recommendedTemplateId as ApprovedResponseTemplateId)
  ) {
    errors.push(`recommendedTemplateId must be one of: ${[...TEMPLATE_IDS].join(', ')}`);
  }
  if (
    typeof candidate.confidence !== 'number' ||
    Number.isNaN(candidate.confidence) ||
    candidate.confidence < 0 ||
    candidate.confidence > 1
  ) {
    errors.push('confidence must be a number between 0 and 1');
  }
  if (typeof candidate.requiresEscalation !== 'boolean') {
    errors.push('requiresEscalation must be a boolean');
  }
  if (
    !Array.isArray(candidate.escalationReasons) ||
    !candidate.escalationReasons.every(
      (reason) => typeof reason === 'string' && ESCALATION_REASONS.has(reason as EscalationReason),
    )
  ) {
    errors.push('escalationReasons must be an array of known EscalationReason values');
  }

  if (errors.length === 0) {
    const freeTextFields = [
      candidate.summary as string,
      ...((candidate.missingInformation as string[] | undefined) ?? []),
    ];
    for (const field of freeTextFields) {
      const claims = findForbiddenClaims(field);
      if (claims.length > 0) {
        errors.push(`forbidden claim detected in free text ("${field}"): ${claims.join(', ')}`);
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, value: null, errors };
  }
  return {
    valid: true,
    value: candidate as unknown as LeadInquiryClassificationResult,
    errors: [],
  };
}
