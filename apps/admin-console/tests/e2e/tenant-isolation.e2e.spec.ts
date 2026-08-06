import { test, expect } from '@playwright/test';

/**
 * CRM cross-tenant isolation live verification - see
 * docs/launch/CRM_V1_RELEASE_READINESS.md for the full setup record
 * (the CRM Isolation Test Tenant business/membership this test logs in
 * as). Hits real production. Self-skips entirely if its required
 * environment variables aren't present, so `pnpm test`/CI never
 * attempt this without deliberately-provided credentials - see
 * playwright.config.ts and .env.e2e.local.example.
 *
 * One correction to the originally-specified expectation: this
 * application's detail pages (Job/Estimate/Lead/Invoice) do not return
 * HTTP 404/403 for a cross-tenant id - RLS filters the row out at the
 * database layer, and the page renders normally (HTTP 200) with an
 * honest "not found" message in the body (e.g. "Job not found.").
 * This is the actual, already-established behavior throughout this
 * codebase (see every `notFound = true` branch in apps/admin-console's
 * detail pages) - asserting on a literal 404 status code would be
 * testing for behavior this app was never built to produce, and would
 * incorrectly fail even when isolation is working correctly. This test
 * asserts on the real behavior: the page's own "not found" text, and
 * the explicit absence of any real Tenant A data in the response body.
 */

const BASE_URL = process.env.E2E_BASE_URL;
const TENANT_B_EMAIL = process.env.E2E_TENANT_B_EMAIL;
const TENANT_B_PASSWORD = process.env.E2E_TENANT_B_PASSWORD;
const TENANT_A_JOB_ID = process.env.E2E_TENANT_A_JOB_ID;
const TENANT_A_ESTIMATE_ID = process.env.E2E_TENANT_A_ESTIMATE_ID;
const TENANT_A_LEAD_ID = process.env.E2E_TENANT_A_LEAD_ID;
const TENANT_A_INVOICE_ID = process.env.E2E_TENANT_A_INVOICE_ID;
const TENANT_B_SEEDED_LEAD_ID = process.env.E2E_TENANT_B_SEEDED_LEAD_ID;

const REQUIRED = { BASE_URL, TENANT_B_EMAIL, TENANT_B_PASSWORD };
const missingRequired = Object.entries(REQUIRED)
  .filter(([, v]) => !v)
  .map(([k]) => k);

test.describe('CRM cross-tenant isolation (production, Tenant B)', () => {
  test.skip(
    missingRequired.length > 0,
    `Skipped - missing required env var(s): ${missingRequired.join(', ')}. ` +
      'Copy apps/admin-console/.env.e2e.local.example to .env.e2e.local and fill in real values.',
  );

  test('Tenant B cannot read, list, or write Tenant A data, and can operate its own tenant', async ({
    page,
  }) => {
    await test.step('1. Log in as the Tenant B isolation test user', async () => {
      await page.goto('/login');
      await page.fill('#email', TENANT_B_EMAIL!);
      await page.fill('#password', TENANT_B_PASSWORD!);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => !url.pathname.includes('/login'));
      await page.screenshot({ path: 'test-results/e2e-01-post-login.png', fullPage: true });
    });

    await test.step('2. Dashboard shows CRM Isolation Test Tenant, not GreenCal', async () => {
      await page.goto('/');
      await expect(page.locator('.admin-nav__business')).toHaveText('CRM Isolation Test Tenant');
      await expect(page.locator('.admin-nav__business')).not.toContainText('GreenCal');
      await page.screenshot({ path: 'test-results/e2e-02-dashboard.png', fullPage: true });
    });

    await test.step('3-5. Direct reads of known Tenant A records are rejected, no Tenant A data leaks', async () => {
      const cases: Array<{
        label: string;
        id?: string;
        path: (id: string) => string;
        notFoundText: string;
      }> = [
        {
          label: 'Job',
          id: TENANT_A_JOB_ID,
          path: (id) => `/jobs/${id}`,
          notFoundText: 'Job not found',
        },
        {
          label: 'Estimate',
          id: TENANT_A_ESTIMATE_ID,
          path: (id) => `/estimates/${id}`,
          notFoundText: 'Estimate not found',
        },
        {
          label: 'Lead',
          id: TENANT_A_LEAD_ID,
          path: (id) => `/leads/${id}`,
          notFoundText: 'Lead not found',
        },
        {
          label: 'Invoice',
          id: TENANT_A_INVOICE_ID,
          path: (id) => `/invoices/${id}`,
          notFoundText: 'Invoice not found',
        },
      ];

      for (const c of cases) {
        if (!c.id) {
          test.info().annotations.push({
            type: 'skipped-check',
            description: `${c.label} id not provided (E2E_TENANT_A_${c.label.toUpperCase()}_ID) - this specific read-isolation check was not run.`,
          });
          continue;
        }
        const response = await page.goto(c.path(c.id));
        // Honest note: this app returns HTTP 200 with a "not found"
        // message body for a cross-tenant id, never a 404/403 status -
        // see the module doc comment above. Assert on the real
        // behavior, not the originally-assumed status code.
        expect(response?.status()).toBe(200);
        await expect(page.getByText(c.notFoundText)).toBeVisible();
        await expect(page.locator('body')).not.toContainText('GreenCal Pressure Washing');
        await page.screenshot({
          path: `test-results/e2e-03-${c.label.toLowerCase()}-read-blocked.png`,
          fullPage: true,
        });
      }
    });

    await test.step('6. List pages contain zero GreenCal / Tenant A records', async () => {
      for (const path of ['/leads', '/jobs', '/invoices']) {
        await page.goto(path);
        await expect(page.locator('body')).not.toContainText('GreenCal Pressure Washing');
        if (TENANT_A_JOB_ID) await expect(page.locator('body')).not.toContainText(TENANT_A_JOB_ID);
        await page.screenshot({
          path: `test-results/e2e-04-list${path.replace('/', '-')}.png`,
          fullPage: true,
        });
      }
    });

    await test.step('7. A write attempt against a Tenant A Job is rejected', async () => {
      if (!TENANT_A_JOB_ID) {
        // Deliberately not test.skip() here - calling it inside the
        // test body skips the ENTIRE test (Playwright's documented
        // conditional-skip behavior), not just this one step,
        // discarding the pass/fail result of every step before it.
        test.info().annotations.push({
          type: 'skipped-check',
          description: 'E2E_TENANT_A_JOB_ID not provided - write-isolation check not run.',
        });
        return;
      }
      // Astro's built-in same-origin check for form POSTs
      // (`security.checkOrigin`, on by default) rejects a raw
      // page.request.post() with "Cross-site POST form submissions
      // are forbidden" (HTTP 403, confirmed via live diagnostic
      // against this exact endpoint) unless the Origin header matches
      // the app's own origin, the way a real browser form submission
      // would set it automatically. Setting it here so this request
      // reaches the actual route handler and its own tenant check,
      // rather than being rejected one layer earlier by Astro's CSRF
      // protection - a different, unrelated security control.
      const response = await page.request.post(`/api/jobs/${TENANT_A_JOB_ID}/transition`, {
        form: { requestedStatus: 'in-progress' },
        headers: { origin: BASE_URL! },
      });
      // The route always redirects (success or failure) - a rejection
      // redirects back with ?error=..., which Playwright's
      // request context follows by default; assert the final URL
      // reflects a rejection, and independently confirm via SQL/manual
      // check that the real Job's status was not changed (not
      // something this test can verify from the browser alone).
      expect(response.url()).toContain('error=');
    });

    await test.step('8-9. A pre-seeded Tenant B Lead is visible only to Tenant B', async () => {
      if (!TENANT_B_SEEDED_LEAD_ID) {
        test.info().annotations.push({
          type: 'skipped-check',
          description:
            'E2E_TENANT_B_SEEDED_LEAD_ID not provided - no "Create Lead" UI exists in ' +
            'apps/admin-console, so this Lead must be seeded via SQL first - see ' +
            'docs/launch/CRM_V1_RELEASE_READINESS.md.',
        });
        return;
      }
      const response = await page.goto(`/leads/${TENANT_B_SEEDED_LEAD_ID}`);
      expect(response?.status()).toBe(200);
      await expect(page.getByText('Lead not found')).not.toBeVisible();
      await page.goto('/leads');
      await expect(page.locator('body')).toContainText(TENANT_B_SEEDED_LEAD_ID!);
      await page.screenshot({ path: 'test-results/e2e-05-tenant-b-own-lead.png', fullPage: true });
    });

    await test.step('10-11. Clean up the throwaway lead (archive - no delete UI exists for Leads)', async () => {
      if (!TENANT_B_SEEDED_LEAD_ID) {
        test.info().annotations.push({
          type: 'skipped-check',
          description: 'E2E_TENANT_B_SEEDED_LEAD_ID not provided - nothing to clean up.',
        });
        return;
      }
      // See the Origin-header note on the step 7 write attempt above -
      // same Astro same-origin check applies to every POST route.
      const response = await page.request.post(`/api/leads/${TENANT_B_SEEDED_LEAD_ID}/archive`, {
        headers: { origin: BASE_URL! },
      });
      expect(response.ok()).toBe(true);
      await page.goto(`/leads/${TENANT_B_SEEDED_LEAD_ID}`);
      await expect(page.getByText('Archived')).toBeVisible();
      // A full row DELETE, if wanted, remains a separate manual SQL
      // step scoped by this exact lead id - see
      // docs/launch/CRM_V1_RELEASE_READINESS.md.
    });
  });
});
