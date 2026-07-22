import { unavailableAdapter, type QuoteSubmissionAdapter } from './adapter';
import { validateQuoteInput } from './validation';
import type { QuoteSubmissionResult } from './types';

export interface SubmitQuoteFormOptions {
  pagePath: string;
  /**
   * Overrides the production adapter. Production code must never pass a
   * test-only adapter here - only tests (see
   * tests/quote-form-unit.spec.ts) inject a controlled adapter to exercise
   * the `success`/`delivery_failed` states.
   */
  adapter?: QuoteSubmissionAdapter;
}

/**
 * The single typed submission boundary the UI (and any future server
 * endpoint) calls. Validates untrusted input first; only validated,
 * normalized data ever reaches an adapter.
 */
export async function submitQuoteForm(
  raw: unknown,
  options: SubmitQuoteFormOptions,
): Promise<QuoteSubmissionResult> {
  const validation = validateQuoteInput(raw);

  if (!validation.valid) {
    return {
      status: 'validation_failed',
      fieldErrors: validation.fieldErrors,
      message: 'Please fix the highlighted fields and try again.',
    };
  }

  const adapter = options.adapter ?? unavailableAdapter;

  try {
    return await adapter.submit(validation.data, { pagePath: options.pagePath });
  } catch {
    return {
      status: 'delivery_failed',
      message: "We couldn't send your request. Please call or email us directly.",
    };
  }
}
