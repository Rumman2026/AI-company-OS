import { test, expect } from '@playwright/test';

const NEW_ROUTES = [
  {
    path: '/residential-services',
    title: 'Residential Services | GreenCal Pressure Washing',
    heading: 'Residential Services',
  },
  {
    path: '/roof',
    title: 'Roof Cleaning | GreenCal Pressure Washing',
    heading: 'Roof Cleaning',
  },
  {
    path: '/restoration/house-washing',
    title: 'House & Stucco Washing | GreenCal Pressure Washing',
    heading: 'House & Stucco Washing',
  },
  {
    path: '/contact-us',
    title: 'Contact | GreenCal Pressure Washing',
    heading: 'Contact',
  },
];

for (const route of NEW_ROUTES) {
  test.describe(`${route.path}`, () => {
    test('loads successfully with the expected title and one heading', async ({ page }) => {
      const response = await page.goto(route.path);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(route.title);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText(route.heading);
    });

    test('has no horizontal overflow at narrow, mobile, and desktop widths', async ({ page }) => {
      // 320px regression guard: the CTA banner's nested padding previously
      // narrowed available width enough that the long mailto address
      // overflowed the viewport at this width (fixed via overflow-wrap).
      await page.setViewportSize({ width: 320, height: 700 });
      await page.goto(route.path);
      const narrowOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(narrowOverflow).toBe(false);

      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(route.path);
      const mobileOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(mobileOverflow).toBe(false);

      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(route.path);
      const desktopOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(desktopOverflow).toBe(false);
    });

    test('skip link remains functional', async ({ page }) => {
      await page.goto(route.path);
      await page.keyboard.press('Tab');
      await expect(page.locator('.skip-link')).toBeFocused();
    });

    test('contains no Wufoo reference, address text, or structured data', async ({ page }) => {
      await page.goto(route.path);
      // /contact-us is the sole, deliberate exception: it renders the real,
      // GreenCal-owned quote form added in Stage 3 - see
      // tests/quote-form.spec.ts and tests/quote-form-unit.spec.ts for its
      // dedicated coverage.
      if (route.path !== '/contact-us') {
        await expect(page.locator('form')).toHaveCount(0);
      }
      await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
      const bodyText = (await page.locator('body').innerText()).toLowerCase();
      expect(bodyText).not.toContain('wufoo');
      expect(bodyText).not.toContain('fullerton');
      expect(bodyText).not.toContain('orangethorpe');
    });
  });
}

test.describe('Header navigation', () => {
  test('contains exactly Home, Residential Services, and Contact', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('header nav[aria-label="Primary"]');
    await expect(header.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute(
      'href',
      '/',
    );
    await expect(header.getByRole('link', { name: 'Residential Services' })).toHaveAttribute(
      'href',
      '/residential-services',
    );
    await expect(header.getByRole('link', { name: 'Contact', exact: true })).toHaveAttribute(
      'href',
      '/contact-us',
    );
  });

  test('does not link to Commercial, About, Service Areas, Reviews, Blog, or Projects', async ({
    page,
  }) => {
    await page.goto('/');
    const header = page.locator('header');
    for (const excluded of [
      'Commercial',
      'About',
      'Service Areas',
      'Reviews',
      'Blog',
      'Projects',
    ]) {
      await expect(header.getByRole('link', { name: excluded })).toHaveCount(0);
    }
  });

  test('brand link remains first focusable element after the skip link', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab'); // skip link
    await page.keyboard.press('Tab'); // brand
    await expect(page.locator('.brand')).toBeFocused();
  });
});

test.describe('Footer navigation', () => {
  test('contains the five expected links and no address text', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer nav[aria-label="Footer"]');
    await expect(footer.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute(
      'href',
      '/',
    );
    await expect(footer.getByRole('link', { name: 'Residential Services' })).toHaveAttribute(
      'href',
      '/residential-services',
    );
    await expect(footer.getByRole('link', { name: 'Roof Cleaning' })).toHaveAttribute(
      'href',
      '/roof',
    );
    await expect(footer.getByRole('link', { name: 'House & Stucco Washing' })).toHaveAttribute(
      'href',
      '/restoration/house-washing',
    );
    await expect(footer.getByRole('link', { name: 'Contact', exact: true })).toHaveAttribute(
      'href',
      '/contact-us',
    );
    const footerText = (await page.locator('footer').innerText()).toLowerCase();
    expect(footerText).not.toContain('fullerton');
    expect(footerText).not.toContain('orangethorpe');
  });
});

test.describe('Cross-linking', () => {
  test('Residential Services links to both pilot service pages', async ({ page }) => {
    await page.goto('/residential-services');
    await expect(page.locator('a[href="/roof"]')).not.toHaveCount(0);
    await expect(page.locator('a[href="/restoration/house-washing"]')).not.toHaveCount(0);
  });

  test('Roof Cleaning links back to Residential Services and Contact', async ({ page }) => {
    await page.goto('/roof');
    await expect(page.locator('a[href="/residential-services"]')).not.toHaveCount(0);
    await expect(page.locator('a[href="/contact-us"]')).not.toHaveCount(0);
  });

  test('House & Stucco Washing links back to Residential Services and Contact', async ({
    page,
  }) => {
    await page.goto('/restoration/house-washing');
    await expect(page.locator('a[href="/residential-services"]')).not.toHaveCount(0);
    await expect(page.locator('a[href="/contact-us"]')).not.toHaveCount(0);
  });
});

// Slice 1 migration-evidence regression guards - see
// GREENCal-SLICE-1-IMPLEMENTATION-SCOPE-20260716.csv. These codify the
// route-preservation evidence from the GreenCal legacy-site audit series
// so an accidental future slug change is caught by CI.
test.describe('Slice 1 migration-evidence regression guards', () => {
  test('/residential-services remains served at its exact path - confirmed legacy 301 consolidation target for 7 retired residential-service subpages (see GREENCal-UNDOCUMENTED-REDIRECT-EVIDENCE-20260716.csv)', async ({
    page,
  }) => {
    const response = await page.goto('/residential-services');
    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe('/residential-services');
  });

  test('/roof remains served at its exact path - confirmed live 301 target of legacy /residential-services/roof-washing (see GREENCal-UNDOCUMENTED-REDIRECT-EVIDENCE-20260716.csv)', async ({
    page,
  }) => {
    const response = await page.goto('/roof');
    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe('/roof');
  });

  test('/restoration/house-washing remains served at its exact path - confirmed live 301 target of /residential-services/house-washing, corroborated by active navigation-template evidence (see GREENCal-UNDOCUMENTED-REDIRECT-EVIDENCE-20260716.csv and GREENCal-FINAL-ROUTE-AUDIT-20260716.md)', async ({
    page,
  }) => {
    const response = await page.goto('/restoration/house-washing');
    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe('/restoration/house-washing');
  });
});

test.describe('Contact page', () => {
  test('has exactly one tel link and one mailto link with the correct destinations', async ({
    page,
  }) => {
    await page.goto('/contact-us');
    const tel = page.locator('a[href^="tel:"]');
    await expect(tel).toHaveCount(1);
    await expect(tel).toHaveAttribute('href', 'tel:+16573198550');
    const mail = page.locator('a[href^="mailto:"]');
    await expect(mail).toHaveCount(1);
    await expect(mail).toHaveAttribute('href', 'mailto:greencaliforniacorporation@gmail.com');
  });

  test('quote-request path is stated explicitly and the real quote form is not a stub', async ({
    page,
  }) => {
    await page.goto('/contact-us');
    // Stage 3 replaced the "no form" state with one real, GreenCal-owned
    // form. This asserts it is not a dead-end stub: it has the honest
    // submission-boundary markers (consent, honeypot, a working submit
    // control) - full behavioral coverage lives in quote-form.spec.ts and
    // quote-form-unit.spec.ts.
    await expect(page.locator('form')).toHaveCount(1);
    await expect(page.locator('#qf-consent')).toHaveCount(1);
    await expect(page.locator('.quote-form-honeypot')).toHaveCount(1);
    await expect(page.locator('#quote-form-submit')).toBeVisible();
    const bodyText = (await page.locator('main').innerText()).toLowerCase();
    expect(bodyText).toContain('quote');
  });
});

test.describe('Homepage residential-only scope', () => {
  test('does not mention commercial services anywhere', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('GreenCal Pressure Washing');
    const bodyText = (await page.locator('body').innerText()).toLowerCase();
    expect(bodyText).not.toContain('commercial');
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description?.toLowerCase()).not.toContain('commercial');
    const ogDescription = await page
      .locator('meta[property="og:description"]')
      .getAttribute('content');
    expect(ogDescription?.toLowerCase()).not.toContain('commercial');
  });
});

// Sprint 1 shared-shell regression guards. These verify user-facing touch-
// target behavior and card presentation, not incidental markup or pixel-
// exact values - see the Sprint 1 implementation summary in the session
// history for the measured baseline (nav/CTA links were 19-24px tall
// before this sprint).
test.describe('Sprint 1 shared-shell regression guards', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
  });

  test('header and footer navigation list links have an adequately sized touch target on /', async ({
    page,
  }) => {
    // Scoped to the nav <ul> links specifically - the brand/logo link is a
    // separate element with its own (already adequate) sizing and is not
    // part of this fix.
    await page.goto('/');
    const links = page.locator('header nav ul a, footer nav ul a');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const box = await links.nth(i).boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(32);
    }
  });

  test('service cards on / are visually distinguishable (bordered)', async ({ page }) => {
    await page.goto('/');
    const cards = page.locator('.service-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const borderWidth = await cards.nth(i).evaluate((el) => getComputedStyle(el).borderWidth);
      expect(borderWidth).not.toBe('0px');
    }
  });

  test('service cards on /residential-services are visually distinguishable (bordered)', async ({
    page,
  }) => {
    await page.goto('/residential-services');
    const cards = page.locator('.service-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const borderWidth = await cards.nth(i).evaluate((el) => getComputedStyle(el).borderWidth);
      expect(borderWidth).not.toBe('0px');
    }
  });

  test('back-navigation and contact links on /roof have an adequately sized touch target', async ({
    page,
  }) => {
    await page.goto('/roof');
    const links = page.locator(
      'a[href="/residential-services"], a[href="/contact-us"], .contact-actions a',
    );
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const box = await links.nth(i).boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(32);
    }
  });

  test('/contact-us shared-shell CTA touch targets remain stable after the shared-shell update', async ({
    page,
  }) => {
    // This test verifies only that the shared ContactActions component's
    // presentation remains stable on /contact-us - it does not assert on
    // /contact-us content, metadata, or form behavior, none of which were
    // touched this sprint.
    await page.goto('/contact-us');
    const links = page.locator('.contact-actions a');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const box = await links.nth(i).boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(32);
    }
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
  });
});

// Revenue-launch sprint (Day 1) regression guards.
test.describe('Revenue launch: homepage conversion path', () => {
  test('has an "Our Services" heading before the service listing', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#services-heading')).toHaveText('Our Services');
  });

  test('has a "How It Works" section', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#how-it-works-heading')).toHaveText('How It Works');
    await expect(page.locator('.how-it-works ol li')).toHaveCount(3);
  });

  test('has a closing call-to-action heading', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#closing-cta-heading')).toHaveText('Ready to Get Started?');
  });
});

test.describe('Revenue launch: /roof as the primary paid-ad landing page', () => {
  test('has a concise opening value proposition before the call-to-action', async ({ page }) => {
    await page.goto('/roof');
    const lede = page.locator('.lede');
    await expect(lede).toBeVisible();
    await expect(lede).toHaveText(
      'Exterior roof cleaning to address surface dirt, debris, and organic growth.',
    );
  });

  test('has a prominent call-to-action banner before the detailed service copy', async ({
    page,
  }) => {
    await page.goto('/roof');
    const ctaBanner = page.locator('.cta-banner');
    await expect(ctaBanner).toBeVisible();
    await expect(ctaBanner.locator('a[href^="tel:"]')).toBeVisible();
    await expect(ctaBanner.locator('a[href^="mailto:"]')).toBeVisible();
  });

  test('has a "How It Works" section and a closing call-to-action', async ({ page }) => {
    await page.goto('/roof');
    await expect(page.locator('#how-it-works-heading')).toHaveText('How It Works');
    await expect(page.locator('.closing-cta')).toBeVisible();
    await expect(page.locator('.closing-cta a[href^="tel:"]')).toBeVisible();
  });

  test('retains related-page links to Residential Services and Contact', async ({ page }) => {
    await page.goto('/roof');
    const relatedNav = page.locator('nav[aria-label="Related pages"]');
    await expect(relatedNav.locator('a[href="/residential-services"]')).toBeVisible();
    await expect(relatedNav.locator('a[href="/contact-us"]')).toBeVisible();
  });
});

test.describe('Revenue launch: /restoration/house-washing shares the strengthened layout', () => {
  test('has a lede, CTA banner, How It Works section, and closing CTA', async ({ page }) => {
    await page.goto('/restoration/house-washing');
    await expect(page.locator('.lede')).toBeVisible();
    await expect(page.locator('.cta-banner')).toBeVisible();
    await expect(page.locator('#how-it-works-heading')).toHaveText('How It Works');
    await expect(page.locator('.closing-cta')).toBeVisible();
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
    expect(body).toContain('Sitemap: https://www.greencalpressurewashing.com/sitemap.xml');
  });
});

const PRODUCTION_DOMAIN = 'https://www.greencalpressurewashing.com';
const INDEXABLE_ROUTES = ['/', ...NEW_ROUTES.map((route) => route.path)];

test.describe('Stage 2: production-domain canonical and Open Graph URLs', () => {
  for (const path of INDEXABLE_ROUTES) {
    test(`${path} has a canonical link and og:url pointing at the production domain`, async ({
      page,
    }) => {
      await page.goto(path);
      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical).toHaveAttribute('href', `${PRODUCTION_DOMAIN}${path}`);
      const ogUrl = page.locator('meta[property="og:url"]');
      await expect(ogUrl).toHaveAttribute('content', `${PRODUCTION_DOMAIN}${path}`);
    });

    test(`${path} has Open Graph and Twitter metadata matching its title and description`, async ({
      page,
    }) => {
      await page.goto(path);
      const pageTitle = await page.title();
      const description = await page.locator('meta[name="description"]').getAttribute('content');

      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', pageTitle);
      await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
        'content',
        description ?? '',
      );
      await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website');
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary');
      await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
        'content',
        pageTitle,
      );
      await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute(
        'content',
        description ?? '',
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
    await expect(page.locator('meta[property="og:url"]')).toHaveCount(0);
  });
});

test.describe('Stage 2: sitemap.xml', () => {
  test('lists exactly the indexable routes at the production domain, and excludes 404', async ({
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
    expect(body).not.toContain('this-route-does-not-exist');
  });
});

test.describe('Stage 2: no Footbridge or unauthorized third-party references', () => {
  test('no route renders Footbridge, analytics, CRM, or call-tracking references', async ({
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

  test('every route renders exactly two same-origin, first-party module scripts (BaseLayout engagement tracking + Footer consent control) - /contact-us has one more for the quote form', async ({
    page,
  }) => {
    for (const path of INDEXABLE_ROUTES) {
      await page.goto(path);
      const scripts = page.locator('script');
      await expect(scripts).toHaveCount(path === '/contact-us' ? 3 : 2);
      const count = await scripts.count();
      for (let i = 0; i < count; i++) {
        await expect(scripts.nth(i)).toHaveAttribute('type', 'module');
        const src = await scripts.nth(i).getAttribute('src');
        expect(src).not.toBeNull();
        expect(src as string).toMatch(/^\//);
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
