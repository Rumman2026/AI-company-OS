import type { ConsentId, CustomerId } from '../ids';

/**
 * Consent is purpose-specific, never a single general marketing boolean.
 */
export type ConsentPurpose =
  | 'service-communication'
  | 'marketing-communication'
  | 'review-request'
  | 'photo-publication'
  | 'project-description-publication'
  | 'city-publication'
  | 'customer-name-publication'
  | 'testimonial-publication';

export type ConsentStatus = 'pending' | 'granted' | 'declined' | 'revoked';

/**
 * Append-only by convention: a revocation is a new CustomerConsent record
 * with status 'revoked', never a mutation of the prior granted record. See
 * consent-effects.ts for what a revocation is required to produce.
 */
export interface CustomerConsent {
  readonly id: ConsentId;
  readonly customerId: CustomerId;
  readonly purpose: ConsentPurpose;
  readonly status: ConsentStatus;
  readonly version: string;
  readonly source: string;
  readonly occurredAt: string;
  readonly proofReference?: string;
  readonly supersedesConsentId?: ConsentId;
}

const PUBLICATION_RELATED_PURPOSES: ReadonlySet<ConsentPurpose> = new Set([
  'photo-publication',
  'project-description-publication',
  'city-publication',
  'customer-name-publication',
  'testimonial-publication',
]);

export function isPublicationRelatedPurpose(purpose: ConsentPurpose): boolean {
  return PUBLICATION_RELATED_PURPOSES.has(purpose);
}
