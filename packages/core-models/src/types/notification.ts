import type { NotificationId } from '../ids';
import type { NotableEntityType } from './note';

/**
 * Deliberately a superset of what any trigger produces today - see
 * DECISIONS.md ADR-0034. `'in-app'` is the only channel any code path
 * in this repository ever creates a Notification with; `'email'` and
 * `'sms'` exist as named values for forward-compatible filtering once
 * a real email/SMS provider credential is configured (mirrors
 * TimelineEntryType's honest not-yet-implemented pattern, ADR-0025).
 */
export type NotificationChannel = 'in-app' | 'email' | 'sms';

/**
 * The specific event a Notification represents - a closed union so a
 * consuming UI can render/group meaningfully, same reasoning as
 * NotableEntityType. Deliberately a superset of what any trigger
 * produces today (see DECISIONS.md ADR-0034) - only
 * `'estimate-customer-approved'` has a real code path that creates
 * one; the rest are named for forward-compatible filtering.
 */
export type NotificationEventType =
  'estimate-customer-approved' | 'lead-created' | 'job-status-changed' | 'task-assigned';

/**
 * A to-do-adjacent notice for a staff member - no state machine (same
 * treatment as Task/Note/Company): a Notification moves between
 * exactly two states (unread, read) with no authorization rules or
 * precondition evidence governing that move.
 */
export interface Notification {
  readonly id: NotificationId;
  readonly recipientUserId: string;
  readonly channel: NotificationChannel;
  readonly eventType: NotificationEventType;
  readonly title: string;
  readonly body?: string;
  readonly entityType?: NotableEntityType;
  readonly entityId?: string;
  readonly read: boolean;
  readonly readAt?: string;
  readonly createdAt: string;
}
