import { randomUUID } from 'node:crypto';
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
  /**
   * Best-effort bookkeeping for the customer-confirmation email, separate
   * from the owner notification above. Never affects the returned
   * QuoteSubmissionResult - see supabase-resend-adapter.ts.
   */
  markCustomerConfirmationStatus(
    leadId: string,
    status: 'sent' | 'failed' | 'not_attempted',
    details?: { providerId?: string; errorCode?: string },
  ): Promise<void>;
  /**
   * Best-effort flag for a deliberately labeled test submission (set only
   * via the internal `__testLead` request field - never customer-facing,
   * never client-submittable through the public form). Failing silently
   * (e.g. before the additive migration adding `is_test_lead` has been
   * run) must never affect the returned QuoteSubmissionResult.
   */
  markTestLead(leadId: string): Promise<void>;
}

const POSTGRES_UNIQUE_VIOLATION = '23505';

/**
 * Strips anything email- or phone-shaped before a Postgrest error reaches
 * the server logs. Postgrest error messages/hints describe schema
 * elements (columns, constraints, tables), not submitted values, for
 * every failure mode this store can hit (auth/permission, not-null,
 * unique-violation) - this is defense-in-depth, not a fix for an observed
 * leak.
 */
function sanitizeForLog(value: string | null | undefined): string | null {
  if (!value) return null;
  return value
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/gi, '[redacted-email]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[redacted-phone]');
}

/**
 * Logs exactly the fields needed to diagnose a rejected insert from
 * Vercel's runtime logs, and nothing that could identify a customer or
 * expose a credential: no request payload, no `error.details` (which can
 * echo back the offending value for some Postgres errors), no URL, no
 * key. `error.code`/`message`/`hint` describe the rejection itself, never
 * submitted field values, for the failure modes this store can hit.
 */
function logRejectedInsert(
  context: string,
  status: number,
  error: { code?: string; message?: string; hint?: string } | null,
): void {
  console.error('[lead-store] ' + context, {
    correlationId: randomUUID(),
    httpStatus: status,
    code: error?.code ?? null,
    message: sanitizeForLog(error?.message),
    hint: sanitizeForLog(error?.hint),
  });
}

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

      const { data, error, status } = await client
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
        const {
          data: existing,
          error: fetchError,
          status: fetchStatus,
        } = await client
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
        logRejectedInsert('idempotent-replay lookup rejected', fetchStatus, fetchError);
        return { ok: false, error: 'duplicate_lookup_failed' };
      }

      logRejectedInsert('insert rejected', status, error);
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

    async markCustomerConfirmationStatus(leadId, status, details) {
      try {
        await client
          .from('quote_leads')
          .update({
            customer_confirmation_status: status,
            customer_confirmation_provider_id: details?.providerId ?? null,
            customer_confirmation_error_code: details?.errorCode ?? null,
          })
          .eq('lead_id', leadId);
      } catch {
        // Best-effort only, same rationale as markNotificationStatus above.
        // Deliberately tolerant of the customer_confirmation_status column
        // not existing yet (before the additive migration is run) - never
        // breaks the insert path or the returned result.
      }
    },

    async markTestLead(leadId) {
      try {
        await client.from('quote_leads').update({ is_test_lead: true }).eq('lead_id', leadId);
      } catch {
        // Best-effort only - tolerant of the is_test_lead column not
        // existing yet. Never breaks the insert path or the returned
        // result.
      }
    },
  };
}
