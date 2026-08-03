import type { LeadStatus } from '@ai-company-os/core-models';

const VALID_STATUSES: readonly LeadStatus[] = [
  'new',
  'contact-attempted',
  'contacted',
  'qualified',
  'disqualified',
  'estimate-requested',
  'estimate-sent',
  'booked',
  'lost',
  'spam',
  'duplicate',
];

/**
 * Rejects any value not in the real LeadStatus union before it ever
 * reaches transitionLead() - form input is an untrusted string, and
 * core-models' state machine should only ever be asked about statuses
 * that actually exist.
 */
export function isValidLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === 'string' && (VALID_STATUSES as readonly string[]).includes(value);
}
