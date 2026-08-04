import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseBusinessHoursRepository } from '../src/business-hours-repository';
import { createFakeSupabaseClient, type FakeTable } from './fake-supabase';

const BUSINESS_A = 'business-a';
const BUSINESS_B = 'business-b';

function setup(seed: Array<Record<string, unknown>> = []) {
  const business_hours: FakeTable = { rows: [...seed], nextId: 1 };
  const client = createFakeSupabaseClient({ business_hours });
  const repo = createSupabaseBusinessHoursRepository(client);
  return { repo, business_hours };
}

test('listBusinessHours returns an empty list for a business with no saved hours, never fabricated defaults', async () => {
  const { repo } = setup();
  const result = await repo.listBusinessHours(BUSINESS_A);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.hours.length, 0);
});

test('setBusinessHours inserts a full week scoped to the business', async () => {
  const { repo, business_hours } = setup();

  const result = await repo.setBusinessHours(BUSINESS_A, [
    { dayOfWeek: 0, closed: true },
    { dayOfWeek: 1, opensAt: '08:00', closesAt: '17:00', closed: false },
  ]);

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.hours.length, 2);
    const monday = result.hours.find((h) => h.dayOfWeek === 1);
    assert.equal(monday?.opensAt, '08:00');
    assert.equal(monday?.closesAt, '17:00');
  }
  assert.ok(business_hours.rows.every((r) => r.business_id === BUSINESS_A));
});

test('setBusinessHours upserts - saving again replaces the same day rather than duplicating it', async () => {
  const { repo, business_hours } = setup();

  await repo.setBusinessHours(BUSINESS_A, [
    { dayOfWeek: 1, opensAt: '08:00', closesAt: '17:00', closed: false },
  ]);
  const result = await repo.setBusinessHours(BUSINESS_A, [
    { dayOfWeek: 1, opensAt: '09:00', closesAt: '18:00', closed: false },
  ]);

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.hours.length, 1, 'must not duplicate the same day');
    assert.equal(result.hours[0].opensAt, '09:00');
  }
  assert.equal(business_hours.rows.length, 1);
});

test("listBusinessHours never returns another business's hours", async () => {
  const { repo } = setup([
    {
      id: '1',
      business_id: BUSINESS_B,
      day_of_week: 1,
      opens_at: '08:00',
      closes_at: '17:00',
      closed: false,
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]);

  const result = await repo.listBusinessHours(BUSINESS_A);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.hours.length, 0);
});
