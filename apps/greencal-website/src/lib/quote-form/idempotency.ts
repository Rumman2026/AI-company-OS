import { createHash } from 'node:crypto';
import type { NormalizedQuoteInput } from './types';

/**
 * A deterministic fingerprint of a normalized quote submission's content -
 * excludes any timestamp, so submitting the exact same details twice
 * (e.g. a network retry after an uncertain client timeout, or an
 * accidental double-click that slipped past the client-side submit lock)
 * always produces the same key. Two genuinely different submissions
 * (even from the same customer) practically never collide.
 *
 * No expiry/time window is applied at this layer - see
 * lead-store.ts/supabase-schema.sql for how the unique constraint uses
 * this key, and README.md for the documented tradeoff (an identical
 * resubmission of the exact same request is treated as the same lead
 * indefinitely, not just within a short window).
 */
export function computeIdempotencyKey(input: NormalizedQuoteInput): string {
  const canonical = JSON.stringify({
    fullName: input.fullName,
    phone: input.phone,
    email: input.email,
    service: input.service,
    city: input.city,
    serviceLocation: input.serviceLocation,
    projectDescription: input.projectDescription,
    preferredContactMethod: input.preferredContactMethod ?? null,
    preferredTiming: input.preferredTiming ?? null,
    propertyType: input.propertyType ?? null,
    estimatedProjectSize: input.estimatedProjectSize ?? null,
  });
  return createHash('sha256').update(canonical).digest('hex');
}
