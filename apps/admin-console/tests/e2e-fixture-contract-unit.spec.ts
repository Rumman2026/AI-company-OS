/**
 * The contract between the E2E fixture provisioner and the database function
 * it calls - checked with no database, no credentials and no browser, so it
 * runs on every `pnpm test` and in CI.
 *
 * WHY THIS EXISTS. The tenant-isolation suite asserts on a fixed Lead id. If
 * packages/db/migrations/041-e2e-fixture-rpc.sql and
 * tests/e2e/fixture-constants.ts ever disagree about what that id is, the
 * failure would surface as a confusing "Lead not found" in a production
 * release gate, at the one moment nobody wants to debug a test. Here it is a
 * one-line diff in a unit run instead.
 *
 * It also pins the provisioner's fail-closed behavior. Those refusals are the
 * whole safety argument for handing a test path a service-role credential, and
 * an argument that is never executed is an argument nobody has checked.
 *
 * `*-unit.spec.ts`, run by the default `chromium` project, matching this
 * directory's existing pure-logic specs - it opens no page.
 */

import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import playwrightConfig from '../playwright.config';
import {
  FIXTURE_BUSINESS_ID,
  FIXTURE_BUSINESS_NAME,
  FIXTURE_BUSINESS_SLUG,
  FIXTURE_CONTACT_DISPLAY_NAME,
  FIXTURE_CONTACT_EMAIL,
  FIXTURE_CONTACT_ID,
  FIXTURE_CONTACT_PHONE,
  FIXTURE_LEAD_ID,
  FIXTURE_LEAD_STATUS,
  FIXTURE_RPC_NAME,
} from './e2e/fixture-constants';
import {
  ALLOW_MUTATION_VAR,
  SECRET_KEY_VAR,
  SUPABASE_URL_VAR,
  assertFixtureRow,
  readProvisionerEnv,
} from './e2e/fixture-provisioner';

const MIGRATION_SQL = readFileSync(
  join(__dirname, '..', '..', '..', 'packages', 'db', 'migrations', '041-e2e-fixture-rpc.sql'),
  'utf-8',
);

/** A complete, valid RPC result row - the baseline each case below perturbs. */
function validRow() {
  return {
    business_id: FIXTURE_BUSINESS_ID,
    business_slug: FIXTURE_BUSINESS_SLUG,
    business_name: FIXTURE_BUSINESS_NAME,
    contact_id: FIXTURE_CONTACT_ID,
    contact_display_name: FIXTURE_CONTACT_DISPLAY_NAME,
    contact_email: FIXTURE_CONTACT_EMAIL,
    contact_phone: FIXTURE_CONTACT_PHONE,
    lead_id: FIXTURE_LEAD_ID,
    lead_business_id: FIXTURE_BUSINESS_ID,
    lead_contact_id: FIXTURE_CONTACT_ID,
    lead_status: FIXTURE_LEAD_STATUS,
    contact_created: false,
    lead_created: false,
    contact_reset: false,
    lead_reset: false,
  };
}

const BASE_ENV = {
  [SUPABASE_URL_VAR]: 'https://example.supabase.co',
  [SECRET_KEY_VAR]: 'not-a-real-key',
  [ALLOW_MUTATION_VAR]: 'true',
};

test.describe('fixture constants match migration 041', () => {
  test('every fixture constant this suite asserts on is the one the SQL owns', () => {
    for (const value of [
      FIXTURE_BUSINESS_ID,
      FIXTURE_BUSINESS_SLUG,
      FIXTURE_BUSINESS_NAME,
      FIXTURE_CONTACT_ID,
      FIXTURE_CONTACT_DISPLAY_NAME,
      FIXTURE_CONTACT_EMAIL,
      FIXTURE_CONTACT_PHONE,
      FIXTURE_LEAD_ID,
    ]) {
      expect(MIGRATION_SQL, `migration 041 must contain "${value}"`).toContain(value);
    }
  });

  test('the RPC name matches the function the migration creates', () => {
    expect(MIGRATION_SQL).toContain(`create function public.${FIXTURE_RPC_NAME}()`);
  });

  test('the fixture business is the isolation tenant, never a real one', () => {
    expect(FIXTURE_BUSINESS_SLUG).toBe('crm-isolation-test-tenant');
    expect(FIXTURE_BUSINESS_NAME).not.toContain('GreenCal');
    expect(FIXTURE_BUSINESS_NAME).not.toContain('Navarro');
  });
});

test.describe('the provisioner fails closed on configuration', () => {
  test('refuses when the Supabase URL is missing', () => {
    const env = { ...BASE_ENV, [SUPABASE_URL_VAR]: undefined };
    expect(() => readProvisionerEnv(env)).toThrow(SUPABASE_URL_VAR);
  });

  test('refuses when the secret key is missing, and names the canonical variable', () => {
    const env = { ...BASE_ENV, [SECRET_KEY_VAR]: undefined };
    expect(() => readProvisionerEnv(env)).toThrow('E2E_SUPABASE_SECRET_KEY');
  });

  test('refuses when the mutation opt-in is absent', () => {
    const env = { ...BASE_ENV, [ALLOW_MUTATION_VAR]: undefined };
    expect(() => readProvisionerEnv(env)).toThrow(ALLOW_MUTATION_VAR);
  });

  test('refuses every near-miss value for the mutation opt-in', () => {
    for (const value of ['TRUE', 'True', '1', 'yes', 'true ', '']) {
      const env = { ...BASE_ENV, [ALLOW_MUTATION_VAR]: value };
      expect(
        () => readProvisionerEnv(env),
        `"${value}" must not be accepted as the mutation opt-in`,
      ).toThrow(ALLOW_MUTATION_VAR);
    }
  });

  test('accepts exactly "true" with both credentials present', () => {
    expect(readProvisionerEnv(BASE_ENV)).toEqual({
      url: BASE_ENV[SUPABASE_URL_VAR],
      secretKey: BASE_ENV[SECRET_KEY_VAR],
    });
  });

  test('does not fall back to the old E2E_SUPABASE_SERVICE_ROLE_KEY name', () => {
    const env = {
      ...BASE_ENV,
      [SECRET_KEY_VAR]: undefined,
      E2E_SUPABASE_SERVICE_ROLE_KEY: 'stale-value-under-the-old-name',
    };
    expect(() => readProvisionerEnv(env)).toThrow(SECRET_KEY_VAR);
  });
});

test.describe('the provisioner verifies what the RPC returned', () => {
  test('accepts the exact expected fixture', () => {
    expect(assertFixtureRow([validRow()]).lead_id).toBe(FIXTURE_LEAD_ID);
  });

  test('rejects an empty result - a provisioner that returned nothing provisioned nothing', () => {
    expect(() => assertFixtureRow([])).toThrow('expected exactly 1');
  });

  test('rejects more than one row', () => {
    expect(() => assertFixtureRow([validRow(), validRow()])).toThrow('expected exactly 1');
  });

  test('rejects a non-array result', () => {
    expect(() => assertFixtureRow(null)).toThrow('expected exactly 1');
  });

  test('rejects a Lead that belongs to another business', () => {
    const row = { ...validRow(), lead_business_id: '00000000-0000-4000-8000-000000000001' };
    expect(() => assertFixtureRow([row])).toThrow('lead_business_id');
  });

  test('rejects a Lead attached to another contact', () => {
    const row = { ...validRow(), lead_contact_id: '00000000-0000-4000-8000-000000000002' };
    expect(() => assertFixtureRow([row])).toThrow('lead_contact_id');
  });

  test('rejects a tenant whose slug is not the isolation tenant', () => {
    const row = { ...validRow(), business_slug: 'greencal-pressure-washing' };
    expect(() => assertFixtureRow([row])).toThrow('business_slug');
  });

  test('rejects a Lead id other than the fixture Lead', () => {
    const row = { ...validRow(), lead_id: '00000000-0000-4000-8000-000000000003' };
    expect(() => assertFixtureRow([row])).toThrow('lead_id');
  });

  test('reports every mismatched field at once, not just the first', () => {
    const row = { ...validRow(), business_slug: 'wrong', lead_status: 'archived' };
    let message = '';
    try {
      assertFixtureRow([row]);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('business_slug');
    expect(message).toContain('lead_status');
  });
});

test.describe('the credentialed projects cannot be reached by an ordinary run', () => {
  // Imported, not described from memory: this is the same module object
  // Playwright itself loaded for this run, so the assertion is about what
  // actually happened, not about what the file appears to say.
  //
  // The opt-in is off here by construction - a `pnpm test` sets
  // npm_lifecycle_event to "test", not "test:e2e:tenant-isolation" - so the
  // two production-hitting projects must not exist at all. Before this gate,
  // a bare `playwright test` ran the tenant-isolation project on any machine
  // whose .env.e2e.local was complete.
  test('a default run defines only the offline chromium project', () => {
    const names = (playwrightConfig.projects ?? []).map((project) => project.name);
    expect(names).toEqual(['chromium']);
  });

  test('the browser suite depends on the fixture setup project', () => {
    const configSource = readFileSync(join(__dirname, '..', 'playwright.config.ts'), 'utf-8');
    // The ordering guarantee: Playwright runs the setup project to completion
    // first and skips the dependent project entirely if it fails, so there is
    // no path from `--project=e2e-tenant-isolation` to a browser assertion
    // against an unprovisioned fixture.
    expect(configSource).toContain("dependencies: ['e2e-tenant-isolation-setup']");
    expect(configSource).toContain("testMatch: '**/e2e/fixture.setup.ts'");
  });
});
