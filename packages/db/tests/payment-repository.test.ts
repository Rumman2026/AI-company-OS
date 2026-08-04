import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCurrencyCode, createMoney } from '@ai-company-os/core-models';
import { createSupabasePaymentRepository } from '../src/payment-repository';
import { createFakeSupabaseClient, type FakeTable } from './fake-supabase';

const BUSINESS_A = 'business-a';
const BUSINESS_B = 'business-b';
const fixtureAmount = createMoney(25000, createCurrencyCode('USD'));

function setup(seed: Array<Record<string, unknown>> = []) {
  const payments: FakeTable = { rows: [...seed], nextId: 1 };
  const client = createFakeSupabaseClient({ payments });
  const repo = createSupabasePaymentRepository(client);
  return { repo, payments };
}

test('createPayment inserts a new payment scoped to the business', async () => {
  const { repo, payments } = setup();

  const result = await repo.createPayment({
    businessId: BUSINESS_A,
    invoiceId: 'invoice-1',
    amount: fixtureAmount,
    occurredAt: '2026-01-05T00:00:00.000Z',
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.payment.invoiceId, 'invoice-1');
    assert.equal(result.payment.amount.amountMinorUnits, 25000);
  }
  assert.equal(payments.rows[0].business_id, BUSINESS_A);
});

test("listPaymentsForInvoice returns only the calling business's payments for the requested invoice, most recent first", async () => {
  const { repo } = setup([
    {
      id: 'payment-1',
      business_id: BUSINESS_A,
      invoice_id: 'invoice-1',
      amount_minor_units: 10000,
      amount_currency: 'USD',
      occurred_at: '2026-01-01T00:00:00.000Z',
      created_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'payment-2',
      business_id: BUSINESS_A,
      invoice_id: 'invoice-1',
      amount_minor_units: 15000,
      amount_currency: 'USD',
      occurred_at: '2026-01-02T00:00:00.000Z',
      created_at: '2026-01-02T00:00:00.000Z',
    },
    {
      id: 'payment-3',
      business_id: BUSINESS_A,
      invoice_id: 'invoice-2',
      amount_minor_units: 5000,
      amount_currency: 'USD',
      occurred_at: '2026-01-03T00:00:00.000Z',
      created_at: '2026-01-03T00:00:00.000Z',
    },
    {
      id: 'payment-4',
      business_id: BUSINESS_B,
      invoice_id: 'invoice-1',
      amount_minor_units: 5000,
      amount_currency: 'USD',
      occurred_at: '2026-01-04T00:00:00.000Z',
      created_at: '2026-01-04T00:00:00.000Z',
    },
  ]);

  const result = await repo.listPaymentsForInvoice(BUSINESS_A, 'invoice-1');
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(
      result.payments.length,
      2,
      "must never include another business's or invoice's payment",
    );
    assert.equal(result.payments[0].id, 'payment-2', 'most recent first');
  }
});
