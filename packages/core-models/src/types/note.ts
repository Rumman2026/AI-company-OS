import type { NoteId } from '../ids';

/**
 * The CRM entities a Note can be attached to. A closed union (unlike
 * AuditLog's free-form `entityType: string`) since Notes are user-authored
 * and benefit from compile-time protection against a typo'd entity type;
 * AuditLog's free-form type exists to describe an arbitrary future
 * persisted record, not to be constructed by hand.
 */
export type NotableEntityType = 'lead' | 'contact' | 'company' | 'job';

export interface Note {
  readonly id: NoteId;
  readonly entityType: NotableEntityType;
  readonly entityId: string;
  readonly body: string;
  readonly authorId?: string;
  readonly createdAt: string;
}
