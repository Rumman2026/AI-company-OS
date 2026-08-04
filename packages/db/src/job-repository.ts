import {
  createJobId,
  transitionJob,
  resolveTransitionAcrossActorCategories,
  type ActorCategory,
  type Job,
  type JobStatus,
  type JobTransitionOptions,
  type LeadId,
  type BookingId,
  type TechnicianId,
  type TransitionContext,
  type TransitionResult,
} from '@ai-company-os/core-models';
import type { MinimalSupabaseClient } from './supabase-client';
import type { AuditLogRepository } from './audit-log-repository';

export type CreateJobResult = { ok: true; job: Job } | { ok: false; error: string };
export type TransitionJobResult =
  { ok: true; result: TransitionResult<JobStatus, Job> } | { ok: false; error: string };
export type GetJobResult = { ok: true; job: Job } | { ok: false; error: string };
export type ListJobsResult = { ok: true; jobs: Job[] } | { ok: false; error: string };

export interface ListJobsOptions {
  readonly status?: JobStatus;
  readonly leadId?: string;
  readonly limit?: number;
  readonly offset?: number;
}

export interface JobRepository {
  /** Inserts a new Job at its initial 'draft' status - mirrors LeadRepository.createLead. */
  createJob(businessId: string, leadId: string, bookingId: string): Promise<CreateJobResult>;
  /**
   * The only way any caller may change a Job's status - always routes
   * through packages/core-models' transitionJob(), same pattern as
   * LeadRepository.transitionLeadStatus.
   */
  transitionJobStatus(
    businessId: string,
    jobId: string,
    requestedStatus: JobStatus,
    context: TransitionContext,
    options?: JobTransitionOptions,
  ): Promise<TransitionJobResult>;
  /**
   * Same as `transitionJobStatus`, but for a caller that may legitimately
   * hold more than one role at once (see DECISIONS.md ADR-0018).
   * `actorCategories` must be non-empty.
   */
  transitionJobStatusForRoles(
    businessId: string,
    jobId: string,
    requestedStatus: JobStatus,
    actorCategories: readonly ActorCategory[],
    context: Omit<TransitionContext, 'actorCategory'>,
    options?: JobTransitionOptions,
  ): Promise<TransitionJobResult>;
  getJob(businessId: string, jobId: string): Promise<GetJobResult>;
  listJobs(businessId: string, options?: ListJobsOptions): Promise<ListJobsResult>;
}

interface JobRow {
  id: string;
  lead_id: string;
  booking_id: string;
  status: JobStatus;
  technician_id: string | null;
  scheduled_at: string | null;
  created_at: string;
}

function toJob(row: JobRow): Job {
  return {
    id: createJobId(row.id),
    leadId: row.lead_id as LeadId,
    bookingId: row.booking_id as BookingId,
    status: row.status,
    technicianId: row.technician_id ? (row.technician_id as TechnicianId) : undefined,
    scheduledAt: row.scheduled_at ?? undefined,
    createdAt: row.created_at,
  };
}

const SELECT_COLUMNS = 'id, lead_id, booking_id, status, technician_id, scheduled_at, created_at';

export function createSupabaseJobRepository(
  client: MinimalSupabaseClient,
  auditLog: AuditLogRepository,
): JobRepository {
  return {
    async createJob(businessId, leadId, bookingId) {
      const { data, error } = await client
        .from('jobs')
        .insert({
          business_id: businessId,
          lead_id: leadId,
          booking_id: bookingId,
          status: 'draft',
        })
        .select(SELECT_COLUMNS)
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'job_insert_failed' };
      }
      return { ok: true, job: toJob(data as JobRow) };
    },

    async transitionJobStatus(businessId, jobId, requestedStatus, context, options) {
      const { data, error } = await client
        .from('jobs')
        .select(SELECT_COLUMNS)
        .eq('id', jobId)
        .eq('business_id', businessId)
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'job_not_found' };
      }

      const currentJob = toJob(data as JobRow);
      const result = transitionJob(currentJob, requestedStatus, context, options);

      if (result.outcome === 'rejected') {
        return { ok: true, result };
      }

      const { error: updateError } = await client
        .from('jobs')
        .update({ status: result.nextState })
        .eq('id', jobId)
        .eq('business_id', businessId);

      if (updateError) {
        return { ok: false, error: updateError.message ?? 'job_update_failed' };
      }

      await auditLog.writeAuditRecord(businessId, result.auditRecord);

      return { ok: true, result };
    },

    async transitionJobStatusForRoles(
      businessId,
      jobId,
      requestedStatus,
      actorCategories,
      context,
      options,
    ) {
      const { data, error } = await client
        .from('jobs')
        .select(SELECT_COLUMNS)
        .eq('id', jobId)
        .eq('business_id', businessId)
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'job_not_found' };
      }

      const currentJob = toJob(data as JobRow);
      const result = resolveTransitionAcrossActorCategories(
        (ctx) => transitionJob(currentJob, requestedStatus, ctx, options),
        actorCategories,
        context,
      );

      if (result.outcome === 'rejected') {
        return { ok: true, result };
      }

      const { error: updateError } = await client
        .from('jobs')
        .update({ status: result.nextState })
        .eq('id', jobId)
        .eq('business_id', businessId);

      if (updateError) {
        return { ok: false, error: updateError.message ?? 'job_update_failed' };
      }

      await auditLog.writeAuditRecord(businessId, result.auditRecord);

      return { ok: true, result };
    },

    async getJob(businessId, jobId) {
      const { data, error } = await client
        .from('jobs')
        .select(SELECT_COLUMNS)
        .eq('id', jobId)
        .eq('business_id', businessId)
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'job_not_found' };
      }
      return { ok: true, job: toJob(data as JobRow) };
    },

    async listJobs(businessId, options = {}) {
      let query = client
        .from('jobs')
        .select(SELECT_COLUMNS)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (options.status) query = query.eq('status', options.status);
      if (options.leadId) query = query.eq('lead_id', options.leadId);
      if (typeof options.limit === 'number') {
        const from = options.offset ?? 0;
        query = query.range(from, from + options.limit - 1);
      }

      const { data, error } = await query;

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'job_list_failed' };
      }
      return { ok: true, jobs: (data as JobRow[]).map(toJob) };
    },
  };
}
