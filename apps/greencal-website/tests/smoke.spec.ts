import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('loads successfully with the expected title', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle('GreenCal Pressure Washing');
  });

  test('has exactly one primary heading', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('GreenCal Pressure Washing');
  });

  test('has header, main, and footer landmarks', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header')).toHaveCount(1);
    await expect(page.locator('main#main-content')).toHaveCount(1);
    await expect(page.locator('footer')).toHaveCount(1);
  });

  test('skip link moves focus to main content', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  });

  test('keyboard focus is visible on an interactive element', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab'); // skip link
    await page.keyboard.press('Tab'); // brand link
    const brand = page.locator('.brand');
    await expect(brand).toBeFocused();
    const outlineStyle = await brand.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outlineStyle).not.toBe('none');
  });

  test('telephone links have the correct tel: destination', async ({ page }) => {
    // Revenue-launch sprint: the homepage now has a top CTA banner and a
    // closing CTA in addition to the original position, so at least one
    // (and every) tel: link must resolve to the correct number.
    await page.goto('/');
    const telLinks = page.locator('a[href^="tel:"]');
    await expect(telLinks.first()).toBeVisible();
    const count = await telLinks.count();
    expect(count).toBeGreaterThanOrEqual(1);
    for (let i = 0; i < count; i++) {
      await expect(telLinks.nth(i)).toHaveAttribute('href', 'tel:+16573198550');
    }
  });

  test('email links have the correct, correctly-spelled mailto: destination', async ({ page }) => {
    await page.goto('/');
    const mailLinks = page.locator('a[href^="mailto:"]');
    await expect(mailLinks.first()).toBeVisible();
    const count = await mailLinks.count();
    expect(count).toBeGreaterThanOrEqual(1);
    for (let i = 0; i < count; i++) {
      await expect(mailLinks.nth(i)).toHaveAttribute(
        'href',
        'mailto:greencaliforniacorporation@gmail.com',
      );
    }
  });

  test('homepage has a prominent call-to-action near the top, before the services list', async ({
    page,
  }) => {
    await page.goto('/');
    const ctaBanner = page.locator('.cta-banner');
    await expect(ctaBanner).toBeVisible();
    const servicesHeading = page.locator('#residential-heading');
    const ctaBox = await ctaBanner.boundingBox();
    const servicesBox = await servicesHeading.boundingBox();
    expect(ctaBox).not.toBeNull();
    expect(servicesBox).not.toBeNull();
    expect((ctaBox as { y: number }).y).toBeLessThan((servicesBox as { y: number }).y);
  });

  test('homepage has a closing call-to-action section', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.closing-cta')).toBeVisible();
    await expect(page.locator('.closing-cta a[href^="tel:"]')).toBeVisible();
  });

  test('every internal link points to an implemented route and does not 404', async ({
    page,
    request,
  }) => {
    await page.goto('/');
    const hrefs = await page
      .locator('a[href]')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    const internalHrefs = [
      ...new Set(hrefs.filter((href): href is string => !!href && href.startsWith('/'))),
    ];
    const implementedRoutes = [
      '/',
      '/residential',
      '/commercial',
      '/multi-family-hoa',
      '/service-areas',
      '/contact-us',
      '/services/roof-cleaning',
      '/services/house-washing',
      '/services/concrete-cleaning',
      '/commercial/building-washing',
      '/commercial/storefront-cleaning',
      '/commercial/concrete-cleaning',
      '/commercial/dumpster-pad-cleaning',
      '/commercial/drive-thru-cleaning',
      '/commercial/gum-stain-removal',
      '/commercial/recurring-exterior-cleaning',
      '/multi-family-hoa/apartment-condo-cleaning',
      '/multi-family-hoa/hoa-pressure-washing',
    ];
    for (const href of internalHrefs) {
      // Fragments (e.g. the Stage 3 quote-form anchor link) are client-side
      // only - strip before matching a route and before requesting.
      const [path, fragment] = href.split('#');
      expect(implementedRoutes).toContain(path);
      const response = await request.get(path);
      expect(response.status()).not.toBe(404);
      if (fragment) {
        const html = await response.text();
        expect(html).toContain(`id="${fragment}"`);
      }
    }
  });

  test('narrow viewport (320px) has no horizontal overflow', async ({ page }) => {
    // Regression guard: the CTA banner's nested padding previously narrowed
    // available width enough that the long mailto address overflowed the
    // viewport at this width (fixed via overflow-wrap on .contact-actions a).
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/');
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
  });

  test('mobile viewport has no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
  });

  test('desktop viewport has no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
  });

  // Slice 1 migration-evidence regression guard - see
  // GREENCal-SLICE-1-IMPLEMENTATION-SCOPE-20260716.csv.
  test('remains served at the root path', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe('/');
  });
});

test.describe('404 page', () => {
  test('renders the custom 404 page for an unknown route', async ({ page }) => {
    const response = await page.goto('/this-route-does-not-exist');
    expect(response?.status()).toBe(404);
    await expect(page.locator('h1')).toHaveText('Page Not Found');
    // Scoped to #main-content: the header's brand link also has href="/".
    await expect(page.locator('#main-content a[href="/"]')).toBeVisible();
  });
});

// Revenue-launch sprint: the site previously shipped with a misspelled
// contact email (greencaliforniacorporarion@gmail.com). This regression
// guard fails loudly if that exact typo ever reappears anywhere in the
// rendered homepage output.
test.describe('Corrected email regression guard', () => {
  test('the previous email typo does not appear anywhere on the homepage', async ({ page }) => {
    await page.goto('/');
    const html = await page.content();
    expect(html).not.toContain('greencaliforniacorporarion');
    expect(html).toContain('greencaliforniacorporation@gmail.com');
  });
});

test.describe('robots.txt', () => {
  test('is served, allows crawling, and references the production sitemap', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('User-agent: *');
    expect(body).toContain('Allow: /');
    expect(body).toContain('Sitemap: https://www.greencalpressurewashing.com/sitemap.xml');
  });
});
