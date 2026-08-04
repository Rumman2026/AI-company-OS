import {
  createEstimateLineItemId,
  createMoney,
  createCurrencyCode,
  type EstimateLineItem,
  type Money,
  type EstimateId,
  type ServicePackageId,
} from '@ai-company-os/core-models';
import type { MinimalSupabaseClient } from './supabase-client';
import type { EstimateRepository } from './estimate-repository';

export interface CreateEstimateLineItemInput {
  readonly businessId: string;
  readonly estimateId: string;
  readonly description: string;
  readonly quantity: number;
  readonly unitPrice: Money;
  readonly servicePackageId?: string;
  readonly sortOrder?: number;
}

export type CreateEstimateLineItemResult =
  { ok: true; lineItem: EstimateLineItem } | { ok: false; error: string };
export type ListEstimateLineItemsResult =
  { ok: true; lineItems: EstimateLineItem[] } | { ok: false; error: string };
export type DeleteEstimateLineItemResult = { ok: true } | { ok: false; error: string };

export interface EstimateLineItemRepository {
  /**
   * Rejects (does not throw) if the parent Estimate is already
   * `approved` or does not exist - line items are only ever mutable
   * while the Estimate is `draft`, mirroring ADR-0021's existing rule
   * for the Estimate itself.
   */
  createLineItem(input: CreateEstimateLineItemInput): Promise<CreateEstimateLineItemResult>;
  listLineItems(businessId: string, estimateId: string): Promise<ListEstimateLineItemsResult>;
  /** Same draft-only rule as createLineItem. */
  deleteLineItem(
    businessId: string,
    estimateId: string,
    lineItemId: string,
  ): Promise<DeleteEstimateLineItemResult>;
  /**
   * Public, token-only lookup (no businessId) - resolves the Estimate
   * via the injected EstimateRepository's getEstimateByPublicToken()
   * first (which already rejects an unknown/expired token), so this
   * never lists line items for an id the caller didn't prove
   * possession of. Callers must pass a service-role client - see
   * DECISIONS.md ADR-0030.
   */
  listLineItemsByPublicToken(token: string): Promise<ListEstimateLineItemsResult>;
}

interface EstimateLineItemRow {
  id: string;
  estimate_id: string;
  description: string;
  quantity: number;
  unit_price_minor_units: number;
  unit_price_currency: string;
  line_total_minor_units: number;
  line_total_currency: string;
  service_package_id: string | null;
  sort_order: number;
  created_at: string;
}

function toEstimateLineItem(row: EstimateLineItemRow): EstimateLineItem {
  return {
    id: createEstimateLineItemId(row.id),
    estimateId: row.estimate_id as EstimateId,
    description: row.description,
    quantity: row.quantity,
    unitPrice: createMoney(row.unit_price_minor_units, createCurrencyCode(row.unit_price_currency)),
    lineTotal: createMoney(row.line_total_minor_units, createCurrencyCode(row.line_total_currency)),
    servicePackageId: row.service_package_id
      ? (row.service_package_id as ServicePackageId)
      : undefined,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

const SELECT_COLUMNS =
  'id, estimate_id, description, quantity, unit_price_minor_units, unit_price_currency, line_total_minor_units, line_total_currency, service_package_id, sort_order, created_at';

export function createSupabaseEstimateLineItemRepository(
  client: MinimalSupabaseClient,
  estimateRepository: EstimateRepository,
): EstimateLineItemRepository {
  return {
    async createLineItem(input) {
      const estimateResult = await estimateRepository.getEstimate(
        input.businessId,
        input.estimateId,
      );
      if (!estimateResult.ok) {
        return { ok: false, error: estimateResult.error };
      }
      if (estimateResult.estimate.status === 'approved') {
        return { ok: false, error: 'estimate_already_approved_line_items_immutable' };
      }

      const lineTotalMinorUnits = input.quantity * input.unitPrice.amountMinorUnits;

      const { data, error } = await client
        .from('estimate_line_items')
        .insert({
          business_id: input.businessId,
          estimate_id: input.estimateId,
          description: input.description,
          quantity: input.quantity,
          unit_price_minor_units: input.unitPrice.amountMinorUnits,
          unit_price_currency: input.unitPrice.currency,
          line_total_minor_units: lineTotalMinorUnits,
          line_total_currency: input.unitPrice.currency,
          service_package_id: input.servicePackageId ?? null,
          sort_order: input.sortOrder ?? 0,
        })
        .select(SELECT_COLUMNS)
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'estimate_line_item_insert_failed' };
      }
      return { ok: true, lineItem: toEstimateLineItem(data as EstimateLineItemRow) };
    },

    async listLineItems(businessId, estimateId) {
      const { data, error } = await client
        .from('estimate_line_items')
        .select(SELECT_COLUMNS)
        .eq('business_id', businessId)
        .eq('estimate_id', estimateId)
        .order('sort_order', { ascending: true });

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'estimate_line_item_list_failed' };
      }
      return { ok: true, lineItems: (data as EstimateLineItemRow[]).map(toEstimateLineItem) };
    },

    async deleteLineItem(businessId, estimateId, lineItemId) {
      const estimateResult = await estimateRepository.getEstimate(businessId, estimateId);
      if (!estimateResult.ok) {
        return { ok: false, error: estimateResult.error };
      }
      if (estimateResult.estimate.status === 'approved') {
        return { ok: false, error: 'estimate_already_approved_line_items_immutable' };
      }

      const { error } = await client
        .from('estimate_line_items')
        .delete()
        .eq('id', lineItemId)
        .eq('estimate_id', estimateId)
        .eq('business_id', businessId);

      if (error) {
        return { ok: false, error: error.message ?? 'estimate_line_item_delete_failed' };
      }
      return { ok: true };
    },

    async listLineItemsByPublicToken(token) {
      const estimateResult = await estimateRepository.getEstimateByPublicToken(token);
      if (!estimateResult.ok) {
        return { ok: false, error: estimateResult.error };
      }

      const { data, error } = await client
        .from('estimate_line_items')
        .select(SELECT_COLUMNS)
        .eq('estimate_id', estimateResult.estimate.id)
        .order('sort_order', { ascending: true });

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'estimate_line_item_list_failed' };
      }
      return { ok: true, lineItems: (data as EstimateLineItemRow[]).map(toEstimateLineItem) };
    },
  };
}
