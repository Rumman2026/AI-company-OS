import type { AuditRecordId, CorrelationId } from '../ids';
import type { ActorCategory } from '../transition';

/**
 * The persisted shape a future adapter would write. See
 * transition.ts#ProposedAuditRecord for the typed value a state-transition
 * function actually returns - this type documents the eventual storage
 * record, not something this package persists.
 */
export interface AuditLog {
  readonly id: AuditRecordId;
  readonly entityType: string;
  readonly entityId: string;
  readonly action: string;
  readonly previousValue: string;
  readonly newValue: string;
  readonly actorCategory: ActorCategory;
  readonly actorId?: string;
  readonly automated: boolean;
  readonly occurredAt: string;
  readonly reason?: string;
  readonly correlationId?: CorrelationId;
}
