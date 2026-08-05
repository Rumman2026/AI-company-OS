import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ProposedAuditRecord } from '@ai-company-os/core-models';
import { createSupabaseReviewRequestRepository } from '../src/review-request-repository';
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
  const review_requests: FakeTable = { rows: [...seed], nextId: 1 };
  const client = createFakeSupabaseClient({ review_requests });
  const { auditLog, records } = createFakeAuditLog();
  const repo = createSupabaseReviewRequestRepository(client, auditLog);
  return { repo, review_requests, records };
}

function notEligibleRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: 'review-request-1',
    business_id: BUSINESS_A,
    job_id: 'job-1',
    status: 'not-eligible',
    deduplication_key: 'job-1:completion-review',
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

test('createReviewRequest inserts a new review request at status "not-eligible", scoped to the business', async () => {
  const { repo } = setup();

  const result = await repo.createReviewRequest({
    businessId: BUSINESS_A,
    jobId: 'job-1',
    deduplicationKey: 'job-1:completion-review',
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.reviewRequest.status, 'not-eligible');
    assert.equal(result.reviewRequest.jobId, 'job-1');
    assert.equal(result.reviewRequest.deduplicationKey, 'job-1:completion-review');
  }
});

test('opted-out is reachable by a real human actor (office-manager) - the one non-automation edge', async () => {
  const { repo, review_requests, records } = setup([notEligibleRequest()]);

  const result = await repo.transitionReviewRequestStatusForRoles(
    BUSINESS_A,
    'review-request-1',
    'opted-out',
    ['office-manager'],
    { actorId: 'test-actor', occurredAt: '2026-01-02T00:00:00.000Z' },
  );

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.result.outcome, 'success');
  assert.equal(review_requests.rows[0].status, 'opted-out');
  assert.equal(records.length, 1);
  assert.equal(records[0].businessId, BUSINESS_A);
});

test('every automation-only edge is rejected for every real membership role this app has', async () => {
  const { repo, review_requests, records } = setup([notEligibleRequest()]);

  const result = await repo.transitionReviewRequestStatusForRoles(
    BUSINESS_A,
    'review-request-1',
    'eligible',
    ['owner-admin', 'office-manager', 'dispatcher', 'technician'],
    { actorId: 'test-actor', occurredAt: '2026-01-02T00:00:00.000Z' },
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.result.outcome, 'rejected');
    if (result.result.outcome === 'rejected') {
      assert.equal(result.result.errorCode, 'unauthorized-actor');
    }
  }
  assert.equal(review_requests.rows[0].status, 'not-eligible');
  assert.equal(records.length, 0);
});

test('a review request belonging to a different business cannot be transitioned (tenant isolation)', async () => {
  const { repo, review_requests, records } = setup([
    notEligibleRequest({ business_id: BUSINESS_B }),
  ]);

  const result = await repo.transitionReviewRequestStatusForRoles(
    BUSINESS_A,
    'review-request-1',
    'opted-out',
    ['office-manager'],
    { actorId: 'test-actor', occurredAt: '2026-01-02T00:00:00.000Z' },
  );

  assert.equal(result.ok, false);
  assert.equal(review_requests.rows[0].status, 'not-eligible');
  assert.equal(records.length, 0);
});

test('an illegal transition is rejected and never reaches the database update', async () => {
  const { repo, review_requests, records } = setup([notEligibleRequest({ status: 'opted-out' })]);

  const result = await repo.transitionReviewRequestStatusForRoles(
    BUSINESS_A,
    'review-request-1',
    'sent',
    ['office-manager'],
    { actorId: 'test-actor', occurredAt: '2026-01-02T00:00:00.000Z' },
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.result.outcome, 'rejected');
    if (result.result.outcome === 'rejected') {
      assert.equal(result.result.errorCode, 'illegal-transition');
    }
  }
  assert.equal(review_requests.rows[0].status, 'opted-out');
  assert.equal(records.length, 0);
});

test('getReviewRequest rejects a cross-tenant lookup', async () => {
  const { repo } = setup([notEligibleRequest()]);

  const own = await repo.getReviewRequest(BUSINESS_A, 'review-request-1');
  assert.equal(own.ok, true);

  const crossTenant = await repo.getReviewRequest(BUSINESS_B, 'review-request-1');
  assert.equal(crossTenant.ok, false);
});

test("listReviewRequestsForJob returns only the calling business's requests for the requested job", async () => {
  const { repo } = setup([
    notEligibleRequest(),
    notEligibleRequest({
      id: 'review-request-2',
      job_id: 'job-2',
      created_at: '2026-01-02T00:00:00.000Z',
    }),
    notEligibleRequest({
      id: 'review-request-3',
      business_id: BUSINESS_B,
      created_at: '2026-01-03T00:00:00.000Z',
    }),
  ]);

  const result = await repo.listReviewRequestsForJob(BUSINESS_A, 'job-1');
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.reviewRequests.length, 1);
    assert.equal(result.reviewRequests[0].id, 'review-request-1');
  }
});
