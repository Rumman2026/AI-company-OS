/**
 * Static assertions over
 * packages/db/migrations/043-restore-remaining-crm-grants.sql.
 *
 * The load-bearing test PARSES the tenant-scoped RLS policies out of the
 * migrations that created them and proves 043's grant set is exactly the set of
 * operations those policies already define, per table. That is 043's entire
 * selection rule, and it is what a future "just add delete while we're here"
 * edit would break silently.
 *
 * It matters more here than it did for 042, because 043 legitimately grants
 * DELETE on two tables. A reviewer who remembers "042 granted no DELETE" could
 * reasonably read that as a mistake; the parser shows it is the rule, applied
 * to tables whose policies differ.
 *
 * No database, no credentials, no network.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS = join(__dirname, '..', 'migrations');
const read = (f: string) => readFileSync(join(MIGRATIONS, f), 'utf-8');

const sql = read('043-restore-remaining-crm-grants.sql');
const rollbackSql = read('043-restore-remaining-crm-grants.rollback.sql');

/** Comment lines are prose and legitimately discuss what is NOT granted. */
const stripComments = (text: string) =>
  text
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n');

const code = stripComments(sql);
const rollbackCode = stripComments(rollbackSql);

const TABLES = [
  'companies',
  'estimate_line_items',
  'review_requests',
  'review_records',
  'photo_assets',
  'photo_pairs',
  'service_packages',
  'business_hours',
  'business_service_areas',
] as const;

/** `grant a, b on public.t to role;` -> one entry per statement. */
function parseGrants(text: string, verb: 'grant' | 'revoke') {
  const preposition = verb === 'grant' ? 'to' : 'from';
  const re = new RegExp(
    `^${verb}\\s+([\\w\\s,]+?)\\s+on\\s+([\\w.]+)\\s+${preposition}\\s+([\\w\\s,]+?);`,
    'gim',
  );
  return [...text.matchAll(re)].map((m) => ({
    privileges: m[1]
      .split(',')
      .map((p) => p.trim().toLowerCase())
      .sort(),
    table: m[2].toLowerCase(),
    roles: m[3]
      .split(',')
      .map((r) => r.trim().toLowerCase())
      .sort(),
  }));
}

const grants = parseGrants(code, 'grant');

test('grants exactly one statement per affected table', () => {
  assert.equal(grants.length, TABLES.length);
  assert.deepEqual(grants.map((g) => g.table).sort(), TABLES.map((t) => `public.${t}`).sort());
});

test('grants only to authenticated - never anon, service_role, postgres or PUBLIC', () => {
  for (const grant of grants) {
    assert.deepEqual(grant.roles, ['authenticated'], `unexpected grantee on ${grant.table}`);
  }
  for (const role of ['anon', 'service_role', 'postgres']) {
    assert.ok(
      !new RegExp(`\\bto\\s+[\\w\\s,]*\\b${role}\\b`, 'i').test(code),
      `043 must never grant to ${role}`,
    );
  }
  assert.ok(!/\bto\s+public\b/i.test(code), '043 must never grant to PUBLIC');
});

test('never grants TRUNCATE, REFERENCES, TRIGGER or ALL PRIVILEGES', () => {
  for (const grant of grants) {
    for (const forbidden of ['truncate', 'references', 'trigger', 'all', 'all privileges']) {
      assert.ok(
        !grant.privileges.includes(forbidden),
        `043 must not grant ${forbidden.toUpperCase()} on ${grant.table}`,
      );
    }
  }
  assert.ok(!/grant\s+all\b/i.test(code), '`grant all` must never appear');
});

test('is additive only - creates, alters or drops no policy, and never weakens RLS', () => {
  for (const forbidden of [
    /create\s+policy/i,
    /drop\s+policy/i,
    /alter\s+policy/i,
    /disable\s+row\s+level\s+security/i,
    /alter\s+table/i,
    /create\s+table/i,
    /\brevoke\b/i,
    /\bdrop\b/i,
    /\bdelete\s+from\b/i,
    /\binsert\s+into\b/i,
  ]) {
    assert.ok(!forbidden.test(code), `043 must not contain ${forbidden}`);
  }
});

test('is wrapped in a single transaction', () => {
  assert.match(code, /^begin;$/m);
  assert.match(code, /^commit;$/m);
});

test('excludes quote_leads, which declares no authenticated policy', () => {
  // Same 42501 symptom, different cause: absent policies mean absent intent.
  // It is written by greencal-website's service-role intake adapter.
  assert.ok(!/public\.quote_leads/.test(code));
});

test('excludes notifications, whose table does not exist in production', () => {
  // Migration 023 creates it and was never applied. Granting on a missing table
  // would fail the whole transaction and bundle two risks into one decision.
  assert.ok(!/public\.notifications/.test(code));
});

test('grants exactly the operations the existing RLS policies already define', () => {
  // The contract, parsed from every migration rather than restated here, so the
  // two cannot drift apart unnoticed.
  const allMigrations = readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith('.sql') && !f.includes('.rollback.'))
    .map((f) => read(f))
    .join('\n');

  const policyRe =
    /create policy\s+\w+\s+on\s+(\w+)\s*\n\s*for\s+(select|insert|update|delete)\s+to\s+authenticated/gim;

  const contract = new Map<string, Set<string>>();
  for (const m of allMigrations.matchAll(policyRe)) {
    const table = m[1].toLowerCase();
    if (!(TABLES as readonly string[]).includes(table)) continue;
    if (!contract.has(table)) contract.set(table, new Set());
    contract.get(table)!.add(m[2].toLowerCase());
  }

  assert.equal(contract.size, TABLES.length, `parsed policies for ${contract.size} tables`);

  for (const table of TABLES) {
    const policyOps = [...contract.get(table)!].sort();
    const granted = grants.find((g) => g.table === `public.${table}`)!.privileges;
    assert.deepEqual(
      granted,
      policyOps,
      `grants on ${table} (${granted.join(', ')}) must exactly match its RLS policy ` +
        `operations (${policyOps.join(', ')}) - no more, no less`,
    );
  }
});

test('DELETE is granted only where a DELETE policy exists', () => {
  // 042 granted no DELETE at all; 043 grants it twice. Asserted directly so the
  // difference reads as the rule rather than an oversight.
  const withDelete = grants
    .filter((g) => g.privileges.includes('delete'))
    .map((g) => g.table)
    .sort();

  assert.deepEqual(withDelete, ['public.business_service_areas', 'public.estimate_line_items']);
});

test('the rollback revokes exactly what 043 granted, and nothing more', () => {
  const revokes = parseGrants(rollbackCode, 'revoke');
  assert.equal(revokes.length, grants.length, 'one revoke per grant');

  for (const grant of grants) {
    const revoke = revokes.find((r) => r.table === grant.table);
    assert.ok(revoke, `rollback is missing a revoke for ${grant.table}`);
    assert.deepEqual(revoke!.privileges, grant.privileges);
    assert.deepEqual(revoke!.roles, ['authenticated']);
  }

  for (const forbidden of [
    /revoke\s+all/i,
    /on\s+all\s+tables/i,
    /\bservice_role\b/i,
    /\banon\b/i,
  ]) {
    assert.ok(!forbidden.test(rollbackCode), `rollback must not contain ${forbidden}`);
  }
  // 042's grants must survive a 043 rollback.
  for (const table of ['contacts', 'tasks', 'notes', 'audit_log']) {
    assert.ok(
      !new RegExp(`public\\.${table}\\b`).test(rollbackCode),
      `rollback must not touch ${table} - that is migration 042's grant`,
    );
  }
});
