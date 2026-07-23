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
 * Fallback adapter, used when required backend configuration is absent.
 *
 * Stage 4A (see DECISIONS.md ADR-0006) added a real server adapter
 * (`@astrojs/vercel`) and a real QuoteSubmissionAdapter implementation
 * (`createSupabaseResendAdapter`, wired in src/pages/api/quote-submit.ts).
 * This adapter is now the honest fallback the server route selects only
 * when `getServerConfig()` returns `null` (any of the five required
 * Supabase/Resend environment variables missing or malformed) - not the
 * unconditional production default it was before Stage 4A. It never
 * claims success.
 *
 * See src/lib/quote-form/README.md for the current activation state and
 * the required environment-variable contract.
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
