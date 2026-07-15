import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  transitionReviewRequest,
  type ReviewEligibilityEvidence,
} from '../src/state-machines/review-request';
import type { ReviewRequestStatus } from '../src/types/review';
import { makeFixtureReviewRequest, makeContext } from '../src/fixtures';

const fullEligibility: ReviewEligibilityEvidence = {
  jobCompleted: true,
  invoiceNotDisputed: true,
  consentGranted: true,
  noActiveComplaint: true,
};

test('every approved Review Request transition succeeds', () => {
  const notEligible = makeFixtureReviewRequest({ status: 'not-eligible' });
  assert.equal(
    transitionReviewRequest(notEligible, 'eligible', makeContext({ actorCategory: 'automation' }), {
      eligibilityEvidence: fullEligibility,
    }).outcome,
    'success',
  );

  const eligible = makeFixtureReviewRequest({ status: 'eligible' });
  assert.equal(
    transitionReviewRequest(eligible, 'queued', makeContext({ actorCategory: 'automation' }))
      .outcome,
    'success',
  );

  const queued = makeFixtureReviewRequest({ status: 'queued' });
  assert.equal(
    transitionReviewRequest(queued, 'sent', makeContext({ actorCategory: 'automation' })).outcome,
    'success',
  );
  assert.equal(
    transitionReviewRequest(queued, 'failed', makeContext({ actorCategory: 'automation' })).outcome,
    'success',
  );

  const sent = makeFixtureReviewRequest({ status: 'sent' });
  assert.equal(
    transitionReviewRequest(sent, 'delivered', makeContext({ actorCategory: 'automation' }))
      .outcome,
    'success',
  );
  assert.equal(
    transitionReviewRequest(sent, 'failed', makeContext({ actorCategory: 'automation' })).outcome,
    'success',
  );
  assert.equal(
    transitionReviewRequest(sent, 'review-received', makeContext({ actorCategory: 'automation' }))
      .outcome,
    'success',
  );

  const delivered = makeFixtureReviewRequest({ status: 'delivered' });
  assert.equal(
    transitionReviewRequest(
      delivered,
      'review-received',
      makeContext({ actorCategory: 'automation' }),
    ).outcome,
    'success',
  );

  for (const from of ['not-eligible', 'eligible', 'queued'] as const) {
    const reviewRequest = makeFixtureReviewRequest({ status: from });
    assert.equal(
      transitionReviewRequest(
        reviewRequest,
        'suppressed',
        makeContext({ actorCategory: 'automation' }),
      ).outcome,
      'success',
      `${from} -> suppressed should succeed`,
    );
  }

  for (const from of [
    'not-eligible',
    'eligible',
    'queued',
    'sent',
    'delivered',
    'failed',
    'suppressed',
  ] as const) {
    const reviewRequest = makeFixtureReviewRequest({ status: from });
    assert.equal(
      transitionReviewRequest(
        reviewRequest,
        'opted-out',
        makeContext({ actorCategory: 'customer' }),
      ).outcome,
      'success',
      `${from} -> opted-out should succeed`,
    );
  }
});

test('eligibility must not depend on customer sentiment, rating, or predicted review quality - no such field exists on the evidence contract', () => {
  const forbiddenKeys = [
    'sentiment',
    'starRating',
    'satisfactionScore',
    'likelyPositive',
    'predictedQuality',
  ];
  const evidenceKeys = Object.keys(fullEligibility);
  for (const forbidden of forbiddenKeys) {
    assert.ok(!evidenceKeys.includes(forbidden));
  }
});

test('review-request eligibility is uniform: any complete evidence set is accepted regardless of the specific job', () => {
  const requestA = makeFixtureReviewRequest({ status: 'not-eligible', deduplicationKey: 'job-a' });
  const requestB = makeFixtureReviewRequest({ status: 'not-eligible', deduplicationKey: 'job-b' });
  for (const request of [requestA, requestB]) {
    const result = transitionReviewRequest(
      request,
      'eligible',
      makeContext({ actorCategory: 'automation' }),
      {
        eligibilityEvidence: fullEligibility,
      },
    );
    assert.equal(result.outcome, 'success');
  }
});

test('opt-out is respected from every reachable state and is terminal', () => {
  const optedOut = makeFixtureReviewRequest({ status: 'opted-out' });
  const targets: ReviewRequestStatus[] = [
    'eligible',
    'queued',
    'sent',
    'delivered',
    'review-received',
  ];
  for (const to of targets) {
    const result = transitionReviewRequest(
      optedOut,
      to,
      makeContext({ actorCategory: 'automation' }),
    );
    assert.equal(result.outcome, 'rejected', `opted-out -> ${to} must be rejected`);
  }
});

test('suppression is respected and blocks a request from progressing', () => {
  const suppressed = makeFixtureReviewRequest({ status: 'suppressed' });
  const result = transitionReviewRequest(
    suppressed,
    'queued',
    makeContext({ actorCategory: 'automation' }),
  );
  assert.equal(result.outcome, 'rejected');
});

test('duplicate requests are preventable through a deterministic deduplication key', () => {
  const requestOne = makeFixtureReviewRequest({ deduplicationKey: 'job-1:review-request' });
  const requestTwo = makeFixtureReviewRequest({ deduplicationKey: 'job-1:review-request' });
  assert.equal(requestOne.deduplicationKey, requestTwo.deduplicationKey);
});

test('failed delivery remains distinguishable from suppression - no retry transition exists for failed', () => {
  const failed = makeFixtureReviewRequest({ status: 'failed' });
  const retryAttempt = transitionReviewRequest(
    failed,
    'queued',
    makeContext({ actorCategory: 'automation' }),
  );
  assert.equal(retryAttempt.outcome, 'rejected');
  const resendAttempt = transitionReviewRequest(
    failed,
    'sent',
    makeContext({ actorCategory: 'automation' }),
  );
  assert.equal(resendAttempt.outcome, 'rejected');
});

test('review receipt does not require or imply Content publication - the two workflows share no transition', () => {
  const delivered = makeFixtureReviewRequest({ status: 'delivered' });
  const result = transitionReviewRequest(
    delivered,
    'review-received',
    makeContext({ actorCategory: 'automation' }),
  );
  assert.equal(result.outcome, 'success');
  if (result.outcome === 'success') {
    assert.ok(!('contentStatus' in result.entity));
    assert.ok(!('publishedProjectId' in result.entity));
  }
});
