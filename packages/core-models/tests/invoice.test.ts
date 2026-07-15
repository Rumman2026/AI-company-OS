import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transitionInvoice } from '../src/state-machines/invoice';
import type { InvoiceStatus, PaymentOutcomeEvidence } from '../src/types/invoice';
import { makeFixtureInvoice, makeContext, fixtureCurrency } from '../src/fixtures';
import { createMoney } from '../src/money';

const partial: PaymentOutcomeEvidence = {
  outcome: 'partial-payment',
  amountReceived: createMoney(10000, fixtureCurrency),
};
const full: PaymentOutcomeEvidence = {
  outcome: 'full-payment',
  amountReceived: createMoney(50000, fixtureCurrency),
};
const noPayment: PaymentOutcomeEvidence = { outcome: 'no-captured-payment' };

test('every approved Invoice transition succeeds with correct actor, reason, and evidence', () => {
  const cases: Array<{
    from: InvoiceStatus;
    to: InvoiceStatus;
    actorCategory: Parameters<typeof makeContext>[0]['actorCategory'];
    reason?: string;
    evidence?: PaymentOutcomeEvidence;
  }> = [
    { from: 'draft', to: 'sent', actorCategory: 'office-manager' },
    { from: 'draft', to: 'voided', actorCategory: 'office-manager', reason: 'Duplicate invoice' },
    { from: 'sent', to: 'partially-paid', actorCategory: 'automation', evidence: partial },
    { from: 'sent', to: 'paid', actorCategory: 'automation', evidence: full },
    { from: 'sent', to: 'overdue', actorCategory: 'automation' },
    { from: 'sent', to: 'voided', actorCategory: 'owner-admin', reason: 'Job canceled' },
    { from: 'partially-paid', to: 'paid', actorCategory: 'office-manager', evidence: full },
    { from: 'partially-paid', to: 'overdue', actorCategory: 'automation' },
    {
      from: 'partially-paid',
      to: 'refunded',
      actorCategory: 'owner-admin',
      reason: 'Customer dispute resolved with refund',
    },
    { from: 'paid', to: 'refunded', actorCategory: 'office-manager', reason: 'Service issue' },
    { from: 'overdue', to: 'partially-paid', actorCategory: 'office-manager', evidence: partial },
    { from: 'overdue', to: 'paid', actorCategory: 'automation', evidence: full },
    {
      from: 'overdue',
      to: 'voided',
      actorCategory: 'owner-admin',
      reason: 'Uncollectable, no payment captured',
      evidence: noPayment,
    },
  ];

  for (const { from, to, actorCategory, reason, evidence } of cases) {
    const invoice = makeFixtureInvoice({ status: from });
    const result = transitionInvoice(invoice, to, makeContext({ actorCategory, reason }), evidence);
    assert.equal(result.outcome, 'success', `${from} -> ${to} should succeed`);
    if (result.outcome === 'success') {
      assert.equal(result.entity.status, to);
    }
  }
});

test('a full late payment on an Overdue invoice transitions directly to Paid without an artificial PartiallyPaid step', () => {
  const invoice = makeFixtureInvoice({ status: 'overdue' });
  const result = transitionInvoice(
    invoice,
    'paid',
    makeContext({ actorCategory: 'automation' }),
    full,
  );
  assert.equal(result.outcome, 'success');
  if (result.outcome === 'success') {
    assert.equal(result.entity.status, 'paid');
  }
});

test('Overdue -> Voided requires the owner-admin actor category specifically, not office-manager', () => {
  const invoice = makeFixtureInvoice({ status: 'overdue' });
  const asOfficeManager = transitionInvoice(
    invoice,
    'voided',
    makeContext({ actorCategory: 'office-manager', reason: 'Write off' }),
    noPayment,
  );
  assert.equal(asOfficeManager.outcome, 'rejected');
  if (asOfficeManager.outcome === 'rejected') {
    assert.equal(asOfficeManager.errorCode, 'unauthorized-actor');
  }

  const asOwnerAdmin = transitionInvoice(
    invoice,
    'voided',
    makeContext({ actorCategory: 'owner-admin', reason: 'Write off' }),
    noPayment,
  );
  assert.equal(asOwnerAdmin.outcome, 'success');
});

test('Overdue -> Voided is rejected when a captured or partial payment remains associated with the invoice', () => {
  const invoice = makeFixtureInvoice({ status: 'overdue' });
  for (const evidence of [partial, full]) {
    const result = transitionInvoice(
      invoice,
      'voided',
      makeContext({ actorCategory: 'owner-admin', reason: 'Write off' }),
      evidence,
    );
    assert.equal(result.outcome, 'rejected');
    if (result.outcome === 'rejected') {
      assert.equal(result.errorCode, 'invalid-evidence');
    }
  }
});

test('explicitly prohibited Invoice transitions are all rejected', () => {
  const prohibited: Array<[InvoiceStatus, InvoiceStatus]> = [
    ['overdue', 'refunded'],
    ['voided', 'paid'],
    ['voided', 'sent'],
    ['refunded', 'paid'],
    ['refunded', 'sent'],
    ['paid', 'overdue'],
    ['paid', 'partially-paid'],
    ['draft', 'paid'],
    ['draft', 'overdue'],
  ];
  for (const [from, to] of prohibited) {
    const invoice = makeFixtureInvoice({ status: from });
    const result = transitionInvoice(
      invoice,
      to,
      makeContext({ actorCategory: 'owner-admin', reason: 'test' }),
      full,
    );
    assert.equal(result.outcome, 'rejected', `${from} -> ${to} must be rejected`);
    if (result.outcome === 'rejected') {
      assert.equal(result.errorCode, 'illegal-transition');
    }
  }
});

test('a payment-outcome-determining transition is rejected when evidence is missing or mismatched', () => {
  const sent = makeFixtureInvoice({ status: 'sent' });
  const missingEvidence = transitionInvoice(
    sent,
    'paid',
    makeContext({ actorCategory: 'automation' }),
  );
  assert.equal(missingEvidence.outcome, 'rejected');
  if (missingEvidence.outcome === 'rejected') {
    assert.equal(missingEvidence.errorCode, 'invalid-evidence');
  }

  const mismatchedEvidence = transitionInvoice(
    sent,
    'paid',
    makeContext({ actorCategory: 'automation' }),
    partial,
  );
  assert.equal(mismatchedEvidence.outcome, 'rejected');
});

test('safe currency representation: constructing Money rejects non-integer or negative minor units', () => {
  assert.throws(() => createMoney(10.5, fixtureCurrency));
  assert.throws(() => createMoney(-100, fixtureCurrency));
});

test('Invoice transitions never introduce fields describing publication, consent, or review state', () => {
  const invoice = makeFixtureInvoice({ status: 'sent' });
  const result = transitionInvoice(
    invoice,
    'paid',
    makeContext({ actorCategory: 'automation' }),
    full,
  );
  assert.equal(result.outcome, 'success');
  if (result.outcome === 'success') {
    const keys = Object.keys(result.entity);
    for (const forbiddenKey of ['publicationStatus', 'consentStatus', 'reviewReceived']) {
      assert.ok(!keys.includes(forbiddenKey));
    }
    // leadId is preserved exactly as it was - Paid never rewrites attribution linkage.
    assert.equal(result.entity.leadId, invoice.leadId);
  }
});
