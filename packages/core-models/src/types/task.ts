import type { TaskId } from '../ids';
import type { NotableEntityType } from './note';

/**
 * A to-do item. No state machine - core-models' "exactly five lifecycles"
 * (Lead, Job, Invoice, Content, Review Request) is a deliberate closed
 * set (see README). Completion is a plain boolean, the same treatment as
 * Company and Note - a Task moves between exactly two states (open,
 * completed) with no authorization rules or precondition evidence
 * governing that move, so a full transition function would be
 * ceremony without benefit.
 *
 * entityType/entityId reuse Note's NotableEntityType - both are optional
 * together, since a Task is not required to attach to a CRM entity (e.g.
 * "call the parts supplier" has nothing to attach to).
 */
export interface Task {
  readonly id: TaskId;
  readonly title: string;
  readonly description?: string;
  readonly dueAt?: string;
  readonly assignedTo?: string;
  readonly entityType?: NotableEntityType;
  readonly entityId?: string;
  readonly completed: boolean;
  readonly completedAt?: string;
  readonly createdAt: string;
}
