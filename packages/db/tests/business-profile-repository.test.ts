import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseBusinessProfileRepository } from '../src/business-profile-repository';
import { createFakeSupabaseClient, type FakeTable } from './fake-supabase';

function setup(seed: Array<Record<string, unknown>> = []) {
  const businesses: FakeTable = { rows: [...seed], nextId: 1 };
  const client = createFakeSupabaseClient({ businesses });
  const repo = createSupabaseBusinessProfileRepository(client);
  return { repo, businesses };
}

function seededBusiness(overrides: Record<string, unknown> = {}) {
  return {
    id: 'business-a',
    name: 'GreenCal Pressure Washing',
    slug: 'greencal-pressure-washing',
    address: null,
    city: null,
    state: null,
    postal_code: null,
    phone: null,
    email: null,
    website: null,
    logo_storage_ref: null,
    primary_color: null,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function fakeFile(): Blob {
  return new Blob(['fake-logo-bytes'], { type: 'image/png' });
}

test('getBusinessProfile returns the profile for the given business id', async () => {
  const { repo } = setup([seededBusiness()]);

  const result = await repo.getBusinessProfile('business-a');
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.profile.name, 'GreenCal Pressure Washing');
    assert.equal(result.profile.address, undefined);
  }
});

test('getBusinessProfile reports a typed error for an unknown business', async () => {
  const { repo } = setup();
  const result = await repo.getBusinessProfile('never-created');
  assert.equal(result.ok, false);
});

test('updateBusinessProfile sets the provided fields and leaves others untouched', async () => {
  const { repo, businesses } = setup([seededBusiness()]);

  const result = await repo.updateBusinessProfile('business-a', {
    address: '123 Main St',
    city: 'Sacramento',
    state: 'CA',
    postalCode: '95814',
    phone: '916-555-0100',
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.profile.address, '123 Main St');
    assert.equal(result.profile.city, 'Sacramento');
    assert.equal(result.profile.name, 'GreenCal Pressure Washing', 'name must remain unchanged');
  }
  assert.equal(businesses.rows[0].address, '123 Main St');
});

test('updateBusinessProfile clears a field when given an empty string', async () => {
  const { repo } = setup([seededBusiness({ phone: '916-555-0100' })]);

  const result = await repo.updateBusinessProfile('business-a', { phone: '' });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.profile.phone, undefined);
});

test('uploadBusinessLogo stores the file and records its path, replacing any prior logo', async () => {
  const { repo, businesses } = setup([
    seededBusiness({ logo_storage_ref: 'business-a/old-logo.png' }),
  ]);

  const result = await repo.uploadBusinessLogo({
    businessId: 'business-a',
    file: fakeFile(),
    fileName: 'logo.png',
    contentType: 'image/png',
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.ok(result.profile.logoStorageRef?.endsWith('logo.png'));
  }
  assert.notEqual(businesses.rows[0].logo_storage_ref, 'business-a/old-logo.png');
});

test('getBusinessLogoSignedUrl returns null when no logo has been uploaded', async () => {
  const { repo } = setup([seededBusiness()]);
  const url = await repo.getBusinessLogoSignedUrl('business-a');
  assert.equal(url, null);
});

test('getBusinessLogoSignedUrl returns a signed URL after a real upload', async () => {
  const { repo } = setup([seededBusiness()]);

  await repo.uploadBusinessLogo({
    businessId: 'business-a',
    file: fakeFile(),
    fileName: 'logo.png',
  });

  const url = await repo.getBusinessLogoSignedUrl('business-a');
  assert.ok(url);
});
