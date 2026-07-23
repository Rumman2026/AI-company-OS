import { test, expect } from '@playwright/test';

// Rewritten for the approved-scope update (see DECISIONS.md ADR-0007):
// the old residential-only route set (/roof, /residential-services,
// /restoration/house-washing) was replaced by the approved
// residential/commercial/multi-family-hoa/service-areas architecture.
// Legacy routes now redirect (301) rather than remaining live pages -
// see the "Legacy redirects" describe block below.

const SERVICE_ROUTES = [
  { path: '/services/roof-cleaning', heading: 'Roof Cleaning' },
  { path: '/services/house-washing', heading: 'House Washing' },
  { path: '/services/concrete-cleaning', heading: 'Concrete Cleaning' },
  { path: '/commercial/building-washing', heading: 'Commercial Building Washing' },
  { path: '/commercial/storefront-cleaning', heading: 'Storefront Cleaning' },
  { path: '/commercial/concrete-cleaning', heading: 'Commercial Concrete Cleaning' },
  { path: '/commercial/dumpster-pad-cleaning', heading: 'Dumpster Pad Cleaning' },
  { path: '/commercial/drive-thru-cleaning', heading: 'Drive-Thru Cleaning' },
  { path: '/commercial/gum-stain-removal', heading: 'Gum and Stain Removal' },
  { path: '/commercial/recurring-exterior-cleaning', heading: 'Recurring Exterior Cleaning' },
  {
    path: '/multi-family-hoa/apartment-condo-cleaning',
    heading: 'Apartment & Condo Exterior Cleaning',
  },
  { path: '/multi-family-hoa/hoa-pressure-washing', heading: 'HOA Pressure Washing' },
];

const CATEGORY_INDEX_ROUTES = [
  { path: '/residential', heading: 'Residential Services' },
  { path: '/commercial', heading: 'Commercial Services' },
  { path: '/multi-family-hoa', heading: 'Multi-Family & HOA Services' },
];

const OTHER_ROUTES = [
  { path: '/', heading: 'GreenCal Pressure Washing' },
  { path: '/contact-us', heading: 'Contact' },
  { path: '/service-areas', heading: 'Service Areas' },
  { path: '/service-areas/san-diego-county', heading: 'San Diego County' },
  { path: '/service-areas/orange-county', heading: 'Orange County' },
  { path: '/service-areas/riverside-county', heading: 'Riverside County' },
];

const INDEXABLE_ROUTES = [
  ...OTHER_ROUTES.map((r) => r.path),
  ...CATEGORY_INDEX_ROUTES.map((r) => r.path),
  ...SERVICE_ROUTES.map((r) => r.path),
];

const PRODUCTION_DOMAIN = 'https://www.greencalpressurewashing.com';

test.describe('Service pages load with the expected heading and structured data', () => {
  for (const route of SERVICE_ROUTES) {
    test(`${route.path} loads successfully with one heading and Service structured data`, async ({
      page,
    }) => {
      const response = await page.goto(route.path);
      expect(response?.status()).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText(route.heading);

      const ldJson = page.locator('script[type="application/ld+json"]');
      await expect(ldJson).toHaveCount(1);
      const raw = await ldJson.textContent();
      const parsed = JSON.parse(raw ?? '{}');
      expect(parsed['@type']).toBe('Service');
      expect(parsed.provider?.name).toBe('GreenCal Pressure Washing');
      // No unverified address/LocalBusiness data - see .claude/rules/websites.md.
      expect(parsed.provider?.address).toBeUndefined();
      expect(parsed['@type']).not.toBe('LocalBusiness');
    });
  }
});

test.describe('Category index and service-area pages load with the expected heading', () => {
  for (const route of [...CATEGORY_INDEX_ROUTES, ...OTHER_ROUTES]) {
    test(`${route.path} loads successfully with the expected heading`, async ({ page }) => {
      const response = await page.goto(route.path);
      expect(response?.status()).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText(route.heading);
    });
  }
});

test.describe('Legacy redirects (DECISIONS.md ADR-0007)', () => {
  test('/roof redirects (301) to /services/roof-cleaning', async ({ page }) => {
    const response = await page.goto('/roof');
    expect(new URL(page.url()).pathname).toBe('/services/roof-cleaning');
    expect(response?.status()).toBe(200); // final response after following the redirect
  });

  test('/restoration/house-washing redirects (301) to /services/house-washing', async ({
    page,
  }) => {
    await page.goto('/restoration/house-washing');
    expect(new URL(page.url()).pathname).toBe('/services/house-washing');
  });

  test('/residential-services redirects (301) to /residential', async ({ page }) => {
    await page.goto('/residential-services');
    expect(new URL(page.url()).pathname).toBe('/residential');
  });
});

test.describe('Header navigation', () => {
  test('contains the approved top-level items and no excluded-scope item', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('header nav[aria-label="Primary"]');
    for (const label of [
      'Home',
      'Residential',
      'Commercial',
      'Multi-Family & HOA',
      'Service Areas',
      'Contact',
      'Request a Quote',
    ]) {
      await expect(header.getByText(label, { exact: true }).first()).toBeVisible();
    }
    for (const excluded of ['About', 'Projects', 'Before & After', 'Reviews', 'Blog', 'Lighting']) {
      await expect(header.getByText(excluded, { exact: true })).toHaveCount(0);
    }
  });

  test('the Residential dropdown reveals exactly the three approved residential services', async ({
    page,
  }) => {
    await page.goto('/');
    const details = page.locator('header .nav-dropdown', { hasText: 'Residential' }).first();
    await details.locator('summary').click();
    const links = details.locator('ul a');
    const labels = await links.allTextContents();
    expect(labels).toContain('Roof Cleaning');
    expect(labels).toContain('House Washing');
    expect(labels).toContain('Concrete Cleaning');
  });

  test('brand link remains first focusable element after the skip link', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab'); // skip link
    await page.keyboard.press('Tab'); // brand
    await expect(page.locator('.brand')).toBeFocused();
  });
});

test.describe('Footer navigation', () => {
  test('contains the approved top-level links and no address text', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer nav[aria-label="Footer"]');
    await expect(footer.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute(
      'href',
      '/',
    );
    await expect(footer.getByRole('link', { name: 'Residential' })).toHaveAttribute(
      'href',
      '/residential',
    );
    await expect(footer.getByRole('link', { name: 'Commercial' })).toHaveAttribute(
      'href',
      '/commercial',
    );
    await expect(footer.getByRole('link', { name: 'Multi-Family & HOA' })).toHaveAttribute(
      'href',
      '/multi-family-hoa',
    );
    await expect(footer.getByRole('link', { name: 'Service Areas' })).toHaveAttribute(
      'href',
      '/service-areas',
    );
    const footerText = (await page.locator('footer').innerText()).toLowerCase();
    expect(footerText).not.toContain('fullerton');
    expect(footerText).not.toContain('orangethorpe');
  });
});

test.describe('Contact page', () => {
  test('has exactly one tel link and one mailto link with the correct destinations', async ({
    page,
  }) => {
    await page.goto('/contact-us');
    const tel = page.locator('a[href^="tel:"]');
    await expect(tel.first()).toHaveAttribute('href', 'tel:+16573198550');
    const mail = page.locator('a[href^="mailto:"]');
    await expect(mail.first()).toHaveAttribute(
      'href',
      'mailto:greencaliforniacorporation@gmail.com',
    );
  });

  test('quote-request path is stated explicitly and the real quote form is not a stub', async ({
    page,
  }) => {
    await page.goto('/contact-us');
    await expect(page.locator('form')).toHaveCount(1);
    await expect(page.locator('#qf-consent')).toHaveCount(1);
    await expect(page.locator('.quote-form-honeypot')).toHaveCount(1);
    await expect(page.locator('#quote-form-submit')).toBeVisible();
  });
});

test.describe('Approved service-area statement', () => {
  test('homepage states the approved three-county scope and never claims broader coverage', async ({
    page,
  }) => {
    await page.goto('/');
    const bodyText = (await page.locator('body').innerText()).toLowerCase();
    expect(bodyText).toContain('san diego');
    expect(bodyText).toContain('orange');
    expect(bodyText).toContain('riverside');
    expect(bodyText).not.toContain('los angeles');
    expect(bodyText).not.toContain('serving all of southern california');
  });
});

test.describe('robots.txt', () => {
  test('is accessible, permits crawling, and references the production sitemap', async ({
    request,
  }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('User-agent: *');
    expect(body).toContain('Allow: /');
    expect(body).toContain(`Sitemap: ${PRODUCTION_DOMAIN}/sitemap.xml`);
  });
});

test.describe('Canonical and Open Graph URLs', () => {
  for (const path of INDEXABLE_ROUTES) {
    test(`${path} has a canonical link and og:url pointing at the production domain`, async ({
      page,
    }) => {
      await page.goto(path);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `${PRODUCTION_DOMAIN}${path}`,
      );
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
        'content',
        `${PRODUCTION_DOMAIN}${path}`,
      );
    });
  }

  test('404 is noindex, nofollow and does not emit a canonical link or og:url', async ({
    page,
  }) => {
    const response = await page.goto('/this-route-does-not-exist');
    expect(response?.status()).toBe(404);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  });

  test('a draft/noindex city page (e.g. San Diego) is noindex and not linked from the sitemap', async ({
    page,
    request,
  }) => {
    const response = await page.goto('/service-areas/san-diego');
    expect(response?.status()).toBe(200);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap).not.toContain('/service-areas/san-diego<');
  });
});

test.describe('sitemap.xml', () => {
  test('lists exactly the indexable routes at the production domain, and excludes 404 and draft city pages', async ({
    request,
  }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('xml');
    const body = await response.text();
    for (const path of INDEXABLE_ROUTES) {
      expect(body).toContain(`<loc>${PRODUCTION_DOMAIN}${path}</loc>`);
    }
    expect(body).not.toContain('404');
    expect(body).not.toContain('/service-areas/san-diego<');
    expect(body).not.toContain('/service-areas/irvine<');
  });
});

test.describe('No Footbridge or unauthorized third-party references', () => {
  test('no indexable route renders Footbridge, analytics, CRM, or call-tracking references', async ({
    page,
  }) => {
    for (const path of INDEXABLE_ROUTES) {
      await page.goto(path);
      const html = (await page.content()).toLowerCase();
      for (const forbidden of [
        'footbridge',
        'gtag',
        'googletagmanager',
        'google-analytics',
        'jobber',
        'callrail',
      ]) {
        expect(html).not.toContain(forbidden);
      }
    }
  });

  test('no route ever loads a script from a third-party host', async ({ page }) => {
    for (const path of INDEXABLE_ROUTES) {
      await page.goto(path);
      const srcs = await page
        .locator('script[src]')
        .evaluateAll((els) => els.map((el) => el.getAttribute('src')));
      for (const src of srcs) {
        expect(src).not.toMatch(/^https?:\/\//);
      }
    }
  });
});
