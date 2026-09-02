/**
 * The Playwright setup project for the cross-tenant isolation suite.
 *
 * WHERE THIS RUNS IN THE LIFECYCLE. It is its own project
 * (`e2e-tenant-isolation-setup` in playwright.config.ts), declared as a
 * `dependencies` entry of `e2e-tenant-isolation`. Playwright runs it to
 * completion first and refuses to run the dependent project if it fails - so a
 * fixture that could not be provisioned stops the release gate instead of
 * letting it start and fail somewhere less legible.
 *
 * WHY A SETUP PROJECT AND NOT `globalSetup`. `globalSetup` is config-level and
 * would also run for the default `chromium` project - i.e. for an ordinary
 * `pnpm test` - which is exactly the "a unit-test run quietly wrote to
 * production" outcome this whole design is avoiding. A dependency project runs
 * only when the project that depends on it runs.
 *
 * IT OPENS NO BROWSER AND ASSERTS NOTHING ABOUT THE UI. It calls one bounded
 * database function through the provisioner and fails loudly on anything
 * unexpected. All of the fail-closed logic lives in fixture-provisioner.ts;
 * this file is the wiring.
 */

import { test as setup } from '@playwright/test';
import { provisionTenantIsolationFixture } from './fixture-provisioner';

setup('provision the Tenant B cross-tenant-isolation fixture', async () => {
  const fixture = await provisionTenantIsolationFixture();

  // Ids and booleans only - no credential, and nothing from any other tenant.
  // Printed because "the fixture already existed and was reset" and "the
  // fixture was created from scratch" are different runs, and a release gate
  // should say which one it was.
  // eslint-disable-next-line no-console
  console.log(
    `[e2e fixture] business=${fixture.businessId} contact=${fixture.contactId} ` +
      `lead=${fixture.leadId} contactCreated=${fixture.contactCreated} ` +
      `leadCreated=${fixture.leadCreated} contactReset=${fixture.contactReset} ` +
      `leadReset=${fixture.leadReset}`,
  );
});
