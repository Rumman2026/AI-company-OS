import {
  createLeadId,
  transitionLead,
  type Lead,
  type LeadAttribution,
  type LeadStatus,
  type ContactId,
  type TransitionContext,
  type TransitionResult,
} from '@ai-company-os/core-models';
import type { MinimalSupabaseClient } from './supabase-client';
import type { AuditLogRepository } from './audit-log-repository';

export type CreateLeadResult = { ok: true; lead: Lead } | { ok: false; error: string };

export type TransitionLeadResult =
  { ok: true; result: TransitionResult<LeadStatus, Lead> } | { ok: false; error: string };

export interface LeadRepository {
  /**
   * Inserts a new Lead at its initial 'new' status. Creation is a
   * repository-level concern, not a state-machine transition - see
   * packages/core-models' fixtures (a Lead is always constructed already
   * at 'new', never reached via transitionLead()).
   */
  createLead(contactId: ContactId, attribution: LeadAttribution): Promise<CreateLeadResult>;
  /**
   * The only way any caller in this repository may change a Lead's
   * status - always routes through packages/core-models' transitionLead()
   * so illegal transitions, unauthorized actors, and missing preconditions
   * are rejected before anything is written, and a successful transition's
   * audit record is persisted via the injected AuditLogRepository.
   */
  transitionLeadStatus(
    leadId: string,
    requestedStatus: LeadStatus,
    context: TransitionContext,
  ): Promise<TransitionLeadResult>;
}

interface LeadRow {
  id: string;
  contact_id: string;
  status: LeadStatus;
  attribution: LeadAttribution;
  duplicate_of_lead_id: string | null;
  created_at: string;
}

function toLead(row: LeadRow): Lead {
  return {
    id: createLeadId(row.id),
    contactId: row.contact_id as ContactId,
    status: row.status,
    attribution: row.attribution,
    duplicateOfLeadId: row.duplicate_of_lead_id
      ? createLeadId(row.duplicate_of_lead_id)
      : undefined,
    createdAt: row.created_at,
  };
}

export function createSupabaseLeadRepository(
  client: MinimalSupabaseClient,
  auditLog: AuditLogRepository,
): LeadRepository {
  return {
    async createLead(contactId, attribution) {
      const { data, error } = await client
        .from('leads')
        .insert({ contact_id: contactId, status: 'new', attribution })
        .select('id, contact_id, status, attribution, duplicate_of_lead_id, created_at')
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'lead_insert_failed' };
      }
      return { ok: true, lead: toLead(data as LeadRow) };
    },

    async transitionLeadStatus(leadId, requestedStatus, context) {
      const { data, error } = await client
        .from('leads')
        .select('id, contact_id, status, attribution, duplicate_of_lead_id, created_at')
        .eq('id', leadId)
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'lead_not_found' };
      }

      const currentLead = toLead(data as LeadRow);
      const result = transitionLead(currentLead, requestedStatus, context);

      if (result.outcome === 'rejected') {
        return { ok: true, result };
      }

      const { error: updateError } = await client
        .from('leads')
        .update({ status: result.nextState })
        .eq('id', leadId);

      if (updateError) {
        return { ok: false, error: updateError.message ?? 'lead_update_failed' };
      }

      await auditLog.writeAuditRecord(result.auditRecord);

      return { ok: true, result };
    },
  };
}
