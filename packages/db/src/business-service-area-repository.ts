import type { MinimalSupabaseClient } from './supabase-client';

/** Deliberately packages/db-only, mirroring BusinessProfile - see that file's doc comment. */
export interface BusinessServiceArea {
  readonly id: string;
  readonly businessId: string;
  readonly areaName: string;
  readonly createdAt: string;
}

export type CreateServiceAreaResult =
  { ok: true; area: BusinessServiceArea } | { ok: false; error: string };
export type ListServiceAreasResult =
  { ok: true; areas: BusinessServiceArea[] } | { ok: false; error: string };
export type DeleteServiceAreaResult = { ok: true } | { ok: false; error: string };

export interface BusinessServiceAreaRepository {
  createServiceArea(businessId: string, areaName: string): Promise<CreateServiceAreaResult>;
  listServiceAreas(businessId: string): Promise<ListServiceAreasResult>;
  deleteServiceArea(businessId: string, areaId: string): Promise<DeleteServiceAreaResult>;
}

interface BusinessServiceAreaRow {
  id: string;
  business_id: string;
  area_name: string;
  created_at: string;
}

function toServiceArea(row: BusinessServiceAreaRow): BusinessServiceArea {
  return {
    id: row.id,
    businessId: row.business_id,
    areaName: row.area_name,
    createdAt: row.created_at,
  };
}

const SELECT_COLUMNS = 'id, business_id, area_name, created_at';

export function createSupabaseBusinessServiceAreaRepository(
  client: MinimalSupabaseClient,
): BusinessServiceAreaRepository {
  return {
    async createServiceArea(businessId, areaName) {
      const { data, error } = await client
        .from('business_service_areas')
        .insert({ business_id: businessId, area_name: areaName })
        .select(SELECT_COLUMNS)
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'service_area_insert_failed' };
      }
      return { ok: true, area: toServiceArea(data as BusinessServiceAreaRow) };
    },

    async listServiceAreas(businessId) {
      const { data, error } = await client
        .from('business_service_areas')
        .select(SELECT_COLUMNS)
        .eq('business_id', businessId)
        .order('area_name', { ascending: true });

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'service_area_list_failed' };
      }
      return { ok: true, areas: (data as BusinessServiceAreaRow[]).map(toServiceArea) };
    },

    async deleteServiceArea(businessId, areaId) {
      const { error } = await client
        .from('business_service_areas')
        .delete()
        .eq('id', areaId)
        .eq('business_id', businessId);

      if (error) {
        return { ok: false, error: error.message ?? 'service_area_delete_failed' };
      }
      return { ok: true };
    },
  };
}
