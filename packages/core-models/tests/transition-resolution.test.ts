import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transitionLead } from '../src/state-machines/lead';
import { makeFixtureLead } from '../src/fixtures';
import { resolveTransitionAcrossActorCategories } from '../src/transition-resolution';
import { DomainValidationError } from '../src/primitives';
import type { TransitionContext } from '../src/transition';

const contextWithoutActor: Omit<TransitionContext, 'actorCategory'> = {
  actorId: 'fixture-actor-1',
  occurredAt: '2026-01-10T00:00:00.000Z',
};

test('a later authorized candidate succeeds when an earlier candidate is unauthorized', () => {
  const lead = makeFixtureLead({ status: 'contacted' });
  let attempts = 0;

  const result = resolveTransitionAcrossActorCategories(
    (context) => {
      attempts += 1;
      return transitionLead(lead, 'qualified', context);
    },
    ['technician', 'office-manager'],
    contextWithoutActor,
  );

  assert.equal(result.outcome, 'success');
  assert.equal(attempts, 2, 'must stop trying further candidates once one succeeds');
});

test('a role that is not registered at all for this membership is never tried - only supplied candidates are attempted', () => {
  const lead = makeFixtureLead({ status: 'contacted' });
  const result = resolveTransitionAcrossActorCategories(
    (context) => transitionLead(lead, 'qualified', context),
    ['technician'],
    contextWithoutActor,
  );

  assert.equal(result.outcome, 'rejected');
  if (result.outcome === 'rejected') {
    assert.equal(result.errorCode, 'unauthorized-actor');
  }
});

test('a specific rejection (missing-precondition) is preferred over a later unauthorized-actor rejection', () => {
  const lead = makeFixtureLead({ status: 'contacted' });

  const result = resolveTransitionAcrossActorCategories(
    // 'contacted' -> 'disqualified' allows only office-manager, and
    // requires a reason - omitting it here deliberately, and trying
    // 'technician' (fully unauthorized) after it.
    (context) => transitionLead(lead, 'disqualified', context),
    ['office-manager', 'technician'],
    contextWithoutActor,
  );

  assert.equal(result.outcome, 'rejected');
  if (result.outcome === 'rejected') {
    assert.equal(
      result.errorCode,
      'missing-precondition',
      'the more specific rejection must win over a plain unauthorized-actor rejection',
    );
  }
});

test('the specific rejection wins regardless of candidate order', () => {
  const lead = makeFixtureLead({ status: 'contacted' });

  const result = resolveTransitionAcrossActorCategories(
    (context) => transitionLead(lead, 'disqualified', context),
    ['technician', 'office-manager'],
    contextWithoutActor,
  );

  assert.equal(result.outcome, 'rejected');
  if (result.outcome === 'rejected') {
    assert.equal(result.errorCode, 'missing-precondition');
  }
});

test('an empty candidate list throws rather than silently returning a fabricated result', () => {
  const lead = makeFixtureLead({ status: 'contacted' });
  assert.throws(
    () =>
      resolveTransitionAcrossActorCategories(
        (context) => transitionLead(lead, 'qualified', context),
        [],
        contextWithoutActor,
      ),
    DomainValidationError,
  );
});
