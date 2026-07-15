import type { BookingId, EstimateId, JobId, LeadId } from '../ids';
import type { Money } from '../money';

export interface Estimate {
  readonly id: EstimateId;
  readonly leadId: LeadId;
  readonly proposedAmount: Money;
  readonly summary: string;
  readonly createdAt: string;
}

export interface Booking {
  readonly id: BookingId;
  readonly leadId: LeadId;
  readonly estimateId: EstimateId;
  readonly jobId?: JobId;
  readonly scheduledAt: string;
  readonly createdAt: string;
}
