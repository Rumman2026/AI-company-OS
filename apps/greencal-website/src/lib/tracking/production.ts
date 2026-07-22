import { getTrackingConfig } from './config';
import { getConsentState } from './consent';
import { initializeGtmIfApproved } from './gtm';
import { trackEvent as trackEventCore } from './track';
import type { TrackEventInput } from './types';

/**
 * The single production entry point every component calls (bind.ts,
 * QuoteForm.astro) - never the pure track.ts core directly. Resolves the
 * real config/consent, lazily initializes GTM if approved, and forwards to
 * the pure core.
 *
 * Never imported by Node-level unit tests: config.ts's `import.meta.env`
 * access cannot be parsed under the Playwright test runner's CommonJS
 * transform. This file is exercised only via real browser tests
 * (tests/tracking.spec.ts) against the actual built site.
 */
export function trackEvent(input: TrackEventInput): void {
  const config = getTrackingConfig();
  const consent = getConsentState();

  if (config.gtmContainerId && consent.analyticsGranted && typeof window !== 'undefined') {
    initializeGtmIfApproved({ config, consent });
  }

  trackEventCore(input, { config, consent });
}
