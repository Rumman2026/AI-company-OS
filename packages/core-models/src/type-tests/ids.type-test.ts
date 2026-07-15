/**
 * Compile-time-only checks. This file is intentionally included in
 * `tsc --noEmit` (it lives under src/, matching the package tsconfig's
 * `include: ["src"]`) but is never executed as a runtime test (it is not
 * under tests/, so `tsx --test tests/` never discovers it) and is never
 * exported from index.ts.
 *
 * Every `@ts-expect-error` below documents a specific compile-time
 * guarantee. Each declared value is passed to `void` immediately so it
 * counts as "used" for `noUnusedLocals` without weakening the check being
 * demonstrated.
 */

import type {
  ConsentId,
  ContentDraftId,
  InvoiceId,
  JobId,
  LeadId,
  PublishedProjectId,
  PublishedProjectSlug,
} from '../ids';
import { createConsentId, createJobId, createLeadId, createPublishedProjectSlug } from '../ids';
import type { Job } from '../types/job';
import type { ActorCategory } from '../transition';
import type { Money, CurrencyCode } from '../money';
import { createCurrencyCode } from '../money';

// LeadId must not be assignable to JobId.
const leadId: LeadId = createLeadId('lead-1');
// @ts-expect-error LeadId and JobId are distinct branded types and must never be interchangeable.
const leadIdAsJobId: JobId = leadId;
void leadIdAsJobId;

// JobId must not be assignable to InvoiceId.
const jobId: JobId = createJobId('job-1');
// @ts-expect-error JobId and InvoiceId are distinct branded types and must never be interchangeable.
const jobIdAsInvoiceId: InvoiceId = jobId;
void jobIdAsInvoiceId;

// ConsentId must not be assignable to ContentDraftId.
const consentId: ConsentId = createConsentId('consent-1');
// @ts-expect-error ConsentId and ContentDraftId are distinct branded types and must never be interchangeable.
const consentIdAsContentDraftId: ContentDraftId = consentId;
void consentIdAsContentDraftId;

// A public slug must never be usable as the internal PublishedProjectId.
const slug: PublishedProjectSlug = createPublishedProjectSlug('roof-cleaning-example');
// @ts-expect-error A public slug must never substitute for an internal PublishedProjectId.
const slugAsInternalId: PublishedProjectId = slug;
void slugAsInternalId;

// A plain string literal must never satisfy a branded id without going
// through its constructor.
// @ts-expect-error A bare string is not assignable to the branded LeadId type.
const rawStringAsLeadId: LeadId = 'not-a-branded-id';
void rawStringAsLeadId;

// Entity relationships require the correct id type: Job.leadId must be a
// LeadId, not a JobId.
// @ts-expect-error Job.leadId requires a LeadId, not a JobId.
const jobWithWrongLeadId: Pick<Job, 'leadId'> = { leadId: jobId };
void jobWithWrongLeadId;

// Transition context requires a valid ActorCategory literal, not an
// arbitrary string.
// @ts-expect-error 'not-a-real-actor' is not one of the approved ActorCategory literals.
const invalidActorCategory: ActorCategory = 'not-a-real-actor';
void invalidActorCategory;

// Monetary values require the approved safe CurrencyCode type, not an
// arbitrary string.
// @ts-expect-error currency must be a branded CurrencyCode, not an arbitrary string literal.
const moneyWithInvalidCurrency: Money = { amountMinorUnits: 1000, currency: 'NOTREAL' };
void moneyWithInvalidCurrency;

// A positive control: valid, correctly-typed values must compile without
// any @ts-expect-error, proving the checks above are testing real
// separation and not merely a broken type declaration.
const validActorCategory: ActorCategory = 'office-manager';
void validActorCategory;
const validCurrency: CurrencyCode = createCurrencyCode('USD');
void validCurrency;
const validJobLeadId: Pick<Job, 'leadId'> = { leadId };
void validJobLeadId;
