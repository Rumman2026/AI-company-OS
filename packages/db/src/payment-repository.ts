import {
  createPaymentId,
  createMoney,
  createCurrencyCode,
  type Payment,
  type InvoiceId,
  type Money,
} from '@ai-company-os/core-models';
import type { MinimalSupabaseClient } from './supabase-client';

export interface CreatePaymentInput {
  readonly businessId: string;
  readonly invoiceId: string;
  readonly amount: Money;
  readonly occurredAt: string;
}

export type CreatePaymentResult = { ok: true; payment: Payment } | { ok: false; error: string };
export type ListPaymentsResult = { ok: true; payments: Payment[] } | { ok: false; error: string };

export interface PaymentRepository {
  /** Records a payment fact against an Invoice - staff-entered, never a live payment-gateway integration. */
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  listPaymentsForInvoice(businessId: string, invoiceId: string): Promise<ListPaymentsResult>;
}

interface PaymentRow {
  id: string;
  invoice_id: string;
  amount_minor_units: number;
  amount_currency: string;
  occurred_at: string;
}

function toPayment(row: PaymentRow): Payment {
  return {
    id: createPaymentId(row.id),
    invoiceId: row.invoice_id as InvoiceId,
    amount: createMoney(row.amount_minor_units, createCurrencyCode(row.amount_currency)),
    occurredAt: row.occurred_at,
  };
}

const SELECT_COLUMNS = 'id, invoice_id, amount_minor_units, amount_currency, occurred_at';

export function createSupabasePaymentRepository(client: MinimalSupabaseClient): PaymentRepository {
  return {
    async createPayment(input) {
      const { data, error } = await client
        .from('payments')
        .insert({
          business_id: input.businessId,
          invoice_id: input.invoiceId,
          amount_minor_units: input.amount.amountMinorUnits,
          amount_currency: input.amount.currency,
          occurred_at: input.occurredAt,
        })
        .select(SELECT_COLUMNS)
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'payment_insert_failed' };
      }
      return { ok: true, payment: toPayment(data as PaymentRow) };
    },

    async listPaymentsForInvoice(businessId, invoiceId) {
      const { data, error } = await client
        .from('payments')
        .select(SELECT_COLUMNS)
        .eq('business_id', businessId)
        .eq('invoice_id', invoiceId)
        .order('occurred_at', { ascending: false });

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'payment_list_failed' };
      }
      return { ok: true, payments: (data as PaymentRow[]).map(toPayment) };
    },
  };
}
