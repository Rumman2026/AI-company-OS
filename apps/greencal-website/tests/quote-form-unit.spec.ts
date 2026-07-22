import { test, expect } from '@playwright/test';
import { validateQuoteInput, LIMITS } from '../src/lib/quote-form/validation';
import { submitQuoteForm } from '../src/lib/quote-form/submit';
import { unavailableAdapter } from '../src/lib/quote-form/adapter';
import type { QuoteSubmissionAdapter } from '../src/lib/quote-form/adapter';
import type { QuoteLeadRecord } from '../src/lib/quote-form/types';

// Pure-logic tests for the quote-form validation and submission boundary.
// These do not use the `page` fixture and run as plain Node code under the
// Playwright test runner (no browser needed) - the same pattern used for
// packages/core-models' domain logic, applied here since this app has no
// separate unit-test runner configured.

const VALID_INPUT = {
  fullName: 'Jane Doe',
  phone: '(657) 319-8551',
  email: 'Jane@Example.com',
  service: 'roof-cleaning',
  serviceLocation: 'Anaheim, CA',
  projectDescription: 'Please clean the roof - visible algae buildup on the north-facing slope.',
  consent: true,
  honeypot: '',
};

test.describe('validateQuoteInput - required fields', () => {
  test('accepts fully valid input', () => {
    const result = validateQuoteInput(VALID_INPUT);
    expect(result.valid).toBe(true);
  });

  test('rejects missing fullName', () => {
    const result = validateQuoteInput({ ...VALID_INPUT, fullName: '' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.fieldErrors.fullName).toBeTruthy();
  });

  test('rejects missing phone', () => {
    const result = validateQuoteInput({ ...VALID_INPUT, phone: '' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.fieldErrors.phone).toBeTruthy();
  });

  test('rejects missing email', () => {
    const result = validateQuoteInput({ ...VALID_INPUT, email: '' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.fieldErrors.email).toBeTruthy();
  });

  test('rejects missing service', () => {
    const result = validateQuoteInput({ ...VALID_INPUT, service: '' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.fieldErrors.service).toBeTruthy();
  });

  test('rejects missing serviceLocation', () => {
    const result = validateQuoteInput({ ...VALID_INPUT, serviceLocation: '' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.fieldErrors.serviceLocation).toBeTruthy();
  });

  test('rejects missing projectDescription', () => {
    const result = validateQuoteInput({ ...VALID_INPUT, projectDescription: '' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.fieldErrors.projectDescription).toBeTruthy();
  });

  test('rejects missing consent', () => {
    const result = validateQuoteInput({ ...VALID_INPUT, consent: false });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.fieldErrors.consent).toBeTruthy();
  });
});

test.describe('validateQuoteInput - field-specific rules', () => {
  test('rejects an invalid email format', () => {
    const result = validateQuoteInput({ ...VALID_INPUT, email: 'not-an-email' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.fieldErrors.email).toBeTruthy();
  });

  test('rejects an invalid phone number', () => {
    const result = validateQuoteInput({ ...VALID_INPUT, phone: '123' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.fieldErrors.phone).toBeTruthy();
  });

  test('accepts common U.S. phone formats without requiring one exact format', () => {
    for (const phone of ['6573198551', '(657) 319-8551', '657-319-8551', '+16573198551']) {
      const result = validateQuoteInput({ ...VALID_INPUT, phone });
      expect(result.valid).toBe(true);
    }
  });

  test('rejects a forged/arbitrary service value not in the allowlist', () => {
    const result = validateQuoteInput({ ...VALID_INPUT, service: 'commercial-power-washing' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.fieldErrors.service).toBeTruthy();
  });

  test('accepts every real, verified service slug', () => {
    for (const service of ['roof-cleaning', 'house-washing']) {
      const result = validateQuoteInput({ ...VALID_INPUT, service });
      expect(result.valid).toBe(true);
    }
  });

  test('rejects a fullName exceeding the maximum length', () => {
    const result = validateQuoteInput({
      ...VALID_INPUT,
      fullName: 'A'.repeat(LIMITS.fullNameMax + 1),
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.fieldErrors.fullName).toBeTruthy();
  });

  test('rejects a projectDescription exceeding the maximum length', () => {
    const result = validateQuoteInput({
      ...VALID_INPUT,
      projectDescription: 'A'.repeat(LIMITS.projectDescriptionMax + 1),
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.fieldErrors.projectDescription).toBeTruthy();
  });

  test('rejects a projectDescription below the minimum length', () => {
    const result = validateQuoteInput({ ...VALID_INPUT, projectDescription: 'too short' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.fieldErrors.projectDescription).toBeTruthy();
  });

  test('trims leading/trailing whitespace from text fields', () => {
    const result = validateQuoteInput({
      ...VALID_INPUT,
      fullName: '  Jane Doe  ',
      serviceLocation: '  Anaheim, CA  ',
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.fullName).toBe('Jane Doe');
      expect(result.data.serviceLocation).toBe('Anaheim, CA');
    }
  });

  test('lowercases and trims the email', () => {
    const result = validateQuoteInput({ ...VALID_INPUT, email: '  Jane@EXAMPLE.com  ' });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data.email).toBe('jane@example.com');
  });

  test('rejects an invalid optional preferredContactMethod', () => {
    const result = validateQuoteInput({ ...VALID_INPUT, preferredContactMethod: 'carrier-pigeon' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.fieldErrors.preferredContactMethod).toBeTruthy();
  });

  test('accepts a valid optional preferredContactMethod', () => {
    const result = validateQuoteInput({ ...VALID_INPUT, preferredContactMethod: 'phone' });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data.preferredContactMethod).toBe('phone');
  });

  test('rejects an invalid optional propertyType', () => {
    const result = validateQuoteInput({ ...VALID_INPUT, propertyType: 'commercial' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.fieldErrors.propertyType).toBeTruthy();
  });

  test('leaves optional fields undefined when not supplied', () => {
    const result = validateQuoteInput(VALID_INPUT);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.preferredContactMethod).toBeUndefined();
      expect(result.data.preferredTiming).toBeUndefined();
      expect(result.data.propertyType).toBeUndefined();
      expect(result.data.estimatedProjectSize).toBeUndefined();
    }
  });
});

test.describe('validateQuoteInput - honeypot and malformed payloads', () => {
  test('rejects a submission with a populated honeypot field', () => {
    const result = validateQuoteInput({ ...VALID_INPUT, honeypot: 'http://spam.example' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.fieldErrors.honeypot).toBeTruthy();
  });

  test('rejects a non-object payload without throwing', () => {
    expect(() => validateQuoteInput('not an object')).not.toThrow();
    expect(() => validateQuoteInput(null)).not.toThrow();
    expect(() => validateQuoteInput(undefined)).not.toThrow();
    const result = validateQuoteInput(null);
    expect(result.valid).toBe(false);
  });

  test('coerces non-string field values defensively instead of throwing', () => {
    expect(() =>
      validateQuoteInput({ ...VALID_INPUT, fullName: 12345, consent: 'yes' }),
    ).not.toThrow();
  });
});

test.describe('submitQuoteForm - typed response states', () => {
  test('returns validation_failed for invalid input, without calling any adapter', async () => {
    let adapterCalled = false;
    const spyAdapter: QuoteSubmissionAdapter = {
      name: 'spy',
      async submit() {
        adapterCalled = true;
        return { status: 'success', leadId: 'x', submittedAt: new Date().toISOString() };
      },
    };
    const result = await submitQuoteForm(
      { ...VALID_INPUT, email: 'bad' },
      { pagePath: '/contact-us', adapter: spyAdapter },
    );
    expect(result.status).toBe('validation_failed');
    expect(adapterCalled).toBe(false);
  });

  test('production default (no adapter override) returns pending_configuration for valid input', async () => {
    const result = await submitQuoteForm(VALID_INPUT, { pagePath: '/contact-us' });
    expect(result.status).toBe('pending_configuration');
  });

  test('the exported production adapter is unavailableAdapter and never returns success', async () => {
    const result = await unavailableAdapter.submit(
      {
        fullName: 'Jane Doe',
        phone: '+16573198551',
        email: 'jane@example.com',
        service: 'roof-cleaning',
        serviceLocation: 'Anaheim, CA',
        projectDescription: 'Roof cleaning needed.',
        consent: true,
      },
      { pagePath: '/contact-us' },
    );
    expect(result.status).toBe('pending_configuration');
  });

  test('returns success only when a controlled test adapter explicitly confirms it', async () => {
    const testAdapter: QuoteSubmissionAdapter = {
      name: 'test-success',
      async submit(input) {
        const lead: QuoteLeadRecord = {
          leadId: 'test-lead-0001',
          createdAt: '2026-07-21T00:00:00.000Z',
          source: 'website_quote_form',
          pagePath: '/contact-us',
          fullName: input.fullName,
          phone: input.phone,
          email: input.email,
          service: input.service,
          serviceLocation: input.serviceLocation,
          projectDescription: input.projectDescription,
          preferredContactMethod: input.preferredContactMethod,
          preferredTiming: input.preferredTiming,
          propertyType: input.propertyType,
          estimatedProjectSize: input.estimatedProjectSize,
          consent: true,
          submissionStatus: 'received',
        };
        return { status: 'success', leadId: lead.leadId, submittedAt: lead.createdAt };
      },
    };
    const result = await submitQuoteForm(VALID_INPUT, {
      pagePath: '/contact-us',
      adapter: testAdapter,
    });
    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.leadId).toBe('test-lead-0001');
      expect(result.submittedAt).toBe('2026-07-21T00:00:00.000Z');
    }
  });

  test('returns delivery_failed when the adapter throws, without leaking the raw error', async () => {
    const throwingAdapter: QuoteSubmissionAdapter = {
      name: 'test-throwing',
      async submit() {
        throw new Error('simulated SMTP timeout: connection reset at 10.0.0.1');
      },
    };
    const result = await submitQuoteForm(VALID_INPUT, {
      pagePath: '/contact-us',
      adapter: throwingAdapter,
    });
    expect(result.status).toBe('delivery_failed');
    if (result.status === 'delivery_failed') {
      expect(result.message).not.toContain('SMTP');
      expect(result.message).not.toContain('10.0.0.1');
      expect(result.message).not.toContain('Error');
    }
  });
});
