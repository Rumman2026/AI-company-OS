import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseBookingRepository } from '../src/booking-repository';
import { createFakeSupabaseClient, type FakeTable } from './fake-supabase';

const BUSINESS_A = 'business-a';
const BUSINESS_B = 'business-b';

function setup(seed: Array<Record<string, unknown>> = []) {
  const bookings: FakeTable = { rows: [...seed], nextId: 1 };
  const client = createFakeSupabaseClient({ bookings });
  const repo = createSupabaseBookingRepository(client);
  return { repo, bookings };
}

test('createBooking inserts a new booking scoped to the business, with no job linked yet', async () => {
  const { repo, bookings } = setup();

  const result = await repo.createBooking({
    businessId: BUSINESS_A,
    leadId: 'lead-1',
    estimateId: 'estimate-1',
    scheduledAt: '2026-02-01T09:00:00.000Z',
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.booking.estimateId, 'estimate-1');
    assert.equal(result.booking.jobId, undefined);
  }
  assert.equal(bookings.rows[0].business_id, BUSINESS_A);
});

test('getBooking rejects a cross-tenant lookup', async () => {
  const { repo } = setup([
    {
      id: 'booking-1',
      business_id: BUSINESS_A,
      lead_id: 'lead-1',
      estimate_id: 'estimate-1',
      job_id: null,
      scheduled_at: '2026-02-01T09:00:00.000Z',
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]);

  const own = await repo.getBooking(BUSINESS_A, 'booking-1');
  assert.equal(own.ok, true);

  const crossTenant = await repo.getBooking(BUSINESS_B, 'booking-1');
  assert.equal(crossTenant.ok, false);
});

test('linkJob sets job_id on the correct business-scoped booking only', async () => {
  const { repo, bookings } = setup([
    {
      id: 'booking-1',
      business_id: BUSINESS_A,
      lead_id: 'lead-1',
      estimate_id: 'estimate-1',
      job_id: null,
      scheduled_at: '2026-02-01T09:00:00.000Z',
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]);

  const result = await repo.linkJob(BUSINESS_A, 'booking-1', 'job-1');
  assert.equal(result.ok, true);
  assert.equal(bookings.rows[0].job_id, 'job-1');

  const getResult = await repo.getBooking(BUSINESS_A, 'booking-1');
  assert.equal(getResult.ok, true);
  if (getResult.ok) assert.equal(getResult.booking.jobId, 'job-1');
});

test("listBookings returns only the calling business's bookings, optionally filtered by lead", async () => {
  const { repo } = setup([
    {
      id: 'booking-1',
      business_id: BUSINESS_A,
      lead_id: 'lead-1',
      estimate_id: 'estimate-1',
      job_id: null,
      scheduled_at: '2026-02-01T09:00:00.000Z',
      created_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'booking-2',
      business_id: BUSINESS_B,
      lead_id: 'lead-2',
      estimate_id: 'estimate-2',
      job_id: null,
      scheduled_at: '2026-02-02T09:00:00.000Z',
      created_at: '2026-01-02T00:00:00.000Z',
    },
  ]);

  const all = await repo.listBookings(BUSINESS_A);
  assert.equal(all.ok, true);
  if (all.ok) assert.equal(all.bookings.length, 1);
});
