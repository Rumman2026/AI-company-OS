/**
 * The synthetic cross-tenant-isolation fixture, mirrored from
 * packages/db/migrations/041-e2e-fixture-rpc.sql.
 *
 * THE SQL IS THE SOURCE OF TRUTH, NOT THIS FILE. The database function owns
 * these constants and cannot be aimed anywhere else (it takes no arguments) -
 * these copies exist so the E2E suite can assert on the fixture it expects
 * instead of trusting whatever the RPC hands back. If the two ever drift, the
 * suite must fail rather than quietly test a different row, which is what
 * tests/e2e-fixture-contract-unit.spec.ts checks: it parses the migration and
 * compares it to this file, on every `pnpm test`, with no database involved.
 *
 * Nothing in here is a secret. These are synthetic ids for a synthetic tenant
 * that exists only to be denied access to real data.
 */

/** The CRM Isolation Test Tenant - never GreenCal, never Navarro. */
export const FIXTURE_BUSINESS_ID = '23489f4c-aa29-46fb-b639-38024f8da89c';
export const FIXTURE_BUSINESS_SLUG = 'crm-isolation-test-tenant';
export const FIXTURE_BUSINESS_NAME = 'CRM Isolation Test Tenant';

export const FIXTURE_CONTACT_ID = '6c8fa104-14d3-5d32-8a26-91363611c351';
export const FIXTURE_CONTACT_DISPLAY_NAME = 'E2E Throwaway Contact';
export const FIXTURE_CONTACT_EMAIL = 'e2e-throwaway-contact@example.com';
export const FIXTURE_CONTACT_PHONE = '+15550000000';

export const FIXTURE_LEAD_ID = 'f217d64b-aeef-4a0e-8fb4-f33cedd36459';
export const FIXTURE_LEAD_STATUS = 'new';

/** The one function the E2E path is allowed to call. */
export const FIXTURE_RPC_NAME = 'e2e_provision_tenant_isolation_fixture';

/**
 * The shape `e2e_provision_tenant_isolation_fixture()` returns. Supabase
 * returns a `returns table (...)` function as an array of rows; this suite
 * requires exactly one.
 */
export interface FixtureProvisionRow {
  readonly business_id: string;
  readonly business_slug: string;
  readonly business_name: string;
  readonly contact_id: string;
  readonly contact_display_name: string;
  readonly contact_email: string;
  readonly contact_phone: string;
  readonly lead_id: string;
  readonly lead_business_id: string;
  readonly lead_contact_id: string;
  readonly lead_status: string;
  readonly contact_created: boolean;
  readonly lead_created: boolean;
  readonly contact_reset: boolean;
  readonly lead_reset: boolean;
}
