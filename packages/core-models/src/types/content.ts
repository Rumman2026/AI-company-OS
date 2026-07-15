import type {
  CityId,
  ContentApprovalId,
  ContentDraftId,
  JobId,
  PhotoPairId,
  PublishedProjectId,
  PublishedProjectSlug,
  ServiceId,
} from '../ids';

export type ContentStatus =
  | 'not-eligible'
  | 'eligible-for-draft'
  | 'draft-generated'
  | 'under-review'
  | 'changes-requested'
  | 'approved'
  | 'rejected'
  | 'scheduled'
  | 'published'
  | 'unpublished'
  | 'archived';

/**
 * Fields are kept in four explicit categories - verified factual,
 * technician-authored, AI-generated, and human-approved - rather than one
 * opaque content blob, so a reader can always tell which parts of a
 * published page were machine-written.
 */
export interface ContentDraft {
  readonly id: ContentDraftId;
  readonly jobId: JobId;
  readonly status: ContentStatus;

  // Verified factual (sourced from the Job record)
  readonly serviceId: ServiceId;
  readonly cityId: CityId;
  readonly photoPairIds: readonly PhotoPairId[];

  // AI-generated (until edited)
  readonly proposedTitle?: string;
  readonly proposedSlug?: string;
  readonly summary?: string;
  readonly faqs?: readonly string[];
  readonly metaDescription?: string;

  // Technician-authored
  readonly technicianObservations?: string;

  // Human-approved layer
  readonly reviewerComments?: string;
  readonly publishedProjectId?: PublishedProjectId;

  readonly createdAt: string;
}

export interface ContentApprovalDecision {
  readonly reviewerId: string;
  readonly approvedAt: string;
  readonly decision: 'approved' | 'rejected' | 'changes-requested';
}

export interface ContentApproval {
  readonly id: ContentApprovalId;
  readonly contentDraftId: ContentDraftId;
  readonly decision: ContentApprovalDecision;
}

export interface PublishedProject {
  readonly id: PublishedProjectId;
  readonly slug: PublishedProjectSlug;
  readonly contentDraftId: ContentDraftId;
  readonly serviceId: ServiceId;
  readonly cityId: CityId;
  readonly publishedAt: string;
}

/**
 * Preconditions required before Content may leave `not-eligible` for
 * `eligible-for-draft`. Mirrors the "Draft eligibility" column of the
 * Growth System Plan's job-to-content eligibility table - deliberately
 * lighter than publication eligibility (e.g. full invoice payment is not
 * required here).
 */
export interface ContentEligibilityEvidence {
  readonly jobCompleted: boolean;
  readonly officeReviewCompleted: boolean;
  readonly invoiceNotVoidedOrDisputed: boolean;
  readonly beforePhotosPresent: boolean;
  readonly afterPhotosPresent: boolean;
  readonly technicianNotesComplete: boolean;
  readonly marketingConsentApproved: boolean;
  readonly serviceAndCityVerified: boolean;
  readonly noUnresolvedComplaint: boolean;
  readonly noRefundOrDispute: boolean;
}

/**
 * The stricter gate required before Approved/Scheduled content may become
 * Published. Mirrors the "Publication" column of the same eligibility
 * table - this is where invoice payment, privacy checks, and content
 * quality become hard requirements.
 */
export interface ContentPublicationEvidence {
  readonly invoicePaid: boolean;
  readonly privateInformationRemoved: boolean;
  readonly contentQualityThresholdMet: boolean;
}
