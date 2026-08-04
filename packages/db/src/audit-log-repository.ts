import {
  createAuditRecordId,
  createCorrelationId,
  type AuditLog,
  type ProposedAuditRecord,
} from '@ai-company-os/core-models';
import type { MinimalSupabaseClient } from './supabase-client';

export type WriteAuditRecordResult = { ok: true } | { ok: false; error: string };
export type ListAuditRecordsResult =
  { ok: true; records: AuditLog[] } | { ok: false; error: string };

export interface ListAuditRecordsOptions {
  readonly entityType?: string;
  readonly entityId?: string;
  readonly limit?: number;
}

export interface AuditLogRepository {
  /**
   * Persists exactly the ProposedAuditRecord a core-models state-machine
   * transition already returned, scoped to `businessId` (see
   * DECISIONS.md ADR-0010) - never constructs or infers audit content
   * itself. Append-only: no update or delete method exists.
   */
  writeAuditRecord(
    businessId: string,
    record: ProposedAuditRecord,
  ): Promise<WriteAuditRecordResult>;
  /** Most recent audit records first, scoped to `businessId`, optionally filtered to one entity. */
  listAuditRecords(
    businessId: string,
    options?: ListAuditRecordsOptions,
  ): Promise<ListAuditRecordsResult>;
}

interface AuditLogRow {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  previous_value: string;
  new_value: string;
  actor_category: AuditLog['actorCategory'];
  actor_id: string | null;
  automated: boolean;
  occurred_at: string;
  reason: string | null;
  correlation_id: string | null;
}

function toAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: createAuditRecordId(row.id),
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    previousValue: row.previous_value,
    newValue: row.new_value,
    actorCategory: row.actor_category,
    actorId: row.actor_id ?? undefined,
    automated: row.automated,
    occurredAt: row.occurred_at,
    reason: row.reason ?? undefined,
    correlationId: row.correlation_id ? createCorrelationId(row.correlation_id) : undefined,
  };
}

const SELECT_COLUMNS =
  'id, entity_type, entity_id, action, previous_value, new_value, actor_category, actor_id, automated, occurred_at, reason, correlation_id';

export function createSupabaseAuditLogRepository(
  client: MinimalSupabaseClient,
): AuditLogRepository {
  return {
    async writeAuditRecord(businessId, record) {
      const { error } = await client.from('audit_log').insert({
        business_id: businessId,
        entity_type: record.entityType,
        entity_id: record.entityId,
        action: record.action,
        previous_value: record.previousValue,
        new_value: record.newValue,
        actor_category: record.actorCategory,
        actor_id: record.actorId,
        automated: record.automated,
        occurred_at: record.occurredAt,
        reason: record.reason ?? null,
        correlation_id: record.correlationId ?? null,
      });

      if (error) {
        return { ok: false, error: error.message ?? 'audit_log_insert_failed' };
      }
      return { ok: true };
    },

    async listAuditRecords(businessId, options = {}) {
      let query = client
        .from('audit_log')
        .select(SELECT_COLUMNS)
        .eq('business_id', businessId)
        .order('occurred_at', { ascending: false });

      if (options.entityType) query = query.eq('entity_type', options.entityType);
      if (options.entityId) query = query.eq('entity_id', options.entityId);
      if (typeof options.limit === 'number') query = query.limit(options.limit);

      const { data, error } = await query;

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'audit_log_list_failed' };
      }
      return { ok: true, records: (data as AuditLogRow[]).map(toAuditLog) };
    },
  };
}
