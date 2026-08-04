import {
  createNotificationId,
  type Notification,
  type NotificationChannel,
  type NotificationEventType,
  type NotableEntityType,
} from '@ai-company-os/core-models';
import type { MinimalSupabaseClient } from './supabase-client';

export interface CreateNotificationInput {
  readonly businessId: string;
  readonly recipientUserId: string;
  readonly channel: NotificationChannel;
  readonly eventType: NotificationEventType;
  readonly title: string;
  readonly body?: string;
  readonly entityType?: NotableEntityType;
  readonly entityId?: string;
}

export interface ListNotificationsOptions {
  readonly unreadOnly?: boolean;
}

export type CreateNotificationResult =
  { ok: true; notification: Notification } | { ok: false; error: string };
export type ListNotificationsResult =
  { ok: true; notifications: Notification[] } | { ok: false; error: string };
export type MarkNotificationReadResult = { ok: true } | { ok: false; error: string };

export interface NotificationRepository {
  createNotification(input: CreateNotificationInput): Promise<CreateNotificationResult>;
  /** Every notification for the calling user, most recent first - never another recipient's. */
  listNotifications(
    recipientUserId: string,
    options?: ListNotificationsOptions,
  ): Promise<ListNotificationsResult>;
  markNotificationRead(
    recipientUserId: string,
    notificationId: string,
  ): Promise<MarkNotificationReadResult>;
}

interface NotificationRow {
  id: string;
  recipient_user_id: string;
  channel: NotificationChannel;
  event_type: NotificationEventType;
  title: string;
  body: string | null;
  entity_type: NotableEntityType | null;
  entity_id: string | null;
  read: boolean;
  read_at: string | null;
  created_at: string;
}

function toNotification(row: NotificationRow): Notification {
  return {
    id: createNotificationId(row.id),
    recipientUserId: row.recipient_user_id,
    channel: row.channel,
    eventType: row.event_type,
    title: row.title,
    body: row.body ?? undefined,
    entityType: row.entity_type ?? undefined,
    entityId: row.entity_id ?? undefined,
    read: row.read,
    readAt: row.read_at ?? undefined,
    createdAt: row.created_at,
  };
}

const SELECT_COLUMNS =
  'id, recipient_user_id, channel, event_type, title, body, entity_type, entity_id, read, read_at, created_at';

export function createSupabaseNotificationRepository(
  client: MinimalSupabaseClient,
): NotificationRepository {
  return {
    async createNotification(input) {
      const { data, error } = await client
        .from('notifications')
        .insert({
          business_id: input.businessId,
          recipient_user_id: input.recipientUserId,
          channel: input.channel,
          event_type: input.eventType,
          title: input.title,
          body: input.body ?? null,
          entity_type: input.entityType ?? null,
          entity_id: input.entityId ?? null,
          read: false,
          read_at: null,
        })
        .select(SELECT_COLUMNS)
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'notification_insert_failed' };
      }
      return { ok: true, notification: toNotification(data as NotificationRow) };
    },

    async listNotifications(recipientUserId, options = {}) {
      let query = client
        .from('notifications')
        .select(SELECT_COLUMNS)
        .eq('recipient_user_id', recipientUserId)
        .order('created_at', { ascending: false });

      if (options.unreadOnly) query = query.eq('read', false);

      const { data, error } = await query;

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'notification_list_failed' };
      }
      return { ok: true, notifications: (data as NotificationRow[]).map(toNotification) };
    },

    async markNotificationRead(recipientUserId, notificationId) {
      const { error } = await client
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('recipient_user_id', recipientUserId);

      if (error) {
        return { ok: false, error: error.message ?? 'notification_update_failed' };
      }
      return { ok: true };
    },
  };
}
