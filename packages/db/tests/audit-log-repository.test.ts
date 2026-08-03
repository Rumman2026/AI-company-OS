import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ProposedAuditRecord } from '@ai-company-os/core-models';
import { createSupabaseAuditLogRepository } from '../src/audit-log-repository';
import { createFakeSupabaseClient, type FakeTable } from './fake-supabase';

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

test('writes exactly the fields the ProposedAuditRecord provides, scoped to the business', async () => {
  const auditLog: FakeTable = { rows: [], nextId: 1 };
  const client = createFakeSupabaseClient({ audit_log: auditLog });
  const repo = createSupabaseAuditLogRepository(client);

  const result = await repo.writeAuditRecord('business-a', fixtureRecord);

  assert.equal(result.ok, true);
  assert.equal(auditLog.rows.length, 1);
  const row = auditLog.rows[0];
  assert.equal(row.business_id, 'business-a');
  assert.equal(row.entity_type, 'Lead');
  assert.equal(row.entity_id, 'lead-1');
  assert.equal(row.action, 'status-change');
  assert.equal(row.previous_value, 'new');
  assert.equal(row.new_value, 'contact-attempted');
  assert.equal(row.actor_category, 'dispatcher');
  assert.equal(row.actor_id, 'actor-1');
  assert.equal(row.automated, false);
  assert.equal(row.occurred_at, '2026-01-01T00:00:00.000Z');
  assert.equal(row.reason, null);
  assert.equal(row.correlation_id, null);
});
