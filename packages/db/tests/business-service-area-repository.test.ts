import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseBusinessServiceAreaRepository } from '../src/business-service-area-repository';
import { createFakeSupabaseClient, type FakeTable } from './fake-supabase';

const BUSINESS_A = 'business-a';
const BUSINESS_B = 'business-b';

function setup(seed: Array<Record<string, unknown>> = []) {
  const business_service_areas: FakeTable = { rows: [...seed], nextId: 1 };
  const client = createFakeSupabaseClient({ business_service_areas });
  const repo = createSupabaseBusinessServiceAreaRepository(client);
  return { repo, business_service_areas };
}

test('createServiceArea inserts a new area scoped to the business', async () => {
  const { repo, business_service_areas } = setup();

  const result = await repo.createServiceArea(BUSINESS_A, 'Sacramento');
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.area.areaName, 'Sacramento');
  assert.equal(business_service_areas.rows[0].business_id, BUSINESS_A);
});

test("listServiceAreas returns only the calling business's areas", async () => {
  const { repo } = setup([
    {
      id: 'area-1',
      business_id: BUSINESS_A,
      area_name: 'Sacramento',
      created_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'area-2',
      business_id: BUSINESS_B,
      area_name: 'Fresno',
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]);

  const result = await repo.listServiceAreas(BUSINESS_A);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.areas.length, 1);
    assert.equal(result.areas[0].areaName, 'Sacramento');
  }
});

test('deleteServiceArea removes an area for the correct business only', async () => {
  const { repo, business_service_areas } = setup([
    {
      id: 'area-1',
      business_id: BUSINESS_A,
      area_name: 'Sacramento',
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]);

  const crossTenant = await repo.deleteServiceArea(BUSINESS_B, 'area-1');
  assert.equal(crossTenant.ok, true);
  assert.equal(business_service_areas.rows.length, 1, "must not remove another business's row");

  const result = await repo.deleteServiceArea(BUSINESS_A, 'area-1');
  assert.equal(result.ok, true);
  assert.equal(business_service_areas.rows.length, 0);
});
