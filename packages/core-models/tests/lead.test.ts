import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transitionLead } from '../src/state-machines/lead';
import type { LeadStatus } from '../src/types/lead';
import { makeFixtureLead, makeContext } from '../src/fixtures';

test('every approved Lead transition succeeds with an authorized actor', () => {
  const cases: Array<{
    from: LeadStatus;
    to: LeadStatus;
    context: Parameters<typeof makeContext>[0];
  }> = [
    { from: 'new', to: 'contact-attempted', context: { actorCategory: 'dispatcher' } },
    {
      from: 'contact-attempted',
      to: 'contact-attempted',
      context: { actorCategory: 'office-manager' },
    },
    { from: 'new', to: 'spam', context: { actorCategory: 'automation' } },
    { from: 'new', to: 'duplicate', context: { actorCategory: 'automation' } },
    { from: 'contact-attempted', to: 'contacted', context: { actorCategory: 'dispatcher' } },
    { from: 'contacted', to: 'qualified', context: { actorCategory: 'office-manager' } },
    {
      from: 'contacted',
      to: 'disqualified',
      context: { actorCategory: 'office-manager', reason: 'Outside service area' },
    },
    { from: 'qualified', to: 'estimate-requested', context: { actorCategory: 'office-manager' } },
    {
      from: 'estimate-requested',
      to: 'estimate-sent',
      context: { actorCategory: 'office-manager' },
    },
    { from: 'estimate-sent', to: 'booked', context: { actorCategory: 'office-manager' } },
    {
      from: 'estimate-sent',
      to: 'lost',
      context: { actorCategory: 'owner-admin', reason: 'Customer declined' },
    },
  ];

  for (const { from, to, context } of cases) {
    const lead = makeFixtureLead({ status: from });
    const result = transitionLead(lead, to, makeContext(context));
    assert.equal(result.outcome, 'success', `${from} -> ${to} should succeed`);
    if (result.outcome === 'success') {
      assert.equal(result.entity.status, to);
      assert.equal(result.previousState, from);
      assert.equal(result.nextState, to);
    }
  }
});

test('representative illegal Lead transitions are rejected', () => {
  const illegalCases: Array<[LeadStatus, LeadStatus]> = [
    ['new', 'booked'],
    ['new', 'qualified'],
    ['contacted', 'booked'],
    ['qualified', 'booked'],
    ['disqualified', 'qualified'],
  ];
  for (const [from, to] of illegalCases) {
    const lead = makeFixtureLead({ status: from });
    const result = transitionLead(lead, to, makeContext());
    assert.equal(result.outcome, 'rejected', `${from} -> ${to} should be rejected`);
    if (result.outcome === 'rejected') {
      assert.equal(result.errorCode, 'illegal-transition');
    }
  }
});

test('spam cannot become qualified or booked through any transition', () => {
  const lead = makeFixtureLead({ status: 'spam' });
  for (const target of ['qualified', 'booked'] as const) {
    const result = transitionLead(lead, target, makeContext({ actorCategory: 'owner-admin' }));
    assert.equal(result.outcome, 'rejected');
    assert.equal(result.errorCode, 'illegal-transition');
  }
});

test('duplicate cannot become qualified or booked through any transition', () => {
  const lead = makeFixtureLead({ status: 'duplicate' });
  for (const target of ['qualified', 'booked'] as const) {
    const result = transitionLead(lead, target, makeContext({ actorCategory: 'owner-admin' }));
    assert.equal(result.outcome, 'rejected');
    assert.equal(result.errorCode, 'illegal-transition');
  }
});

test('there is no shortcut transition directly to booked from any state other than estimate-sent', () => {
  const nonEstimateSentStatuses: LeadStatus[] = [
    'new',
    'contact-attempted',
    'contacted',
    'qualified',
    'disqualified',
    'estimate-requested',
    'lost',
    'spam',
    'duplicate',
  ];
  for (const from of nonEstimateSentStatuses) {
    const lead = makeFixtureLead({ status: from });
    const result = transitionLead(lead, 'booked', makeContext({ actorCategory: 'owner-admin' }));
    assert.equal(result.outcome, 'rejected', `${from} -> booked must be rejected`);
  }
});

test('disqualification and lost transitions preserve the original attribution unchanged', () => {
  const lead = makeFixtureLead({ status: 'contacted' });
  const disqualified = transitionLead(
    lead,
    'disqualified',
    makeContext({ actorCategory: 'office-manager', reason: 'No budget' }),
  );
  assert.equal(disqualified.outcome, 'success');
  if (disqualified.outcome === 'success') {
    assert.deepEqual(disqualified.entity.attribution, lead.attribution);
  }

  const lostLead = makeFixtureLead({ status: 'qualified' });
  const lost = transitionLead(
    lostLead,
    'lost',
    makeContext({ actorCategory: 'owner-admin', reason: 'Went with a competitor' }),
  );
  assert.equal(lost.outcome, 'success');
  if (lost.outcome === 'success') {
    assert.deepEqual(lost.entity.attribution, lostLead.attribution);
  }
});

test('a reason is required for disqualification and is reported as a typed rejection when absent', () => {
  const lead = makeFixtureLead({ status: 'contacted' });
  const result = transitionLead(
    lead,
    'disqualified',
    makeContext({ actorCategory: 'office-manager' }),
  );
  assert.equal(result.outcome, 'rejected');
  if (result.outcome === 'rejected') {
    assert.equal(result.errorCode, 'missing-precondition');
    assert.deepEqual(result.missingPreconditions, ['reason']);
  }
});

test('an unauthorized actor is rejected with a typed unauthorized-actor result', () => {
  const lead = makeFixtureLead({ status: 'contacted' });
  const result = transitionLead(lead, 'qualified', makeContext({ actorCategory: 'technician' }));
  assert.equal(result.outcome, 'rejected');
  if (result.outcome === 'rejected') {
    assert.equal(result.errorCode, 'unauthorized-actor');
    assert.equal(result.unauthorizedActorCategory, 'technician');
  }
});

test('a click or engagement-style actor cannot qualify a lead - only office-manager is authorized', () => {
  const lead = makeFixtureLead({ status: 'contacted' });
  for (const actorCategory of ['customer', 'automation'] as const) {
    const result = transitionLead(lead, 'qualified', makeContext({ actorCategory }));
    assert.equal(result.outcome, 'rejected');
  }
});
