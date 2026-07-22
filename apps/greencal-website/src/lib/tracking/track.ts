import type { DataLayerEvent, TrackContext, TrackEventInput } from './types';

function defaultSink(event: DataLayerEvent): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(event);
}

/**
 * The pure, testable tracking core. Deliberately imports nothing from
 * config.ts/consent.ts/gtm.ts - those read `import.meta.env` (directly or
 * transitively) and are not parseable under the Playwright test runner's
 * CommonJS transform. Production wiring (production.ts) resolves the real
 * config/consent and passes them in; tests do the same with fake values.
 * Safe no-op whenever config/consent are omitted or inactive - never
 * throws, never sends anything, never assumes consent.
 */
export function trackEvent(input: TrackEventInput, context: TrackContext = {}): void {
  if (!context.config?.gtmContainerId) return;
  if (!context.consent?.analyticsGranted) return;

  const event: DataLayerEvent = { event: input.name, ...input.params };
  const sink = context.sink ?? defaultSink;
  sink(event);
}
