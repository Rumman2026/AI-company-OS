import {
  createInvoiceId,
  createMoney,
  createCurrencyCode,
  transitionInvoice,
  resolveTransitionAcrossActorCategories,
  type ActorCategory,
  type Invoice,
  type InvoiceStatus,
  type LeadId,
  type JobId,
  type Money,
  type PaymentOutcomeEvidence,
  type TransitionContext,
  type TransitionResult,
} from '@ai-company-os/core-models';
import type { MinimalSupabaseClient } from './supabase-client';
import type { AuditLogRepository } from './audit-log-repository';

export interface CreateInvoiceInput {
  readonly businessId: string;
  readonly jobId: string;
  readonly leadId: string;
  readonly totalAmount: Money;
  readonly dueAt?: string;
}

export type CreateInvoiceResult = { ok: true; invoice: Invoice } | { ok: false; error: string };
export type GetInvoiceResult = { ok: true; invoice: Invoice } | { ok: false; error: string };
export type ListInvoicesResult = { ok: true; invoices: Invoice[] } | { ok: false; error: string };
export type TransitionInvoiceResult =
  { ok: true; result: TransitionResult<InvoiceStatus, Invoice> } | { ok: false; error: string };

export interface ListInvoicesOptions {
  readonly status?: InvoiceStatus;
  readonly jobId?: string;
  readonly leadId?: string;
}

export interface InvoiceRepository {
  /** Inserts a new Invoice at its initial 'draft' status - mirrors JobRepository.createJob. */
  createInvoice(input: CreateInvoiceInput): Promise<CreateInvoiceResult>;
  getInvoice(businessId: string, invoiceId: string): Promise<GetInvoiceResult>;
  listInvoices(businessId: string, options?: ListInvoicesOptions): Promise<ListInvoicesResult>;
  /**
   * Same as `transitionJobStatusForRoles` - tries each of the caller's
   * roles until one is authorized for the requested edge (see
   * DECISIONS.md ADR-0018). `evidence` is required for the
   * payment-related edges `transitionInvoice()` itself defines
   * (partially-paid/paid) - omitting it when required is rejected as
   * `invalid-evidence`, not silently accepted.
   */
  transitionInvoiceStatusForRoles(
    businessId: string,
    invoiceId: string,
    requestedStatus: InvoiceStatus,
    actorCategories: readonly ActorCategory[],
    context: Omit<TransitionContext, 'actorCategory'>,
    evidence?: PaymentOutcomeEvidence,
  ): Promise<TransitionInvoiceResult>;
}

interface InvoiceRow {
  id: string;
  job_id: string;
  lead_id: string;
  status: InvoiceStatus;
  total_amount_minor_units: number;
  total_amount_currency: string;
  due_at: string | null;
  created_at: string;
}

function toInvoice(row: InvoiceRow): Invoice {
  return {
    id: createInvoiceId(row.id),
    jobId: row.job_id as JobId,
    leadId: row.lead_id as LeadId,
    status: row.status,
    totalAmount: createMoney(
      row.total_amount_minor_units,
      createCurrencyCode(row.total_amount_currency),
    ),
    dueAt: row.due_at ?? undefined,
    createdAt: row.created_at,
  };
}

const SELECT_COLUMNS =
  'id, job_id, lead_id, status, total_amount_minor_units, total_amount_currency, due_at, created_at';

export function createSupabaseInvoiceRepository(
  client: MinimalSupabaseClient,
  auditLog: AuditLogRepository,
): InvoiceRepository {
  return {
    async createInvoice(input) {
      const { data, error } = await client
        .from('invoices')
        .insert({
          business_id: input.businessId,
          job_id: input.jobId,
          lead_id: input.leadId,
          status: 'draft',
          total_amount_minor_units: input.totalAmount.amountMinorUnits,
          total_amount_currency: input.totalAmount.currency,
          due_at: input.dueAt ?? null,
        })
        .select(SELECT_COLUMNS)
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'invoice_insert_failed' };
      }
      return { ok: true, invoice: toInvoice(data as InvoiceRow) };
    },

    async getInvoice(businessId, invoiceId) {
      const { data, error } = await client
        .from('invoices')
        .select(SELECT_COLUMNS)
        .eq('id', invoiceId)
        .eq('business_id', businessId)
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'invoice_not_found' };
      }
      return { ok: true, invoice: toInvoice(data as InvoiceRow) };
    },

    async listInvoices(businessId, options = {}) {
      let query = client
        .from('invoices')
        .select(SELECT_COLUMNS)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (options.status) query = query.eq('status', options.status);
      if (options.jobId) query = query.eq('job_id', options.jobId);
      if (options.leadId) query = query.eq('lead_id', options.leadId);

      const { data, error } = await query;

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'invoice_list_failed' };
      }
      return { ok: true, invoices: (data as InvoiceRow[]).map(toInvoice) };
    },

    async transitionInvoiceStatusForRoles(
      businessId,
      invoiceId,
      requestedStatus,
      actorCategories,
      context,
      evidence,
    ) {
      const { data, error } = await client
        .from('invoices')
        .select(SELECT_COLUMNS)
        .eq('id', invoiceId)
        .eq('business_id', businessId)
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'invoice_not_found' };
      }

      const currentInvoice = toInvoice(data as InvoiceRow);
      const result = resolveTransitionAcrossActorCategories(
        (ctx) => transitionInvoice(currentInvoice, requestedStatus, ctx, evidence),
        actorCategories,
        context,
      );

      if (result.outcome === 'rejected') {
        return { ok: true, result };
      }

      const { error: updateError } = await client
        .from('invoices')
        .update({ status: result.nextState })
        .eq('id', invoiceId)
        .eq('business_id', businessId);

      if (updateError) {
        return { ok: false, error: updateError.message ?? 'invoice_update_failed' };
      }

      const auditWrite = await auditLog.writeAuditRecord(businessId, result.auditRecord);
      if (!auditWrite.ok) {
        return { ok: false, error: `audit_write_failed: ${auditWrite.error}` };
      }

      return { ok: true, result };
    },
  };
}
