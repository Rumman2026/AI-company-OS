import type { JobId, ReviewRecordId, ReviewRequestId } from '../ids';

export type ReviewRequestStatus =
  | 'not-eligible'
  | 'eligible'
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'review-received'
  | 'suppressed'
  | 'opted-out';

export interface ReviewRequest {
  readonly id: ReviewRequestId;
  readonly jobId: JobId;
  readonly status: ReviewRequestStatus;
  /** Deterministic key preventing duplicate requests for the same job/purpose. */
  readonly deduplicationKey: string;
  readonly createdAt: string;
}

/**
 * A received, real review. Never fabricated or rewritten - see the
 * review-request state machine's binding rules.
 */
export interface ReviewRecord {
  readonly id: ReviewRecordId;
  readonly reviewRequestId?: ReviewRequestId;
  readonly jobId?: JobId;
  readonly sourcePlatform: string;
  readonly receivedAt: string;
}
