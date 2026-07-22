import type { NormalizedQuoteInput, QuoteSubmissionResult } from './types';

export interface QuoteSubmissionContext {
  pagePath: string;
}

/**
 * The server-adapter boundary. Anything that can accept a validated quote
 * request and attempt delivery implements this interface - a future
 * GreenCal-owned email relay, database, or CRM ingestion endpoint, or (in
 * tests only) a controlled test adapter.
 */
export interface QuoteSubmissionAdapter {
  readonly name: string;
  submit(
    input: NormalizedQuoteInput,
    context: QuoteSubmissionContext,
  ): Promise<QuoteSubmissionResult>;
}

/**
 * Production default adapter.
 *
 * apps/greencal-website is Astro `output: 'static'` with no server adapter
 * installed (see astro.config.mjs) and no GreenCal-owned database, email
 * relay, or CRM ingestion endpoint exists yet (see the Stage 3 backend
 * inventory in the quote-form documentation). This adapter never claims
 * success - it is the honest, structural admission that online delivery is
 * not active, returned after a submission has already passed validation.
 *
 * Activation requires, in order, all owner-approved:
 * 1. A server adapter and hosting target for apps/greencal-website (or a
 *    separate lightweight delivery endpoint), so a request can reach a
 *    trusted server at all.
 * 2. A concrete delivery mechanism (e.g. a transactional email relay, or a
 *    GreenCal-owned database/CRM ingestion endpoint).
 * 3. A real QuoteSubmissionAdapter implementation, behind this same
 *    interface, replacing this one as the production default.
 *
 * See src/lib/quote-form/README.md for the full activation checklist and
 * the reserved environment-variable contract.
 */
export const unavailableAdapter: QuoteSubmissionAdapter = {
  name: 'unavailable',
  async submit(): Promise<QuoteSubmissionResult> {
    return {
      status: 'pending_configuration',
      message:
        "Online quote submission isn't active yet. Please call or email us directly and we'll get back to you.",
    };
  },
};
