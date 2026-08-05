import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createActivityTimelineRepository } from '../src/activity-timeline-repository';
import { createSupabaseLeadRepository } from '../src/lead-repository';
import { createSupabaseEstimateRepository } from '../src/estimate-repository';
import { createSupabaseBookingRepository } from '../src/booking-repository';
import { createSupabaseJobRepository } from '../src/job-repository';
import { createSupabaseNoteRepository } from '../src/note-repository';
import { createSupabaseTaskRepository } from '../src/task-repository';
import { createSupabasePhotoAssetRepository } from '../src/photo-asset-repository';
import { createSupabaseAuditLogRepository } from '../src/audit-log-repository';
import { createSupabaseInvoiceRepository } from '../src/invoice-repository';
import { createSupabasePaymentRepository } from '../src/payment-repository';
import { createSupabaseReviewRecordRepository } from '../src/review-record-repository';
import { createFakeSupabaseClient, type FakeTable } from './fake-supabase';

const BUSINESS_A = 'business-a';
const BUSINESS_B = 'business-b';

function setup() {
  const tables: Record<string, FakeTable> = {
    contacts: { rows: [], nextId: 1 },
    leads: {
      rows: [
        {
          id: 'lead-1',
          business_id: BUSINESS_A,
          contact_id: 'contact-1',
          status: 'booked',
          attribution: { channel: 'unknown', leadCreatedAt: '2026-01-01T00:00:00.000Z' },
          duplicate_of_lead_id: null,
          archived_at: null,
          created_at: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'lead-other-tenant',
          business_id: BUSINESS_B,
          contact_id: 'contact-1',
          status: 'new',
          attribution: { channel: 'unknown', leadCreatedAt: '2026-01-01T00:00:00.000Z' },
          duplicate_of_lead_id: null,
          archived_at: null,
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      nextId: 3,
    },
    estimates: {
      rows: [
        {
          id: 'estimate-1',
          business_id: BUSINESS_A,
          lead_id: 'lead-1',
          proposed_amount_minor_units: 50000,
          proposed_amount_currency: 'USD',
          summary: 'Roof soft wash',
          status: 'approved',
          created_by: 'user-office-manager',
          approved_at: '2026-01-02T00:00:00.000Z',
          approved_by: 'user-owner',
          created_at: '2026-01-01T12:00:00.000Z',
        },
      ],
      nextId: 2,
    },
    bookings: {
      rows: [
        {
          id: 'booking-1',
          business_id: BUSINESS_A,
          lead_id: 'lead-1',
          estimate_id: 'estimate-1',
          job_id: 'job-1',
          scheduled_at: '2026-01-05T15:00:00.000Z',
          created_by: 'user-office-manager',
          created_at: '2026-01-02T01:00:00.000Z',
        },
      ],
      nextId: 2,
    },
    jobs: {
      rows: [
        {
          id: 'job-1',
          business_id: BUSINESS_A,
          lead_id: 'lead-1',
          booking_id: 'booking-1',
          status: 'completed',
          technician_id: null,
          scheduled_at: '2026-01-05T15:00:00.000Z',
          created_at: '2026-01-02T01:00:00.000Z',
        },
      ],
      nextId: 2,
    },
    notes: {
      rows: [
        {
          id: 'note-contact-1',
          business_id: BUSINESS_A,
          entity_type: 'contact',
          entity_id: 'contact-1',
          body: 'Prefers text over calls',
          author_id: 'user-office-manager',
          created_at: '2026-01-01T08:00:00.000Z',
        },
        {
          id: 'note-job-1',
          business_id: BUSINESS_A,
          entity_type: 'job',
          entity_id: 'job-1',
          body: 'Gate code is 1234',
          author_id: 'user-technician',
          created_at: '2026-01-05T14:00:00.000Z',
        },
      ],
      nextId: 3,
    },
    tasks: {
      rows: [
        {
          id: 'task-1',
          business_id: BUSINESS_A,
          title: 'Follow up after service',
          description: null,
          due_at: null,
          assigned_to: null,
          entity_type: 'job',
          entity_id: 'job-1',
          completed: true,
          created_by: 'user-office-manager',
          completed_at: '2026-01-06T00:00:00.000Z',
          completed_by: 'user-office-manager',
          created_at: '2026-01-05T16:00:00.000Z',
        },
      ],
      nextId: 2,
    },
    photo_assets: {
      rows: [
        {
          id: 'photo-1',
          business_id: BUSINESS_A,
          job_id: 'job-1',
          kind: 'after',
          private_original_ref: `${BUSINESS_A}/job-1/after.jpg`,
          public_derivative_ref: null,
          metadata_stripped: false,
          gps_data_removed: false,
          privacy_review_passed: false,
          face_review_passed: null,
          license_plate_review_passed: null,
          human_publication_approved: false,
          publication_consent_granted: false,
          publication_status: 'not-published',
          caption: null,
          alt_text_draft: null,
          uploaded_by: 'user-technician',
          created_at: '2026-01-05T17:00:00.000Z',
        },
      ],
      nextId: 2,
    },
    invoices: {
      rows: [
        {
          id: 'invoice-1',
          business_id: BUSINESS_A,
          job_id: 'job-1',
          lead_id: 'lead-1',
          status: 'paid',
          total_amount_minor_units: 50000,
          total_amount_currency: 'USD',
          due_at: null,
          created_at: '2026-01-06T00:00:00.000Z',
        },
      ],
      nextId: 2,
    },
    payments: {
      rows: [
        {
          id: 'payment-1',
          business_id: BUSINESS_A,
          invoice_id: 'invoice-1',
          amount_minor_units: 50000,
          amount_currency: 'USD',
          occurred_at: '2026-01-07T00:00:00.000Z',
          created_at: '2026-01-07T00:00:00.000Z',
        },
      ],
      nextId: 2,
    },
    review_records: {
      rows: [
        {
          id: 'review-record-1',
          business_id: BUSINESS_A,
          review_request_id: null,
          job_id: 'job-1',
          source_platform: 'Google',
          received_at: '2026-01-08T00:00:00.000Z',
        },
      ],
      nextId: 2,
    },
    audit_log: {
      rows: [
        {
          id: 'audit-1',
          business_id: BUSINESS_A,
          entity_type: 'Lead',
          entity_id: 'lead-1',
          action: 'status-change',
          previous_value: 'new',
          new_value: 'booked',
          actor_category: 'office-manager',
          actor_id: 'user-office-manager',
          automated: false,
          occurred_at: '2026-01-02T00:30:00.000Z',
          reason: null,
          correlation_id: null,
        },
        {
          id: 'audit-2',
          business_id: BUSINESS_A,
          entity_type: 'Job',
          entity_id: 'job-1',
          action: 'status-change',
          previous_value: 'in-progress',
          new_value: 'completed',
          actor_category: 'technician',
          actor_id: 'user-technician',
          automated: false,
          occurred_at: '2026-01-05T18:00:00.000Z',
          reason: null,
          correlation_id: null,
        },
      ],
      nextId: 3,
    },
  };

  const client = createFakeSupabaseClient(tables);
  const auditLogRepository = createSupabaseAuditLogRepository(client);
  const timeline = createActivityTimelineRepository({
    leadRepository: createSupabaseLeadRepository(client, auditLogRepository),
    estimateRepository: createSupabaseEstimateRepository(client),
    bookingRepository: createSupabaseBookingRepository(client),
    jobRepository: createSupabaseJobRepository(client, auditLogRepository),
    noteRepository: createSupabaseNoteRepository(client),
    taskRepository: createSupabaseTaskRepository(client),
    photoAssetRepository: createSupabasePhotoAssetRepository(client),
    auditLogRepository,
    invoiceRepository: createSupabaseInvoiceRepository(client, auditLogRepository),
    paymentRepository: createSupabasePaymentRepository(client),
    reviewRecordRepository: createSupabaseReviewRecordRepository(client),
  });

  return { timeline };
}

test('listTimelineForContact composes every event source into one chronological, most-recent-first list', async () => {
  const { timeline } = setup();

  const result = await timeline.listTimelineForContact(BUSINESS_A, 'contact-1');

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const types = result.entries.map((e) => e.type);
  assert.ok(types.includes('lead-created'));
  assert.ok(types.includes('lead-status-change'));
  assert.ok(types.includes('estimate-created'));
  assert.ok(types.includes('estimate-approved'));
  assert.ok(types.includes('appointment-scheduled'));
  assert.ok(types.includes('job-created'));
  assert.ok(types.includes('job-status-change'));
  assert.ok(types.includes('note-added'));
  assert.ok(types.includes('task-created'));
  assert.ok(types.includes('task-completed'));
  assert.ok(types.includes('media-uploaded'));
  assert.ok(types.includes('invoice-created'));
  assert.ok(types.includes('payment-received'));
  assert.ok(types.includes('review-received'));

  for (let i = 1; i < result.entries.length; i++) {
    assert.ok(
      result.entries[i - 1].occurredAt >= result.entries[i].occurredAt,
      'entries must be sorted most-recent-first',
    );
  }
});

test("listTimelineForContact never includes another business's lead history (tenant isolation)", async () => {
  const { timeline } = setup();

  const result = await timeline.listTimelineForContact(BUSINESS_A, 'contact-1');
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.ok(result.entries.every((e) => e.entityId !== 'lead-other-tenant'));
});

test('listTimelineForContact filters by type', async () => {
  const { timeline } = setup();

  const result = await timeline.listTimelineForContact(BUSINESS_A, 'contact-1', {
    types: ['media-uploaded'],
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].type, 'media-uploaded');
  assert.equal(result.entries[0].actorId, 'user-technician');
});

test('listTimelineForContact filters by employee (actorId)', async () => {
  const { timeline } = setup();

  const result = await timeline.listTimelineForContact(BUSINESS_A, 'contact-1', {
    actorId: 'user-technician',
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(result.entries.length > 0);
  assert.ok(result.entries.every((e) => e.actorId === 'user-technician'));
});

test('listTimelineForContact filters by date range', async () => {
  const { timeline } = setup();

  const result = await timeline.listTimelineForContact(BUSINESS_A, 'contact-1', {
    dateFrom: '2026-01-05T00:00:00.000Z',
    dateTo: '2026-01-05T23:59:59.000Z',
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(result.entries.length > 0);
  assert.ok(
    result.entries.every(
      (e) =>
        e.occurredAt >= '2026-01-05T00:00:00.000Z' && e.occurredAt <= '2026-01-05T23:59:59.000Z',
    ),
  );
});

test('listTimelineForContact never fabricates an entry for a not-yet-implemented type', async () => {
  const { timeline } = setup();

  const result = await timeline.listTimelineForContact(BUSINESS_A, 'contact-1');
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const notYetImplemented = ['call-logged', 'sms-sent', 'email-sent', 'review-request-sent'];
  assert.ok(result.entries.every((e) => !notYetImplemented.includes(e.type)));
});

test('listTimelineForContact reports invoice-created, payment-received, and review-received with correct summaries', async () => {
  const { timeline } = setup();

  const result = await timeline.listTimelineForContact(BUSINESS_A, 'contact-1');
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const invoiceEntry = result.entries.find((e) => e.type === 'invoice-created');
  assert.ok(invoiceEntry);
  assert.equal(invoiceEntry?.summary, 'Invoice created (500 USD)');

  const paymentEntry = result.entries.find((e) => e.type === 'payment-received');
  assert.ok(paymentEntry);
  assert.equal(paymentEntry?.summary, 'Payment received (500 USD)');

  const reviewEntry = result.entries.find((e) => e.type === 'review-received');
  assert.ok(reviewEntry);
  assert.equal(reviewEntry?.summary, 'Review received (Google)');
});
