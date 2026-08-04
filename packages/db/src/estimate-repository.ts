import { randomBytes } from 'node:crypto';
import {
  createEstimateId,
  createMoney,
  createCurrencyCode,
  type Estimate,
  type Money,
  type LeadId,
} from '@ai-company-os/core-models';
import type { MinimalSupabaseClient } from './supabase-client';

const CUSTOMER_APPROVAL_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface CreateEstimateInput {
  readonly businessId: string;
  readonly leadId: string;
  readonly proposedAmount: Money;
  readonly summary: string;
  readonly createdBy?: string;
}

export interface SetEstimatePricingInput {
  readonly taxRateBasisPoints?: number;
  readonly discountAmount?: Money;
  readonly depositAmount?: Money;
}

export type CreateEstimateResult = { ok: true; estimate: Estimate } | { ok: false; error: string };
export type GetEstimateResult = { ok: true; estimate: Estimate } | { ok: false; error: string };
export type ListEstimatesResult =
  { ok: true; estimates: Estimate[] } | { ok: false; error: string };
export type ApproveEstimateResult = { ok: true; estimate: Estimate } | { ok: false; error: string };
export type SetEstimatePricingResult =
  { ok: true; estimate: Estimate } | { ok: false; error: string };
export type GenerateCustomerApprovalLinkResult =
  { ok: true; estimate: Estimate } | { ok: false; error: string };
export type GetEstimateByPublicTokenResult =
  { ok: true; estimate: Estimate; businessId: string } | { ok: false; error: string };
export type ApproveEstimateByCustomerTokenResult =
  { ok: true; estimate: Estimate; businessId: string } | { ok: false; error: string };

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
  approveEstimate(
    businessId: string,
    estimateId: string,
    approvedBy?: string,
  ): Promise<ApproveEstimateResult>;
  /**
   * Sets tax rate / discount / deposit - rejects (does not throw) if
   * the Estimate is already `approved`, mirroring the same "mutable
   * only while draft" rule ADR-0021/ADR-0026 already established for
   * an Estimate's other fields and its line items (see ADR-0027).
   */
  setEstimatePricing(
    businessId: string,
    estimateId: string,
    input: SetEstimatePricingInput,
  ): Promise<SetEstimatePricingResult>;
  /**
   * Staff-only, tenant-scoped: generates a fresh, high-entropy token
   * with a 30-day expiry for the public customer-approval link,
   * replacing any prior token. Rejects once the Estimate is already
   * approved (see DECISIONS.md ADR-0030).
   */
  generateCustomerApprovalLink(
    businessId: string,
    estimateId: string,
  ): Promise<GenerateCustomerApprovalLinkResult>;
  /**
   * Public, token-only lookup (no businessId) - callers must pass a
   * service-role client, since no tenant session exists at this point.
   * Rejects if the token is unknown or expired.
   */
  getEstimateByPublicToken(token: string): Promise<GetEstimateByPublicTokenResult>;
  /**
   * Public, token-only approval - callers must pass a service-role
   * client. Rejects if the token is unknown, expired, or the Estimate
   * is already approved; rejects an empty/overlong signature name
   * rather than silently accepting it.
   */
  approveEstimateByCustomerToken(
    token: string,
    customerSignatureName: string,
  ): Promise<ApproveEstimateByCustomerTokenResult>;
}

interface EstimateRow {
  id: string;
  business_id: string;
  lead_id: string;
  proposed_amount_minor_units: number;
  proposed_amount_currency: string;
  summary: string;
  status: Estimate['status'];
  created_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  tax_rate_basis_points: number | null;
  discount_amount_minor_units: number | null;
  discount_amount_currency: string | null;
  deposit_amount_minor_units: number | null;
  deposit_amount_currency: string | null;
  customer_approval_token: string | null;
  customer_approval_token_expires_at: string | null;
  customer_approved: boolean;
  customer_signature_name: string | null;
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
    createdBy: row.created_by ?? undefined,
    approvedAt: row.approved_at ?? undefined,
    approvedBy: row.approved_by ?? undefined,
    taxRateBasisPoints: row.tax_rate_basis_points ?? undefined,
    discountAmount:
      row.discount_amount_minor_units !== null && row.discount_amount_currency
        ? createMoney(
            row.discount_amount_minor_units,
            createCurrencyCode(row.discount_amount_currency),
          )
        : undefined,
    depositAmount:
      row.deposit_amount_minor_units !== null && row.deposit_amount_currency
        ? createMoney(
            row.deposit_amount_minor_units,
            createCurrencyCode(row.deposit_amount_currency),
          )
        : undefined,
    customerApprovalToken: row.customer_approval_token ?? undefined,
    customerApprovalTokenExpiresAt: row.customer_approval_token_expires_at ?? undefined,
    customerApproved: row.customer_approved,
    customerSignatureName: row.customer_signature_name ?? undefined,
    createdAt: row.created_at,
  };
}

const SELECT_COLUMNS =
  'id, business_id, lead_id, proposed_amount_minor_units, proposed_amount_currency, summary, status, created_by, approved_at, approved_by, tax_rate_basis_points, discount_amount_minor_units, discount_amount_currency, deposit_amount_minor_units, deposit_amount_currency, customer_approval_token, customer_approval_token_expires_at, customer_approved, customer_signature_name, created_at';

function isTokenExpired(expiresAt: string | undefined): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() <= Date.now();
}

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
          created_by: input.createdBy ?? null,
          approved_at: null,
          approved_by: null,
          tax_rate_basis_points: null,
          discount_amount_minor_units: null,
          discount_amount_currency: null,
          deposit_amount_minor_units: null,
          deposit_amount_currency: null,
          customer_approval_token: null,
          customer_approval_token_expires_at: null,
          customer_approved: false,
          customer_signature_name: null,
        })
        .select(SELECT_COLUMNS)
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'estimate_insert_failed' };
      }
      return { ok: true, estimate: toEstimate(data as EstimateRow) };
    },

    async approveEstimate(businessId, estimateId, approvedBy) {
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
        .update({ status: 'approved', approved_at: approvedAt, approved_by: approvedBy ?? null })
        .eq('id', estimateId)
        .eq('business_id', businessId);

      if (updateError) {
        return { ok: false, error: updateError.message ?? 'estimate_approve_failed' };
      }

      return {
        ok: true,
        estimate: {
          ...current,
          status: 'approved',
          approvedAt,
          approvedBy: approvedBy ?? undefined,
        },
      };
    },

    async setEstimatePricing(businessId, estimateId, input) {
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
        return { ok: false, error: 'estimate_already_approved_pricing_immutable' };
      }

      const { error: updateError } = await client
        .from('estimates')
        .update({
          tax_rate_basis_points: input.taxRateBasisPoints ?? null,
          discount_amount_minor_units: input.discountAmount?.amountMinorUnits ?? null,
          discount_amount_currency: input.discountAmount?.currency ?? null,
          deposit_amount_minor_units: input.depositAmount?.amountMinorUnits ?? null,
          deposit_amount_currency: input.depositAmount?.currency ?? null,
        })
        .eq('id', estimateId)
        .eq('business_id', businessId);

      if (updateError) {
        return { ok: false, error: updateError.message ?? 'estimate_pricing_update_failed' };
      }

      return {
        ok: true,
        estimate: {
          ...current,
          taxRateBasisPoints: input.taxRateBasisPoints,
          discountAmount: input.discountAmount,
          depositAmount: input.depositAmount,
        },
      };
    },

    async generateCustomerApprovalLink(businessId, estimateId) {
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

      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + CUSTOMER_APPROVAL_TOKEN_TTL_MS).toISOString();

      const { error: updateError } = await client
        .from('estimates')
        .update({
          customer_approval_token: token,
          customer_approval_token_expires_at: expiresAt,
        })
        .eq('id', estimateId)
        .eq('business_id', businessId);

      if (updateError) {
        return { ok: false, error: updateError.message ?? 'estimate_link_generation_failed' };
      }

      return {
        ok: true,
        estimate: {
          ...current,
          customerApprovalToken: token,
          customerApprovalTokenExpiresAt: expiresAt,
        },
      };
    },

    async getEstimateByPublicToken(token) {
      const { data, error } = await client
        .from('estimates')
        .select(SELECT_COLUMNS)
        .eq('customer_approval_token', token)
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'estimate_not_found' };
      }

      const row = data as EstimateRow;
      const estimate = toEstimate(row);
      if (isTokenExpired(estimate.customerApprovalTokenExpiresAt)) {
        return { ok: false, error: 'approval_link_expired' };
      }
      return { ok: true, estimate, businessId: row.business_id };
    },

    async approveEstimateByCustomerToken(token, customerSignatureName) {
      const trimmedName = customerSignatureName.trim();
      if (trimmedName.length === 0 || trimmedName.length > 200) {
        return { ok: false, error: 'invalid_signature_name' };
      }

      const { data, error } = await client
        .from('estimates')
        .select(SELECT_COLUMNS)
        .eq('customer_approval_token', token)
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'estimate_not_found' };
      }

      const row = data as EstimateRow;
      const current = toEstimate(row);
      if (isTokenExpired(current.customerApprovalTokenExpiresAt)) {
        return { ok: false, error: 'approval_link_expired' };
      }
      if (current.status === 'approved') {
        return { ok: false, error: 'estimate_already_approved' };
      }

      const approvedAt = new Date().toISOString();
      const { error: updateError } = await client
        .from('estimates')
        .update({
          status: 'approved',
          approved_at: approvedAt,
          customer_approved: true,
          customer_signature_name: trimmedName,
        })
        .eq('customer_approval_token', token);

      if (updateError) {
        return { ok: false, error: updateError.message ?? 'estimate_approve_failed' };
      }

      return {
        ok: true,
        estimate: {
          ...current,
          status: 'approved',
          approvedAt,
          customerApproved: true,
          customerSignatureName: trimmedName,
        },
        businessId: row.business_id,
      };
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
