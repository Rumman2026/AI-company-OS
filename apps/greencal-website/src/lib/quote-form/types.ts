/**
 * Field errors keyed by field name. `form` is used for errors that are not
 * attributable to a single field (e.g. a malformed payload).
 */
export type FieldErrors = Record<string, string>;

export type PreferredContactMethod = 'phone' | 'email';

/** Normalized, validated quote-request data - the only shape adapters see. */
export interface NormalizedQuoteInput {
  fullName: string;
  phone: string;
  email: string;
  service: string;
  /** Canonical city slug, or the OTHER_CITY_SLUG sentinel - see validation.ts. */
  city: string;
  serviceLocation: string;
  projectDescription: string;
  consent: true;
  preferredContactMethod?: PreferredContactMethod;
  preferredTiming?: string;
  propertyType?: string;
  estimatedProjectSize?: string;
}

/**
 * The typed submission-result contract. Every submission path - client UI,
 * a future server endpoint, and tests - resolves to exactly one of these
 * four states. Production code must never return `success` unless a
 * trusted adapter actually confirms delivery.
 */
export type QuoteSubmissionResult =
  | {
      status: 'success';
      leadId: string;
      submittedAt: string;
    }
  | {
      status: 'validation_failed';
      fieldErrors: FieldErrors;
      message: string;
    }
  | {
      status: 'pending_configuration';
      message: string;
    }
  | {
      status: 'delivery_failed';
      message: string;
    };

export const QUOTE_LEAD_SOURCE = 'website_quote_form' as const;

/**
 * Minimal structured lead payload. Deliberately does NOT import or depend
 * on packages/core-models' `Lead`/`LeadAttribution`/`FormSubmission`
 * contracts: `LeadAttribution.channel` is required and packages/core-models
 * has no persistence layer, so forcing this payload into that shape today
 * would mean fabricating attribution/contact data this static site cannot
 * honestly capture yet (see docs note in adapter.ts). Field names are kept
 * close to that future contract on purpose so a future ingestion adapter
 * can map QuoteLeadRecord -> FormSubmission + Lead + LeadAttribution
 * without a redesign.
 */
export interface QuoteLeadRecord {
  leadId: string;
  createdAt: string;
  source: typeof QUOTE_LEAD_SOURCE;
  pagePath: string;
  fullName: string;
  phone: string;
  email: string;
  service: string;
  city: string;
  serviceLocation: string;
  projectDescription: string;
  preferredContactMethod?: PreferredContactMethod;
  preferredTiming?: string;
  propertyType?: string;
  estimatedProjectSize?: string;
  consent: true;
  submissionStatus: 'received';
}
