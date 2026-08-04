import type { EstimateAttachmentId, EstimateId } from '../ids';

/**
 * A reference photo attached to an Estimate - see DECISIONS.md ADR-0028.
 * Deliberately a separate, minimal type from `PhotoAsset`
 * (types/photo.ts), not a widened version of it: `PhotoAsset` models a
 * Job's before/progress/after documentation with a public-marketing
 * publication workflow (metadataStripped, gpsDataRemoved,
 * privacyReviewPassed, humanPublicationApproved, publicationStatus,
 * etc.) that has no meaning for an estimate attachment, which is always
 * a private, internal-only reference image (e.g. a customer's photo of
 * what needs cleaning) and is never a candidate for public
 * before/after marketing use.
 */
export interface EstimateAttachment {
  readonly id: EstimateAttachmentId;
  readonly estimateId: EstimateId;
  readonly storageRef: string;
  readonly fileName: string;
  readonly caption?: string;
  readonly uploadedBy?: string;
  readonly uploadedAt: string;
}
