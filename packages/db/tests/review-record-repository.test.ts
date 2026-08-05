import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseReviewRecordRepository } from '../src/review-record-repository';
import { createFakeSupabaseClient, type FakeTable } from './fake-supabase';

const BUSINESS_A = 'business-a';
const BUSINESS_B = 'business-b';

function setup(seed: Array<Record<string, unknown>> = []) {
  const review_records: FakeTable = { rows: [...seed], nextId: 1 };
  const client = createFakeSupabaseClient({ review_records });
  const repo = createSupabaseReviewRecordRepository(client);
  return { repo, review_records };
}

test('createReviewRecord inserts a new review record scoped to the business', async () => {
  const { repo, review_records } = setup();

  const result = await repo.createReviewRecord({
    businessId: BUSINESS_A,
    jobId: 'job-1',
    sourcePlatform: 'Google',
    receivedAt: '2026-01-05T00:00:00.000Z',
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.reviewRecord.jobId, 'job-1');
    assert.equal(result.reviewRecord.sourcePlatform, 'Google');
  }
  assert.equal(review_records.rows[0].business_id, BUSINESS_A);
});

test("listReviewRecordsForJob returns only the calling business's records for the requested job, most recent first", async () => {
  const { repo } = setup([
    {
      id: 'review-record-1',
      business_id: BUSINESS_A,
      job_id: 'job-1',
      review_request_id: null,
      source_platform: 'Google',
      received_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'review-record-2',
      business_id: BUSINESS_A,
      job_id: 'job-1',
      review_request_id: null,
      source_platform: 'Yelp',
      received_at: '2026-01-02T00:00:00.000Z',
    },
    {
      id: 'review-record-3',
      business_id: BUSINESS_A,
      job_id: 'job-2',
      review_request_id: null,
      source_platform: 'Google',
      received_at: '2026-01-03T00:00:00.000Z',
    },
    {
      id: 'review-record-4',
      business_id: BUSINESS_B,
      job_id: 'job-1',
      review_request_id: null,
      source_platform: 'Google',
      received_at: '2026-01-04T00:00:00.000Z',
    },
  ]);

  const result = await repo.listReviewRecordsForJob(BUSINESS_A, 'job-1');
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(
      result.reviewRecords.length,
      2,
      "must never include another business's or job's record",
    );
    assert.equal(result.reviewRecords[0].id, 'review-record-2', 'most recent first');
  }
});
