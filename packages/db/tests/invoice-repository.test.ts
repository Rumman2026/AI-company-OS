import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createCurrencyCode,
  createMoney,
  type ProposedAuditRecord,
} from '@ai-company-os/core-models';
import { createSupabaseInvoiceRepository } from '../src/invoice-repository';
import type { AuditLogRepository } from '../src/audit-log-repository';
import { createFakeSupabaseClient, type FakeTable } from './fake-supabase';

const BUSINESS_A = 'business-a';
const BUSINESS_B = 'business-b';
const fixtureAmount = createMoney(50000, createCurrencyCode('USD'));

function createFakeAuditLog() {
  const records: Array<{ businessId: string; record: ProposedAuditRecord }> = [];
  const auditLog: AuditLogRepository = {
    async writeAuditRecord(businessId, record) {
      records.push({ businessId, record });
      return { ok: true };
    },
  };
  return { auditLog, records };
}

function setup(seed: Array<Record<string, unknown>> = []) {
  const invoices: FakeTable = { rows: [...seed], nextId: 1 };
  const client = createFakeSupabaseClient({ invoices });
  const { auditLog, records } = createFakeAuditLog();
  const repo = createSupabaseInvoiceRepository(client, auditLog);
  return { repo, invoices, records };
}

function draftInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: 'invoice-1',
    business_id: BUSINESS_A,
    job_id: 'job-1',
    lead_id: 'lead-1',
    status: 'draft',
    total_amount_minor_units: 50000,
    total_amount_currency: 'USD',
    due_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

test('createInvoice inserts a new invoice at status "draft", scoped to the business', async () => {
  const { repo } = setup();

  const result = await repo.createInvoice({
    businessId: BUSINESS_A,
    jobId: 'job-1',
    leadId: 'lead-1',
    totalAmount: fixtureAmount,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.invoice.status, 'draft');
    assert.equal(result.invoice.jobId, 'job-1');
    assert.equal(result.invoice.totalAmount.amountMinorUnits, 50000);
  }
});

test('a valid transition persists the new status and writes exactly one audit record', async () => {
  const { repo, invoices, records } = setup([draftInvoice()]);

  const result = await repo.transitionInvoiceStatusForRoles(
    BUSINESS_A,
    'invoice-1',
    'sent',
    ['office-manager'],
    { actorId: 'test-actor', occurredAt: '2026-01-02T00:00:00.000Z' },
  );

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.result.outcome, 'success');
  assert.equal(invoices.rows[0].status, 'sent');
  assert.equal(records.length, 1);
  assert.equal(records[0].businessId, BUSINESS_A);
});

test('an invoice belonging to a different business cannot be transitioned (tenant isolation)', async () => {
  const { repo, invoices, records } = setup([draftInvoice({ business_id: BUSINESS_B })]);

  const result = await repo.transitionInvoiceStatusForRoles(
    BUSINESS_A,
    'invoice-1',
    'sent',
    ['office-manager'],
    { actorId: 'test-actor', occurredAt: '2026-01-02T00:00:00.000Z' },
  );

  assert.equal(result.ok, false);
  assert.equal(invoices.rows[0].status, 'draft');
  assert.equal(records.length, 0);
});

test('an illegal transition is rejected and never reaches the database update', async () => {
  const { repo, invoices, records } = setup([draftInvoice()]);

  const result = await repo.transitionInvoiceStatusForRoles(
    BUSINESS_A,
    'invoice-1',
    'paid',
    ['owner-admin'],
    { actorId: 'test-actor', occurredAt: '2026-01-02T00:00:00.000Z' },
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.result.outcome, 'rejected');
    if (result.result.outcome === 'rejected') {
      assert.equal(result.result.errorCode, 'illegal-transition');
    }
  }
  assert.equal(invoices.rows[0].status, 'draft');
  assert.equal(records.length, 0);
});

test('sent -> paid without full-payment evidence is rejected as invalid-evidence, not a database write', async () => {
  const { repo, invoices, records } = setup([draftInvoice({ status: 'sent' })]);

  const result = await repo.transitionInvoiceStatusForRoles(
    BUSINESS_A,
    'invoice-1',
    'paid',
    ['office-manager'],
    { actorId: 'test-actor', occurredAt: '2026-01-02T00:00:00.000Z' },
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.result.outcome, 'rejected');
    if (result.result.outcome === 'rejected') {
      assert.equal(result.result.errorCode, 'invalid-evidence');
    }
  }
  assert.equal(invoices.rows[0].status, 'sent');
  assert.equal(records.length, 0);
});

test('sent -> paid with full-payment evidence succeeds', async () => {
  const { repo, invoices } = setup([draftInvoice({ status: 'sent' })]);

  const result = await repo.transitionInvoiceStatusForRoles(
    BUSINESS_A,
    'invoice-1',
    'paid',
    ['office-manager'],
    { actorId: 'test-actor', occurredAt: '2026-01-02T00:00:00.000Z' },
    { outcome: 'full-payment', amountReceived: fixtureAmount },
  );

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.result.outcome, 'success');
  assert.equal(invoices.rows[0].status, 'paid');
});

test('transitionInvoiceStatusForRoles succeeds for an owner-admin who also holds office-manager', async () => {
  const { repo, invoices } = setup([draftInvoice()]);

  const result = await repo.transitionInvoiceStatusForRoles(
    BUSINESS_A,
    'invoice-1',
    'sent',
    ['owner-admin', 'office-manager'],
    { actorId: 'test-actor', occurredAt: '2026-01-02T00:00:00.000Z' },
  );

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.result.outcome, 'success');
  assert.equal(invoices.rows[0].status, 'sent');
});

test('getInvoice rejects a cross-tenant lookup', async () => {
  const { repo } = setup([draftInvoice()]);

  const own = await repo.getInvoice(BUSINESS_A, 'invoice-1');
  assert.equal(own.ok, true);

  const crossTenant = await repo.getInvoice(BUSINESS_B, 'invoice-1');
  assert.equal(crossTenant.ok, false);
});

test("listInvoices returns only the calling business's invoices, optionally filtered by status", async () => {
  const { repo } = setup([
    draftInvoice(),
    draftInvoice({ id: 'invoice-2', status: 'sent', created_at: '2026-01-02T00:00:00.000Z' }),
    draftInvoice({
      id: 'invoice-3',
      business_id: BUSINESS_B,
      created_at: '2026-01-03T00:00:00.000Z',
    }),
  ]);

  const all = await repo.listInvoices(BUSINESS_A);
  assert.equal(all.ok, true);
  if (all.ok) assert.equal(all.invoices.length, 2);

  const sentOnly = await repo.listInvoices(BUSINESS_A, { status: 'sent' });
  assert.equal(sentOnly.ok, true);
  if (sentOnly.ok) {
    assert.equal(sentOnly.invoices.length, 1);
    assert.equal(sentOnly.invoices[0].id, 'invoice-2');
  }
});
