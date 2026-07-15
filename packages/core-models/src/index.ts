/**
 * Public entry point for @ai-company-os/core-models.
 *
 * Provider-neutral domain contracts for the GreenCal Lead-to-Job-to-Content
 * growth system - see the Growth System Plan and its first-slice
 * implementation prompt for the full architecture. Named exports only (no
 * wildcard re-exports); fixtures, test helpers, and type-test files are
 * never exported from here.
 */

export { DomainValidationError } from './primitives';

export {
  createLeadId,
  createContactId,
  createCustomerId,
  createEstimateId,
  createBookingId,
  createJobId,
  createJobServiceId,
  createTechnicianId,
  createJobCompletionRecordId,
  createPhotoAssetId,
  createPhotoPairId,
  createConsentId,
  createInvoiceId,
  createPaymentId,
  createReviewRequestId,
  createReviewRecordId,
  createContentDraftId,
  createContentApprovalId,
  createPublishedProjectId,
  createServiceId,
  createCityId,
  createCityServiceId,
  createPageMetadataId,
  createInternalLinkRecommendationId,
  createConversionEventId,
  createMarketingCampaignId,
  createCallRecordId,
  createFormSubmissionId,
  createAuditRecordId,
  createCorrelationId,
  createPublishedProjectSlug,
} from './ids';
export type {
  LeadId,
  ContactId,
  CustomerId,
  EstimateId,
  BookingId,
  JobId,
  JobServiceId,
  TechnicianId,
  JobCompletionRecordId,
  PhotoAssetId,
  PhotoPairId,
  ConsentId,
  InvoiceId,
  PaymentId,
  ReviewRequestId,
  ReviewRecordId,
  ContentDraftId,
  ContentApprovalId,
  PublishedProjectId,
  ServiceId,
  CityId,
  CityServiceId,
  PageMetadataId,
  InternalLinkRecommendationId,
  ConversionEventId,
  MarketingCampaignId,
  CallRecordId,
  FormSubmissionId,
  AuditRecordId,
  CorrelationId,
  PublishedProjectSlug,
} from './ids';

export { createCurrencyCode, createMoney } from './money';
export type { CurrencyCode, Money } from './money';

export { isAutomatedActor } from './transition';
export type {
  ActorCategory,
  TransitionContext,
  TransitionErrorCode,
  ProposedAuditRecord,
  TransitionSuccess,
  TransitionRejection,
  TransitionResult,
} from './transition';

export type { LeadAttribution, MarketingCampaign, AttributionChannel } from './types/attribution';
export type { Lead, LeadStatus } from './types/lead';
export type { Contact, Customer } from './types/contact';
export type { Estimate, Booking } from './types/estimate-booking';
export type { Job, JobStatus, JobService, Technician, JobCompletionRecord } from './types/job';
export type { PhotoAsset, PhotoPair, PhotoPublicationStatus } from './types/photo';
export { isPublicationRelatedPurpose } from './types/consent';
export type { CustomerConsent, ConsentPurpose, ConsentStatus } from './types/consent';
export type { Invoice, Payment, InvoiceStatus, PaymentOutcomeEvidence } from './types/invoice';
export type { ReviewRequest, ReviewRequestStatus, ReviewRecord } from './types/review';
export type {
  ContentDraft,
  ContentStatus,
  ContentApproval,
  ContentApprovalDecision,
  PublishedProject,
  ContentEligibilityEvidence,
  ContentPublicationEvidence,
} from './types/content';
export type {
  Service,
  City,
  CityService,
  CityServicePublicationStatus,
} from './types/service-city';
export type { PageMetadata, InternalLinkRecommendation } from './types/seo';
export type {
  ConversionEvent,
  ConversionEventCategory,
  ConversionEventName,
} from './types/conversion';
export type { CallRecord, FormSubmission } from './types/call-form';
export type { AuditLog } from './types/audit';

export { transitionLead } from './state-machines/lead';
export { transitionJob } from './state-machines/job';
export type { JobTransitionOptions } from './state-machines/job';
export { transitionInvoice } from './state-machines/invoice';
export { transitionContent } from './state-machines/content';
export type { ContentTransitionOptions } from './state-machines/content';
export { transitionReviewRequest } from './state-machines/review-request';
export type {
  ReviewRequestTransitionOptions,
  ReviewEligibilityEvidence,
} from './state-machines/review-request';

export { evaluateConsentRevocation } from './consent-effects';
export type { RequiredConsentEffect, ConsentRevocationEvaluation } from './consent-effects';

export { evaluatePhotoPublicationEligibility } from './photo-eligibility';
export type { PhotoPublicationEligibility } from './photo-eligibility';
