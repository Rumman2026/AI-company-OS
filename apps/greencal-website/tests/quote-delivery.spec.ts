import { test, expect } from '@playwright/test';

// Browser/integration coverage for the Stage 4A trusted server route
// (src/pages/api/quote-submit.ts) and its client wiring. Runs against the
// real dev server (see playwright.config.ts) with no Supabase/Resend
// credentials configured - so production behavior here is, correctly and
// honestly, the pending_configuration/validation_failed paths. The
// success/delivery_failed paths through the real adapter are covered with
// fakes in tests/quote-delivery-unit.spec.ts - this file never contacts a
// real Supabase, Resend, or Vercel service.

const VALID_PAYLOAD = {
  fullName: 'Jane Doe',
  phone: '(657) 319-8551',
  email: 'jane@example.com',
  service: 'roof-cleaning',
  city: 'carlsbad',
  serviceLocation: 'Carlsbad, CA 92008',
  projectDescription: 'Please clean the roof - visible algae buildup.',
  consent: true,
  pagePath: '/contact-us',
};

test.describe('POST /api/quote-submit - server route behavior', () => {
  test('returns 200 with pending_configuration for a fully valid submission (no backend configured)', async ({
    request,
  }) => {
    const response = await request.post('/api/quote-submit', { data: VALID_PAYLOAD });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('pending_configuration');
    expect(body.message).toContain('call or email');
  });

  test('returns 200 with validation_failed for invalid input', async ({ request }) => {
    const response = await request.post('/api/quote-submit', {
      data: { ...VALID_PAYLOAD, email: 'not-an-email', consent: false },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('validation_failed');
    expect(body.fieldErrors.email).toBeTruthy();
    expect(body.fieldErrors.consent).toBeTruthy();
  });

  test('rejects a forged service value at the trusted server boundary', async ({ request }) => {
    const response = await request.post('/api/quote-submit', {
      data: { ...VALID_PAYLOAD, service: 'commercial-power-washing' },
    });
    const body = await response.json();
    expect(body.status).toBe('validation_failed');
    expect(body.fieldErrors.service).toBeTruthy();
  });

  test('rejects a populated honeypot field without leaking that reason in the response shape', async ({
    request,
  }) => {
    const response = await request.post('/api/quote-submit', {
      data: { ...VALID_PAYLOAD, honeypot: 'http://spam.example' },
    });
    const body = await response.json();
    expect(body.status).toBe('validation_failed');
  });

  test('handles a genuinely unparseable request body without a 500 error', async ({ request }) => {
    // A Buffer bypasses Playwright's automatic JSON serialization, so this
    // sends the literal, syntactically invalid bytes - unlike a plain
    // string `data` value, which Playwright JSON-encodes as a valid JSON
    // string primitive (correctly triggering validation_failed instead,
    // covered by the non-object-JSON-body test below).
    const response = await request.post('/api/quote-submit', {
      headers: { 'Content-Type': 'application/json' },
      data: Buffer.from('not valid json{{{'),
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('delivery_failed');
  });

  test('handles a non-object JSON body (e.g. an array) without a 500 error', async ({
    request,
  }) => {
    const response = await request.post('/api/quote-submit', { data: [1, 2, 3] });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('validation_failed');
  });

  test('never returns a fabricated success without a configured backend', async ({ request }) => {
    // Repeat the valid submission several times - production must stay
    // honest every time, not just on the first attempt.
    for (let i = 0; i < 3; i++) {
      const response = await request.post('/api/quote-submit', {
        data: { ...VALID_PAYLOAD, email: `jane+${i}@example.com` },
      });
      const body = await response.json();
      expect(body.status).not.toBe('success');
    }
  });

  test('response body never contains a raw provider error, stack trace, or secret-looking value', async ({
    request,
  }) => {
    const response = await request.post('/api/quote-submit', { data: VALID_PAYLOAD });
    const text = await response.text();
    expect(text.toLowerCase()).not.toContain('supabase_service_role_key');
    expect(text.toLowerCase()).not.toContain('resend_api_key');
    expect(text).not.toMatch(/at\s+\S+\s+\(.*:\d+:\d+\)/); // stack-trace-shaped line
  });
});

test.describe('Quote form UI - Stage 4A wiring preserved', () => {
  test('a full valid submission through the UI reaches the server route and displays the honest pending_configuration message', async ({
    page,
  }) => {
    await page.goto('/contact-us');
    await page.fill('#qf-fullName', VALID_PAYLOAD.fullName);
    await page.fill('#qf-phone', VALID_PAYLOAD.phone);
    await page.fill('#qf-email', VALID_PAYLOAD.email);
    await page.selectOption('#qf-service', VALID_PAYLOAD.service);
    await page.selectOption('#qf-city', VALID_PAYLOAD.city);
    await page.fill('#qf-serviceLocation', VALID_PAYLOAD.serviceLocation);
    await page.fill('#qf-projectDescription', VALID_PAYLOAD.projectDescription);
    await page.check('#qf-consent');

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/quote-submit')),
      page.click('#quote-form-submit'),
    ]);
    expect(response.status()).toBe(200);

    await expect(page.locator('#quote-form-status')).toContainText(/isn't active yet/i);
    // Honest failure/pending copy must not claim delivery.
    await expect(page.locator('#quote-form-status')).not.toContainText(/thank you/i);
  });

  test('accessible validation experience is preserved through the network round-trip', async ({
    page,
  }) => {
    await page.goto('/contact-us');
    await page.click('#quote-form-submit');

    const summary = page.locator('#quote-form-error-summary');
    await expect(summary).toBeVisible();
    await expect(summary).toBeFocused();
    await expect(page.locator('#qf-fullName')).toHaveAttribute('aria-invalid', 'true');
  });

  test('duplicate-submit lock still guards the button during the network request', async ({
    page,
  }) => {
    // The local dev server resolves /api/quote-submit fast enough that the
    // disabled state can flip back before a normal assertion observes it -
    // delay the response so the transient locked state is reliably
    // observable, matching real-world network latency.
    await page.route('**/api/quote-submit', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });

    await page.goto('/contact-us');
    await page.fill('#qf-fullName', VALID_PAYLOAD.fullName);
    await page.fill('#qf-phone', VALID_PAYLOAD.phone);
    await page.fill('#qf-email', VALID_PAYLOAD.email);
    await page.selectOption('#qf-service', VALID_PAYLOAD.service);
    await page.selectOption('#qf-city', VALID_PAYLOAD.city);
    await page.fill('#qf-serviceLocation', VALID_PAYLOAD.serviceLocation);
    await page.fill('#qf-projectDescription', VALID_PAYLOAD.projectDescription);
    await page.check('#qf-consent');

    await page.click('#quote-form-submit');
    // While the (artificially delayed) request is in flight, the button
    // must already be disabled.
    await expect(page.locator('#quote-form-submit')).toBeDisabled();
    // And re-enabled once the honest pending_configuration result arrives.
    await expect(page.locator('#quote-form-submit')).toBeEnabled();
  });

  test('call and email alternatives remain available regardless of submission outcome', async ({
    page,
  }) => {
    await page.goto('/contact-us');
    await expect(page.locator('a[href^="tel:"]').first()).toBeEnabled();
    await expect(page.locator('a[href^="mailto:"]').first()).toBeEnabled();
  });
});

test.describe('Stage 4A regression: no secrets, no browser-side provider imports', () => {
  test('no page ships a Supabase or Resend client-side reference', async ({ page }) => {
    const routes = [
      '/',
      '/contact-us',
      '/services/roof-cleaning',
      '/services/house-washing',
      '/residential',
      '/commercial',
      '/multi-family-hoa',
      '/service-areas',
    ];
    for (const route of routes) {
      await page.goto(route);
      const html = await page.content();
      expect(html.toLowerCase()).not.toContain('service_role');
      expect(html.toLowerCase()).not.toContain('resend_api_key');
    }
  });

  test('/404 remains noindex and unaffected by the new server route', async ({ page }) => {
    const response = await page.goto('/this-route-does-not-exist');
    expect(response?.status()).toBe(404);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
  });

  test('sitemap.xml and robots.txt remain correct', async ({ request }) => {
    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    const robots = await request.get('/robots.txt');
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toContain('Sitemap:');
  });

  test('the corrected company email remains correct', async ({ page }) => {
    await page.goto('/contact-us');
    const html = await page.content();
    expect(html).toContain('greencaliforniacorporation@gmail.com');
    expect(html).not.toContain('greencaliforniacorporarion');
  });
});
