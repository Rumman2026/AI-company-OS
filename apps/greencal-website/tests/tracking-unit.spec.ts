import { test, expect } from '@playwright/test';
import { isValidGtmContainerId } from '../src/lib/tracking/gtm-id';
import { getConsentState, setConsentState } from '../src/lib/tracking/consent';
import { trackEvent } from '../src/lib/tracking/track';
import { mapSubmissionResultToEvent } from '../src/lib/tracking/quote-form-events';
import type { DataLayerEvent } from '../src/lib/tracking/types';
import type { QuoteSubmissionResult } from '../src/lib/quote-form/types';

// Pure-logic tests for the tracking module, run as plain Node code under
// the Playwright test runner (no browser, no real localStorage, no
// network) - same pattern as tests/quote-form-unit.spec.ts.
//
// config.ts, gtm.ts, and production.ts are deliberately NOT imported here:
// config.ts reads `import.meta.env`, which the Playwright test runner's
// CommonJS transform cannot even parse (a verified failure, not a
// hypothetical one). Their real, inactive-by-default production behavior
// is instead verified against the actual built site in
// tests/tracking.spec.ts.

test.describe('Configuration safety', () => {
  test('isValidGtmContainerId accepts only well-formed GTM ids', () => {
    expect(isValidGtmContainerId('GTM-ABC1234')).toBe(true);
    expect(isValidGtmContainerId('GTM-5X9K2')).toBe(true);
  });

  test('isValidGtmContainerId rejects malformed, empty, or non-string values', () => {
    for (const value of [
      '',
      'UA-12345-1',
      'gtm-abc1234',
      'GTM-',
      'Footbridge-GTM-0000000',
      'GTM 1234567',
      undefined,
      null,
      12345,
      {},
    ]) {
      expect(isValidGtmContainerId(value)).toBe(false);
    }
  });
});

test.describe('Consent safety', () => {
  test('getConsentState() defaults to not-granted outside a browser (no localStorage)', () => {
    expect(() => getConsentState()).not.toThrow();
    expect(getConsentState().analyticsGranted).toBe(false);
  });

  test('setConsentState() does not throw when localStorage is unavailable', () => {
    expect(() => setConsentState({ analyticsGranted: true })).not.toThrow();
  });
});

test.describe('trackEvent - gating and safety', () => {
  test('does not call the sink when no tracking config is provided (production-like default)', () => {
    let called = false;
    trackEvent(
      { name: 'phone_click' },
      { consent: { analyticsGranted: true }, sink: () => (called = true) },
    );
    expect(called).toBe(false);
  });

  test('does not call the sink when config is present but consent is not granted', () => {
    let called = false;
    trackEvent(
      { name: 'phone_click' },
      {
        config: { gtmContainerId: 'GTM-ABC1234' },
        consent: { analyticsGranted: false },
        sink: () => (called = true),
      },
    );
    expect(called).toBe(false);
  });

  test('calls the sink only when both a valid config and granted consent are present', () => {
    let received: DataLayerEvent | null = null;
    trackEvent(
      { name: 'phone_click', params: { pagePath: '/roof', contactMethod: 'phone' } },
      {
        config: { gtmContainerId: 'GTM-ABC1234' },
        consent: { analyticsGranted: true },
        sink: (event) => (received = event),
      },
    );
    expect(received).not.toBeNull();
    expect((received as unknown as DataLayerEvent).event).toBe('phone_click');
  });

  test('never throws when window/document are unavailable and no sink is injected (Node context)', () => {
    expect(() =>
      trackEvent(
        { name: 'quote_form_view' },
        { config: { gtmContainerId: 'GTM-ABC1234' }, consent: { analyticsGranted: true } },
      ),
    ).not.toThrow();
  });
});

test.describe('trackEvent - no PII in payloads', () => {
  const FORBIDDEN_KEYS = [
    'fullName',
    'phone',
    'email',
    'serviceLocation',
    'projectDescription',
    'name',
    'address',
  ];

  test('event params never contain a name/phone/email/address/description field', () => {
    let received: DataLayerEvent | null = null;
    trackEvent(
      {
        name: 'quote_form_success',
        params: { pagePath: '/contact-us', formId: 'quote-form-form', submissionState: 'success' },
      },
      {
        config: { gtmContainerId: 'GTM-ABC1234' },
        consent: { analyticsGranted: true },
        sink: (event) => (received = event),
      },
    );
    expect(received).not.toBeNull();
    const keys = Object.keys(received as unknown as DataLayerEvent);
    for (const forbidden of FORBIDDEN_KEYS) {
      expect(keys).not.toContain(forbidden);
    }
  });
});

test.describe('mapSubmissionResultToEvent - conversion safeguard', () => {
  const context = { pagePath: '/contact-us', formId: 'quote-form-form' };

  test('maps success to quote_form_success only', () => {
    const result: QuoteSubmissionResult = {
      status: 'success',
      leadId: 'test-lead',
      submittedAt: '2026-01-01T00:00:00.000Z',
    };
    expect(mapSubmissionResultToEvent(result, context).name).toBe('quote_form_success');
  });

  test('maps validation_failed to quote_form_validation_failed, never success', () => {
    const result: QuoteSubmissionResult = {
      status: 'validation_failed',
      fieldErrors: { email: 'bad' },
      message: 'x',
    };
    const event = mapSubmissionResultToEvent(result, context);
    expect(event.name).toBe('quote_form_validation_failed');
    expect(event.name).not.toBe('quote_form_success');
    expect(event.params?.errorCount).toBe(1);
  });

  test('maps pending_configuration to quote_form_pending_configuration, never success or a conversion name', () => {
    const result: QuoteSubmissionResult = { status: 'pending_configuration', message: 'x' };
    const event = mapSubmissionResultToEvent(result, context);
    expect(event.name).toBe('quote_form_pending_configuration');
    expect(event.name).not.toBe('quote_form_success');
  });

  test('maps delivery_failed to quote_form_delivery_failed, never success', () => {
    const result: QuoteSubmissionResult = { status: 'delivery_failed', message: 'x' };
    const event = mapSubmissionResultToEvent(result, context);
    expect(event.name).toBe('quote_form_delivery_failed');
    expect(event.name).not.toBe('quote_form_success');
  });

  test('the production adapter path (pending_configuration) can never structurally produce quote_form_success', () => {
    // The current production adapter always resolves to pending_configuration
    // (see quote-form/adapter.ts unavailableAdapter) - this is the direct
    // proof that production cannot emit a fake conversion.
    const productionResult: QuoteSubmissionResult = {
      status: 'pending_configuration',
      message: "Online quote submission isn't active yet.",
    };
    expect(mapSubmissionResultToEvent(productionResult, context).name).not.toBe(
      'quote_form_success',
    );
  });

  test('no event params ever contain PII regardless of result state', () => {
    const results: QuoteSubmissionResult[] = [
      { status: 'success', leadId: 'x', submittedAt: 'x' },
      { status: 'validation_failed', fieldErrors: { email: 'bad' }, message: 'x' },
      { status: 'pending_configuration', message: 'x' },
      { status: 'delivery_failed', message: 'x' },
    ];
    for (const result of results) {
      const event = mapSubmissionResultToEvent(result, context);
      const keys = Object.keys(event.params ?? {});
      expect(keys).not.toContain('fullName');
      expect(keys).not.toContain('email');
      expect(keys).not.toContain('phone');
    }
  });
});
