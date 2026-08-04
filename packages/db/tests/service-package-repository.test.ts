import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCurrencyCode, createMoney } from '@ai-company-os/core-models';
import { createSupabaseServicePackageRepository } from '../src/service-package-repository';
import { createFakeSupabaseClient, type FakeTable } from './fake-supabase';

const BUSINESS_A = 'business-a';
const BUSINESS_B = 'business-b';
const fixturePrice = createMoney(45000, createCurrencyCode('USD'));

function setup(seed: Array<Record<string, unknown>> = []) {
  const service_packages: FakeTable = { rows: [...seed], nextId: 1 };
  const client = createFakeSupabaseClient({ service_packages });
  const repo = createSupabaseServicePackageRepository(client);
  return { repo, service_packages };
}

test('createServicePackage inserts a new, active package scoped to the business', async () => {
  const { repo, service_packages } = setup();

  const result = await repo.createServicePackage({
    businessId: BUSINESS_A,
    name: 'Roof soft wash',
    defaultUnitPrice: fixturePrice,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.servicePackage.name, 'Roof soft wash');
    assert.equal(result.servicePackage.active, true);
  }
  assert.equal(service_packages.rows[0].business_id, BUSINESS_A);
});

test("listServicePackages returns only the calling business's active packages by default", async () => {
  const { repo } = setup([
    {
      id: 'pkg-1',
      business_id: BUSINESS_A,
      name: 'Roof soft wash',
      description: null,
      default_unit_price_minor_units: 45000,
      default_unit_price_currency: 'USD',
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'pkg-2',
      business_id: BUSINESS_A,
      name: 'Retired package',
      description: null,
      default_unit_price_minor_units: 10000,
      default_unit_price_currency: 'USD',
      active: false,
      created_at: '2026-01-02T00:00:00.000Z',
    },
    {
      id: 'pkg-3',
      business_id: BUSINESS_B,
      name: 'Other tenant package',
      description: null,
      default_unit_price_minor_units: 20000,
      default_unit_price_currency: 'USD',
      active: true,
      created_at: '2026-01-03T00:00:00.000Z',
    },
  ]);

  const activeOnly = await repo.listServicePackages(BUSINESS_A);
  assert.equal(activeOnly.ok, true);
  if (activeOnly.ok) {
    assert.equal(activeOnly.servicePackages.length, 1);
    assert.equal(activeOnly.servicePackages[0].id, 'pkg-1');
  }

  const withInactive = await repo.listServicePackages(BUSINESS_A, { includeInactive: true });
  assert.equal(withInactive.ok, true);
  if (withInactive.ok) assert.equal(withInactive.servicePackages.length, 2);
});

test('setServicePackageActive deactivates a package for the correct business only', async () => {
  const { repo, service_packages } = setup([
    {
      id: 'pkg-1',
      business_id: BUSINESS_A,
      name: 'Roof soft wash',
      description: null,
      default_unit_price_minor_units: 45000,
      default_unit_price_currency: 'USD',
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]);

  const result = await repo.setServicePackageActive(BUSINESS_A, 'pkg-1', false);
  assert.equal(result.ok, true);
  assert.equal(service_packages.rows[0].active, false);
});
