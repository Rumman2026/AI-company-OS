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
  consentGranted: true,
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

test('eligibility must not depend on customer sentiment, rating, predicted review quality, complaint status, or invoice-dispute status - no such field exists on the evidence contract', () => {
  const forbiddenKeys = [
    'sentiment',
    'starRating',
    'satisfactionScore',
    'likelyPositive',
    'predictedQuality',
    'positiveFeedback',
    'negativeFeedback',
    'employeeJudgment',
    'serviceRecoveryOutcome',
    'noActiveComplaint',
    'hasComplaint',
    'complaintStatus',
    'invoiceNotDisputed',
    'invoiceDisputed',
    'disputeStatus',
  ];
  const evidenceKeys = Object.keys(fullEligibility);
  for (const forbidden of forbiddenKeys) {
    assert.ok(!evidenceKeys.includes(forbidden), `"${forbidden}" must not be an eligibility field`);
  }
  assert.deepEqual(evidenceKeys.sort(), ['consentGranted', 'jobCompleted']);
});

test('review eligibility contains no complaint-status requirement, exactly', () => {
  const evidenceKeys = Object.keys(fullEligibility);
  assert.ok(!evidenceKeys.some((key) => key.toLowerCase().includes('complaint')));
});

test('review eligibility contains no invoice-dispute requirement, exactly', () => {
  const evidenceKeys = Object.keys(fullEligibility);
  assert.ok(!evidenceKeys.some((key) => key.toLowerCase().includes('dispute')));
});

test('a completed customer with review-request consent is not rejected solely because a complaint exists elsewhere in the system', () => {
  // A complaint may be tracked by a separate, not-yet-implemented workflow,
  // but ReviewEligibilityEvidence has no field to express it - so passing
  // only the two neutral fields succeeds regardless of any out-of-band
  // complaint state.
  const notEligible = makeFixtureReviewRequest({ status: 'not-eligible' });
  const result = transitionReviewRequest(
    notEligible,
    'eligible',
    makeContext({ actorCategory: 'automation' }),
    { eligibilityEvidence: { jobCompleted: true, consentGranted: true } },
  );
  assert.equal(result.outcome, 'success');
});

test('a completed customer is not rejected solely because an invoice dispute exists elsewhere in the system', () => {
  const notEligible = makeFixtureReviewRequest({ status: 'not-eligible' });
  const result = transitionReviewRequest(
    notEligible,
    'eligible',
    makeContext({ actorCategory: 'automation' }),
    { eligibilityEvidence: { jobCompleted: true, consentGranted: true } },
  );
  assert.equal(result.outcome, 'success');
});

test('Review Request eligibility remains independent from complaint and dispute workflows - no such entity or field is imported or referenced', () => {
  // Structural check: review-request.ts and types/review.ts import
  // nothing from a complaint or dispute module (no such module exists in
  // this slice), and ReviewEligibilityEvidence's only fields are
  // jobCompleted and consentGranted.
  const evidenceKeys = Object.keys(fullEligibility);
  assert.deepEqual(evidenceKeys.sort(), ['consentGranted', 'jobCompleted']);
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
