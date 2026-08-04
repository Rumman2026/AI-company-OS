import {
  createLeadId,
  transitionLead,
  resolveTransitionAcrossActorCategories,
  type ActorCategory,
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

export type GetLeadResult = { ok: true; lead: Lead } | { ok: false; error: string };
export type ListLeadsResult = { ok: true; leads: Lead[] } | { ok: false; error: string };

export interface ListLeadsOptions {
  readonly status?: LeadStatus;
  readonly contactId?: string;
  readonly limit?: number;
  readonly offset?: number;
}

export interface LeadRepository {
  /**
   * Inserts a new Lead at its initial 'new' status, scoped to
   * `businessId` (see DECISIONS.md ADR-0010). Creation is a
   * repository-level concern, not a state-machine transition - see
   * packages/core-models' fixtures (a Lead is always constructed already
   * at 'new', never reached via transitionLead()).
   */
  createLead(
    businessId: string,
    contactId: ContactId,
    attribution: LeadAttribution,
  ): Promise<CreateLeadResult>;
  /**
   * The only way any caller in this repository may change a Lead's
   * status - always routes through packages/core-models' transitionLead()
   * so illegal transitions, unauthorized actors, and missing preconditions
   * are rejected before anything is written, and a successful transition's
   * audit record is persisted via the injected AuditLogRepository.
   * `businessId` scopes the lookup/update - defense in depth against a
   * cross-tenant bug even though this repository is only ever called
   * from the trusted service-role path, which bypasses RLS.
   */
  transitionLeadStatus(
    businessId: string,
    leadId: string,
    requestedStatus: LeadStatus,
    context: TransitionContext,
  ): Promise<TransitionLeadResult>;
  /**
   * Same as `transitionLeadStatus`, but for a caller that may legitimately
   * hold more than one role at once (see DECISIONS.md ADR-0018) - tries
   * each candidate actor category in order via
   * core-models' `resolveTransitionAcrossActorCategories()` and persists
   * at most one successful outcome. `actorCategories` must be non-empty.
   */
  transitionLeadStatusForRoles(
    businessId: string,
    leadId: string,
    requestedStatus: LeadStatus,
    actorCategories: readonly ActorCategory[],
    context: Omit<TransitionContext, 'actorCategory'>,
  ): Promise<TransitionLeadResult>;
  /** A single Lead, scoped to `businessId`. */
  getLead(businessId: string, leadId: string): Promise<GetLeadResult>;
  /** Every Lead for `businessId`, most recent first, optionally filtered by status. */
  listLeads(businessId: string, options?: ListLeadsOptions): Promise<ListLeadsResult>;
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
    async createLead(businessId, contactId, attribution) {
      const { data, error } = await client
        .from('leads')
        .insert({ business_id: businessId, contact_id: contactId, status: 'new', attribution })
        .select('id, contact_id, status, attribution, duplicate_of_lead_id, created_at')
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'lead_insert_failed' };
      }
      return { ok: true, lead: toLead(data as LeadRow) };
    },

    async transitionLeadStatus(businessId, leadId, requestedStatus, context) {
      const { data, error } = await client
        .from('leads')
        .select('id, contact_id, status, attribution, duplicate_of_lead_id, created_at')
        .eq('id', leadId)
        .eq('business_id', businessId)
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
        .eq('id', leadId)
        .eq('business_id', businessId);

      if (updateError) {
        return { ok: false, error: updateError.message ?? 'lead_update_failed' };
      }

      await auditLog.writeAuditRecord(businessId, result.auditRecord);

      return { ok: true, result };
    },

    async transitionLeadStatusForRoles(
      businessId,
      leadId,
      requestedStatus,
      actorCategories,
      context,
    ) {
      const { data, error } = await client
        .from('leads')
        .select('id, contact_id, status, attribution, duplicate_of_lead_id, created_at')
        .eq('id', leadId)
        .eq('business_id', businessId)
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'lead_not_found' };
      }

      const currentLead = toLead(data as LeadRow);
      const result = resolveTransitionAcrossActorCategories(
        (ctx) => transitionLead(currentLead, requestedStatus, ctx),
        actorCategories,
        context,
      );

      if (result.outcome === 'rejected') {
        return { ok: true, result };
      }

      const { error: updateError } = await client
        .from('leads')
        .update({ status: result.nextState })
        .eq('id', leadId)
        .eq('business_id', businessId);

      if (updateError) {
        return { ok: false, error: updateError.message ?? 'lead_update_failed' };
      }

      await auditLog.writeAuditRecord(businessId, result.auditRecord);

      return { ok: true, result };
    },

    async getLead(businessId, leadId) {
      const { data, error } = await client
        .from('leads')
        .select('id, contact_id, status, attribution, duplicate_of_lead_id, created_at')
        .eq('id', leadId)
        .eq('business_id', businessId)
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'lead_not_found' };
      }
      return { ok: true, lead: toLead(data as LeadRow) };
    },

    async listLeads(businessId, options = {}) {
      let query = client
        .from('leads')
        .select('id, contact_id, status, attribution, duplicate_of_lead_id, created_at')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (options.status) query = query.eq('status', options.status);
      if (options.contactId) query = query.eq('contact_id', options.contactId);
      if (typeof options.limit === 'number') {
        const from = options.offset ?? 0;
        query = query.range(from, from + options.limit - 1);
      }

      const { data, error } = await query;

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'lead_list_failed' };
      }
      return { ok: true, leads: (data as LeadRow[]).map(toLead) };
    },
  };
}
