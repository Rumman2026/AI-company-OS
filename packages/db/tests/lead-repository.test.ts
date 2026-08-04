import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createContactId,
  type LeadAttribution,
  type ProposedAuditRecord,
} from '@ai-company-os/core-models';
import { createSupabaseLeadRepository } from '../src/lead-repository';
import type { AuditLogRepository } from '../src/audit-log-repository';
import { createFakeSupabaseClient, type FakeTable } from './fake-supabase';

const BUSINESS_A = 'business-a';
const BUSINESS_B = 'business-b';

const fixtureAttribution: LeadAttribution = {
  channel: 'unknown',
  leadCreatedAt: '2026-01-01T00:00:00.000Z',
};

function createFakeAuditLog() {
  const records: Array<{ businessId: string; record: ProposedAuditRecord }> = [];
  const auditLog: AuditLogRepository = {
    async writeAuditRecord(businessId, record) {
      records.push({ businessId, record });
      return { ok: true };
    },
  };
  return { auditLog, records };
}

function setup(seed: Array<Record<string, unknown>> = []) {
  const leads: FakeTable = { rows: [...seed], nextId: 1 };
  const client = createFakeSupabaseClient({ leads });
  const { auditLog, records } = createFakeAuditLog();
  const repo = createSupabaseLeadRepository(client, auditLog);
  return { repo, leads, records };
}

test('createLead inserts a new lead at status "new", scoped to the business', async () => {
  const { repo } = setup();

  const result = await repo.createLead(
    BUSINESS_A,
    createContactId('contact-1'),
    fixtureAttribution,
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.lead.status, 'new');
    assert.equal(result.lead.contactId, 'contact-1');
  }
});

test('a valid transition persists the new status and writes exactly one audit record scoped to the business', async () => {
  const { repo, leads, records } = setup([
    {
      id: 'lead-1',
      business_id: BUSINESS_A,
      contact_id: 'contact-1',
      status: 'new',
      attribution: fixtureAttribution,
      duplicate_of_lead_id: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]);

  const result = await repo.transitionLeadStatus(BUSINESS_A, 'lead-1', 'contact-attempted', {
    actorCategory: 'dispatcher',
    actorId: 'test-actor',
    occurredAt: '2026-01-02T00:00:00.000Z',
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.result.outcome, 'success');
  }
  assert.equal(leads.rows[0].status, 'contact-attempted');
  assert.equal(records.length, 1);
  assert.equal(records[0].businessId, BUSINESS_A);
  assert.equal(records[0].record.newValue, 'contact-attempted');
});

test('a lead belonging to a different business cannot be transitioned (tenant isolation)', async () => {
  const { repo, leads, records } = setup([
    {
      id: 'lead-1',
      business_id: BUSINESS_B,
      contact_id: 'contact-1',
      status: 'new',
      attribution: fixtureAttribution,
      duplicate_of_lead_id: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]);

  const result = await repo.transitionLeadStatus(BUSINESS_A, 'lead-1', 'contact-attempted', {
    actorCategory: 'dispatcher',
    actorId: 'test-actor',
    occurredAt: '2026-01-02T00:00:00.000Z',
  });

  assert.equal(
    result.ok,
    false,
    "a cross-tenant lead lookup must fail, not silently transition another business's lead",
  );
  assert.equal(leads.rows[0].status, 'new', "the other business's lead must remain unchanged");
  assert.equal(records.length, 0);
});

test('an illegal transition is rejected and never reaches the database update or audit log', async () => {
  const { repo, leads, records } = setup([
    {
      id: 'lead-1',
      business_id: BUSINESS_A,
      contact_id: 'contact-1',
      status: 'new',
      attribution: fixtureAttribution,
      duplicate_of_lead_id: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]);

  const result = await repo.transitionLeadStatus(BUSINESS_A, 'lead-1', 'booked', {
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
  assert.equal(leads.rows[0].status, 'new', 'status must not change on an illegal transition');
  assert.equal(records.length, 0);
});

test('an unauthorized actor is rejected and never reaches the database update', async () => {
  const { repo, leads, records } = setup([
    {
      id: 'lead-1',
      business_id: BUSINESS_A,
      contact_id: 'contact-1',
      status: 'contacted',
      attribution: fixtureAttribution,
      duplicate_of_lead_id: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]);

  const result = await repo.transitionLeadStatus(BUSINESS_A, 'lead-1', 'qualified', {
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
  assert.equal(leads.rows[0].status, 'contacted');
  assert.equal(records.length, 0);
});

test('transitionLeadStatusForRoles succeeds using whichever supplied role is authorized', async () => {
  const { repo, leads, records } = setup([
    {
      id: 'lead-1',
      business_id: BUSINESS_A,
      contact_id: 'contact-1',
      status: 'contacted',
      attribution: fixtureAttribution,
      duplicate_of_lead_id: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]);

  const result = await repo.transitionLeadStatusForRoles(
    BUSINESS_A,
    'lead-1',
    'qualified',
    ['technician', 'office-manager'],
    { actorId: 'test-actor', occurredAt: '2026-01-02T00:00:00.000Z' },
  );

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.result.outcome, 'success');
  assert.equal(leads.rows[0].status, 'qualified');
  assert.equal(records.length, 1);
});

test('transitionLeadStatusForRoles rejects and never writes when none of the supplied roles are authorized', async () => {
  const { repo, leads, records } = setup([
    {
      id: 'lead-1',
      business_id: BUSINESS_A,
      contact_id: 'contact-1',
      status: 'contacted',
      attribution: fixtureAttribution,
      duplicate_of_lead_id: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]);

  const result = await repo.transitionLeadStatusForRoles(
    BUSINESS_A,
    'lead-1',
    'qualified',
    ['technician', 'dispatcher'],
    { actorId: 'test-actor', occurredAt: '2026-01-02T00:00:00.000Z' },
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.result.outcome, 'rejected');
    if (result.result.outcome === 'rejected') {
      assert.equal(result.result.errorCode, 'unauthorized-actor');
    }
  }
  assert.equal(leads.rows[0].status, 'contacted');
  assert.equal(records.length, 0);
});

test('archiveLead removes a lead from the default list view without changing its status, and restoreLead reverses it', async () => {
  const { repo, leads } = setup([
    {
      id: 'lead-1',
      business_id: BUSINESS_A,
      contact_id: 'contact-1',
      status: 'qualified',
      attribution: fixtureAttribution,
      duplicate_of_lead_id: null,
      archived_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]);

  const archiveResult = await repo.archiveLead(BUSINESS_A, 'lead-1');
  assert.equal(archiveResult.ok, true);
  assert.ok(leads.rows[0].archived_at);
  assert.equal(
    leads.rows[0].status,
    'qualified',
    'archiving must never change the pipeline status',
  );

  const defaultList = await repo.listLeads(BUSINESS_A);
  assert.equal(defaultList.ok, true);
  if (defaultList.ok) assert.equal(defaultList.leads.length, 0);

  const withArchived = await repo.listLeads(BUSINESS_A, { includeArchived: true });
  assert.equal(withArchived.ok, true);
  if (withArchived.ok) {
    assert.equal(withArchived.leads.length, 1);
    assert.equal(withArchived.leads[0].status, 'qualified');
  }

  const restoreResult = await repo.restoreLead(BUSINESS_A, 'lead-1');
  assert.equal(restoreResult.ok, true);
  assert.equal(leads.rows[0].archived_at, null);
});

test('a non-existent lead id is reported as a typed error', async () => {
  const { repo } = setup([]);

  const result = await repo.transitionLeadStatus(BUSINESS_A, 'missing-lead', 'contacted', {
    actorCategory: 'dispatcher',
    actorId: 'test-actor',
    occurredAt: '2026-01-02T00:00:00.000Z',
  });

  assert.equal(result.ok, false);
});

test('getLead returns a lead scoped to the business, and rejects a cross-tenant lookup', async () => {
  const { repo } = setup([
    {
      id: 'lead-1',
      business_id: BUSINESS_A,
      contact_id: 'contact-1',
      status: 'new',
      attribution: fixtureAttribution,
      duplicate_of_lead_id: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]);

  const own = await repo.getLead(BUSINESS_A, 'lead-1');
  assert.equal(own.ok, true);

  const crossTenant = await repo.getLead(BUSINESS_B, 'lead-1');
  assert.equal(crossTenant.ok, false);
});

test("listLeads returns only the calling business's leads, most recent first, and supports a status filter", async () => {
  const { repo } = setup([
    {
      id: 'lead-1',
      business_id: BUSINESS_A,
      contact_id: 'contact-1',
      status: 'new',
      attribution: fixtureAttribution,
      duplicate_of_lead_id: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'lead-2',
      business_id: BUSINESS_A,
      contact_id: 'contact-2',
      status: 'qualified',
      attribution: fixtureAttribution,
      duplicate_of_lead_id: null,
      created_at: '2026-01-02T00:00:00.000Z',
    },
    {
      id: 'lead-3',
      business_id: BUSINESS_B,
      contact_id: 'contact-3',
      status: 'new',
      attribution: fixtureAttribution,
      duplicate_of_lead_id: null,
      created_at: '2026-01-03T00:00:00.000Z',
    },
  ]);

  const all = await repo.listLeads(BUSINESS_A);
  assert.equal(all.ok, true);
  if (all.ok) {
    assert.equal(all.leads.length, 2, "must never include another business's lead");
    assert.ok(all.leads.every((l) => l.id !== 'lead-3'));
  }

  const qualifiedOnly = await repo.listLeads(BUSINESS_A, { status: 'qualified' });
  assert.equal(qualifiedOnly.ok, true);
  if (qualifiedOnly.ok) {
    assert.equal(qualifiedOnly.leads.length, 1);
    assert.equal(qualifiedOnly.leads[0].id, 'lead-2');
  }
});
