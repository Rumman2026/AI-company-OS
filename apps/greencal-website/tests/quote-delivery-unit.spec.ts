import { test, expect } from '@playwright/test';
import { computeIdempotencyKey } from '../src/lib/quote-form/idempotency';
import {
  isNonEmptyString,
  isPlausibleEmail,
  isPlausibleHttpsUrl,
} from '../src/lib/quote-form/server-config-validation';
import {
  escapeHtml,
  buildLeadNotificationEmail,
  type NotificationSender,
  type NotificationSendResult,
  type LeadNotificationPayload,
} from '../src/lib/quote-form/notification-sender';
import type {
  LeadStore,
  InsertLeadResult,
  QuoteLeadInsertRow,
} from '../src/lib/quote-form/lead-store';
import { createSupabaseResendAdapter } from '../src/lib/quote-form/supabase-resend-adapter';
import type { NormalizedQuoteInput } from '../src/lib/quote-form/types';

// Pure-logic tests for the Stage 4A quote-delivery orchestration. No real
// Supabase, Resend, or Vercel is touched - every dependency is a fake
// matching the narrow LeadStore/NotificationSender interfaces, same
// pattern as tests/quote-form-unit.spec.ts and tests/tracking-unit.spec.ts.
// server-config.ts itself is not imported here - it reads import.meta.env,
// which cannot be parsed under the Playwright test runner's CommonJS
// transform (see src/lib/tracking/README.md for the same, already-verified
// issue).

const VALID_INPUT: NormalizedQuoteInput = {
  fullName: 'Jane Doe',
  phone: '+16573198551',
  email: 'jane@example.com',
  service: 'roof-cleaning',
  serviceLocation: 'Anaheim, CA',
  projectDescription: 'Please clean the roof - visible algae buildup.',
  consent: true,
};

test.describe('computeIdempotencyKey', () => {
  test('is deterministic for identical content', () => {
    expect(computeIdempotencyKey(VALID_INPUT)).toBe(computeIdempotencyKey({ ...VALID_INPUT }));
  });

  test('differs when any field differs', () => {
    const a = computeIdempotencyKey(VALID_INPUT);
    const b = computeIdempotencyKey({ ...VALID_INPUT, email: 'other@example.com' });
    expect(a).not.toBe(b);
  });

  test('is a 64-character hex sha256 digest', () => {
    const key = computeIdempotencyKey(VALID_INPUT);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  test('treats undefined optional fields consistently regardless of key presence', () => {
    const a = computeIdempotencyKey(VALID_INPUT);
    const b = computeIdempotencyKey({ ...VALID_INPUT, preferredTiming: undefined });
    expect(a).toBe(b);
  });
});

test.describe('server-config-validation helpers', () => {
  test('isNonEmptyString', () => {
    expect(isNonEmptyString('x')).toBe(true);
    expect(isNonEmptyString('')).toBe(false);
    expect(isNonEmptyString('   ')).toBe(false);
    expect(isNonEmptyString(undefined)).toBe(false);
    expect(isNonEmptyString(123)).toBe(false);
  });

  test('isPlausibleHttpsUrl', () => {
    expect(isPlausibleHttpsUrl('https://project.supabase.co')).toBe(true);
    expect(isPlausibleHttpsUrl('http://project.supabase.co')).toBe(false);
    expect(isPlausibleHttpsUrl('not-a-url')).toBe(false);
    expect(isPlausibleHttpsUrl('')).toBe(false);
    expect(isPlausibleHttpsUrl(undefined)).toBe(false);
  });

  test('isPlausibleEmail', () => {
    expect(isPlausibleEmail('greencaliforniacorporation@gmail.com')).toBe(true);
    expect(isPlausibleEmail('not-an-email')).toBe(false);
    expect(isPlausibleEmail('')).toBe(false);
    expect(isPlausibleEmail(undefined)).toBe(false);
  });
});

test.describe('escapeHtml', () => {
  test('escapes HTML-significant characters', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    expect(escapeHtml(`"quoted" 'value'`)).toBe('&quot;quoted&quot; &#39;value&#39;');
  });

  test('leaves plain text unchanged', () => {
    expect(escapeHtml('Jane Doe, 123 Main St')).toBe('Jane Doe, 123 Main St');
  });
});

test.describe('buildLeadNotificationEmail', () => {
  const payload: LeadNotificationPayload = {
    leadId: 'lead-123',
    createdAt: '2026-07-22T00:00:00.000Z',
    pagePath: '/contact-us',
    input: VALID_INPUT,
  };

  test('escapes customer-supplied HTML in the rendered email', () => {
    const malicious: LeadNotificationPayload = {
      ...payload,
      input: { ...VALID_INPUT, projectDescription: '<img src=x onerror=alert(1)>' },
    };
    const { html } = buildLeadNotificationEmail(malicious);
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  test('includes the lead id and core fields in both html and text', () => {
    const { html, text, subject } = buildLeadNotificationEmail(payload);
    expect(subject).toContain('lead-123');
    expect(html).toContain('jane@example.com');
    expect(text).toContain('jane@example.com');
    expect(text).toContain('Anaheim, CA');
  });

  test('omits undefined optional fields rather than rendering them empty', () => {
    const { text } = buildLeadNotificationEmail(payload);
    expect(text).not.toContain('Preferred contact method:');
  });
});

function createFakeLeadStore(
  behavior: {
    insert?: (row: QuoteLeadInsertRow) => InsertLeadResult;
  } = {},
): LeadStore & { insertCalls: QuoteLeadInsertRow[]; notificationCalls: unknown[] } {
  const insertCalls: QuoteLeadInsertRow[] = [];
  const notificationCalls: unknown[] = [];
  return {
    insertCalls,
    notificationCalls,
    async insertLead(row) {
      insertCalls.push(row);
      if (behavior.insert) return behavior.insert(row);
      return { ok: true, row: { leadId: row.leadId, createdAt: row.createdAt }, duplicate: false };
    },
    async markNotificationStatus(leadId, status, details) {
      notificationCalls.push({ leadId, status, details });
    },
  };
}

function createFakeNotifier(
  result: NotificationSendResult,
): NotificationSender & { calls: LeadNotificationPayload[] } {
  const calls: LeadNotificationPayload[] = [];
  return {
    calls,
    async sendLeadNotification(payload) {
      calls.push(payload);
      return result;
    },
  };
}

test.describe('createSupabaseResendAdapter - approved delivery policy', () => {
  const context = { pagePath: '/contact-us' };

  test('Supabase storage failure returns delivery_failed and never calls the notifier', async () => {
    const store = createFakeLeadStore({ insert: () => ({ ok: false, error: 'insert failed' }) });
    const notifier = createFakeNotifier({ ok: true, providerId: 'resend-1' });
    const adapter = createSupabaseResendAdapter(store, notifier);

    const result = await adapter.submit(VALID_INPUT, context);

    expect(result.status).toBe('delivery_failed');
    expect(notifier.calls).toHaveLength(0);
  });

  test('a fresh store + successful notification returns success and records notification_status sent', async () => {
    const store = createFakeLeadStore();
    const notifier = createFakeNotifier({ ok: true, providerId: 'resend-1' });
    const adapter = createSupabaseResendAdapter(store, notifier);

    const result = await adapter.submit(VALID_INPUT, context);

    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.leadId).toBeTruthy();
      expect(result.submittedAt).toBeTruthy();
    }
    expect(notifier.calls).toHaveLength(1);
    expect(store.notificationCalls).toEqual([expect.objectContaining({ status: 'sent' })]);
  });

  test('a fresh store + failed notification returns delivery_failed, preserves the lead, and records notification_status failed', async () => {
    const store = createFakeLeadStore();
    const notifier = createFakeNotifier({ ok: false, error: 'resend rejected' });
    const adapter = createSupabaseResendAdapter(store, notifier);

    const result = await adapter.submit(VALID_INPUT, context);

    expect(result.status).toBe('delivery_failed');
    expect(store.insertCalls).toHaveLength(1); // the lead WAS stored
    expect(store.notificationCalls).toEqual([expect.objectContaining({ status: 'failed' })]);
  });

  test('the partial-failure message differs from the total-failure message (distinct, honest wording)', async () => {
    const failedStoreAdapter = createSupabaseResendAdapter(
      createFakeLeadStore({ insert: () => ({ ok: false, error: 'x' }) }),
      createFakeNotifier({ ok: true, providerId: 'x' }),
    );
    const failedNotifyAdapter = createSupabaseResendAdapter(
      createFakeLeadStore(),
      createFakeNotifier({ ok: false, error: 'x' }),
    );

    const totalFailure = await failedStoreAdapter.submit(VALID_INPUT, context);
    const partialFailure = await failedNotifyAdapter.submit(VALID_INPUT, context);

    expect(totalFailure.status).toBe('delivery_failed');
    expect(partialFailure.status).toBe('delivery_failed');
    if (totalFailure.status === 'delivery_failed' && partialFailure.status === 'delivery_failed') {
      expect(totalFailure.message).not.toBe(partialFailure.message);
    }
  });

  test('an idempotent replay (duplicate insert) returns success without sending a second notification', async () => {
    const store = createFakeLeadStore({
      insert: () => ({
        ok: true,
        row: { leadId: 'existing-lead-id', createdAt: '2026-01-01T00:00:00.000Z' },
        duplicate: true,
      }),
    });
    const notifier = createFakeNotifier({ ok: true, providerId: 'resend-1' });
    const adapter = createSupabaseResendAdapter(store, notifier);

    const result = await adapter.submit(VALID_INPUT, context);

    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.leadId).toBe('existing-lead-id');
    }
    expect(notifier.calls).toHaveLength(0); // no duplicate email
  });

  test('never returns success unless a store or notifier explicitly confirmed it', async () => {
    // Exhaustive sweep: no combination of failure states can produce success.
    const failureCombinations: Array<[boolean, boolean]> = [
      [false, true],
      [false, false],
      [true, false],
    ];
    for (const [storeOk, notifyOk] of failureCombinations) {
      const store = storeOk
        ? createFakeLeadStore()
        : createFakeLeadStore({ insert: () => ({ ok: false, error: 'x' }) });
      const notifier = createFakeNotifier(
        notifyOk ? { ok: true, providerId: 'x' } : { ok: false, error: 'x' },
      );
      const adapter = createSupabaseResendAdapter(store, notifier);
      const result = await adapter.submit(VALID_INPUT, context);
      expect(result.status).not.toBe('success');
    }
  });

  test('generates a fresh, well-formed lead id and ISO timestamp for a new lead', async () => {
    const store = createFakeLeadStore();
    const notifier = createFakeNotifier({ ok: true, providerId: 'x' });
    const adapter = createSupabaseResendAdapter(store, notifier);

    const result = await adapter.submit(VALID_INPUT, context);

    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.leadId).toMatch(/^[0-9a-f-]{36}$/i);
      expect(() => new Date(result.submittedAt).toISOString()).not.toThrow();
    }
  });
});
