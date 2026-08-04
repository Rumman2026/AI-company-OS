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

test("listAuditRecords returns only the calling business's records, most recent first, optionally filtered to one entity", async () => {
  const auditLog: FakeTable = {
    rows: [
      {
        id: 'audit-1',
        business_id: 'business-a',
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
      },
      {
        id: 'audit-2',
        business_id: 'business-a',
        entity_type: 'Job',
        entity_id: 'job-1',
        action: 'status-change',
        previous_value: 'draft',
        new_value: 'scheduled',
        actor_category: 'office-manager',
        actor_id: 'actor-2',
        automated: false,
        occurred_at: '2026-01-02T00:00:00.000Z',
        reason: null,
        correlation_id: null,
      },
      {
        id: 'audit-3',
        business_id: 'business-b',
        entity_type: 'Lead',
        entity_id: 'lead-9',
        action: 'status-change',
        previous_value: 'new',
        new_value: 'contact-attempted',
        actor_category: 'dispatcher',
        actor_id: 'actor-3',
        automated: false,
        occurred_at: '2026-01-03T00:00:00.000Z',
        reason: null,
        correlation_id: null,
      },
    ],
    nextId: 4,
  };
  const client = createFakeSupabaseClient({ audit_log: auditLog });
  const repo = createSupabaseAuditLogRepository(client);

  const all = await repo.listAuditRecords('business-a');
  assert.equal(all.ok, true);
  if (all.ok) {
    assert.equal(all.records.length, 2, "must never include another business's record");
  }

  const filtered = await repo.listAuditRecords('business-a', {
    entityType: 'Job',
    entityId: 'job-1',
  });
  assert.equal(filtered.ok, true);
  if (filtered.ok) {
    assert.equal(filtered.records.length, 1);
    assert.equal(filtered.records[0].entityId, 'job-1');
  }
});
