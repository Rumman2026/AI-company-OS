import type { BookingId, EstimateId, JobId, LeadId } from '../ids';
import type { Money } from '../money';

/**
 * No state machine - see DECISIONS.md ADR-0021 (and ADR-0039 for
 * `rejected`). `draft` is the only status a new Estimate is ever
 * created at; `approveEstimate()`/`rejectEstimate()` (packages/db) are
 * the only paths out of `draft`, both terminal - no update method
 * exists for an Estimate's amount/summary at any status, so "revision
 * controls rather than silent editing" is satisfied by omission today.
 * A future edit feature must create a new Estimate row referencing the
 * original rather than mutate one in place, especially once approved
 * or rejected.
 */
export type EstimateStatus = 'draft' | 'approved' | 'rejected';

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
  readonly rejectedAt?: string;
  /** The actor who rejected this Estimate. */
  readonly rejectedBy?: string;
  /**
   * Sales tax rate in basis points (1/100 of a percent - e.g. 825 =
   * 8.25%), integer to stay floating-point-free per money.ts's own
   * philosophy. See DECISIONS.md ADR-0027 and `calculateEstimateTotals()`.
   */
  readonly taxRateBasisPoints?: number;
  /** A fixed-amount discount off the subtotal - see DECISIONS.md ADR-0027 for why this is a flat amount, not a percentage. */
  readonly discountAmount?: Money;
  /** Amount due upfront if the customer accepts - never subtracted from `total`, tracked separately. */
  readonly depositAmount?: Money;
  /**
   * A high-entropy, unguessable token for the public customer-approval
   * link - see DECISIONS.md ADR-0030. Only ever present after staff
   * explicitly generates a link (not created automatically for every
   * Estimate). Undefined once no active link exists.
   */
  readonly customerApprovalToken?: string;
  /** The token stops being accepted after this time - see ADR-0030 (30-day expiry). */
  readonly customerApprovalTokenExpiresAt?: string;
  /** True only if this Estimate was approved via the public customer-facing link, not by staff. */
  readonly customerApproved?: boolean;
  /** The customer's typed full name, captured as a lightweight, non-binding signature at the moment of public approval. */
  readonly customerSignatureName?: string;
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
