import type { ProposedAuditRecord } from '@ai-company-os/core-models';
import type { MinimalSupabaseClient } from './supabase-client';

export type WriteAuditRecordResult = { ok: true } | { ok: false; error: string };

export interface AuditLogRepository {
  /**
   * Persists exactly the ProposedAuditRecord a core-models state-machine
   * transition already returned - never constructs or infers audit
   * content itself. Append-only: no update or delete method exists.
   */
  writeAuditRecord(record: ProposedAuditRecord): Promise<WriteAuditRecordResult>;
}

export function createSupabaseAuditLogRepository(
  client: MinimalSupabaseClient,
): AuditLogRepository {
  return {
    async writeAuditRecord(record) {
      const { error } = await client.from('audit_log').insert({
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
  };
}
