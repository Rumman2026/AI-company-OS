import {
  createReviewRecordId,
  type ReviewRecord,
  type JobId,
  type ReviewRequestId,
} from '@ai-company-os/core-models';
import type { MinimalSupabaseClient } from './supabase-client';

export interface CreateReviewRecordInput {
  readonly businessId: string;
  readonly jobId?: string;
  readonly reviewRequestId?: string;
  readonly sourcePlatform: string;
  readonly receivedAt: string;
}

export type CreateReviewRecordResult =
  { ok: true; reviewRecord: ReviewRecord } | { ok: false; error: string };
export type ListReviewRecordsResult =
  { ok: true; reviewRecords: ReviewRecord[] } | { ok: false; error: string };

export interface ReviewRecordRepository {
  /** Records a real, received review as fact - staff-entered, never a live review-platform integration. */
  createReviewRecord(input: CreateReviewRecordInput): Promise<CreateReviewRecordResult>;
  listReviewRecordsForJob(businessId: string, jobId: string): Promise<ListReviewRecordsResult>;
}

interface ReviewRecordRow {
  id: string;
  review_request_id: string | null;
  job_id: string | null;
  source_platform: string;
  received_at: string;
}

function toReviewRecord(row: ReviewRecordRow): ReviewRecord {
  return {
    id: createReviewRecordId(row.id),
    reviewRequestId: row.review_request_id ? (row.review_request_id as ReviewRequestId) : undefined,
    jobId: row.job_id ? (row.job_id as JobId) : undefined,
    sourcePlatform: row.source_platform,
    receivedAt: row.received_at,
  };
}

const SELECT_COLUMNS = 'id, review_request_id, job_id, source_platform, received_at';

export function createSupabaseReviewRecordRepository(
  client: MinimalSupabaseClient,
): ReviewRecordRepository {
  return {
    async createReviewRecord(input) {
      const { data, error } = await client
        .from('review_records')
        .insert({
          business_id: input.businessId,
          job_id: input.jobId ?? null,
          review_request_id: input.reviewRequestId ?? null,
          source_platform: input.sourcePlatform,
          received_at: input.receivedAt,
        })
        .select(SELECT_COLUMNS)
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'review_record_insert_failed' };
      }
      return { ok: true, reviewRecord: toReviewRecord(data as ReviewRecordRow) };
    },

    async listReviewRecordsForJob(businessId, jobId) {
      const { data, error } = await client
        .from('review_records')
        .select(SELECT_COLUMNS)
        .eq('business_id', businessId)
        .eq('job_id', jobId)
        .order('received_at', { ascending: false });

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'review_record_list_failed' };
      }
      return { ok: true, reviewRecords: (data as ReviewRecordRow[]).map(toReviewRecord) };
    },
  };
}
