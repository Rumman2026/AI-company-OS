/**
 * Static security assertions over
 * packages/db/migrations/041-e2e-fixture-rpc.sql.
 *
 * WHAT THIS IS AND IS NOT. It is not a substitute for executing the migration
 * - packages/db/tests/migration-041/test041.sql does that, against a scratch
 * database, and proves behavior (idempotency, the conflict refusals, the
 * privilege model as Postgres actually resolves it). This file proves the
 * properties that are decidable from the text and that a careless future edit
 * is most likely to break: that the function stayed no-argument, that no table
 * privilege was ever granted to anybody, that nothing but service_role can
 * execute it, that the fixture ids are still constants rather than parameters,
 * and that no dynamic SQL crept in.
 *
 * It runs in `pnpm test` on every machine and in CI, with no database, no
 * credentials and no network - which is the point. The behavioral suite needs
 * a Postgres to run against; this one catches the regressions that would
 * otherwise reach production because nobody had a scratch database handy.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATION_PATH = join(__dirname, '..', 'migrations', '041-e2e-fixture-rpc.sql');
const ROLLBACK_PATH = join(__dirname, '..', 'migrations', '041-e2e-fixture-rpc.rollback.sql');

const sql = readFileSync(MIGRATION_PATH, 'utf-8');
const rollbackSql = readFileSync(ROLLBACK_PATH, 'utf-8');

const FUNCTION = 'public.e2e_provision_tenant_isolation_fixture()';

/**
 * The migration with every `--` comment line removed. Every assertion about
 * what the migration DOES runs against this, because the file's header prose
 * legitimately contains the words "grant", "delete" and "insert" while
 * explaining why they are absent - matching against the raw text would make
 * the prose part of the test.
 */
const code = sql
  .split('\n')
  .filter((line) => !line.trimStart().startsWith('--'))
  .join('\n');

const FIXTURE = {
  businessId: '23489f4c-aa29-46fb-b639-38024f8da89c',
  businessSlug: 'crm-isolation-test-tenant',
  businessName: 'CRM Isolation Test Tenant',
  contactId: '6c8fa104-14d3-5d32-8a26-91363611c351',
  contactName: 'E2E Throwaway Contact',
  contactEmail: 'e2e-throwaway-contact@example.com',
  contactPhone: '+15550000000',
  leadId: 'f217d64b-aeef-4a0e-8fb4-f33cedd36459',
};

test('creates exactly one function, and it takes no arguments', () => {
  const created = code.match(/create\s+function\s+[\w.]+\s*\(/g) ?? [];
  assert.equal(created.length, 1, 'migration 041 must create exactly one function');
  assert.match(
    code,
    /create function public\.e2e_provision_tenant_isolation_fixture\(\)/,
    'the function must be declared with an empty parameter list - a parameterised ' +
      'version would be a general-purpose row writer, not a fixture provisioner',
  );
});

test('is created without `or replace`, so a name collision aborts the migration', () => {
  assert.ok(
    !/create\s+or\s+replace\s+function/i.test(code),
    '`create or replace` would silently overwrite an existing function in production',
  );
});

test('is SECURITY DEFINER with a fixed empty search_path', () => {
  assert.match(code, /security definer/);
  assert.match(
    code,
    /set search_path = ''/,
    'search_path must be pinned empty so nothing resolves by search and every ' +
      'relation is what the text says it is',
  );
});

test('contains no dynamic SQL', () => {
  for (const forbidden of [/\bexecute\s+format\b/i, /\bexecute\s+'/i, /\bquote_ident\b/i]) {
    assert.ok(!forbidden.test(code), `dynamic SQL construct ${forbidden} must not appear`);
  }
});

test('hard-codes every fixture id and never generates one', () => {
  for (const [name, value] of Object.entries(FIXTURE)) {
    assert.ok(code.includes(value), `fixture constant ${name} ("${value}") must appear in the SQL`);
  }
  assert.ok(
    !/gen_random_uuid|uuid_generate_v[0-9]/.test(code),
    'the fixture must never generate a random id - it is a fixed, verifiable row',
  );
});

test('the fixture ids appear as constants, not as function parameters', () => {
  const declare = code.slice(code.indexOf('declare'), code.indexOf('begin\n'));
  for (const value of [FIXTURE.businessId, FIXTURE.contactId, FIXTURE.leadId]) {
    assert.ok(
      declare.includes(`constant uuid := '${value}'`),
      `${value} must be a plpgsql constant in the DECLARE block`,
    );
  }
});

test('grants no table privilege to any role', () => {
  const grants = code.match(/^grant .*/gim) ?? [];
  assert.ok(grants.length > 0, 'expected at least the one EXECUTE grant');
  for (const grant of grants) {
    assert.match(
      grant,
      /^grant execute on function /i,
      `only EXECUTE-on-function grants are allowed in this migration, found: ${grant}`,
    );
  }
  for (const forbidden of [
    /grant\s+all/i,
    /grant\s+(select|insert|update|delete)/i,
    /on\s+table/i,
  ]) {
    assert.ok(!forbidden.test(code), `${forbidden} must not appear in migration 041`);
  }
});

test('grants EXECUTE to service_role and to nobody else', () => {
  const grants = code.match(/^grant .*/gim) ?? [];
  assert.equal(grants.length, 1, 'exactly one grant statement is expected');
  assert.equal(
    grants[0].trim(),
    `grant execute on function ${FUNCTION} to service_role;`,
    'EXECUTE must go to service_role alone',
  );
  // Checked against the grant STATEMENTS, not the whole file: the
  // `comment on function` payload at the bottom legitimately contains the
  // sentence "EXECUTE is granted to service_role alone - never anon or
  // authenticated", and a looser match would read that prose as a grant.
  // Only the GRANTEE list is checked, i.e. what follows the final `to` - the
  // schema-qualified function name contains the word "public" and would
  // otherwise read as a grant to PUBLIC.
  for (const grant of grants) {
    const grantees = grant.split(/\bto\b/i).pop() ?? '';
    for (const role of ['anon', 'authenticated', 'public']) {
      assert.ok(
        !new RegExp(`\\b${role}\\b`, 'i').test(grantees),
        `EXECUTE must never be granted to ${role} - the function lives in the exposed ` +
          `\`public\` schema, so a grant there is reachable over the Data API. Found: ${grant}`,
      );
    }
  }
});

test('revokes the default PUBLIC execute, plus anon and authenticated explicitly', () => {
  for (const role of ['public', 'anon', 'authenticated']) {
    assert.match(
      code,
      new RegExp(`revoke all on function ${FUNCTION.replace(/[().]/g, '\\$&')} from ${role};`),
      `missing explicit revoke from ${role}`,
    );
  }
});

test('is wrapped in a single transaction', () => {
  assert.match(code, /^begin;$/m);
  assert.match(code, /^commit;$/m);
  assert.ok(!/\brollback;/i.test(code), 'a migration must not contain a bare rollback');
});

test('every write is addressed by the fixture primary key and scoped to the fixture tenant', () => {
  const inserts = code.match(/insert into [\s\S]*?;/g) ?? [];
  assert.equal(inserts.length, 2, 'exactly two inserts: the Contact and the Lead');
  for (const statement of inserts) {
    assert.match(
      statement,
      /on conflict \(id\) do nothing/,
      'inserts must be idempotent and must never overwrite an existing row',
    );
    assert.ok(
      /public\.(contacts|leads)/.test(statement),
      'only the contacts and leads tables may be written',
    );
  }

  const updates = code.match(/update public\.[\s\S]*?;/g) ?? [];
  assert.equal(updates.length, 2, 'exactly two updates: the Contact and Lead canonical resets');
  for (const statement of updates) {
    assert.match(
      statement,
      /where [\s\S]*\.id = c_(contact|lead)_id/,
      'every update must be addressed by the fixture primary key',
    );
    assert.match(
      statement,
      /\.business_id = c_business_id/,
      'every update must additionally be scoped to the fixture tenant',
    );
  }
});

test('never deletes anything', () => {
  assert.ok(
    !/^\s*delete\s+from/im.test(code),
    'the provisioner provisions; deleting the fixture is a deliberate manual act ' +
      '(documented in the rollback file), never something a test run does',
  );
});

test('refuses on a tenant, Contact or Lead identity mismatch', () => {
  const raises = code.match(/raise exception/g) ?? [];
  assert.ok(
    raises.length >= 5,
    `expected at least five fail-closed raises, found ${raises.length}`,
  );
  assert.match(
    code,
    /slug\/name mismatch/,
    'the tenant guard must check slug and name, not just existence',
  );
  assert.match(code, /refusing to overwrite a row this fixture does not own/);
  assert.match(code, /refusing to re-parent a row this fixture does not own/);
});

test('the rollback drops the function and touches nothing else', () => {
  const rollbackCode = rollbackSql
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n');
  assert.match(
    rollbackCode,
    new RegExp(`drop function if exists ${FUNCTION.replace(/[().]/g, '\\$&')};`),
  );
  assert.ok(
    !/^\s*(delete|drop table|alter table|revoke|grant)\b/im.test(rollbackCode),
    'the rollback must drop the function only - no row deletions, no schema changes',
  );
});
