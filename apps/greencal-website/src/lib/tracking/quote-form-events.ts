import type { QuoteSubmissionResult } from '../quote-form/types';
import type { TrackEventInput } from './types';

export interface QuoteFormEventContext {
  pagePath: string;
  formId: string;
}

/**
 * The single, mandatory conversion safeguard: this is the ONLY place that
 * decides which tracking event corresponds to a quote-submission result.
 *
 * `quote_form_success` is emitted if and only if `result.status ===
 * 'success'` - i.e. only when a trusted adapter has actually confirmed
 * delivery (see ../quote-form/adapter.ts and ../quote-form/submit.ts).
 * `validation_failed`, `pending_configuration`, and `delivery_failed` each
 * map to their own diagnostic event and NEVER to `quote_form_success` or
 * any other event that could be mistaken for a completed lead.
 *
 * Since Stage 4B (see DECISIONS.md ADR-0006 and
 * src/lib/quote-form/README.md's "Production verification record"),
 * production uses the real `createSupabaseResendAdapter`, so
 * `quote_form_success` is reachable in production - but only when that
 * adapter's approved delivery policy actually confirms a fresh
 * store-and-notify or a valid idempotent replay; it is never fabricated
 * here or anywhere upstream. See README.md's conversion rules.
 */
export function mapSubmissionResultToEvent(
  result: QuoteSubmissionResult,
  context: QuoteFormEventContext,
): TrackEventInput {
  const params = { pagePath: context.pagePath, formId: context.formId };

  switch (result.status) {
    case 'success':
      return { name: 'quote_form_success', params: { ...params, submissionState: 'success' } };
    case 'validation_failed':
      return {
        name: 'quote_form_validation_failed',
        params: {
          ...params,
          submissionState: 'validation_failed',
          errorCount: Object.keys(result.fieldErrors).length,
        },
      };
    case 'pending_configuration':
      return {
        name: 'quote_form_pending_configuration',
        params: { ...params, submissionState: 'pending_configuration' },
      };
    case 'delivery_failed':
      return {
        name: 'quote_form_delivery_failed',
        params: { ...params, submissionState: 'delivery_failed' },
      };
  }
}
