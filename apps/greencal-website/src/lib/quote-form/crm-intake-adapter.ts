import {
  createDbClient,
  createSupabaseAuditLogRepository,
  createSupabaseContactRepository,
  createSupabaseLeadRepository,
} from '@ai-company-os/db';
import type { LeadAttribution } from '@ai-company-os/core-models';
import type { CrmIntake } from './supabase-resend-adapter';

/**
 * The real @ai-company-os/db-backed CrmIntake implementation (see
 * DECISIONS.md ADR-0009). GreenCal's public quote form has no UTM or
 * referrer capture today, so `channel` is honestly recorded as
 * `'unknown'` rather than guessing `'direct'` or any other specific
 * channel - see the doc comment on AttributionChannel in
 * packages/core-models.
 */
export function createSupabaseCrmIntake(url: string, serviceRoleKey: string): CrmIntake {
  const client = createDbClient(url, serviceRoleKey);
  const contacts = createSupabaseContactRepository(client);
  const auditLog = createSupabaseAuditLogRepository(client);
  const leads = createSupabaseLeadRepository(client, auditLog);

  return {
    async recordLead(input) {
      const contactResult = await contacts.findOrCreateContact({
        displayName: input.fullName,
        phone: input.phone,
        email: input.email,
      });
      if (!contactResult.ok) {
        return { ok: false, error: contactResult.error };
      }

      const attribution: LeadAttribution = {
        channel: 'unknown',
        leadCreatedAt: new Date().toISOString(),
      };

      const leadResult = await leads.createLead(contactResult.contact.id, attribution);
      if (!leadResult.ok) {
        return { ok: false, error: leadResult.error };
      }

      return { ok: true, crmLeadId: leadResult.lead.id };
    },
  };
}
