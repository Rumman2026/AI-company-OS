import { QUOTE_FORM_SERVICE_SLUGS } from '../../data/quote-form-service-options';
import { cities } from '../../data/cities';
import type { FieldErrors, NormalizedQuoteInput, PreferredContactMethod } from './types';

// Single source of truth for the service allowlist: quoteFormServiceOptions
// (residential + commercial + multi-family/HOA + "other, reviewed
// manually") - see DECISIONS.md ADR-0007. The selector can never drift
// from the site's approved services because it is rendered from the same
// list.
const ALLOWED_SERVICE_SLUGS: readonly string[] = QUOTE_FORM_SERVICE_SLUGS;

// Single source of truth for the city allowlist: src/data/cities.ts (see
// ADR-0007 - "do not maintain separate manually duplicated city lists").
// OTHER_CITY_SLUG is always a valid choice specifically so a legitimate
// lead is never rejected just because the customer's city isn't listed or
// autocomplete/matching failed - the lead is still accepted and can be
// reviewed for service-area confirmation.
export const OTHER_CITY_SLUG = 'other-not-listed';
const ALLOWED_CITY_SLUGS: readonly string[] = [...cities.map((city) => city.slug), OTHER_CITY_SLUG];

export const PREFERRED_CONTACT_METHODS = ['phone', 'email'] as const;
export const PREFERRED_TIMING_OPTIONS = [
  'as-soon-as-possible',
  'within-a-week',
  'within-a-month',
  'flexible',
] as const;
export const PROPERTY_TYPE_OPTIONS = [
  'single-family-home',
  'condo-townhome',
  'multi-family',
  'commercial',
  'other',
] as const;
export const PROJECT_SIZE_OPTIONS = ['small', 'medium', 'large', 'not-sure'] as const;

export const LIMITS = {
  fullNameMin: 2,
  fullNameMax: 100,
  emailMax: 254,
  serviceLocationMin: 2,
  serviceLocationMax: 120,
  projectDescriptionMin: 10,
  projectDescriptionMax: 2000,
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ValidationSuccess {
  valid: true;
  data: NormalizedQuoteInput;
}

export interface ValidationFailure {
  valid: false;
  fieldErrors: FieldErrors;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asBoolean(value: unknown): boolean {
  return value === true || value === 'true' || value === 'on';
}

function isOneOf<T extends string>(value: string, allowed: readonly T[]): value is T {
  return (allowed as readonly string[]).includes(value);
}

function normalizePhone(rawPhone: string): string | null {
  const trimmed = rawPhone.trim();
  const hasLeadingPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');

  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  if (hasLeadingPlus && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }
  return null;
}

/**
 * The trusted validation boundary. Runs on unknown, untrusted input -
 * today that means client-side FormData, but the same function is meant
 * to run unchanged on a future server endpoint's request body, so it
 * never trusts the shape of `raw` and never throws.
 */
export function validateQuoteInput(raw: unknown): ValidationResult {
  const fieldErrors: FieldErrors = {};

  if (typeof raw !== 'object' || raw === null) {
    return { valid: false, fieldErrors: { form: 'Malformed submission.' } };
  }
  const input = raw as Record<string, unknown>;

  // Honeypot: a real customer never populates this hidden field. Checked
  // first and returned immediately so no other validation work is spent
  // on an obviously automated submission.
  const honeypot = asString(input.honeypot).trim();
  if (honeypot.length > 0) {
    return { valid: false, fieldErrors: { honeypot: 'Submission rejected.' } };
  }

  const fullName = asString(input.fullName).trim();
  if (fullName.length < LIMITS.fullNameMin || fullName.length > LIMITS.fullNameMax) {
    fieldErrors.fullName = `Enter your name (${LIMITS.fullNameMin}-${LIMITS.fullNameMax} characters).`;
  }

  const phone = normalizePhone(asString(input.phone));
  if (!phone) {
    fieldErrors.phone = 'Enter a valid U.S. phone number.';
  }

  const email = asString(input.email).trim().toLowerCase();
  if (email.length === 0 || email.length > LIMITS.emailMax || !EMAIL_PATTERN.test(email)) {
    fieldErrors.email = 'Enter a valid email address.';
  }

  const service = asString(input.service).trim();
  if (!isOneOf(service, ALLOWED_SERVICE_SLUGS)) {
    fieldErrors.service = 'Choose a service from the list.';
  }

  const city = asString(input.city).trim();
  if (!isOneOf(city, ALLOWED_CITY_SLUGS)) {
    fieldErrors.city = 'Choose your city, or "Other / not listed here".';
  }

  const serviceLocation = asString(input.serviceLocation).trim();
  if (
    serviceLocation.length < LIMITS.serviceLocationMin ||
    serviceLocation.length > LIMITS.serviceLocationMax
  ) {
    fieldErrors.serviceLocation = `Enter your city or service address (${LIMITS.serviceLocationMin}-${LIMITS.serviceLocationMax} characters).`;
  }

  const projectDescription = asString(input.projectDescription).trim();
  if (
    projectDescription.length < LIMITS.projectDescriptionMin ||
    projectDescription.length > LIMITS.projectDescriptionMax
  ) {
    fieldErrors.projectDescription = `Describe your project (${LIMITS.projectDescriptionMin}-${LIMITS.projectDescriptionMax} characters).`;
  }

  const consent = asBoolean(input.consent);
  if (!consent) {
    fieldErrors.consent = 'You must agree to be contacted about this request.';
  }

  let preferredContactMethod: PreferredContactMethod | undefined;
  const rawPreferredContactMethod = asString(input.preferredContactMethod).trim();
  if (rawPreferredContactMethod.length > 0) {
    if (!isOneOf(rawPreferredContactMethod, PREFERRED_CONTACT_METHODS)) {
      fieldErrors.preferredContactMethod = 'Choose a valid contact method.';
    } else {
      preferredContactMethod = rawPreferredContactMethod;
    }
  }

  let preferredTiming: string | undefined;
  const rawPreferredTiming = asString(input.preferredTiming).trim();
  if (rawPreferredTiming.length > 0) {
    if (!isOneOf(rawPreferredTiming, PREFERRED_TIMING_OPTIONS)) {
      fieldErrors.preferredTiming = 'Choose a valid timing option.';
    } else {
      preferredTiming = rawPreferredTiming;
    }
  }

  let propertyType: string | undefined;
  const rawPropertyType = asString(input.propertyType).trim();
  if (rawPropertyType.length > 0) {
    if (!isOneOf(rawPropertyType, PROPERTY_TYPE_OPTIONS)) {
      fieldErrors.propertyType = 'Choose a valid property type.';
    } else {
      propertyType = rawPropertyType;
    }
  }

  let estimatedProjectSize: string | undefined;
  const rawEstimatedProjectSize = asString(input.estimatedProjectSize).trim();
  if (rawEstimatedProjectSize.length > 0) {
    if (!isOneOf(rawEstimatedProjectSize, PROJECT_SIZE_OPTIONS)) {
      fieldErrors.estimatedProjectSize = 'Choose a valid project size.';
    } else {
      estimatedProjectSize = rawEstimatedProjectSize;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { valid: false, fieldErrors };
  }

  return {
    valid: true,
    data: {
      fullName,
      // phone is guaranteed non-null here: any null value already produced
      // a fieldErrors.phone entry above, which returns early.
      phone: phone as string,
      email,
      service,
      city,
      serviceLocation,
      projectDescription,
      consent: true,
      preferredContactMethod,
      preferredTiming,
      propertyType,
      estimatedProjectSize,
    },
  };
}
