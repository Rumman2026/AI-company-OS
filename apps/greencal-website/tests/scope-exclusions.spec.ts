import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { cities, COUNTIES } from '../src/data/cities';
import { services } from '../src/data/services';
import { quoteFormServiceOptions } from '../src/data/quote-form-service-options';

// Automated validation for the approved-scope update - see DECISIONS.md
// ADR-0007 and BUSINESS_FACTS.md. Fails the build if an excluded service,
// an unapproved city, or Los Angeles County appears anywhere in the
// approved-scope surface (navigation, quote form, structured data,
// generated pages, sitemap) - see ADR-0007's automated-validation
// requirement. Case-insensitive by design.

// Terms with no legitimate reason to ever appear anywhere in this app's
// source or rendered output - not even in a negation/disclaimer sentence.
const EXCLUDED_SERVICE_TERMS = [
  'auto detailing',
  'mobile detailing',
  'fleet detailing',
  'car washing',
  'carpet cleaning',
  'upholstery cleaning',
  'paver sealing',
  'concrete sealing',
  'driveway sealing',
  'brick sealing',
  'stone sealing',
  'joint-sand',
  'polymeric-sand',
  'holiday lighting',
  'permanent lighting',
  'lighting installation',
  'landscaping',
  'roof repair',
  'roofing installation',
  'gutter installation',
  'solar installation',
  'janitorial',
  'maid service',
];

// Pool cleaning/maintenance/repair is prohibited as a service, but the
// approved concrete-cleaning page is required to state, as a deliberate
// disclaimer, that a pool deck may be cleaned as a concrete surface while
// pool cleaning itself is not offered (see BUSINESS_FACTS.md) - so these
// terms get their own, more precise tests below rather than a blanket
// never-appears-anywhere check.
const POOL_SERVICE_TERMS = ['pool cleaning', 'pool maintenance', 'pool chemical', 'pool repair'];

const EXCLUDED_LOCATION_TERMS = ['los angeles county', 'los angeles'];

// --------------------------------------------------------------------
// Data-layer guards - pure Node checks, no browser needed.
// --------------------------------------------------------------------

test.describe('Canonical data-source integrity', () => {
  test('no duplicate city slugs', () => {
    const slugs = cities.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  test('no duplicate service slugs across the published service pages', () => {
    const slugs = services.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  test('no duplicate quote-form service option slugs', () => {
    const slugs = quoteFormServiceOptions.map((o) => o.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  test('no duplicate canonical service routes', () => {
    const routes = services.map((s) => s.route);
    expect(new Set(routes).size).toBe(routes.length);
  });

  test('every city has a valid approved county', () => {
    for (const city of cities) {
      expect(COUNTIES).toContain(city.county);
    }
  });

  test('every city is exactly one of the three approved counties - no Los Angeles County', () => {
    const countyNames = new Set(cities.map((c) => c.county));
    expect(countyNames.size).toBe(3);
    for (const county of countyNames) {
      expect(county).not.toMatch(/los angeles/i);
    }
  });

  test('the approved city list has exactly 80 communities', () => {
    expect(cities).toHaveLength(80);
  });

  test('every quote-form service option maps to an approved category or "other"', () => {
    for (const option of quoteFormServiceOptions) {
      expect(['residential', 'commercial', 'multi-family-hoa', 'other']).toContain(option.category);
    }
  });

  test('no draft/non-indexable city is marked indexable by mistake', () => {
    // Every city starts draft/non-indexable until real per-city content
    // exists - see ADR-0007's city-page publication policy.
    for (const city of cities) {
      if (city.publishStatus === 'draft') {
        expect(city.indexable).toBe(false);
      }
    }
  });
});

// --------------------------------------------------------------------
// Source-tree guard - catches an excluded term anywhere in application
// source (data files, components, pages), excluding this test file, the
// documentation files that are allowed to name excluded services for
// clarity (BUSINESS_FACTS.md, DECISIONS.md, README files), and the
// migration-note exemption ADR-0007 allows.
// --------------------------------------------------------------------

function listSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      listSourceFiles(full, out);
    } else if (/\.(ts|astro|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

test.describe('Source-tree scope guard', () => {
  test('no excluded-service term appears in apps/greencal-website/src', () => {
    const srcDir = join(__dirname, '..', 'src');
    const files = listSourceFiles(srcDir);
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const content = readFileSync(file, 'utf-8').toLowerCase();
      for (const term of EXCLUDED_SERVICE_TERMS) {
        expect(content, `${file} must not reference excluded term "${term}"`).not.toContain(term);
      }
    }
  });

  test('pool cleaning/maintenance/repair is mentioned only once, as the required concrete-cleaning disclaimer - never offered', () => {
    const srcDir = join(__dirname, '..', 'src');
    const files = listSourceFiles(srcDir);
    const filesReferencingPool = files.filter((file) => {
      const content = readFileSync(file, 'utf-8').toLowerCase();
      return POOL_SERVICE_TERMS.some((term) => content.includes(term));
    });
    // Only services.ts (the concrete-cleaning ServiceRecord's disclaimer)
    // may reference pool service terms - nowhere else (nav, quote form
    // options, other service pages) may offer or imply the service.
    expect(filesReferencingPool.map((f) => relative(srcDir, f))).toEqual([
      join('data', 'services.ts'),
    ]);

    const servicesContent = readFileSync(
      join(srcDir, 'data', 'services.ts'),
      'utf-8',
    ).toLowerCase();
    expect(servicesContent).toMatch(/does not offer pool cleaning/);
  });

  test('no Los Angeles County reference appears in apps/greencal-website/src', () => {
    const srcDir = join(__dirname, '..', 'src');
    const files = listSourceFiles(srcDir);

    for (const file of files) {
      const content = readFileSync(file, 'utf-8').toLowerCase();
      for (const term of EXCLUDED_LOCATION_TERMS) {
        expect(content, `${file} must not reference "${term}"`).not.toContain(term);
      }
    }
  });
});

// --------------------------------------------------------------------
// Rendered-output guards - browser checks against the running dev server
// (see playwright.config.ts). Covers navigation, quote-form options,
// generated pages, and the sitemap - the same surfaces ADR-0007 requires.
// --------------------------------------------------------------------

const REPRESENTATIVE_ROUTES = [
  '/',
  '/residential',
  '/commercial',
  '/multi-family-hoa',
  '/service-areas',
  '/service-areas/san-diego-county',
  '/service-areas/orange-county',
  '/service-areas/riverside-county',
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

test.describe('Rendered-page scope guard', () => {
  for (const path of REPRESENTATIVE_ROUTES) {
    test(`${path} never renders an excluded service or Los Angeles County`, async ({ page }) => {
      await page.goto(path);
      const bodyText = (await page.locator('body').innerText()).toLowerCase();
      for (const term of [...EXCLUDED_SERVICE_TERMS, ...EXCLUDED_LOCATION_TERMS]) {
        expect(bodyText, `${path} must not render "${term}"`).not.toContain(term);
      }
    });
  }

  test('pool cleaning is mentioned only as the required disclaimer on /services/concrete-cleaning, and never elsewhere', async ({
    page,
  }) => {
    await page.goto('/services/concrete-cleaning');
    const concreteBody = (await page.locator('body').innerText()).toLowerCase();
    expect(concreteBody).toContain('does not offer pool cleaning');

    for (const path of REPRESENTATIVE_ROUTES.filter((p) => p !== '/services/concrete-cleaning')) {
      await page.goto(path);
      const bodyText = (await page.locator('body').innerText()).toLowerCase();
      for (const term of POOL_SERVICE_TERMS) {
        expect(bodyText, `${path} must not reference "${term}"`).not.toContain(term);
      }
    }
  });

  test('the quote form service selector never offers an excluded service', async ({ page }) => {
    await page.goto('/contact-us');
    const optionText = (await page.locator('#qf-service option').allTextContents())
      .join(' | ')
      .toLowerCase();
    for (const term of EXCLUDED_SERVICE_TERMS) {
      expect(optionText).not.toContain(term);
    }
  });

  test('the quote form city selector never offers Los Angeles or a Los Angeles County city', async ({
    page,
  }) => {
    await page.goto('/contact-us');
    const optionText = (await page.locator('#qf-city option').allTextContents())
      .join(' | ')
      .toLowerCase();
    for (const term of EXCLUDED_LOCATION_TERMS) {
      expect(optionText).not.toContain(term);
    }
  });

  test('no structured data on any service page references an excluded service', async ({
    page,
  }) => {
    for (const service of services) {
      await page.goto(service.route);
      const raw = await page.locator('script[type="application/ld+json"]').textContent();
      const lowered = (raw ?? '').toLowerCase();
      for (const term of EXCLUDED_SERVICE_TERMS) {
        expect(lowered).not.toContain(term);
      }
    }
  });

  test('sitemap.xml never lists a draft/noindex city page', async ({ request }) => {
    const body = (await (await request.get('/sitemap.xml')).text()).toLowerCase();
    for (const city of cities.filter((c) => !c.indexable)) {
      expect(body).not.toContain(`/service-areas/${city.slug}<`);
    }
  });

  test('sitemap.xml never contains Los Angeles or an excluded-service route', async ({
    request,
  }) => {
    const body = (await (await request.get('/sitemap.xml')).text()).toLowerCase();
    for (const term of [...EXCLUDED_SERVICE_TERMS, ...EXCLUDED_LOCATION_TERMS]) {
      expect(body).not.toContain(term);
    }
  });
});
