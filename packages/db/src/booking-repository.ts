import {
  createBookingId,
  type Booking,
  type LeadId,
  type EstimateId,
  type JobId,
} from '@ai-company-os/core-models';
import type { MinimalSupabaseClient } from './supabase-client';

export interface CreateBookingInput {
  readonly businessId: string;
  readonly leadId: string;
  readonly estimateId: string;
  readonly scheduledAt: string;
}

export type CreateBookingResult = { ok: true; booking: Booking } | { ok: false; error: string };
export type GetBookingResult = { ok: true; booking: Booking } | { ok: false; error: string };
export type ListBookingsResult = { ok: true; bookings: Booking[] } | { ok: false; error: string };
export type LinkJobResult = { ok: true } | { ok: false; error: string };

export interface ListBookingsOptions {
  readonly leadId?: string;
}

export interface BookingRepository {
  createBooking(input: CreateBookingInput): Promise<CreateBookingResult>;
  getBooking(businessId: string, bookingId: string): Promise<GetBookingResult>;
  listBookings(businessId: string, options?: ListBookingsOptions): Promise<ListBookingsResult>;
  /** Best-effort back-link once a Job is created from this booking. */
  linkJob(businessId: string, bookingId: string, jobId: string): Promise<LinkJobResult>;
}

interface BookingRow {
  id: string;
  lead_id: string;
  estimate_id: string;
  job_id: string | null;
  scheduled_at: string;
  created_at: string;
}

function toBooking(row: BookingRow): Booking {
  return {
    id: createBookingId(row.id),
    leadId: row.lead_id as LeadId,
    estimateId: row.estimate_id as EstimateId,
    jobId: row.job_id ? (row.job_id as JobId) : undefined,
    scheduledAt: row.scheduled_at,
    createdAt: row.created_at,
  };
}

const SELECT_COLUMNS = 'id, lead_id, estimate_id, job_id, scheduled_at, created_at';

export function createSupabaseBookingRepository(client: MinimalSupabaseClient): BookingRepository {
  return {
    async createBooking(input) {
      const { data, error } = await client
        .from('bookings')
        .insert({
          business_id: input.businessId,
          lead_id: input.leadId,
          estimate_id: input.estimateId,
          scheduled_at: input.scheduledAt,
        })
        .select(SELECT_COLUMNS)
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'booking_insert_failed' };
      }
      return { ok: true, booking: toBooking(data as BookingRow) };
    },

    async getBooking(businessId, bookingId) {
      const { data, error } = await client
        .from('bookings')
        .select(SELECT_COLUMNS)
        .eq('id', bookingId)
        .eq('business_id', businessId)
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'booking_not_found' };
      }
      return { ok: true, booking: toBooking(data as BookingRow) };
    },

    async listBookings(businessId, options = {}) {
      let query = client
        .from('bookings')
        .select(SELECT_COLUMNS)
        .eq('business_id', businessId)
        .order('scheduled_at', { ascending: true });

      if (options.leadId) query = query.eq('lead_id', options.leadId);

      const { data, error } = await query;

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'booking_list_failed' };
      }
      return { ok: true, bookings: (data as BookingRow[]).map(toBooking) };
    },

    async linkJob(businessId, bookingId, jobId) {
      const { error } = await client
        .from('bookings')
        .update({ job_id: jobId })
        .eq('id', bookingId)
        .eq('business_id', businessId);

      if (error) {
        return { ok: false, error: error.message ?? 'booking_link_job_failed' };
      }
      return { ok: true };
    },
  };
}
