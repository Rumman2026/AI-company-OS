/**
 * The standalone, test-only provisioner for the cross-tenant-isolation
 * fixture. Invokes exactly one bounded database function -
 * `public.e2e_provision_tenant_isolation_fixture()` (see
 * packages/db/migrations/041-e2e-fixture-rpc.sql) - and verifies what comes
 * back.
 *
 * WHY THIS IS NOT IN THE SPEC FILE. Fixture provisioning is setup, not a
 * browser assertion, and the previous version of this suite had raw
 * `insert into contacts` / `insert into leads` calls sitting in the test
 * file's beforeAll. That put row-writing power in the same file as the
 * navigation steps, where it is easy to extend by accident, and it required
 * `service_role` to hold INSERT on the CRM tables. Neither is true any more:
 * the only database capability this whole path has is EXECUTE on one
 * no-argument function.
 *
 * WHY IT SENDS NO IDS. The RPC takes no arguments. This module cannot ask for
 * a different tenant, contact or lead even if it wanted to - the fixture is
 * constant inside the function body. The constants imported below are used to
 * CHECK the answer, never to steer it.
 *
 * FAILS CLOSED, ALWAYS LOUDLY. Missing credentials, a missing opt-in flag, a
 * PostgREST error, a wrong row count, or any field that does not match the
 * expected fixture all throw. There is no branch here that returns a
 * "provisioned" result it did not verify, and no branch that skips.
 *
 * SECRET HANDLING. The key is read from the environment, handed to
 * `createClient`, and never logged, returned, or included in an error message.
 * Every error below reports variable NAMES and fixture ids only.
 */

import { createClient } from '@supabase/supabase-js';
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
  type FixtureProvisionRow,
} from './fixture-constants';

/**
 * The canonical name of the backend/test-only Supabase secret. Renamed from
 * `E2E_SUPABASE_SERVICE_ROLE_KEY`, which no longer works - see
 * .env.e2e.local.example. Deliberately no fallback to the old name: a silent
 * fallback would let a stale local file keep working while the documented
 * contract said otherwise, and there is no third party consuming this
 * variable to stage a transition for.
 */
export const SECRET_KEY_VAR = 'E2E_SUPABASE_SECRET_KEY';
export const SUPABASE_URL_VAR = 'E2E_SUPABASE_URL';
export const ALLOW_MUTATION_VAR = 'E2E_ALLOW_FIXTURE_MUTATION';

export interface ProvisionedFixture {
  readonly businessId: string;
  readonly contactId: string;
  readonly leadId: string;
  /** What this call actually did - reported so a run says so out loud. */
  readonly contactCreated: boolean;
  readonly leadCreated: boolean;
  readonly contactReset: boolean;
  readonly leadReset: boolean;
}

/**
 * Every check that can be made without a database, factored out so it is
 * directly testable (tests/e2e-fixture-contract-unit.spec.ts) rather than
 * only reachable by hitting production.
 *
 * Verifies the RPC's answer against the expected fixture field by field. The
 * function cannot be aimed at another tenant, so this is not the security
 * boundary - it is the check that the fixture in the database is still the
 * fixture this suite was written against.
 */
export function assertFixtureRow(rows: unknown): FixtureProvisionRow {
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new Error(
      `Fixture provisioning failed: ${FIXTURE_RPC_NAME}() returned ` +
        `${Array.isArray(rows) ? `${rows.length} rows` : typeof rows} - expected exactly 1.`,
    );
  }
  const row = rows[0] as FixtureProvisionRow;

  const expected: ReadonlyArray<readonly [keyof FixtureProvisionRow, string]> = [
    ['business_id', FIXTURE_BUSINESS_ID],
    ['business_slug', FIXTURE_BUSINESS_SLUG],
    ['business_name', FIXTURE_BUSINESS_NAME],
    ['contact_id', FIXTURE_CONTACT_ID],
    ['contact_display_name', FIXTURE_CONTACT_DISPLAY_NAME],
    ['contact_email', FIXTURE_CONTACT_EMAIL],
    ['contact_phone', FIXTURE_CONTACT_PHONE],
    ['lead_id', FIXTURE_LEAD_ID],
    ['lead_business_id', FIXTURE_BUSINESS_ID],
    ['lead_contact_id', FIXTURE_CONTACT_ID],
    ['lead_status', FIXTURE_LEAD_STATUS],
  ];

  const mismatches = expected
    .filter(([field, want]) => row?.[field] !== want)
    .map(([field, want]) => `${String(field)}: expected "${want}", got "${String(row?.[field])}"`);

  if (mismatches.length > 0) {
    throw new Error(
      `Fixture verification failed - ${FIXTURE_RPC_NAME}() returned a fixture that does not ` +
        `match apps/admin-console/tests/e2e/fixture-constants.ts:\n  ${mismatches.join('\n  ')}\n` +
        'Refusing to run tenant-isolation assertions against an unexpected row.',
    );
  }
  return row;
}

/**
 * Reads the three required variables, refusing on any that is absent or, for
 * the opt-in flag, not exactly "true".
 *
 * `E2E_ALLOW_FIXTURE_MUTATION` is a separate interlock from having the
 * credentials at all: holding the key is not the same as intending to write
 * with it. Anything other than the exact string "true" - unset, "1", "TRUE",
 * "yes" - is a refusal, so the flag can never be half-satisfied by a typo.
 */
export function readProvisionerEnv(env: NodeJS.ProcessEnv = process.env): {
  url: string;
  secretKey: string;
} {
  const url = env[SUPABASE_URL_VAR];
  const secretKey = env[SECRET_KEY_VAR];

  const missing = [...(url ? [] : [SUPABASE_URL_VAR]), ...(secretKey ? [] : [SECRET_KEY_VAR])];
  if (missing.length > 0) {
    throw new Error(
      `Fixture provisioning refused: missing ${missing.join(' and ')}. ` +
        'Copy apps/admin-console/.env.e2e.local.example to .env.e2e.local and fill it in ' +
        '(the file is gitignored; never commit or paste the value).',
    );
  }

  if (env[ALLOW_MUTATION_VAR] !== 'true') {
    throw new Error(
      `Fixture provisioning refused: ${ALLOW_MUTATION_VAR} must be exactly "true". ` +
        'It is a deliberate, separate opt-in from holding the credentials - this path ' +
        'calls a database function that writes rows in the CRM Isolation Test Tenant.',
    );
  }

  return { url: url!, secretKey: secretKey! };
}

/**
 * Provisions (or re-verifies) the fixture and returns what the call did.
 * Idempotent, because the RPC is: running it twice in a row is a supported,
 * expected case, and the second run reports `*_created: false`.
 */
export async function provisionTenantIsolationFixture(
  env: NodeJS.ProcessEnv = process.env,
): Promise<ProvisionedFixture> {
  const { url, secretKey } = readProvisionerEnv(env);

  const client = createClient(url, secretKey, { auth: { persistSession: false } });
  const { data, error } = await client.rpc(FIXTURE_RPC_NAME);

  if (error) {
    // `error.message` is PostgREST's, never the key - the client is
    // constructed above and the credential never reaches this string.
    throw new Error(
      `Fixture provisioning failed: ${FIXTURE_RPC_NAME}() returned an error - ${error.message}. ` +
        'If this is "Could not find the function", apply ' +
        'packages/db/migrations/041-e2e-fixture-rpc.sql. If it is a permission error, the ' +
        `EXECUTE grant to service_role in that migration was not applied.`,
    );
  }

  const row = assertFixtureRow(data);
  return {
    businessId: row.business_id,
    contactId: row.contact_id,
    leadId: row.lead_id,
    contactCreated: row.contact_created,
    leadCreated: row.lead_created,
    contactReset: row.contact_reset,
    leadReset: row.lead_reset,
  };
}
