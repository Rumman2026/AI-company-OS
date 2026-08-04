import type { InvoiceStatus } from '@ai-company-os/core-models';
import type { BadgeTone } from './components/Badge';

const TONE_BY_STATUS: Record<InvoiceStatus, BadgeTone> = {
  draft: 'neutral',
  sent: 'warning',
  'partially-paid': 'warning',
  paid: 'success',
  overdue: 'danger',
  voided: 'danger',
  refunded: 'neutral',
};

export function invoiceStatusTone(status: InvoiceStatus): BadgeTone {
  return TONE_BY_STATUS[status];
}
