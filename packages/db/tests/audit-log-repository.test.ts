import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ProposedAuditRecord } from '@ai-company-os/core-models';
import { createSupabaseAuditLogRepository } from '../src/audit-log-repository';
import type { MinimalSupabaseClient } from '../src/supabase-client';

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

test('writes exactly the fields the ProposedAuditRecord provides', async () => {
  const inserted: unknown[] = [];
  const client = {
    from(table: string) {
      assert.equal(table, 'audit_log');
      return {
        async insert(values: unknown) {
          inserted.push(values);
          return { error: null };
        },
      };
    },
  } as unknown as MinimalSupabaseClient;

  const repo = createSupabaseAuditLogRepository(client);
  const result = await repo.writeAuditRecord(fixtureRecord);

  assert.equal(result.ok, true);
  assert.equal(inserted.length, 1);
  assert.deepEqual(inserted[0], {
    entity_type: 'Lead',
    entity_id: 'lead-1',
    action: 'status-change',
    previous_value: 'new',
    new_value: 'contact-attempted',
    actor_category: 'dispatcher',
    actor_id: 'actor-1',
    automated: false,
    occurred_at: '2026-01-01T00:00:00.000Z',
    reason: null,
    correlation_id: null,
  });
});

test('reports a database error as a typed failure rather than throwing', async () => {
  const client = {
    from() {
      return {
        async insert() {
          return { error: { message: 'insert rejected' } };
        },
      };
    },
  } as unknown as MinimalSupabaseClient;

  const repo = createSupabaseAuditLogRepository(client);
  const result = await repo.writeAuditRecord(fixtureRecord);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error, 'insert rejected');
  }
});
