import type { JobStatus } from '@ai-company-os/core-models';

const VALID_STATUSES: readonly JobStatus[] = [
  'draft',
  'scheduled',
  'assigned',
  'in-progress',
  'service-completed',
  'awaiting-office-review',
  'completed',
  'follow-up-required',
  'canceled',
];

/**
 * Rejects any value not in the real JobStatus union before it ever
 * reaches transitionJob() - same rationale as leads/validate-status.ts.
 */
export function isValidJobStatus(value: unknown): value is JobStatus {
  return typeof value === 'string' && (VALID_STATUSES as readonly string[]).includes(value);
}
