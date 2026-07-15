import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transitionJob } from '../src/state-machines/job';
import type { JobStatus } from '../src/types/job';
import { makeFixtureJob, makeFixtureCompletionRecord, makeContext } from '../src/fixtures';

test('every approved Job transition succeeds with an authorized actor', () => {
  const completionRecord = makeFixtureCompletionRecord();

  const draft = makeFixtureJob({ status: 'draft' });
  assert.equal(
    transitionJob(draft, 'scheduled', makeContext({ actorCategory: 'dispatcher' })).outcome,
    'success',
  );

  const scheduled = makeFixtureJob({ status: 'scheduled' });
  assert.equal(
    transitionJob(scheduled, 'assigned', makeContext({ actorCategory: 'dispatcher' })).outcome,
    'success',
  );

  const assigned = makeFixtureJob({ status: 'assigned' });
  assert.equal(
    transitionJob(
      assigned,
      'canceled',
      makeContext({ actorCategory: 'dispatcher', reason: 'Rescheduling' }),
    ).outcome,
    'success',
  );
  assert.equal(
    transitionJob(assigned, 'in-progress', makeContext({ actorCategory: 'technician' })).outcome,
    'success',
  );

  const inProgress = makeFixtureJob({ status: 'in-progress' });
  const serviceCompletedResult = transitionJob(
    inProgress,
    'service-completed',
    makeContext({ actorCategory: 'technician' }),
    { completionRecord },
  );
  assert.equal(serviceCompletedResult.outcome, 'success');

  const serviceCompleted = makeFixtureJob({ status: 'service-completed' });
  assert.equal(
    transitionJob(
      serviceCompleted,
      'awaiting-office-review',
      makeContext({ actorCategory: 'automation' }),
    ).outcome,
    'success',
  );

  const awaitingReview = makeFixtureJob({ status: 'awaiting-office-review' });
  assert.equal(
    transitionJob(awaitingReview, 'completed', makeContext({ actorCategory: 'office-manager' }))
      .outcome,
    'success',
  );
  assert.equal(
    transitionJob(
      awaitingReview,
      'follow-up-required',
      makeContext({ actorCategory: 'office-manager', reason: 'Missing after photos' }),
    ).outcome,
    'success',
  );

  const followUpRequired = makeFixtureJob({ status: 'follow-up-required' });
  assert.equal(
    transitionJob(followUpRequired, 'assigned', makeContext({ actorCategory: 'dispatcher' }))
      .outcome,
    'success',
  );
  assert.equal(
    transitionJob(followUpRequired, 'in-progress', makeContext({ actorCategory: 'dispatcher' }))
      .outcome,
    'success',
  );

  const completed = makeFixtureJob({ status: 'completed' });
  assert.equal(
    transitionJob(
      completed,
      'follow-up-required',
      makeContext({ actorCategory: 'office-manager', reason: 'Customer complaint' }),
    ).outcome,
    'success',
  );

  for (const from of ['draft', 'in-progress', 'completed'] as const) {
    const job = makeFixtureJob({ status: from });
    const result = transitionJob(
      job,
      'canceled',
      makeContext({ actorCategory: 'owner-admin', reason: 'Customer canceled' }),
    );
    assert.equal(result.outcome, 'success', `${from} -> canceled via owner-admin should succeed`);
  }
});

test('a Job cannot move directly from Draft to Completed', () => {
  const job = makeFixtureJob({ status: 'draft' });
  const result = transitionJob(job, 'completed', makeContext({ actorCategory: 'office-manager' }));
  assert.equal(result.outcome, 'rejected');
  assert.equal((result as { errorCode: string }).errorCode, 'illegal-transition');
});

test('service completion and office-approved completion are separate, non-collapsible states', () => {
  const serviceCompleted = makeFixtureJob({ status: 'service-completed' });
  const directToCompleted = transitionJob(
    serviceCompleted,
    'completed',
    makeContext({ actorCategory: 'office-manager' }),
  );
  assert.equal(directToCompleted.outcome, 'rejected');
});

test('In Progress -> Service Completed is rejected when hard-required completion fields are missing', () => {
  const job = makeFixtureJob({ status: 'in-progress' });
  const incomplete = makeFixtureCompletionRecord({
    servicePerformed: '',
    workCompletedDescription: '',
  });
  const result = transitionJob(
    job,
    'service-completed',
    makeContext({ actorCategory: 'technician' }),
    {
      completionRecord: incomplete,
    },
  );
  assert.equal(result.outcome, 'rejected');
  if (result.outcome === 'rejected') {
    assert.equal(result.errorCode, 'missing-precondition');
    assert.ok(result.missingPreconditions?.includes('completionRecord.servicePerformed'));
    assert.ok(result.missingPreconditions?.includes('completionRecord.workCompletedDescription'));
  }
});

test('In Progress -> Service Completed is rejected when no completion record is supplied at all', () => {
  const job = makeFixtureJob({ status: 'in-progress' });
  const result = transitionJob(
    job,
    'service-completed',
    makeContext({ actorCategory: 'technician' }),
  );
  assert.equal(result.outcome, 'rejected');
});

test('cancellation requires an explicit reason', () => {
  const job = makeFixtureJob({ status: 'scheduled' });
  const result = transitionJob(job, 'canceled', makeContext({ actorCategory: 'dispatcher' }));
  assert.equal(result.outcome, 'rejected');
  if (result.outcome === 'rejected') {
    assert.equal(result.errorCode, 'missing-precondition');
  }
});

test('follow-up-required requires an explicit reason from awaiting-office-review', () => {
  const job = makeFixtureJob({ status: 'awaiting-office-review' });
  const result = transitionJob(
    job,
    'follow-up-required',
    makeContext({ actorCategory: 'office-manager' }),
  );
  assert.equal(result.outcome, 'rejected');
});

test('canceled is terminal - no transition is approved out of it', () => {
  const job = makeFixtureJob({ status: 'canceled' });
  const targets: JobStatus[] = [
    'draft',
    'scheduled',
    'assigned',
    'in-progress',
    'service-completed',
    'awaiting-office-review',
    'completed',
    'follow-up-required',
  ];
  for (const to of targets) {
    const result = transitionJob(job, to, makeContext({ actorCategory: 'owner-admin' }));
    assert.equal(result.outcome, 'rejected', `canceled -> ${to} must be rejected`);
  }
});

test('Job transitions never introduce fields describing Invoice, Consent, or Content state', () => {
  const job = makeFixtureJob({ status: 'awaiting-office-review' });
  const result = transitionJob(job, 'completed', makeContext({ actorCategory: 'office-manager' }));
  assert.equal(result.outcome, 'success');
  if (result.outcome === 'success') {
    const keys = Object.keys(result.entity);
    for (const forbiddenKey of [
      'invoiceStatus',
      'consentStatus',
      'contentStatus',
      'reviewRequestStatus',
    ]) {
      assert.ok(!keys.includes(forbiddenKey), `Job must not carry a "${forbiddenKey}" field`);
    }
  }
});
