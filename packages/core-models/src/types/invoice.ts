import type { InvoiceId, JobId, LeadId, PaymentId } from '../ids';
import type { Money } from '../money';

export type InvoiceStatus =
  'draft' | 'sent' | 'partially-paid' | 'paid' | 'overdue' | 'voided' | 'refunded';

export interface Invoice {
  readonly id: InvoiceId;
  readonly jobId: JobId;
  /** Denormalized for revenue-attribution reporting; never mutated by ordinary transitions. */
  readonly leadId: LeadId;
  readonly status: InvoiceStatus;
  readonly totalAmount: Money;
  readonly dueAt?: string;
  readonly createdAt: string;
}

export interface Payment {
  readonly id: PaymentId;
  readonly invoiceId: InvoiceId;
  readonly amount: Money;
  readonly occurredAt: string;
}

/**
 * Provider-neutral evidence of a payment outcome, supplied by the caller.
 * No payment is processed, settled, or synchronized here - this only
 * distinguishes which outcome the caller is asserting occurred.
 */
export type PaymentOutcomeEvidence =
  | { readonly outcome: 'partial-payment'; readonly amountReceived: Money }
  | { readonly outcome: 'full-payment'; readonly amountReceived: Money }
  | { readonly outcome: 'no-captured-payment' };
