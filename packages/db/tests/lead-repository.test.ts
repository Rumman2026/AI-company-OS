import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createContactId,
  type LeadAttribution,
  type ProposedAuditRecord,
} from '@ai-company-os/core-models';
import { createSupabaseLeadRepository } from '../src/lead-repository';
import type { AuditLogRepository } from '../src/audit-log-repository';
import type { MinimalSupabaseClient } from '../src/supabase-client';

interface FakeLeadRow {
  id: string;
  contact_id: string;
  status: string;
  attribution: LeadAttribution;
  duplicate_of_lead_id: string | null;
  created_at: string;
}

const fixtureAttribution: LeadAttribution = {
  channel: 'direct',
  leadCreatedAt: '2026-01-01T00:00:00.000Z',
};

function createFakeAuditLog() {
  const records: ProposedAuditRecord[] = [];
  const auditLog: AuditLogRepository = {
    async writeAuditRecord(record) {
      records.push(record);
      return { ok: true };
    },
  };
  return { auditLog, records };
}

function createFakeClient(seed: FakeLeadRow[] = []) {
  const rows = [...seed];
  let nextId = 1;
  const updateCalls: Array<{ id: string; status: string }> = [];

  const client = {
    from(table: string) {
      assert.equal(table, 'leads');
      return {
        select() {
          return {
            eq(_col: string, value: string) {
              return {
                async single() {
                  const match = rows.find((r) => r.id === value);
                  return { data: match ?? null, error: match ? null : { message: 'not found' } };
                },
              };
            },
          };
        },
        insert(values: Partial<FakeLeadRow>) {
          return {
            select() {
              return {
                async single() {
                  const row: FakeLeadRow = {
                    id: String(nextId++),
                    contact_id: values.contact_id as string,
                    status: (values.status as string) ?? 'new',
                    attribution: values.attribution as LeadAttribution,
                    duplicate_of_lead_id: null,
                    created_at: '2026-01-01T00:00:00.000Z',
                  };
                  rows.push(row);
                  return { data: row, error: null };
                },
              };
            },
          };
        },
        update(values: { status: string }) {
          return {
            async eq(_col: string, value: string) {
              updateCalls.push({ id: value, status: values.status });
              const row = rows.find((r) => r.id === value);
              if (row) row.status = values.status;
              return { error: null };
            },
          };
        },
      };
    },
  };

  return { client: client as unknown as MinimalSupabaseClient, rows, updateCalls };
}

test('createLead inserts a new lead at status "new"', async () => {
  const { client } = createFakeClient();
  const { auditLog } = createFakeAuditLog();
  const repo = createSupabaseLeadRepository(client, auditLog);

  const result = await repo.createLead(createContactId('contact-1'), fixtureAttribution);

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.lead.status, 'new');
    assert.equal(result.lead.contactId, 'contact-1');
  }
});

test('a valid transition persists the new status and writes exactly one audit record', async () => {
  const { client, updateCalls } = createFakeClient([
    {
      id: 'lead-1',
      contact_id: 'contact-1',
      status: 'new',
      attribution: fixtureAttribution,
      duplicate_of_lead_id: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]);
  const { auditLog, records } = createFakeAuditLog();
  const repo = createSupabaseLeadRepository(client, auditLog);

  const result = await repo.transitionLeadStatus('lead-1', 'contact-attempted', {
    actorCategory: 'dispatcher',
    actorId: 'test-actor',
    occurredAt: '2026-01-02T00:00:00.000Z',
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.result.outcome, 'success');
  }
  assert.equal(updateCalls.length, 1);
  assert.equal(updateCalls[0].status, 'contact-attempted');
  assert.equal(records.length, 1);
  assert.equal(records[0].action, 'status-change');
  assert.equal(records[0].newValue, 'contact-attempted');
});

test('an illegal transition is rejected and never reaches the database update', async () => {
  const { client, updateCalls } = createFakeClient([
    {
      id: 'lead-1',
      contact_id: 'contact-1',
      status: 'new',
      attribution: fixtureAttribution,
      duplicate_of_lead_id: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]);
  const { auditLog, records } = createFakeAuditLog();
  const repo = createSupabaseLeadRepository(client, auditLog);

  const result = await repo.transitionLeadStatus('lead-1', 'booked', {
    actorCategory: 'owner-admin',
    actorId: 'test-actor',
    occurredAt: '2026-01-02T00:00:00.000Z',
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.result.outcome, 'rejected');
    if (result.result.outcome === 'rejected') {
      assert.equal(result.result.errorCode, 'illegal-transition');
    }
  }
  assert.equal(updateCalls.length, 0, 'an illegal transition must never call update');
  assert.equal(records.length, 0, 'an illegal transition must never write an audit record');
});

test('an unauthorized actor is rejected and never reaches the database update', async () => {
  const { client, updateCalls } = createFakeClient([
    {
      id: 'lead-1',
      contact_id: 'contact-1',
      status: 'contacted',
      attribution: fixtureAttribution,
      duplicate_of_lead_id: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]);
  const { auditLog, records } = createFakeAuditLog();
  const repo = createSupabaseLeadRepository(client, auditLog);

  const result = await repo.transitionLeadStatus('lead-1', 'qualified', {
    actorCategory: 'technician',
    actorId: 'test-actor',
    occurredAt: '2026-01-02T00:00:00.000Z',
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.result.outcome, 'rejected');
    if (result.result.outcome === 'rejected') {
      assert.equal(result.result.errorCode, 'unauthorized-actor');
    }
  }
  assert.equal(updateCalls.length, 0);
  assert.equal(records.length, 0);
});

test('a non-existent lead id is reported as a typed error', async () => {
  const { client } = createFakeClient([]);
  const { auditLog } = createFakeAuditLog();
  const repo = createSupabaseLeadRepository(client, auditLog);

  const result = await repo.transitionLeadStatus('missing-lead', 'contacted', {
    actorCategory: 'dispatcher',
    actorId: 'test-actor',
    occurredAt: '2026-01-02T00:00:00.000Z',
  });

  assert.equal(result.ok, false);
});
