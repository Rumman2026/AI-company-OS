/**
 * Static assertions over packages/db/migrations/044-crm-audit-writer.sql.
 *
 * These are forgery assertions, not style assertions. `audit_log` is an
 * append-only compliance trail, and 044's entire justification for being a
 * SECURITY DEFINER function rather than an INSERT policy is that a policy
 * cannot stop a caller from lying about WHO acted, in WHAT role, and WHEN.
 * Each test below pins one of those defences, so that a later edit which
 * "simplifies" the function by accepting an actor parameter fails here rather
 * than in production, silently, months later.
 *
 * No database, no credentials, no network.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS = join(__dirname, '..', 'migrations');
const read = (f: string) => readFileSync(join(MIGRATIONS, f), 'utf-8');

const sql = read('044-crm-audit-writer.sql');
const rollbackSql = read('044-crm-audit-writer.rollback.sql');

/** Comment lines are prose and legitimately discuss the attacks being blocked. */
const stripComments = (text: string) =>
  text
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n');

const code = stripComments(sql);
const rollbackCode = stripComments(rollbackSql);

test('the caller cannot name the actor - actor_id is not a parameter', () => {
  // The single most important property. If this ever becomes a parameter, any
  // authenticated user can attribute their action to somebody else.
  assert.ok(!/p_actor_id/i.test(code), 'actor_id must never be a parameter');
  // The chain that makes it unforgeable, asserted link by link: the only
  // assignment to v_uid is auth.uid(), and the actor_id column is written from
  // v_uid. Neither half is enough on its own.
  assert.match(code, /v_uid\s*:=\s*auth\.uid\(\);/);
  assert.equal([...code.matchAll(/v_uid\s*:=/g)].length, 1, 'v_uid must be assigned exactly once');
  assert.match(code, /actor_category, actor_id, automated[\s\S]{0,200}v_uid::pg_catalog\.text/);
});

test('the caller cannot choose when it happened - occurred_at is not a parameter', () => {
  assert.ok(!/p_occurred_at/i.test(code), 'occurred_at must never be a parameter');
  assert.match(code, /pg_catalog\.now\(\)/);
});

test('the claimed role is verified against roles the caller actually holds', () => {
  // Checked across BOTH tables: migration 007 added membership_roles for
  // multi-role staff while memberships.role stayed as the primary role.
  assert.match(code, /m\.role\s*=\s*p_actor_category/);
  assert.match(code, /r\.role\s*=\s*p_actor_category/);
  assert.match(code, /public\.membership_roles/);
});

test('an interactive caller cannot claim to be an automated actor', () => {
  assert.match(code, /if coalesce\(p_automated, false\) then/);
  assert.match(
    code,
    /raise exception 'crm_audit: an interactive caller may not record an automated actor'/,
  );
  // Rejected, not silently rewritten - the insert always writes a false literal.
  assert.match(code, /p_actor_category,\s*v_uid::pg_catalog\.text,\s*false/);
});

test('writing into another tenant is refused', () => {
  assert.match(code, /from public\.memberships[\s\S]{0,120}business_id = p_business_id/);
  assert.match(code, /caller holds no membership in this business/);
});

test('every refusal is a permission error, not a silent no-op', () => {
  // A function that returned null on refusal would recreate the exact defect
  // 044 exists to fix: a write that fails without anyone noticing.
  const raises = [...code.matchAll(/raise exception/g)];
  assert.ok(raises.length >= 6, `expected several explicit refusals, found ${raises.length}`);
  assert.ok(!/return null/i.test(code), 'a refusal must raise, never return null');
});

test('is SECURITY DEFINER with an empty search_path and no dynamic SQL', () => {
  assert.match(code, /security definer/i);
  assert.match(code, /set search_path = ''/);
  assert.ok(
    !/\bexecute\s+(format|'|")/i.test(code),
    'no dynamic SQL may exist in a definer function',
  );
});

test('grants EXECUTE to authenticated only, and never a table privilege', () => {
  assert.match(
    code,
    /revoke all on function public\.crm_write_audit_record\([\s\S]{0,120}\) from public;/,
  );
  assert.match(
    code,
    /revoke all on function public\.crm_write_audit_record\([\s\S]{0,120}\) from anon;/,
  );
  assert.match(
    code,
    /grant execute on function public\.crm_write_audit_record\([\s\S]{0,120}\) to authenticated;/,
  );

  // The whole point: audit_log stays closed at the privilege layer, so this
  // function remains the only way in.
  assert.ok(
    !/grant[\s\S]{0,80}on public\.audit_log/i.test(code),
    '044 must never grant a table privilege on audit_log',
  );
  assert.ok(!/\bto\s+service_role\b/i.test(code), '044 must not grant to service_role');
  assert.ok(!/\bto\s+anon\b/i.test(code), '044 must not grant to anon');
});

test('creates, alters or drops no policy, and changes no table', () => {
  for (const forbidden of [
    /create\s+policy/i,
    /drop\s+policy/i,
    /alter\s+policy/i,
    /alter\s+table/i,
    /create\s+table/i,
    /disable\s+row\s+level\s+security/i,
    /\bdelete\s+from\b/i,
    /\bupdate\s+public\./i,
  ]) {
    assert.ok(!forbidden.test(code), `044 must not contain ${forbidden}`);
  }
});

test('is append-only - it inserts into audit_log and nothing else', () => {
  const inserts = [...code.matchAll(/insert into (\S+)/gi)].map((m) => m[1]);
  assert.deepEqual(inserts, ['public.audit_log']);
});

test('is wrapped in a single transaction', () => {
  assert.match(code, /^begin;$/m);
  assert.match(code, /^commit;$/m);
});

test('the rollback drops exactly that function and nothing else', () => {
  assert.match(rollbackCode, /drop function if exists public\.crm_write_audit_record\(/);
  const drops = [...rollbackCode.matchAll(/\bdrop\b\s+(\w+)/gi)].map((m) => m[1].toLowerCase());
  assert.deepEqual(drops, ['function']);
  for (const forbidden of [/drop\s+table/i, /revoke/i, /drop\s+policy/i, /truncate/i]) {
    assert.ok(!forbidden.test(rollbackCode), `rollback must not contain ${forbidden}`);
  }
});
