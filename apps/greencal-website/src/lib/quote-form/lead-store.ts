import { createClient } from '@supabase/supabase-js';
import { QUOTE_LEAD_SOURCE, type NormalizedQuoteInput } from './types';

export interface QuoteLeadInsertRow {
  leadId: string;
  createdAt: string;
  pagePath: string;
  idempotencyKey: string;
  input: NormalizedQuoteInput;
}

export interface StoredLead {
  leadId: string;
  createdAt: string;
}

export type InsertLeadResult =
  { ok: true; row: StoredLead; duplicate: boolean } | { ok: false; error: string };

/**
 * The narrow interface the orchestration layer (supabase-resend-adapter.ts)
 * depends on - not the real Supabase SDK. This keeps the orchestration
 * logic (idempotency handling, success/failure decisions) fully
 * unit-testable with a simple fake, with no real database or SDK involved
 * in tests at all.
 */
export interface LeadStore {
  insertLead(row: QuoteLeadInsertRow): Promise<InsertLeadResult>;
  markNotificationStatus(
    leadId: string,
    status: 'sent' | 'failed',
    details?: { providerId?: string; errorCode?: string },
  ): Promise<void>;
}

const POSTGRES_UNIQUE_VIOLATION = '23505';

/**
 * The real, GreenCal-owned Supabase implementation. Only ever constructed
 * from the trusted server route with the server-only service-role key -
 * never imported or instantiated from client-side code. See
 * supabase-schema.sql for the table this reads/writes.
 */
export function createSupabaseLeadStore(url: string, serviceRoleKey: string): LeadStore {
  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  return {
    async insertLead(row) {
      const { input } = row;
      const insertPayload = {
        lead_id: row.leadId,
        created_at: row.createdAt,
        source: QUOTE_LEAD_SOURCE,
        page_path: row.pagePath,
        full_name: input.fullName,
        phone: input.phone,
        email: input.email,
        service: input.service,
        city: input.city,
        service_location: input.serviceLocation,
        project_description: input.projectDescription,
        preferred_contact_method: input.preferredContactMethod ?? null,
        preferred_timing: input.preferredTiming ?? null,
        property_type: input.propertyType ?? null,
        estimated_project_size: input.estimatedProjectSize ?? null,
        consent: input.consent,
        submission_status: 'received',
        lead_storage_status: 'stored',
        notification_status: 'pending',
        idempotency_key: row.idempotencyKey,
      };

      const { data, error } = await client
        .from('quote_leads')
        .insert(insertPayload)
        .select('lead_id, created_at')
        .single();

      if (!error && data) {
        return {
          ok: true,
          row: { leadId: data.lead_id as string, createdAt: data.created_at as string },
          duplicate: false,
        };
      }

      if (error?.code === POSTGRES_UNIQUE_VIOLATION) {
        // Idempotent replay: the exact same request was already stored.
        // Look up the existing row rather than creating a duplicate.
        const { data: existing, error: fetchError } = await client
          .from('quote_leads')
          .select('lead_id, created_at')
          .eq('idempotency_key', row.idempotencyKey)
          .single();

        if (!fetchError && existing) {
          return {
            ok: true,
            row: {
              leadId: existing.lead_id as string,
              createdAt: existing.created_at as string,
            },
            duplicate: true,
          };
        }
        return { ok: false, error: 'duplicate_lookup_failed' };
      }

      return { ok: false, error: error?.message ?? 'unknown_insert_error' };
    },

    async markNotificationStatus(leadId, status, details) {
      try {
        await client
          .from('quote_leads')
          .update({
            notification_status: status,
            notification_provider_id: details?.providerId ?? null,
            notification_error_code: details?.errorCode ?? null,
          })
          .eq('lead_id', leadId);
      } catch {
        // Best-effort status bookkeeping only - a failure here must never
        // change the QuoteSubmissionResult the orchestration layer already
        // decided. Server-side only; never surfaced to the customer.
      }
    },
  };
}
