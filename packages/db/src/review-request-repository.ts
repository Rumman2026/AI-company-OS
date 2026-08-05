import {
  createReviewRequestId,
  transitionReviewRequest,
  resolveTransitionAcrossActorCategories,
  type ActorCategory,
  type ReviewRequest,
  type ReviewRequestStatus,
  type JobId,
  type ReviewEligibilityEvidence,
  type TransitionContext,
  type TransitionResult,
} from '@ai-company-os/core-models';
import type { MinimalSupabaseClient } from './supabase-client';
import type { AuditLogRepository } from './audit-log-repository';

export interface CreateReviewRequestInput {
  readonly businessId: string;
  readonly jobId: string;
  readonly deduplicationKey: string;
}

export type CreateReviewRequestResult =
  { ok: true; reviewRequest: ReviewRequest } | { ok: false; error: string };
export type GetReviewRequestResult =
  { ok: true; reviewRequest: ReviewRequest } | { ok: false; error: string };
export type ListReviewRequestsResult =
  { ok: true; reviewRequests: ReviewRequest[] } | { ok: false; error: string };
export type TransitionReviewRequestResult =
  | { ok: true; result: TransitionResult<ReviewRequestStatus, ReviewRequest> }
  | { ok: false; error: string };

export interface ReviewRequestRepository {
  /** Inserts a new ReviewRequest at its initial 'not-eligible' status - mirrors InvoiceRepository.createInvoice. */
  createReviewRequest(input: CreateReviewRequestInput): Promise<CreateReviewRequestResult>;
  getReviewRequest(businessId: string, reviewRequestId: string): Promise<GetReviewRequestResult>;
  listReviewRequestsForJob(businessId: string, jobId: string): Promise<ListReviewRequestsResult>;
  /**
   * Same role-fallback pattern as `transitionInvoiceStatusForRoles`
   * (see DECISIONS.md ADR-0018). Nearly every edge in
   * transitionReviewRequest()'s table requires `actorCategory:
   * 'automation'`, which no real membership role in this application
   * resolves to - only 'opted-out' (customer/office-manager) is
   * reachable from a real caller today. That is intentional, not a
   * bug: this method still exists so a future automation actor can
   * use it without a repository change.
   */
  transitionReviewRequestStatusForRoles(
    businessId: string,
    reviewRequestId: string,
    requestedStatus: ReviewRequestStatus,
    actorCategories: readonly ActorCategory[],
    context: Omit<TransitionContext, 'actorCategory'>,
    eligibilityEvidence?: ReviewEligibilityEvidence,
  ): Promise<TransitionReviewRequestResult>;
}

interface ReviewRequestRow {
  id: string;
  job_id: string;
  status: ReviewRequestStatus;
  deduplication_key: string;
  created_at: string;
}

function toReviewRequest(row: ReviewRequestRow): ReviewRequest {
  return {
    id: createReviewRequestId(row.id),
    jobId: row.job_id as JobId,
    status: row.status,
    deduplicationKey: row.deduplication_key,
    createdAt: row.created_at,
  };
}

const SELECT_COLUMNS = 'id, job_id, status, deduplication_key, created_at';

export function createSupabaseReviewRequestRepository(
  client: MinimalSupabaseClient,
  auditLog: AuditLogRepository,
): ReviewRequestRepository {
  return {
    async createReviewRequest(input) {
      const { data, error } = await client
        .from('review_requests')
        .insert({
          business_id: input.businessId,
          job_id: input.jobId,
          status: 'not-eligible',
          deduplication_key: input.deduplicationKey,
        })
        .select(SELECT_COLUMNS)
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'review_request_insert_failed' };
      }
      return { ok: true, reviewRequest: toReviewRequest(data as ReviewRequestRow) };
    },

    async getReviewRequest(businessId, reviewRequestId) {
      const { data, error } = await client
        .from('review_requests')
        .select(SELECT_COLUMNS)
        .eq('id', reviewRequestId)
        .eq('business_id', businessId)
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'review_request_not_found' };
      }
      return { ok: true, reviewRequest: toReviewRequest(data as ReviewRequestRow) };
    },

    async listReviewRequestsForJob(businessId, jobId) {
      const { data, error } = await client
        .from('review_requests')
        .select(SELECT_COLUMNS)
        .eq('business_id', businessId)
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'review_request_list_failed' };
      }
      return { ok: true, reviewRequests: (data as ReviewRequestRow[]).map(toReviewRequest) };
    },

    async transitionReviewRequestStatusForRoles(
      businessId,
      reviewRequestId,
      requestedStatus,
      actorCategories,
      context,
      eligibilityEvidence,
    ) {
      const { data, error } = await client
        .from('review_requests')
        .select(SELECT_COLUMNS)
        .eq('id', reviewRequestId)
        .eq('business_id', businessId)
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'review_request_not_found' };
      }

      const currentReviewRequest = toReviewRequest(data as ReviewRequestRow);
      const result = resolveTransitionAcrossActorCategories(
        (ctx) =>
          transitionReviewRequest(currentReviewRequest, requestedStatus, ctx, {
            eligibilityEvidence,
          }),
        actorCategories,
        context,
      );

      if (result.outcome === 'rejected') {
        return { ok: true, result };
      }

      const { error: updateError } = await client
        .from('review_requests')
        .update({ status: result.nextState })
        .eq('id', reviewRequestId)
        .eq('business_id', businessId);

      if (updateError) {
        return { ok: false, error: updateError.message ?? 'review_request_update_failed' };
      }

      await auditLog.writeAuditRecord(businessId, result.auditRecord);

      return { ok: true, result };
    },
  };
}
