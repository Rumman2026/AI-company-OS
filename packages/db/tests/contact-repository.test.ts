import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseContactRepository } from '../src/contact-repository';
import { createFakeSupabaseClient, type FakeTable } from './fake-supabase';

const BUSINESS_A = 'business-a';
const BUSINESS_B = 'business-b';

function setup(seed: Array<Record<string, unknown>> = []) {
  const contacts: FakeTable = { rows: [...seed], nextId: 1 };
  const client = createFakeSupabaseClient({ contacts });
  const repo = createSupabaseContactRepository(client);
  return { repo, contacts };
}

test('creates a new contact when no phone or email match exists', async () => {
  const { repo, contacts } = setup();

  const result = await repo.findOrCreateContact({
    businessId: BUSINESS_A,
    displayName: 'Jane Doe',
    phone: '5551234567',
    email: 'jane@example.com',
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.created, true);
    assert.equal(result.contact.displayName, 'Jane Doe');
  }
  assert.equal(contacts.rows.length, 1);
  assert.equal(contacts.rows[0].business_id, BUSINESS_A);
});

test('finds an existing contact by phone within the same business instead of creating a duplicate', async () => {
  const { repo, contacts } = setup([
    {
      id: 'existing-1',
      business_id: BUSINESS_A,
      display_name: 'Jane Doe',
      phone: '5551234567',
      email: 'jane@example.com',
      created_at: '2025-01-01T00:00:00.000Z',
    },
  ]);

  const result = await repo.findOrCreateContact({
    businessId: BUSINESS_A,
    displayName: 'Jane Doe',
    phone: '5551234567',
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.created, false);
    assert.equal(result.contact.id, 'existing-1');
  }
  assert.equal(contacts.rows.length, 1, 'no new row should be inserted');
});

test('never returns a matching phone/email belonging to a different business (tenant isolation)', async () => {
  const { repo, contacts } = setup([
    {
      id: 'other-tenant-contact',
      business_id: BUSINESS_B,
      display_name: 'Someone Else',
      phone: '5551234567',
      email: 'jane@example.com',
      created_at: '2025-01-01T00:00:00.000Z',
    },
  ]);

  const result = await repo.findOrCreateContact({
    businessId: BUSINESS_A,
    displayName: 'Jane Doe',
    phone: '5551234567',
    email: 'jane@example.com',
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(
      result.created,
      true,
      "must create a new contact for business A, not reuse business B's row",
    );
    assert.notEqual(result.contact.id, 'other-tenant-contact');
  }
  assert.equal(contacts.rows.length, 2);
});

test('finds an existing contact by email when phone is not provided', async () => {
  const { repo } = setup([
    {
      id: 'existing-2',
      business_id: BUSINESS_A,
      display_name: 'John Smith',
      phone: null,
      email: 'john@example.com',
      created_at: '2025-01-01T00:00:00.000Z',
    },
  ]);

  const result = await repo.findOrCreateContact({
    businessId: BUSINESS_A,
    displayName: 'John Smith',
    email: 'john@example.com',
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.created, false);
    assert.equal(result.contact.id, 'existing-2');
  }
});

test('getContact returns a contact scoped to the business, and rejects a cross-tenant lookup', async () => {
  const { repo } = setup([
    {
      id: 'contact-1',
      business_id: BUSINESS_A,
      display_name: 'Jane Doe',
      phone: '5551234567',
      email: 'jane@example.com',
      created_at: '2025-01-01T00:00:00.000Z',
    },
  ]);

  const own = await repo.getContact(BUSINESS_A, 'contact-1');
  assert.equal(own.ok, true);

  const crossTenant = await repo.getContact(BUSINESS_B, 'contact-1');
  assert.equal(crossTenant.ok, false);
});

test("listContacts returns only the calling business's contacts, and supports a search filter", async () => {
  const { repo } = setup([
    {
      id: 'contact-1',
      business_id: BUSINESS_A,
      display_name: 'Jane Doe',
      phone: '5551234567',
      email: 'jane@example.com',
      created_at: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 'contact-2',
      business_id: BUSINESS_A,
      display_name: 'John Smith',
      phone: null,
      email: 'john@example.com',
      created_at: '2025-01-02T00:00:00.000Z',
    },
    {
      id: 'contact-3',
      business_id: BUSINESS_B,
      display_name: 'Other Tenant Contact',
      phone: null,
      email: null,
      created_at: '2025-01-03T00:00:00.000Z',
    },
  ]);

  const all = await repo.listContacts(BUSINESS_A);
  assert.equal(all.ok, true);
  if (all.ok) {
    assert.equal(all.contacts.length, 2, "must never include another business's contact");
  }

  const searched = await repo.listContacts(BUSINESS_A, { search: 'jane' });
  assert.equal(searched.ok, true);
  if (searched.ok) {
    assert.equal(searched.contacts.length, 1);
    assert.equal(searched.contacts[0].id, 'contact-1');
  }
});

test('linkCompany sets company_id on the correct business-scoped contact only', async () => {
  const { repo, contacts } = setup([
    {
      id: 'contact-1',
      business_id: BUSINESS_A,
      display_name: 'Jane Doe',
      phone: '5551234567',
      email: 'jane@example.com',
      created_at: '2025-01-01T00:00:00.000Z',
    },
  ]);

  const result = await repo.linkCompany(BUSINESS_A, 'contact-1', 'company-1');
  assert.equal(result.ok, true);
  assert.equal(contacts.rows[0].company_id, 'company-1');

  const getResult = await repo.getContact(BUSINESS_A, 'contact-1');
  assert.equal(getResult.ok, true);
  if (getResult.ok) assert.equal(getResult.contact.companyId, 'company-1');
});
