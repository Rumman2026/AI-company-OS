import type { MinimalSupabaseClient } from './supabase-client';

/** 0 = Sunday .. 6 = Saturday, matching JavaScript's Date.getDay(). */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Deliberately packages/db-only, mirroring BusinessProfile - see that file's doc comment. */
export interface BusinessDayHours {
  readonly dayOfWeek: DayOfWeek;
  readonly opensAt?: string;
  readonly closesAt?: string;
  readonly closed: boolean;
}

export interface SetBusinessDayHoursInput {
  readonly dayOfWeek: DayOfWeek;
  readonly opensAt?: string;
  readonly closesAt?: string;
  readonly closed: boolean;
}

export type ListBusinessHoursResult =
  { ok: true; hours: BusinessDayHours[] } | { ok: false; error: string };
export type SetBusinessHoursResult =
  { ok: true; hours: BusinessDayHours[] } | { ok: false; error: string };

export interface BusinessHoursRepository {
  /** Every day this business has ever saved hours for - a business with no saved hours yet returns an empty list, never fabricated defaults. */
  listBusinessHours(businessId: string): Promise<ListBusinessHoursResult>;
  /** Upserts the full week in one call - each entry replaces that day's prior row, if any. */
  setBusinessHours(
    businessId: string,
    days: readonly SetBusinessDayHoursInput[],
  ): Promise<SetBusinessHoursResult>;
}

interface BusinessHoursRow {
  business_id: string;
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  closed: boolean;
}

function toDayHours(row: BusinessHoursRow): BusinessDayHours {
  return {
    dayOfWeek: row.day_of_week as DayOfWeek,
    opensAt: row.opens_at ?? undefined,
    closesAt: row.closes_at ?? undefined,
    closed: row.closed,
  };
}

const SELECT_COLUMNS = 'business_id, day_of_week, opens_at, closes_at, closed';

export function createSupabaseBusinessHoursRepository(
  client: MinimalSupabaseClient,
): BusinessHoursRepository {
  async function fetchHours(businessId: string): Promise<ListBusinessHoursResult> {
    const { data, error } = await client
      .from('business_hours')
      .select(SELECT_COLUMNS)
      .eq('business_id', businessId)
      .order('day_of_week', { ascending: true });

    if (error || !data) {
      return { ok: false, error: error?.message ?? 'business_hours_list_failed' };
    }
    return { ok: true, hours: (data as BusinessHoursRow[]).map(toDayHours) };
  }

  return {
    async listBusinessHours(businessId) {
      return fetchHours(businessId);
    },

    async setBusinessHours(businessId, days) {
      const rows = days.map((day) => ({
        business_id: businessId,
        day_of_week: day.dayOfWeek,
        opens_at: day.opensAt ?? null,
        closes_at: day.closesAt ?? null,
        closed: day.closed,
      }));

      const { error } = await client
        .from('business_hours')
        .upsert(rows, { onConflict: 'business_id,day_of_week' });

      if (error) {
        return { ok: false, error: error.message ?? 'business_hours_save_failed' };
      }

      return fetchHours(businessId);
    },
  };
}
