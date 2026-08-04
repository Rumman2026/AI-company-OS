import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCurrencyCode, createMoney } from '@ai-company-os/core-models';
import { createSupabaseEstimateRepository } from '../src/estimate-repository';
import { createFakeSupabaseClient, type FakeTable } from './fake-supabase';

const BUSINESS_A = 'business-a';
const BUSINESS_B = 'business-b';
const fixtureAmount = createMoney(50000, createCurrencyCode('USD'));

function setup(seed: Array<Record<string, unknown>> = []) {
  const estimates: FakeTable = { rows: [...seed], nextId: 1 };
  const client = createFakeSupabaseClient({ estimates });
  const repo = createSupabaseEstimateRepository(client);
  return { repo, estimates };
}

test('createEstimate inserts a new estimate scoped to the business', async () => {
  const { repo, estimates } = setup();

  const result = await repo.createEstimate({
    businessId: BUSINESS_A,
    leadId: 'lead-1',
    proposedAmount: fixtureAmount,
    summary: 'Roof soft wash',
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.estimate.summary, 'Roof soft wash');
    assert.equal(result.estimate.proposedAmount.amountMinorUnits, 50000);
  }
  assert.equal(estimates.rows[0].business_id, BUSINESS_A);
});

test('getEstimate rejects a cross-tenant lookup', async () => {
  const { repo } = setup([
    {
      id: 'estimate-1',
      business_id: BUSINESS_A,
      lead_id: 'lead-1',
      proposed_amount_minor_units: 50000,
      proposed_amount_currency: 'USD',
      summary: 'Roof soft wash',
      status: 'draft',
      approved_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]);

  const own = await repo.getEstimate(BUSINESS_A, 'estimate-1');
  assert.equal(own.ok, true);

  const crossTenant = await repo.getEstimate(BUSINESS_B, 'estimate-1');
  assert.equal(crossTenant.ok, false);
});

test("listEstimates returns only the calling business's estimates, optionally filtered by lead", async () => {
  const { repo } = setup([
    {
      id: 'estimate-1',
      business_id: BUSINESS_A,
      lead_id: 'lead-1',
      proposed_amount_minor_units: 50000,
      proposed_amount_currency: 'USD',
      summary: 'Roof soft wash',
      status: 'draft',
      approved_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'estimate-2',
      business_id: BUSINESS_A,
      lead_id: 'lead-2',
      proposed_amount_minor_units: 30000,
      proposed_amount_currency: 'USD',
      summary: 'Driveway cleaning',
      status: 'draft',
      approved_at: null,
      created_at: '2026-01-02T00:00:00.000Z',
    },
    {
      id: 'estimate-3',
      business_id: BUSINESS_B,
      lead_id: 'lead-3',
      proposed_amount_minor_units: 10000,
      proposed_amount_currency: 'USD',
      summary: 'Other tenant',
      status: 'draft',
      approved_at: null,
      created_at: '2026-01-03T00:00:00.000Z',
    },
  ]);

  const all = await repo.listEstimates(BUSINESS_A);
  assert.equal(all.ok, true);
  if (all.ok) assert.equal(all.estimates.length, 2);

  const filtered = await repo.listEstimates(BUSINESS_A, { leadId: 'lead-2' });
  assert.equal(filtered.ok, true);
  if (filtered.ok) {
    assert.equal(filtered.estimates.length, 1);
    assert.equal(filtered.estimates[0].id, 'estimate-2');
  }
});

test('createEstimate always starts a new estimate at status "draft"', async () => {
  const { repo } = setup();

  const result = await repo.createEstimate({
    businessId: BUSINESS_A,
    leadId: 'lead-1',
    proposedAmount: fixtureAmount,
    summary: 'Roof soft wash',
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.estimate.status, 'draft');
    assert.equal(result.estimate.approvedAt, undefined);
  }
});

test('approveEstimate moves a draft estimate to approved and sets approvedAt', async () => {
  const { repo, estimates } = setup([
    {
      id: 'estimate-1',
      business_id: BUSINESS_A,
      lead_id: 'lead-1',
      proposed_amount_minor_units: 50000,
      proposed_amount_currency: 'USD',
      summary: 'Roof soft wash',
      status: 'draft',
      approved_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]);

  const result = await repo.approveEstimate(BUSINESS_A, 'estimate-1');

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.estimate.status, 'approved');
    assert.ok(result.estimate.approvedAt);
  }
  assert.equal(estimates.rows[0].status, 'approved');
});

test('approveEstimate rejects an already-approved estimate rather than silently re-approving', async () => {
  const { repo } = setup([
    {
      id: 'estimate-1',
      business_id: BUSINESS_A,
      lead_id: 'lead-1',
      proposed_amount_minor_units: 50000,
      proposed_amount_currency: 'USD',
      summary: 'Roof soft wash',
      status: 'approved',
      approved_at: '2026-01-02T00:00:00.000Z',
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]);

  const result = await repo.approveEstimate(BUSINESS_A, 'estimate-1');
  assert.equal(result.ok, false);
});

test('approveEstimate rejects a cross-tenant estimate', async () => {
  const { repo, estimates } = setup([
    {
      id: 'estimate-1',
      business_id: BUSINESS_B,
      lead_id: 'lead-1',
      proposed_amount_minor_units: 50000,
      proposed_amount_currency: 'USD',
      summary: 'Roof soft wash',
      status: 'draft',
      approved_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]);

  const result = await repo.approveEstimate(BUSINESS_A, 'estimate-1');
  assert.equal(result.ok, false);
  assert.equal(
    estimates.rows[0].status,
    'draft',
    "the other business's estimate must remain unchanged",
  );
});
