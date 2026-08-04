import {
  createEstimateId,
  createMoney,
  createCurrencyCode,
  type Estimate,
  type Money,
  type LeadId,
} from '@ai-company-os/core-models';
import type { MinimalSupabaseClient } from './supabase-client';

export interface CreateEstimateInput {
  readonly businessId: string;
  readonly leadId: string;
  readonly proposedAmount: Money;
  readonly summary: string;
}

export type CreateEstimateResult = { ok: true; estimate: Estimate } | { ok: false; error: string };
export type GetEstimateResult = { ok: true; estimate: Estimate } | { ok: false; error: string };
export type ListEstimatesResult =
  { ok: true; estimates: Estimate[] } | { ok: false; error: string };
export type ApproveEstimateResult = { ok: true; estimate: Estimate } | { ok: false; error: string };

export interface ListEstimatesOptions {
  readonly leadId?: string;
}

export interface EstimateRepository {
  createEstimate(input: CreateEstimateInput): Promise<CreateEstimateResult>;
  getEstimate(businessId: string, estimateId: string): Promise<GetEstimateResult>;
  listEstimates(businessId: string, options?: ListEstimatesOptions): Promise<ListEstimatesResult>;
  /**
   * The only way any caller may move an Estimate from `draft` to
   * `approved` - rejects (does not throw) if the estimate is already
   * approved or does not exist, rather than silently re-approving.
   */
  approveEstimate(businessId: string, estimateId: string): Promise<ApproveEstimateResult>;
}

interface EstimateRow {
  id: string;
  lead_id: string;
  proposed_amount_minor_units: number;
  proposed_amount_currency: string;
  summary: string;
  status: Estimate['status'];
  approved_at: string | null;
  created_at: string;
}

function toEstimate(row: EstimateRow): Estimate {
  return {
    id: createEstimateId(row.id),
    leadId: row.lead_id as LeadId,
    proposedAmount: createMoney(
      row.proposed_amount_minor_units,
      createCurrencyCode(row.proposed_amount_currency),
    ),
    summary: row.summary,
    status: row.status,
    approvedAt: row.approved_at ?? undefined,
    createdAt: row.created_at,
  };
}

const SELECT_COLUMNS =
  'id, lead_id, proposed_amount_minor_units, proposed_amount_currency, summary, status, approved_at, created_at';

export function createSupabaseEstimateRepository(
  client: MinimalSupabaseClient,
): EstimateRepository {
  return {
    async createEstimate(input) {
      const { data, error } = await client
        .from('estimates')
        .insert({
          business_id: input.businessId,
          lead_id: input.leadId,
          proposed_amount_minor_units: input.proposedAmount.amountMinorUnits,
          proposed_amount_currency: input.proposedAmount.currency,
          summary: input.summary,
          status: 'draft',
          approved_at: null,
        })
        .select(SELECT_COLUMNS)
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'estimate_insert_failed' };
      }
      return { ok: true, estimate: toEstimate(data as EstimateRow) };
    },

    async approveEstimate(businessId, estimateId) {
      const { data, error } = await client
        .from('estimates')
        .select(SELECT_COLUMNS)
        .eq('id', estimateId)
        .eq('business_id', businessId)
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'estimate_not_found' };
      }

      const current = toEstimate(data as EstimateRow);
      if (current.status === 'approved') {
        return { ok: false, error: 'estimate_already_approved' };
      }

      const approvedAt = new Date().toISOString();
      const { error: updateError } = await client
        .from('estimates')
        .update({ status: 'approved', approved_at: approvedAt })
        .eq('id', estimateId)
        .eq('business_id', businessId);

      if (updateError) {
        return { ok: false, error: updateError.message ?? 'estimate_approve_failed' };
      }

      return { ok: true, estimate: { ...current, status: 'approved', approvedAt } };
    },

    async getEstimate(businessId, estimateId) {
      const { data, error } = await client
        .from('estimates')
        .select(SELECT_COLUMNS)
        .eq('id', estimateId)
        .eq('business_id', businessId)
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'estimate_not_found' };
      }
      return { ok: true, estimate: toEstimate(data as EstimateRow) };
    },

    async listEstimates(businessId, options = {}) {
      let query = client
        .from('estimates')
        .select(SELECT_COLUMNS)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (options.leadId) query = query.eq('lead_id', options.leadId);

      const { data, error } = await query;

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'estimate_list_failed' };
      }
      return { ok: true, estimates: (data as EstimateRow[]).map(toEstimate) };
    },
  };
}
