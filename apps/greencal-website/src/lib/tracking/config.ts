import { isValidGtmContainerId } from './gtm-id';
import type { TrackingConfig } from './types';

export { isValidGtmContainerId };

/**
 * The single centralized source of tracking configuration. Reads the one
 * public, browser-safe identifier this app currently supports. No secret,
 * server-only credential is ever read here - GTM container ids are
 * inherently public (visible in any page's rendered source once loaded).
 *
 * Fails safe: absent or malformed input returns `gtmContainerId: null`,
 * never a guessed, sample, or Footbridge id.
 *
 * Only ever imported from production wiring (production.ts, Footer.astro) -
 * never from the pure track.ts core or from Node-level unit tests, because
 * `import.meta.env` cannot be parsed under the Playwright test runner's
 * CommonJS transform.
 */
export function getTrackingConfig(): TrackingConfig {
  const raw = import.meta.env.PUBLIC_GTM_CONTAINER_ID;
  return { gtmContainerId: isValidGtmContainerId(raw) ? raw : null };
}
