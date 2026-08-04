import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCurrencyCode, createMoney } from '@ai-company-os/core-models';
import { createSupabaseEstimateLineItemRepository } from '../src/estimate-line-item-repository';
import { createSupabaseEstimateRepository } from '../src/estimate-repository';
import { createFakeSupabaseClient, type FakeTable } from './fake-supabase';

const BUSINESS_A = 'business-a';
const BUSINESS_B = 'business-b';
const unitPrice = createMoney(15000, createCurrencyCode('USD'));

function setup(
  estimateSeed: Array<Record<string, unknown>>,
  lineItemSeed: Array<Record<string, unknown>> = [],
) {
  const estimates: FakeTable = { rows: estimateSeed, nextId: 1 };
  const estimate_line_items: FakeTable = { rows: lineItemSeed, nextId: 1 };
  const client = createFakeSupabaseClient({ estimates, estimate_line_items });
  const estimateRepository = createSupabaseEstimateRepository(client);
  const repo = createSupabaseEstimateLineItemRepository(client, estimateRepository);
  return { repo, estimateRepository, estimates, estimate_line_items };
}

function draftEstimate(overrides: Record<string, unknown> = {}) {
  return {
    id: 'estimate-1',
    business_id: BUSINESS_A,
    lead_id: 'lead-1',
    proposed_amount_minor_units: 0,
    proposed_amount_currency: 'USD',
    summary: 'Roof + gutters',
    status: 'draft',
    created_by: null,
    approved_at: null,
    approved_by: null,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

test('createLineItem inserts a line item with a correctly computed lineTotal', async () => {
  const { repo } = setup([draftEstimate()]);

  const result = await repo.createLineItem({
    businessId: BUSINESS_A,
    estimateId: 'estimate-1',
    description: 'Roof soft wash',
    quantity: 2,
    unitPrice,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.lineItem.quantity, 2);
    assert.equal(result.lineItem.lineTotal.amountMinorUnits, 30000);
    assert.equal(result.lineItem.lineTotal.currency, 'USD');
  }
});

test('createLineItem rejects once the parent Estimate is approved - line items are immutable after approval', async () => {
  const { repo } = setup([
    draftEstimate({ status: 'approved', approved_at: '2026-01-02T00:00:00.000Z' }),
  ]);

  const result = await repo.createLineItem({
    businessId: BUSINESS_A,
    estimateId: 'estimate-1',
    description: 'Late addition',
    quantity: 1,
    unitPrice,
  });

  assert.equal(result.ok, false);
});

test('createLineItem rejects a cross-tenant estimate', async () => {
  const { repo } = setup([draftEstimate({ business_id: BUSINESS_B })]);

  const result = await repo.createLineItem({
    businessId: BUSINESS_A,
    estimateId: 'estimate-1',
    description: 'Roof soft wash',
    quantity: 1,
    unitPrice,
  });

  assert.equal(result.ok, false);
});

test("listLineItems returns only the requested estimate's line items, in sort order", async () => {
  const { repo } = setup(
    [draftEstimate()],
    [
      {
        id: 'line-2',
        business_id: BUSINESS_A,
        estimate_id: 'estimate-1',
        description: 'Second',
        quantity: 1,
        unit_price_minor_units: 10000,
        unit_price_currency: 'USD',
        line_total_minor_units: 10000,
        line_total_currency: 'USD',
        service_package_id: null,
        sort_order: 1,
        created_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'line-1',
        business_id: BUSINESS_A,
        estimate_id: 'estimate-1',
        description: 'First',
        quantity: 1,
        unit_price_minor_units: 20000,
        unit_price_currency: 'USD',
        line_total_minor_units: 20000,
        line_total_currency: 'USD',
        service_package_id: null,
        sort_order: 0,
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ],
  );

  const result = await repo.listLineItems(BUSINESS_A, 'estimate-1');
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.lineItems.length, 2);
    assert.equal(result.lineItems[0].description, 'First');
    assert.equal(result.lineItems[1].description, 'Second');
  }
});

test('deleteLineItem removes a line item while the estimate is draft', async () => {
  const { repo, estimate_line_items } = setup(
    [draftEstimate()],
    [
      {
        id: 'line-1',
        business_id: BUSINESS_A,
        estimate_id: 'estimate-1',
        description: 'First',
        quantity: 1,
        unit_price_minor_units: 20000,
        unit_price_currency: 'USD',
        line_total_minor_units: 20000,
        line_total_currency: 'USD',
        service_package_id: null,
        sort_order: 0,
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ],
  );

  const result = await repo.deleteLineItem(BUSINESS_A, 'estimate-1', 'line-1');
  assert.equal(result.ok, true);
  assert.equal(estimate_line_items.rows.length, 0);
});

test('deleteLineItem rejects once the parent Estimate is approved', async () => {
  const { repo, estimate_line_items } = setup(
    [draftEstimate({ status: 'approved', approved_at: '2026-01-02T00:00:00.000Z' })],
    [
      {
        id: 'line-1',
        business_id: BUSINESS_A,
        estimate_id: 'estimate-1',
        description: 'First',
        quantity: 1,
        unit_price_minor_units: 20000,
        unit_price_currency: 'USD',
        line_total_minor_units: 20000,
        line_total_currency: 'USD',
        service_package_id: null,
        sort_order: 0,
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ],
  );

  const result = await repo.deleteLineItem(BUSINESS_A, 'estimate-1', 'line-1');
  assert.equal(result.ok, false);
  assert.equal(estimate_line_items.rows.length, 1, 'the line item must remain untouched');
});
