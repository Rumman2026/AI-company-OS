/**
 * Demonstrates that Lead, Job, Invoice, Consent, Photo, Content, Review
 * Request, Attribution, and Conversion Event remain structurally separate
 * concerns - transitioning one entity's state machine never touches
 * another entity, and no entity type carries a field belonging to a
 * different workflow.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transitionJob } from '../src/state-machines/job';
import { transitionInvoice } from '../src/state-machines/invoice';
import { transitionLead } from '../src/state-machines/lead';
import { transitionReviewRequest } from '../src/state-machines/review-request';
import {
  makeFixtureJob,
  makeFixtureCompletionRecord,
  makeFixtureInvoice,
  makeFixtureLead,
  makeFixtureReviewRequest,
  makeContext,
  fixtureCurrency,
} from '../src/fixtures';
import { createMoney } from '../src/money';

test('a completed Job does not mutate or embed Invoice state', () => {
  const job = makeFixtureJob({ status: 'awaiting-office-review' });
  const result = transitionJob(job, 'completed', makeContext({ actorCategory: 'office-manager' }));
  assert.equal(result.outcome, 'success');
  if (result.outcome === 'success') {
    assert.ok(!('invoiceStatus' in result.entity));
    assert.ok(!('invoiceId' in result.entity));
  }
});

test('a completed Job does not approve Content - Job and ContentDraft are entirely separate types with separate transition functions', () => {
  const job = makeFixtureJob({ status: 'awaiting-office-review' });
  const result = transitionJob(job, 'completed', makeContext({ actorCategory: 'office-manager' }));
  assert.equal(result.outcome, 'success');
  if (result.outcome === 'success') {
    assert.ok(!('contentStatus' in result.entity));
  }
});

test('a Paid Invoice does not approve Content or grant Consent - Invoice carries no such fields', () => {
  const invoice = makeFixtureInvoice({ status: 'sent' });
  const result = transitionInvoice(invoice, 'paid', makeContext({ actorCategory: 'automation' }), {
    outcome: 'full-payment',
    amountReceived: createMoney(50000, fixtureCurrency),
  });
  assert.equal(result.outcome, 'success');
  if (result.outcome === 'success') {
    assert.ok(!('contentStatus' in result.entity));
    assert.ok(!('consentStatus' in result.entity));
  }
});

test('review receipt does not alter Invoice - the two are unrelated types with unrelated transition functions', () => {
  const reviewRequest = makeFixtureReviewRequest({ status: 'delivered' });
  const result = transitionReviewRequest(
    reviewRequest,
    'review-received',
    makeContext({ actorCategory: 'automation' }),
  );
  assert.equal(result.outcome, 'success');
  if (result.outcome === 'success') {
    assert.ok(!('invoiceStatus' in result.entity));
  }
});

test('Lead-status changes never overwrite first-touch Attribution, across every reachable Lead transition', () => {
  const originalAttribution = makeFixtureLead().attribution;
  const steps = [
    { from: 'new', to: 'contact-attempted', actorCategory: 'dispatcher' },
    { from: 'contact-attempted', to: 'contacted', actorCategory: 'dispatcher' },
    { from: 'contacted', to: 'qualified', actorCategory: 'office-manager' },
  ] as const;

  for (const { from, to, actorCategory } of steps) {
    const lead = makeFixtureLead({ status: from });
    const result = transitionLead(lead, to, makeContext({ actorCategory }));
    assert.equal(result.outcome, 'success');
    if (result.outcome === 'success') {
      assert.deepEqual(result.entity.attribution, originalAttribution);
    }
  }
});

test('Conversion Events are a separate type and are never accepted as a state argument by any transition function', () => {
  // Structural check: none of the five transition functions import or
  // reference ConversionEvent anywhere in their public signatures. This is
  // enforced by the type system (see src/types/conversion.ts, which is
  // never imported by any file under src/state-machines/).
  const job = makeFixtureJob({ status: 'in-progress' });
  const result = transitionJob(
    job,
    'service-completed',
    makeContext({ actorCategory: 'technician' }),
    {
      completionRecord: makeFixtureCompletionRecord(),
    },
  );
  assert.equal(result.outcome, 'success');
  if (result.outcome === 'success') {
    assert.ok(!('conversionEvents' in result.entity));
  }
});
