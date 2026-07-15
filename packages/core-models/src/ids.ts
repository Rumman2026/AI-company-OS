/**
 * Opaque, branded identifiers for every entity in the domain model.
 *
 * Each ID type is structurally distinct at compile time (see
 * type-tests/ids.type-test.ts) even though every one is a branded string at
 * runtime. IDs are never generated here - this package only validates and
 * brands an already-supplied string. Generation strategy (e.g. UUIDv7) is a
 * future persistence-layer concern, deliberately out of scope for this
 * provider-neutral slice.
 *
 * `PublishedProjectSlug` is intentionally NOT an "Id" - it is the only
 * identifier ever meant to appear in a public URL, and must never be
 * interchangeable with any internal id, including `PublishedProjectId`.
 */

import { type Branded, createBrandedString, DomainValidationError } from './primitives';

export type LeadId = Branded<string, 'LeadId'>;
export function createLeadId(value: string): LeadId {
  return createBrandedString('LeadId', value);
}

export type ContactId = Branded<string, 'ContactId'>;
export function createContactId(value: string): ContactId {
  return createBrandedString('ContactId', value);
}

export type CustomerId = Branded<string, 'CustomerId'>;
export function createCustomerId(value: string): CustomerId {
  return createBrandedString('CustomerId', value);
}

export type EstimateId = Branded<string, 'EstimateId'>;
export function createEstimateId(value: string): EstimateId {
  return createBrandedString('EstimateId', value);
}

export type BookingId = Branded<string, 'BookingId'>;
export function createBookingId(value: string): BookingId {
  return createBrandedString('BookingId', value);
}

export type JobId = Branded<string, 'JobId'>;
export function createJobId(value: string): JobId {
  return createBrandedString('JobId', value);
}

export type JobServiceId = Branded<string, 'JobServiceId'>;
export function createJobServiceId(value: string): JobServiceId {
  return createBrandedString('JobServiceId', value);
}

export type TechnicianId = Branded<string, 'TechnicianId'>;
export function createTechnicianId(value: string): TechnicianId {
  return createBrandedString('TechnicianId', value);
}

export type JobCompletionRecordId = Branded<string, 'JobCompletionRecordId'>;
export function createJobCompletionRecordId(value: string): JobCompletionRecordId {
  return createBrandedString('JobCompletionRecordId', value);
}

export type PhotoAssetId = Branded<string, 'PhotoAssetId'>;
export function createPhotoAssetId(value: string): PhotoAssetId {
  return createBrandedString('PhotoAssetId', value);
}

export type PhotoPairId = Branded<string, 'PhotoPairId'>;
export function createPhotoPairId(value: string): PhotoPairId {
  return createBrandedString('PhotoPairId', value);
}

export type ConsentId = Branded<string, 'ConsentId'>;
export function createConsentId(value: string): ConsentId {
  return createBrandedString('ConsentId', value);
}

export type InvoiceId = Branded<string, 'InvoiceId'>;
export function createInvoiceId(value: string): InvoiceId {
  return createBrandedString('InvoiceId', value);
}

export type PaymentId = Branded<string, 'PaymentId'>;
export function createPaymentId(value: string): PaymentId {
  return createBrandedString('PaymentId', value);
}

export type ReviewRequestId = Branded<string, 'ReviewRequestId'>;
export function createReviewRequestId(value: string): ReviewRequestId {
  return createBrandedString('ReviewRequestId', value);
}

export type ReviewRecordId = Branded<string, 'ReviewRecordId'>;
export function createReviewRecordId(value: string): ReviewRecordId {
  return createBrandedString('ReviewRecordId', value);
}

export type ContentDraftId = Branded<string, 'ContentDraftId'>;
export function createContentDraftId(value: string): ContentDraftId {
  return createBrandedString('ContentDraftId', value);
}

export type ContentApprovalId = Branded<string, 'ContentApprovalId'>;
export function createContentApprovalId(value: string): ContentApprovalId {
  return createBrandedString('ContentApprovalId', value);
}

export type PublishedProjectId = Branded<string, 'PublishedProjectId'>;
export function createPublishedProjectId(value: string): PublishedProjectId {
  return createBrandedString('PublishedProjectId', value);
}

export type ServiceId = Branded<string, 'ServiceId'>;
export function createServiceId(value: string): ServiceId {
  return createBrandedString('ServiceId', value);
}

export type CityId = Branded<string, 'CityId'>;
export function createCityId(value: string): CityId {
  return createBrandedString('CityId', value);
}

export type CityServiceId = Branded<string, 'CityServiceId'>;
export function createCityServiceId(value: string): CityServiceId {
  return createBrandedString('CityServiceId', value);
}

export type PageMetadataId = Branded<string, 'PageMetadataId'>;
export function createPageMetadataId(value: string): PageMetadataId {
  return createBrandedString('PageMetadataId', value);
}

export type InternalLinkRecommendationId = Branded<string, 'InternalLinkRecommendationId'>;
export function createInternalLinkRecommendationId(value: string): InternalLinkRecommendationId {
  return createBrandedString('InternalLinkRecommendationId', value);
}

export type ConversionEventId = Branded<string, 'ConversionEventId'>;
export function createConversionEventId(value: string): ConversionEventId {
  return createBrandedString('ConversionEventId', value);
}

export type MarketingCampaignId = Branded<string, 'MarketingCampaignId'>;
export function createMarketingCampaignId(value: string): MarketingCampaignId {
  return createBrandedString('MarketingCampaignId', value);
}

export type CallRecordId = Branded<string, 'CallRecordId'>;
export function createCallRecordId(value: string): CallRecordId {
  return createBrandedString('CallRecordId', value);
}

export type FormSubmissionId = Branded<string, 'FormSubmissionId'>;
export function createFormSubmissionId(value: string): FormSubmissionId {
  return createBrandedString('FormSubmissionId', value);
}

export type AuditRecordId = Branded<string, 'AuditRecordId'>;
export function createAuditRecordId(value: string): AuditRecordId {
  return createBrandedString('AuditRecordId', value);
}

export type CorrelationId = Branded<string, 'CorrelationId'>;
export function createCorrelationId(value: string): CorrelationId {
  return createBrandedString('CorrelationId', value);
}

/**
 * The only identifier ever meant to appear in a public URL, sitemap,
 * canonical tag, or structured-data payload. Structurally distinct from
 * `PublishedProjectId` - see the compile-time type tests.
 */
export type PublishedProjectSlug = Branded<string, 'PublishedProjectSlug'>;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function createPublishedProjectSlug(value: string): PublishedProjectSlug {
  if (typeof value !== 'string' || !SLUG_PATTERN.test(value)) {
    throw new DomainValidationError(
      'PublishedProjectSlug',
      value,
      'must be lowercase, alphanumeric words separated by single hyphens',
    );
  }
  return value as PublishedProjectSlug;
}
