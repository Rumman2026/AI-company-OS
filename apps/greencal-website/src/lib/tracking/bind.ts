import { trackEvent } from './production';
import type { TrackEventParams } from './types';

const BOUND_ATTR = 'data-tracking-bound';

function derivePlacement(el: Element): string {
  if (el.closest('.cta-banner')) return 'cta_banner';
  if (el.closest('.closing-cta')) return 'closing_cta';
  if (el.closest('#quote-form')) return 'quote_form_section';
  if (el.closest('header')) return 'header';
  if (el.closest('footer')) return 'footer';
  return 'page';
}

function baseParams(el: Element): TrackEventParams {
  return { pagePath: window.location.pathname, placement: derivePlacement(el) };
}

/**
 * Binds click tracking to every matching, not-yet-bound element. The
 * `data-tracking-bound` guard prevents the same element from ever getting a
 * second listener attached, even if this function runs more than once on
 * the same page (e.g. because more than one component calls it) - each
 * real click still fires its own event exactly once.
 */
function bindOnce(selector: string, onClick: (el: Element) => void): void {
  document.querySelectorAll(selector).forEach((el) => {
    if (el.hasAttribute(BOUND_ATTR)) return;
    el.setAttribute(BOUND_ATTR, 'true');
    el.addEventListener('click', () => onClick(el));
  });
}

/**
 * Wires up the approved engagement-event taxonomy (phone_click,
 * email_click, quote_cta_click) across the whole page. Safe to call from
 * every page via BaseLayout - trackEvent() itself no-ops when tracking is
 * not configured/consented, so this has no effect in production today.
 */
export function bindEngagementTracking(): void {
  if (typeof document === 'undefined') return;

  bindOnce('a[href^="tel:"]', (el) => {
    trackEvent({ name: 'phone_click', params: { ...baseParams(el), contactMethod: 'phone' } });
  });

  bindOnce('a[href^="mailto:"]', (el) => {
    trackEvent({ name: 'email_click', params: { ...baseParams(el), contactMethod: 'email' } });
  });

  bindOnce('a[href*="#quote-form"]', (el) => {
    trackEvent({ name: 'quote_cta_click', params: baseParams(el) });
  });
}
