import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseCompanyRepository } from '../src/company-repository';
import { createFakeSupabaseClient, type FakeTable } from './fake-supabase';

const BUSINESS_A = 'business-a';
const BUSINESS_B = 'business-b';

function setup(seed: Array<Record<string, unknown>> = []) {
  const companies: FakeTable = { rows: [...seed], nextId: 1 };
  const client = createFakeSupabaseClient({ companies });
  const repo = createSupabaseCompanyRepository(client);
  return { repo, companies };
}

test('createCompany inserts a new company scoped to the business', async () => {
  const { repo, companies } = setup();

  const result = await repo.createCompany({ businessId: BUSINESS_A, name: 'Acme HOA' });

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.company.name, 'Acme HOA');
  assert.equal(companies.rows[0].business_id, BUSINESS_A);
});

test('getCompany rejects a cross-tenant lookup', async () => {
  const { repo } = setup([
    {
      id: 'company-1',
      business_id: BUSINESS_A,
      name: 'Acme HOA',
      primary_contact_id: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]);

  const own = await repo.getCompany(BUSINESS_A, 'company-1');
  assert.equal(own.ok, true);

  const crossTenant = await repo.getCompany(BUSINESS_B, 'company-1');
  assert.equal(crossTenant.ok, false);
});

test("listCompanies returns only the calling business's companies, and supports a search filter", async () => {
  const { repo } = setup([
    {
      id: 'company-1',
      business_id: BUSINESS_A,
      name: 'Acme HOA',
      primary_contact_id: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'company-2',
      business_id: BUSINESS_A,
      name: 'Riverside Property Management',
      primary_contact_id: null,
      created_at: '2026-01-02T00:00:00.000Z',
    },
    {
      id: 'company-3',
      business_id: BUSINESS_B,
      name: 'Other Tenant Co',
      primary_contact_id: null,
      created_at: '2026-01-03T00:00:00.000Z',
    },
  ]);

  const all = await repo.listCompanies(BUSINESS_A);
  assert.equal(all.ok, true);
  if (all.ok)
    assert.equal(all.companies.length, 2, "must never include another business's company");

  const searched = await repo.listCompanies(BUSINESS_A, { search: 'acme' });
  assert.equal(searched.ok, true);
  if (searched.ok) {
    assert.equal(searched.companies.length, 1);
    assert.equal(searched.companies[0].id, 'company-1');
  }
});

test('archiveCompany removes a company from the default list view without deleting it, and restoreCompany reverses it', async () => {
  const { repo, companies } = setup([
    {
      id: 'company-1',
      business_id: BUSINESS_A,
      name: 'Acme HOA',
      primary_contact_id: null,
      archived_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]);

  const archiveResult = await repo.archiveCompany(BUSINESS_A, 'company-1');
  assert.equal(archiveResult.ok, true);
  assert.ok(companies.rows[0].archived_at);

  const defaultList = await repo.listCompanies(BUSINESS_A);
  assert.equal(defaultList.ok, true);
  if (defaultList.ok) assert.equal(defaultList.companies.length, 0);

  const withArchived = await repo.listCompanies(BUSINESS_A, { includeArchived: true });
  assert.equal(withArchived.ok, true);
  if (withArchived.ok) assert.equal(withArchived.companies.length, 1);

  const restoreResult = await repo.restoreCompany(BUSINESS_A, 'company-1');
  assert.equal(restoreResult.ok, true);
  assert.equal(companies.rows[0].archived_at, null);
});
