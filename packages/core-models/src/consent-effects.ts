/**
 * This package never mutates a database, website, CMS, photo store, or
 * review platform directly. Evaluating a consent revocation instead returns
 * a typed list of required effects for a future adapter to execute -
 * publication-related revocations always require at least one effect,
 * never a silent no-op.
 */

import type { ConsentPurpose, CustomerConsent } from './types/consent';
import { isPublicationRelatedPurpose } from './types/consent';

export type RequiredConsentEffect =
  | 'unpublish-affected-content'
  | 'remove-affected-photo-derivatives'
  | 'suppress-future-review-requests'
  | 'suppress-future-marketing-communication'
  | 'require-privacy-review'
  | 'require-content-re-review'
  | 'record-audit-action'
  | 'notify-adapters-takedown-required';

export interface ConsentRevocationEvaluation {
  readonly consentId: string;
  readonly purpose: ConsentPurpose;
  readonly requiredEffects: readonly RequiredConsentEffect[];
}

/**
 * Evaluates what a revocation of `revokedConsent` requires. Does not mutate
 * `revokedConsent` or any other record - the caller is responsible for
 * persisting a new 'revoked' CustomerConsent row (see types/consent.ts) and
 * for having its own adapters execute the returned effects.
 */
export function evaluateConsentRevocation(
  revokedConsent: CustomerConsent,
): ConsentRevocationEvaluation {
  if (revokedConsent.status !== 'revoked') {
    throw new Error(
      'evaluateConsentRevocation expects a CustomerConsent record already in "revoked" status.',
    );
  }

  const effects: RequiredConsentEffect[] = ['record-audit-action'];

  if (isPublicationRelatedPurpose(revokedConsent.purpose)) {
    effects.push(
      'unpublish-affected-content',
      'require-content-re-review',
      'require-privacy-review',
    );
    if (revokedConsent.purpose === 'photo-publication') {
      effects.push('remove-affected-photo-derivatives');
    }
    effects.push('notify-adapters-takedown-required');
  }

  if (revokedConsent.purpose === 'review-request') {
    effects.push('suppress-future-review-requests');
  }

  if (revokedConsent.purpose === 'marketing-communication') {
    effects.push('suppress-future-marketing-communication');
  }

  return {
    consentId: revokedConsent.id,
    purpose: revokedConsent.purpose,
    requiredEffects: effects,
  };
}
