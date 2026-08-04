import {
  createServicePackageId,
  createMoney,
  createCurrencyCode,
  type ServicePackage,
  type Money,
} from '@ai-company-os/core-models';
import type { MinimalSupabaseClient } from './supabase-client';

export interface CreateServicePackageInput {
  readonly businessId: string;
  readonly name: string;
  readonly description?: string;
  readonly defaultUnitPrice: Money;
}

export type CreateServicePackageResult =
  { ok: true; servicePackage: ServicePackage } | { ok: false; error: string };
export type ListServicePackagesResult =
  { ok: true; servicePackages: ServicePackage[] } | { ok: false; error: string };
export type SetServicePackageActiveResult = { ok: true } | { ok: false; error: string };

export interface ListServicePackagesOptions {
  /** Excluded from the default list unless true. */
  readonly includeInactive?: boolean;
}

export interface ServicePackageRepository {
  createServicePackage(input: CreateServicePackageInput): Promise<CreateServicePackageResult>;
  /** Every active ServicePackage for `businessId` by default. */
  listServicePackages(
    businessId: string,
    options?: ListServicePackagesOptions,
  ): Promise<ListServicePackagesResult>;
  /** Deactivating a package hides it from future estimate-building - it never deletes or affects existing line items that reference it. */
  setServicePackageActive(
    businessId: string,
    servicePackageId: string,
    active: boolean,
  ): Promise<SetServicePackageActiveResult>;
}

interface ServicePackageRow {
  id: string;
  name: string;
  description: string | null;
  default_unit_price_minor_units: number;
  default_unit_price_currency: string;
  active: boolean;
  created_at: string;
}

function toServicePackage(row: ServicePackageRow): ServicePackage {
  return {
    id: createServicePackageId(row.id),
    name: row.name,
    description: row.description ?? undefined,
    defaultUnitPrice: createMoney(
      row.default_unit_price_minor_units,
      createCurrencyCode(row.default_unit_price_currency),
    ),
    active: row.active,
    createdAt: row.created_at,
  };
}

const SELECT_COLUMNS =
  'id, name, description, default_unit_price_minor_units, default_unit_price_currency, active, created_at';

export function createSupabaseServicePackageRepository(
  client: MinimalSupabaseClient,
): ServicePackageRepository {
  return {
    async createServicePackage(input) {
      const { data, error } = await client
        .from('service_packages')
        .insert({
          business_id: input.businessId,
          name: input.name,
          description: input.description ?? null,
          default_unit_price_minor_units: input.defaultUnitPrice.amountMinorUnits,
          default_unit_price_currency: input.defaultUnitPrice.currency,
          active: true,
        })
        .select(SELECT_COLUMNS)
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'service_package_insert_failed' };
      }
      return { ok: true, servicePackage: toServicePackage(data as ServicePackageRow) };
    },

    async listServicePackages(businessId, options = {}) {
      let query = client
        .from('service_packages')
        .select(SELECT_COLUMNS)
        .eq('business_id', businessId)
        .order('name', { ascending: true });

      if (!options.includeInactive) query = query.eq('active', true);

      const { data, error } = await query;

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'service_package_list_failed' };
      }
      return { ok: true, servicePackages: (data as ServicePackageRow[]).map(toServicePackage) };
    },

    async setServicePackageActive(businessId, servicePackageId, active) {
      const { error } = await client
        .from('service_packages')
        .update({ active })
        .eq('id', servicePackageId)
        .eq('business_id', businessId);

      if (error) {
        return { ok: false, error: error.message ?? 'service_package_update_failed' };
      }
      return { ok: true };
    },
  };
}
