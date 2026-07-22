import { getTrackingConfig } from './config';
import { getConsentState } from './consent';
import type { ConsentState, TrackingConfig } from './types';

export interface GtmLoadContext {
  config?: TrackingConfig;
  consent?: ConsentState;
}

/**
 * Loads GreenCal's own GTM container, and only GreenCal's own container -
 * never Footbridge's, never a sample/placeholder id. No-ops entirely unless
 * BOTH conditions hold:
 *   1. An owner-approved, validly formatted container id is configured
 *      (see config.ts) - never invented, never guessed.
 *   2. The visitor has explicitly granted analytics consent (see
 *      consent.ts) - never assumed, never preselected.
 *
 * Idempotent via a DOM check (not in-memory state), so calling this more
 * than once per page - from more than one component - never injects the
 * script twice.
 *
 * This function currently never loads anything in production: no
 * container id has been configured yet (see
 * src/lib/tracking/README.md's activation checklist).
 */
export function initializeGtmIfApproved(context: GtmLoadContext = {}): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const { gtmContainerId } = context.config ?? getTrackingConfig();
  if (!gtmContainerId) return;

  const { analyticsGranted } = context.consent ?? getConsentState();
  if (!analyticsGranted) return;

  if (document.querySelector('script[data-greencal-gtm]')) return;

  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmContainerId)}`;
  script.dataset.greencalGtm = gtmContainerId;
  document.head.appendChild(script);
}
