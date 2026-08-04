import type { InvoiceStatus } from '@ai-company-os/core-models';

const VALID_STATUSES: readonly InvoiceStatus[] = [
  'draft',
  'sent',
  'partially-paid',
  'paid',
  'overdue',
  'voided',
  'refunded',
];

/**
 * Rejects any value not in the real InvoiceStatus union before it ever
 * reaches transitionInvoice() - same rationale as jobs/validate-status.ts.
 */
export function isValidInvoiceStatus(value: unknown): value is InvoiceStatus {
  return typeof value === 'string' && (VALID_STATUSES as readonly string[]).includes(value);
}
