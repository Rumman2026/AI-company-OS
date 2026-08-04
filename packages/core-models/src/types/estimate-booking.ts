import type { BookingId, EstimateId, JobId, LeadId } from '../ids';
import type { Money } from '../money';

/**
 * No state machine - see DECISIONS.md ADR-0021. `draft` is the only
 * status a new Estimate is ever created at; `approveEstimate()`
 * (packages/db) is the only path to `approved`, which is then
 * immutable - no update method exists for an Estimate's amount/summary
 * at any status, so "revision controls rather than silent editing" is
 * satisfied by omission today. A future edit feature must create a new
 * Estimate row referencing the original rather than mutate one in
 * place, especially once approved.
 */
export type EstimateStatus = 'draft' | 'approved';

export interface Estimate {
  readonly id: EstimateId;
  readonly leadId: LeadId;
  readonly proposedAmount: Money;
  readonly summary: string;
  readonly status: EstimateStatus;
  /** The actor who created this Estimate - see DECISIONS.md ADR-0025 (activity timeline, employee filtering). */
  readonly createdBy?: string;
  readonly approvedAt?: string;
  /** The actor who approved this Estimate. */
  readonly approvedBy?: string;
  readonly createdAt: string;
}

export interface Booking {
  readonly id: BookingId;
  readonly leadId: LeadId;
  readonly estimateId: EstimateId;
  readonly jobId?: JobId;
  readonly scheduledAt: string;
  /** The actor who created this Booking - see DECISIONS.md ADR-0025 (activity timeline, employee filtering). */
  readonly createdBy?: string;
  readonly createdAt: string;
}
