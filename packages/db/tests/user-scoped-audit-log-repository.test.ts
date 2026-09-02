/**
 * The user-scoped audit writer: the path the admin console takes.
 *
 * These cover what the SQL abuse tests cannot - that the CLIENT sends the right
 * thing. packages/db/tests/sql/044-audit-writer-abuse.sql proves the database
 * refuses a forged actor; these prove the application never even offers one,
 * and that a refusal reaches the caller instead of being dropped.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ProposedAuditRecord } from '@ai-company-os/core-models';
import {
  createUserScopedAuditLogRepository,
  type AuditLogRpcClient,
} from '../src/audit-log-repository';

const fixtureRecord: ProposedAuditRecord = {
  entityType: 'Lead',
  entityId: 'lead-1',
  action: 'status-change',
  previousValue: 'new',
  newValue: 'contact-attempted',
  actorCategory: 'dispatcher',
  actorId: 'actor-1',
  automated: false,
  occurredAt: '2026-01-01T00:00:00.000Z',
};

interface RecordedCall {
  name: string;
  args: Record<string, unknown>;
}

function fakeRpcClient(error: { message: string } | null = null) {
  const calls: RecordedCall[] = [];
  const client = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      return { data: error ? null : 'audit-1', error };
    },
    from: () => {
      throw new Error('the user-scoped writer must not touch audit_log directly');
    },
  } as unknown as AuditLogRpcClient;
  return { client, calls };
}

test('writes through the SECURITY DEFINER function, never a direct insert', async () => {
  const { client, calls } = fakeRpcClient();

  const result = await createUserScopedAuditLogRepository(client).writeAuditRecord(
    'business-a',
    fixtureRecord,
  );

  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, 'crm_write_audit_record');
  // `from` throws in the fake, so reaching here at all proves no table write.
});

test('never transmits an actor or a timestamp the database would have to trust', async () => {
  // The strong property. The database ignores these fields regardless, but
  // sending them would tell a future reader they are honoured, and would make
  // reintroducing a p_actor_id parameter look like a small, safe change.
  const { client, calls } = fakeRpcClient();

  await createUserScopedAuditLogRepository(client).writeAuditRecord('business-a', fixtureRecord);

  const args = calls[0].args;
  for (const forbidden of ['p_actor_id', 'p_occurred_at', 'actor_id', 'occurred_at']) {
    assert.ok(!(forbidden in args), `${forbidden} must never be sent to the audit writer`);
  }
  assert.ok(
    !Object.values(args).includes('actor-1'),
    "the record's actorId must not be smuggled through another parameter",
  );
  assert.ok(
    !Object.values(args).includes('2026-01-01T00:00:00.000Z'),
    "the record's occurredAt must not be smuggled through another parameter",
  );
});

test('sends exactly the ten parameters the function declares', async () => {
  const { client, calls } = fakeRpcClient();

  await createUserScopedAuditLogRepository(client).writeAuditRecord('business-a', fixtureRecord);

  assert.deepEqual(Object.keys(calls[0].args).sort(), [
    'p_action',
    'p_actor_category',
    'p_automated',
    'p_business_id',
    'p_correlation_id',
    'p_entity_id',
    'p_entity_type',
    'p_new_value',
    'p_previous_value',
    'p_reason',
  ]);
  assert.equal(calls[0].args.p_business_id, 'business-a');
  assert.equal(calls[0].args.p_actor_category, 'dispatcher');
});

test('a refused write is reported, not swallowed', async () => {
  // The defect this whole migration exists to end: for months every one of
  // these returned a failure that nobody looked at.
  const { client } = fakeRpcClient({ message: 'crm_audit: caller holds no membership' });

  const result = await createUserScopedAuditLogRepository(client).writeAuditRecord(
    'business-a',
    fixtureRecord,
  );

  assert.equal(result.ok, false);
  assert.match(
    (result as { ok: false; error: string }).error,
    /caller holds no membership/,
    "the database's reason must survive to the caller",
  );
});

test('a transition whose audit write fails does NOT report success', async () => {
  // This is the defect, reproduced at the layer it actually bit: for months a
  // lead moved status, the audit write was refused with 42501, and the caller
  // was told `ok: true`. The state change is already committed by this point,
  // so surfacing a failure is the safe direction - a retry is rejected by the
  // state machine as already-in-state rather than double-applied.
  const { createSupabaseLeadRepository } = await import('../src/lead-repository');
  const { createFakeSupabaseClient } = await import('./fake-supabase');

  const leads = {
    rows: [
      {
        id: 'lead-1',
        business_id: 'business-a',
        contact_id: 'contact-1',
        status: 'new',
        attribution: { channel: 'unknown', leadCreatedAt: '2026-01-01T00:00:00.000Z' },
        duplicate_of_lead_id: null,
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ],
    nextId: 1,
  };

  const refusingAuditLog = {
    async writeAuditRecord() {
      return { ok: false as const, error: 'crm_audit: caller holds no membership' };
    },
    async listAuditRecords() {
      return { ok: true as const, records: [] };
    },
  };

  const repo = createSupabaseLeadRepository(createFakeSupabaseClient({ leads }), refusingAuditLog);

  const result = await repo.transitionLeadStatus('business-a', 'lead-1', 'contact-attempted', {
    actorCategory: 'dispatcher',
    actorId: 'test-actor',
    occurredAt: '2026-01-02T00:00:00.000Z',
  });

  assert.equal(result.ok, false, 'an unaudited transition must not report success');
  assert.match((result as { ok: false; error: string }).error, /^audit_write_failed: /);
  assert.match((result as { ok: false; error: string }).error, /caller holds no membership/);
});
