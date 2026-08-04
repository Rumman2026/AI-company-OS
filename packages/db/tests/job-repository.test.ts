import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ProposedAuditRecord } from '@ai-company-os/core-models';
import { createSupabaseJobRepository } from '../src/job-repository';
import type { AuditLogRepository } from '../src/audit-log-repository';
import { createFakeSupabaseClient, type FakeTable } from './fake-supabase';

const BUSINESS_A = 'business-a';
const BUSINESS_B = 'business-b';

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
  const jobs: FakeTable = { rows: [...seed], nextId: 1 };
  const client = createFakeSupabaseClient({ jobs });
  const { auditLog, records } = createFakeAuditLog();
  const repo = createSupabaseJobRepository(client, auditLog);
  return { repo, jobs, records };
}

test('createJob inserts a new job at status "draft", scoped to the business', async () => {
  const { repo } = setup();

  const result = await repo.createJob(BUSINESS_A, 'lead-1', 'booking-1');

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.job.status, 'draft');
    assert.equal(result.job.leadId, 'lead-1');
    assert.equal(result.job.bookingId, 'booking-1');
  }
});

test('a valid transition persists the new status and writes exactly one audit record', async () => {
  const { repo, jobs, records } = setup([
    {
      id: 'job-1',
      business_id: BUSINESS_A,
      lead_id: 'lead-1',
      booking_id: 'booking-1',
      status: 'draft',
      technician_id: null,
      scheduled_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]);

  const result = await repo.transitionJobStatus(BUSINESS_A, 'job-1', 'scheduled', {
    actorCategory: 'office-manager',
    actorId: 'test-actor',
    occurredAt: '2026-01-02T00:00:00.000Z',
  });

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.result.outcome, 'success');
  assert.equal(jobs.rows[0].status, 'scheduled');
  assert.equal(records.length, 1);
  assert.equal(records[0].businessId, BUSINESS_A);
});

test('a job belonging to a different business cannot be transitioned (tenant isolation)', async () => {
  const { repo, jobs, records } = setup([
    {
      id: 'job-1',
      business_id: BUSINESS_B,
      lead_id: 'lead-1',
      booking_id: 'booking-1',
      status: 'draft',
      technician_id: null,
      scheduled_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]);

  const result = await repo.transitionJobStatus(BUSINESS_A, 'job-1', 'scheduled', {
    actorCategory: 'office-manager',
    actorId: 'test-actor',
    occurredAt: '2026-01-02T00:00:00.000Z',
  });

  assert.equal(result.ok, false);
  assert.equal(jobs.rows[0].status, 'draft');
  assert.equal(records.length, 0);
});

test('an illegal transition is rejected and never reaches the database update', async () => {
  const { repo, jobs, records } = setup([
    {
      id: 'job-1',
      business_id: BUSINESS_A,
      lead_id: 'lead-1',
      booking_id: 'booking-1',
      status: 'draft',
      technician_id: null,
      scheduled_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]);

  const result = await repo.transitionJobStatus(BUSINESS_A, 'job-1', 'completed', {
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
  assert.equal(jobs.rows[0].status, 'draft');
  assert.equal(records.length, 0);
});

test('service-completed requires a completion record - missing one is a typed rejection, not a database write', async () => {
  const { repo, jobs, records } = setup([
    {
      id: 'job-1',
      business_id: BUSINESS_A,
      lead_id: 'lead-1',
      booking_id: 'booking-1',
      status: 'in-progress',
      technician_id: 'tech-1',
      scheduled_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]);

  const result = await repo.transitionJobStatus(BUSINESS_A, 'job-1', 'service-completed', {
    actorCategory: 'technician',
    actorId: 'tech-1',
    occurredAt: '2026-01-02T00:00:00.000Z',
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.result.outcome, 'rejected');
    if (result.result.outcome === 'rejected') {
      assert.equal(result.result.errorCode, 'missing-precondition');
    }
  }
  assert.equal(jobs.rows[0].status, 'in-progress');
  assert.equal(records.length, 0);
});

test('transitionJobStatusForRoles succeeds for an owner-admin who also holds office-manager', async () => {
  const { repo, jobs, records } = setup([
    {
      id: 'job-1',
      business_id: BUSINESS_A,
      lead_id: 'lead-1',
      booking_id: 'booking-1',
      status: 'draft',
      technician_id: null,
      scheduled_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]);

  const result = await repo.transitionJobStatusForRoles(
    BUSINESS_A,
    'job-1',
    'scheduled',
    ['owner-admin', 'office-manager'],
    { actorId: 'test-actor', occurredAt: '2026-01-02T00:00:00.000Z' },
  );

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.result.outcome, 'success');
  assert.equal(jobs.rows[0].status, 'scheduled');
  assert.equal(records.length, 1);
});

test('transitionJobStatusForRoles rejects an owner-admin-only membership for an edge that requires office-manager/dispatcher', async () => {
  const { repo, jobs, records } = setup([
    {
      id: 'job-1',
      business_id: BUSINESS_A,
      lead_id: 'lead-1',
      booking_id: 'booking-1',
      status: 'draft',
      technician_id: null,
      scheduled_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]);

  const result = await repo.transitionJobStatusForRoles(
    BUSINESS_A,
    'job-1',
    'scheduled',
    ['owner-admin'],
    { actorId: 'test-actor', occurredAt: '2026-01-02T00:00:00.000Z' },
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.result.outcome, 'rejected');
    if (result.result.outcome === 'rejected') {
      assert.equal(result.result.errorCode, 'unauthorized-actor');
    }
  }
  assert.equal(jobs.rows[0].status, 'draft');
  assert.equal(records.length, 0);
});

test('getJob rejects a cross-tenant lookup', async () => {
  const { repo } = setup([
    {
      id: 'job-1',
      business_id: BUSINESS_A,
      lead_id: 'lead-1',
      booking_id: 'booking-1',
      status: 'draft',
      technician_id: null,
      scheduled_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]);

  const own = await repo.getJob(BUSINESS_A, 'job-1');
  assert.equal(own.ok, true);

  const crossTenant = await repo.getJob(BUSINESS_B, 'job-1');
  assert.equal(crossTenant.ok, false);
});

test("listJobs returns only the calling business's jobs, optionally filtered by status", async () => {
  const { repo } = setup([
    {
      id: 'job-1',
      business_id: BUSINESS_A,
      lead_id: 'lead-1',
      booking_id: 'booking-1',
      status: 'draft',
      technician_id: null,
      scheduled_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'job-2',
      business_id: BUSINESS_A,
      lead_id: 'lead-2',
      booking_id: 'booking-2',
      status: 'scheduled',
      technician_id: null,
      scheduled_at: null,
      created_at: '2026-01-02T00:00:00.000Z',
    },
    {
      id: 'job-3',
      business_id: BUSINESS_B,
      lead_id: 'lead-3',
      booking_id: 'booking-3',
      status: 'draft',
      technician_id: null,
      scheduled_at: null,
      created_at: '2026-01-03T00:00:00.000Z',
    },
  ]);

  const all = await repo.listJobs(BUSINESS_A);
  assert.equal(all.ok, true);
  if (all.ok) assert.equal(all.jobs.length, 2);

  const scheduledOnly = await repo.listJobs(BUSINESS_A, { status: 'scheduled' });
  assert.equal(scheduledOnly.ok, true);
  if (scheduledOnly.ok) {
    assert.equal(scheduledOnly.jobs.length, 1);
    assert.equal(scheduledOnly.jobs[0].id, 'job-2');
  }
});
