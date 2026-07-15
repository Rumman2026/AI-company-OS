/**
 * Deterministic local fixtures for tests only. Never exported from
 * index.ts - see the "no test-only constructors through the production
 * entry point" requirement.
 */

import {
  createLeadId,
  createContactId,
  createCustomerId,
  createEstimateId,
  createBookingId,
  createJobId,
  createJobCompletionRecordId,
  createInvoiceId,
  createConsentId,
  createContentDraftId,
  createReviewRequestId,
  createPhotoAssetId,
  createServiceId,
  createCityId,
} from '../ids';
import { createCurrencyCode, createMoney } from '../money';
import type { Lead } from '../types/lead';
import type { LeadAttribution } from '../types/attribution';
import type { Job, JobCompletionRecord } from '../types/job';
import type { Invoice } from '../types/invoice';
import type { CustomerConsent } from '../types/consent';
import type { ContentDraft } from '../types/content';
import type { ReviewRequest } from '../types/review';
import type { PhotoAsset } from '../types/photo';
import type { TransitionContext } from '../transition';

export const fixtureCurrency = createCurrencyCode('USD');

export const fixtureLeadId = createLeadId('fixture-lead-1');
export const fixtureContactId = createContactId('fixture-contact-1');
export const fixtureCustomerId = createCustomerId('fixture-customer-1');
export const fixtureEstimateId = createEstimateId('fixture-estimate-1');
export const fixtureBookingId = createBookingId('fixture-booking-1');
export const fixtureJobId = createJobId('fixture-job-1');
export const fixtureJobCompletionRecordId = createJobCompletionRecordId('fixture-completion-1');
export const fixtureInvoiceId = createInvoiceId('fixture-invoice-1');
export const fixtureConsentId = createConsentId('fixture-consent-1');
export const fixtureContentDraftId = createContentDraftId('fixture-content-1');
export const fixtureReviewRequestId = createReviewRequestId('fixture-review-request-1');
export const fixturePhotoAssetIdBefore = createPhotoAssetId('fixture-photo-before-1');
export const fixturePhotoAssetIdAfter = createPhotoAssetId('fixture-photo-after-1');
export const fixtureServiceId = createServiceId('fixture-service-1');
export const fixtureCityId = createCityId('fixture-city-1');

export const fixtureAttribution: LeadAttribution = {
  channel: 'organic',
  leadCreatedAt: '2026-01-01T00:00:00.000Z',
};

export function makeFixtureLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: fixtureLeadId,
    contactId: fixtureContactId,
    status: 'new',
    attribution: fixtureAttribution,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeFixtureJob(overrides: Partial<Job> = {}): Job {
  return {
    id: fixtureJobId,
    leadId: fixtureLeadId,
    bookingId: fixtureBookingId,
    status: 'draft',
    createdAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}

export function makeFixtureCompletionRecord(
  overrides: Partial<JobCompletionRecord> = {},
): JobCompletionRecord {
  return {
    id: fixtureJobCompletionRecordId,
    jobId: fixtureJobId,
    servicePerformed: 'Roof soft wash',
    workCompletedDescription: 'Removed organic growth from all roof surfaces.',
    beforePhotoIds: [fixturePhotoAssetIdBefore],
    afterPhotoIds: [fixturePhotoAssetIdAfter],
    submittedAt: '2026-01-03T00:00:00.000Z',
    ...overrides,
  };
}

export function makeFixtureInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: fixtureInvoiceId,
    jobId: fixtureJobId,
    leadId: fixtureLeadId,
    status: 'draft',
    totalAmount: createMoney(50000, fixtureCurrency),
    createdAt: '2026-01-04T00:00:00.000Z',
    ...overrides,
  };
}

export function makeFixtureConsent(overrides: Partial<CustomerConsent> = {}): CustomerConsent {
  return {
    id: fixtureConsentId,
    customerId: fixtureCustomerId,
    purpose: 'photo-publication',
    status: 'granted',
    version: '2026-01-01',
    source: 'fixture',
    occurredAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeFixtureContentDraft(overrides: Partial<ContentDraft> = {}): ContentDraft {
  return {
    id: fixtureContentDraftId,
    jobId: fixtureJobId,
    status: 'not-eligible',
    serviceId: fixtureServiceId,
    cityId: fixtureCityId,
    photoPairIds: [],
    createdAt: '2026-01-05T00:00:00.000Z',
    ...overrides,
  };
}

export function makeFixtureReviewRequest(overrides: Partial<ReviewRequest> = {}): ReviewRequest {
  return {
    id: fixtureReviewRequestId,
    jobId: fixtureJobId,
    status: 'not-eligible',
    deduplicationKey: `review-request:${fixtureJobId}`,
    createdAt: '2026-01-06T00:00:00.000Z',
    ...overrides,
  };
}

export function makeFixturePhotoAsset(overrides: Partial<PhotoAsset> = {}): PhotoAsset {
  return {
    id: fixturePhotoAssetIdBefore,
    jobId: fixtureJobId,
    kind: 'before',
    privateOriginalRef: 'private/fixture-original.jpg',
    metadataStripped: false,
    gpsDataRemoved: false,
    privacyReviewPassed: false,
    humanPublicationApproved: false,
    publicationConsentGranted: false,
    publicationStatus: 'not-published',
    ...overrides,
  };
}

export function makeContext(overrides: Partial<TransitionContext> = {}): TransitionContext {
  return {
    actorCategory: 'office-manager',
    actorId: 'fixture-actor-1',
    occurredAt: '2026-01-10T00:00:00.000Z',
    ...overrides,
  };
}
