/**
 * Static assertions over
 * packages/db/migrations/042-restore-crm-authenticated-grants.sql.
 *
 * The load-bearing test here is the last one: it PARSES the tenant-scoped RLS
 * policies out of migrations 002, 005 and 006 and proves that 042's grant set
 * is exactly the set of operations those policies already define, per table.
 * That is 042's entire selection rule, and it is the one property that a
 * future "just add delete while we're in here" edit would break silently. The
 * rest of this file pins the individual prohibitions.
 *
 * No database, no credentials, no network - runs in `pnpm test` everywhere.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS = join(__dirname, '..', 'migrations');
const read = (f: string) => readFileSync(join(MIGRATIONS, f), 'utf-8');

const sql = read('042-restore-crm-authenticated-grants.sql');
const rollbackSql = read('042-restore-crm-authenticated-grants.rollback.sql');

/** Comment lines are prose and legitimately discuss what is NOT granted. */
const stripComments = (text: string) =>
  text
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n');

const code = stripComments(sql);
const rollbackCode = stripComments(rollbackSql);

const TABLES = ['contacts', 'tasks', 'notes', 'audit_log'] as const;
type Table = (typeof TABLES)[number];

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

test('grants exactly four statements, one per affected table', () => {
  assert.equal(grants.length, 4, `expected 4 grant statements, found ${grants.length}`);
  assert.deepEqual(grants.map((g) => g.table).sort(), TABLES.map((t) => `public.${t}`).sort());
});

test('touches no table outside contacts/tasks/notes/audit_log', () => {
  const allowed = new Set<string>(TABLES.map((t) => `public.${t}`));
  for (const g of grants) {
    assert.ok(allowed.has(g.table), `unexpected table in migration 042: ${g.table}`);
  }
  // Nothing else in the file may name another relation either.
  for (const other of [
    'leads',
    'jobs',
    'estimates',
    'invoices',
    'bookings',
    'payments',
    'memberships',
    'businesses',
  ]) {
    assert.ok(
      !new RegExp(`\\bpublic\\.${other}\\b`).test(code),
      `migration 042 must not reference public.${other}`,
    );
  }
});

test('grants only to authenticated - never anon, service_role, postgres or PUBLIC', () => {
  for (const g of grants) {
    assert.deepEqual(g.roles, ['authenticated'], `unexpected grantee(s): ${g.roles.join(', ')}`);
  }
  for (const role of ['anon', 'service_role', 'postgres']) {
    assert.ok(
      !new RegExp(`\\bto\\s+[\\w\\s,]*\\b${role}\\b`, 'i').test(code),
      `migration 042 must never grant to ${role}`,
    );
  }
  assert.ok(!/\bto\s+public\b/i.test(code), 'migration 042 must never grant to PUBLIC');
});

test('never grants DELETE, TRUNCATE, REFERENCES, TRIGGER or ALL PRIVILEGES', () => {
  for (const g of grants) {
    for (const forbidden of [
      'delete',
      'truncate',
      'references',
      'trigger',
      'all',
      'all privileges',
    ]) {
      assert.ok(
        !g.privileges.includes(forbidden),
        `migration 042 must not grant ${forbidden.toUpperCase()} (on ${g.table})`,
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
    /\brevoke\b/i,
    /\bdrop\b/i,
    /\bdelete\s+from\b/i,
    /\binsert\s+into\b/i,
    /\bupdate\s+public\./i,
  ]) {
    assert.ok(!forbidden.test(code), `migration 042 must not contain ${forbidden}`);
  }
});

test('is wrapped in a single transaction', () => {
  assert.match(code, /^begin;$/m);
  assert.match(code, /^commit;$/m);
});

test('grants exactly the operations the existing RLS policies already define', () => {
  // The policy contract, parsed from the migrations that created it - not
  // restated here by hand, so the two cannot drift apart unnoticed.
  const policySources = [
    read('002-multi-tenant-foundation.sql'),
    read('005-note-foundation.sql'),
    read('006-task-foundation.sql'),
  ].join('\n');

  const policyRe =
    /create policy\s+\w+\s+on\s+(\w+)\s*\n\s*for\s+(select|insert|update|delete)\s+to\s+authenticated/gim;

  const contract = new Map<string, Set<string>>();
  for (const m of policySources.matchAll(policyRe)) {
    const table = m[1].toLowerCase();
    if (!TABLES.includes(table as Table)) continue;
    if (!contract.has(table)) contract.set(table, new Set());
    contract.get(table)!.add(m[2].toLowerCase());
  }

  // Sanity-check the parser itself before trusting its verdict.
  assert.equal(contract.size, 4, `expected policies for 4 tables, parsed ${contract.size}`);

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

  // The specific shapes those policies imply, asserted directly so a parser
  // regression cannot quietly turn this test into a tautology.
  assert.deepEqual([...contract.get('contacts')!].sort(), ['insert', 'select', 'update']);
  assert.deepEqual([...contract.get('tasks')!].sort(), ['insert', 'select', 'update']);
  assert.deepEqual([...contract.get('notes')!].sort(), ['insert', 'select']);
  assert.deepEqual([...contract.get('audit_log')!].sort(), ['select']);
});

test('audit_log gets SELECT only - the append-only trail stays unwritable', () => {
  const auditGrant = grants.find((g) => g.table === 'public.audit_log')!;
  assert.deepEqual(auditGrant.privileges, ['select']);
});

test('the rollback revokes exactly what 042 granted, and nothing more', () => {
  const revokes = parseGrants(rollbackCode, 'revoke');
  assert.equal(revokes.length, grants.length, 'one revoke per grant');

  for (const g of grants) {
    const r = revokes.find((x) => x.table === g.table);
    assert.ok(r, `rollback is missing a revoke for ${g.table}`);
    assert.deepEqual(
      r!.privileges,
      g.privileges,
      `rollback for ${g.table} must revoke exactly the granted privileges`,
    );
    assert.deepEqual(r!.roles, ['authenticated']);
  }

  for (const forbidden of [
    /revoke\s+all/i,
    /on\s+all\s+tables/i,
    /\bservice_role\b/i,
    /\banon\b/i,
  ]) {
    assert.ok(!forbidden.test(rollbackCode), `rollback must not contain ${forbidden}`);
  }
  for (const forbidden of [/create\s+policy/i, /drop\s+policy/i, /alter\s+table/i, /\bgrant\b/i]) {
    assert.ok(!forbidden.test(rollbackCode), `rollback must not contain ${forbidden}`);
  }
});
