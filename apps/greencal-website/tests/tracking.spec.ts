import { test, expect } from '@playwright/test';

const ALL_ROUTES = [
  '/',
  '/residential',
  '/services/roof-cleaning',
  '/services/house-washing',
  '/commercial',
  '/multi-family-hoa',
  '/service-areas',
  '/contact-us',
];

test.describe('Tracking: inactive-by-default production behavior', () => {
  for (const path of ALL_ROUTES) {
    test(`${path} never touches window.dataLayer, loads no third-party script, and has no console errors`, async ({
      page,
    }) => {
      const consoleErrors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });

      await page.goto(path);
      const dataLayer = await page.evaluate(() => window.dataLayer);
      expect(dataLayer).toBeUndefined();

      const hasGtmScript = await page.evaluate(
        () => !!document.querySelector('script[data-greencal-gtm]'),
      );
      expect(hasGtmScript).toBe(false);

      expect(consoleErrors).toEqual([]);
    });
  }

  test('clicking the phone and email links does not populate window.dataLayer (no configured id)', async ({
    page,
  }) => {
    await page.goto('/');
    await page.locator('a[href^="tel:"]').first().click();
    await page.locator('a[href^="mailto:"]').first().click();
    const dataLayer = await page.evaluate(() => window.dataLayer);
    expect(dataLayer).toBeUndefined();
  });

  test('a full valid quote-form submission does not populate window.dataLayer (no configured id)', async ({
    page,
  }) => {
    await page.goto('/contact-us');
    await page.fill('#qf-fullName', 'Jane Doe');
    await page.fill('#qf-phone', '(657) 319-8551');
    await page.fill('#qf-email', 'jane@example.com');
    await page.selectOption('#qf-service', 'roof-cleaning');
    await page.selectOption('#qf-city', 'carlsbad');
    await page.fill('#qf-serviceLocation', 'Carlsbad, CA 92008');
    await page.fill('#qf-projectDescription', 'Please clean the roof, algae buildup present.');
    await page.check('#qf-consent');
    await page.click('#quote-form-submit');
    await expect(page.locator('#quote-form-status')).toContainText(/isn't active yet/i);

    const dataLayer = await page.evaluate(() => window.dataLayer);
    expect(dataLayer).toBeUndefined();
  });
});

test.describe('Tracking: engagement-click wiring is present', () => {
  test('phone, email, and quote-CTA links are bound exactly once', async ({ page }) => {
    await page.goto('/');
    const telBound = await page
      .locator('a[href^="tel:"]')
      .evaluateAll((els) => els.every((el) => el.getAttribute('data-tracking-bound') === 'true'));
    expect(telBound).toBe(true);

    const mailBound = await page
      .locator('a[href^="mailto:"]')
      .evaluateAll((els) => els.every((el) => el.getAttribute('data-tracking-bound') === 'true'));
    expect(mailBound).toBe(true);

    const quoteCtaBound = await page
      .locator('a[href*="#quote-form"]')
      .evaluateAll((els) => els.every((el) => el.getAttribute('data-tracking-bound') === 'true'));
    expect(quoteCtaBound).toBe(true);
  });
});

test.describe('Tracking preferences control (footer)', () => {
  test('is present on every route, keyboard accessible, and off by default', async ({ page }) => {
    for (const path of ALL_ROUTES) {
      await page.goto(path);
      const toggle = page.locator('#tracking-consent-toggle');
      await expect(toggle).not.toBeChecked();
    }
  });

  test('is not a blocking overlay - core page content remains usable without interacting with it', async ({
    page,
  }) => {
    await page.goto('/');
    // The disclosure is collapsed by default (native <details>) and must
    // not obstruct the primary heading or CTA.
    const details = page.locator('.tracking-preferences');
    await expect(details).toHaveJSProperty('open', false);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('a[href^="tel:"]').first()).toBeVisible();
  });

  test('reports honest status text reflecting that no tracking is configured', async ({ page }) => {
    await page.goto('/');
    await page.locator('.tracking-preferences summary').click();
    await expect(page.locator('#tracking-preferences-status')).toHaveText(
      /no optional tracking is currently active/i,
    );
  });

  test('can be opened and the checkbox toggled via keyboard alone', async ({ page }) => {
    await page.goto('/');
    const summary = page.locator('.tracking-preferences summary');
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.tracking-preferences')).toHaveJSProperty('open', true);

    const toggle = page.locator('#tracking-consent-toggle');
    await toggle.focus();
    await page.keyboard.press('Space');
    await expect(toggle).toBeChecked();
  });

  test('persists the preference and it survives a reload', async ({ page }) => {
    await page.goto('/');
    await page.locator('.tracking-preferences summary').click();
    await page.check('#tracking-consent-toggle');
    await page.reload();
    await page.locator('.tracking-preferences summary').click();
    await expect(page.locator('#tracking-consent-toggle')).toBeChecked();
  });

  test('does not preselect consent - a fresh browser context always starts unchecked', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('#tracking-consent-toggle')).not.toBeChecked();
    await context.close();
  });

  test('has no horizontal overflow at 320px with the preferences panel open', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto('/');
    await page.locator('.tracking-preferences summary').click();
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
  });

  test('declining/leaving tracking off does not block navigation, phone, email, or the quote form', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('a[href^="tel:"]').first()).toBeEnabled();
    await expect(page.locator('a[href^="mailto:"]').first()).toBeEnabled();
    await page.goto('/contact-us');
    await expect(page.locator('#quote-form-submit')).toBeEnabled();
  });
});

test.describe('Tracking: regression - existing SEO and structure remain intact', () => {
  test('/404 remains noindex with no canonical or og:url', async ({ page }) => {
    const response = await page.goto('/this-route-does-not-exist');
    expect(response?.status()).toBe(404);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  });

  test('sitemap.xml and robots.txt remain correct', async ({ request }) => {
    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    const sitemapBody = await sitemap.text();
    expect(sitemapBody).toContain('https://www.greencalpressurewashing.com/');

    const robots = await request.get('/robots.txt');
    expect(robots.status()).toBe(200);
    const robotsBody = await robots.text();
    expect(robotsBody).toContain('Sitemap: https://www.greencalpressurewashing.com/sitemap.xml');
  });

  test('the corrected company email is unchanged', async ({ page }) => {
    await page.goto('/contact-us');
    const html = await page.content();
    expect(html).toContain('greencaliforniacorporation@gmail.com');
    expect(html).not.toContain('greencaliforniacorporarion');
  });

  test('no Footbridge, gtag, or googletagmanager reference exists in any rendered route', async ({
    page,
  }) => {
    for (const path of ALL_ROUTES) {
      await page.goto(path);
      const html = (await page.content()).toLowerCase();
      for (const forbidden of [
        'footbridge',
        'gtag(',
        'googletagmanager.com',
        'google-analytics.com',
      ]) {
        expect(html).not.toContain(forbidden);
      }
    }
  });

  test('no secret-looking value is exposed in the rendered HTML', async ({ page }) => {
    await page.goto('/');
    const html = await page.content();
    expect(html).not.toMatch(/api[_-]?key/i);
    expect(html).not.toMatch(/secret/i);
    expect(html).not.toMatch(/service[_-]?account/i);
  });
});
