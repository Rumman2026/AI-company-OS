import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseNotificationRepository } from '../src/notification-repository';
import { createFakeSupabaseClient, type FakeTable } from './fake-supabase';

const BUSINESS_A = 'business-a';
const USER_A = 'user-a';
const USER_B = 'user-b';

function setup(seed: Array<Record<string, unknown>> = []) {
  const notifications: FakeTable = { rows: [...seed], nextId: 1 };
  const client = createFakeSupabaseClient({ notifications });
  const repo = createSupabaseNotificationRepository(client);
  return { repo, notifications };
}

test('createNotification inserts an unread in-app notification for the recipient', async () => {
  const { repo, notifications } = setup();

  const result = await repo.createNotification({
    businessId: BUSINESS_A,
    recipientUserId: USER_A,
    channel: 'in-app',
    eventType: 'estimate-customer-approved',
    title: 'Estimate approved by customer',
    body: 'Jane Smith approved estimate #123',
    entityType: 'lead',
    entityId: 'lead-1',
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.notification.read, false);
    assert.equal(result.notification.channel, 'in-app');
    assert.equal(result.notification.title, 'Estimate approved by customer');
  }
  assert.equal(notifications.rows[0].recipient_user_id, USER_A);
});

test("listNotifications returns only the calling recipient's notifications, most recent first", async () => {
  const { repo } = setup([
    {
      id: 'n-1',
      business_id: BUSINESS_A,
      recipient_user_id: USER_A,
      channel: 'in-app',
      event_type: 'estimate-customer-approved',
      title: 'First',
      body: null,
      entity_type: null,
      entity_id: null,
      read: false,
      read_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'n-2',
      business_id: BUSINESS_A,
      recipient_user_id: USER_A,
      channel: 'in-app',
      event_type: 'estimate-customer-approved',
      title: 'Second',
      body: null,
      entity_type: null,
      entity_id: null,
      read: false,
      read_at: null,
      created_at: '2026-01-02T00:00:00.000Z',
    },
    {
      id: 'n-3',
      business_id: BUSINESS_A,
      recipient_user_id: USER_B,
      channel: 'in-app',
      event_type: 'estimate-customer-approved',
      title: "Another user's",
      body: null,
      entity_type: null,
      entity_id: null,
      read: false,
      read_at: null,
      created_at: '2026-01-03T00:00:00.000Z',
    },
  ]);

  const result = await repo.listNotifications(USER_A);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(
      result.notifications.length,
      2,
      "must never include another recipient's notification",
    );
    assert.equal(result.notifications[0].title, 'Second', 'most recent first');
  }
});

test('listNotifications supports an unreadOnly filter', async () => {
  const { repo } = setup([
    {
      id: 'n-1',
      business_id: BUSINESS_A,
      recipient_user_id: USER_A,
      channel: 'in-app',
      event_type: 'estimate-customer-approved',
      title: 'Read one',
      body: null,
      entity_type: null,
      entity_id: null,
      read: true,
      read_at: '2026-01-01T00:00:00.000Z',
      created_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'n-2',
      business_id: BUSINESS_A,
      recipient_user_id: USER_A,
      channel: 'in-app',
      event_type: 'estimate-customer-approved',
      title: 'Unread one',
      body: null,
      entity_type: null,
      entity_id: null,
      read: false,
      read_at: null,
      created_at: '2026-01-02T00:00:00.000Z',
    },
  ]);

  const result = await repo.listNotifications(USER_A, { unreadOnly: true });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.notifications.length, 1);
    assert.equal(result.notifications[0].title, 'Unread one');
  }
});

test('markNotificationRead sets read/readAt for the correct recipient only', async () => {
  const { repo, notifications } = setup([
    {
      id: 'n-1',
      business_id: BUSINESS_A,
      recipient_user_id: USER_A,
      channel: 'in-app',
      event_type: 'estimate-customer-approved',
      title: 'First',
      body: null,
      entity_type: null,
      entity_id: null,
      read: false,
      read_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]);

  const crossUser = await repo.markNotificationRead(USER_B, 'n-1');
  assert.equal(crossUser.ok, true);
  assert.equal(
    notifications.rows[0].read,
    false,
    "another user's mark-read must not affect this row",
  );

  const result = await repo.markNotificationRead(USER_A, 'n-1');
  assert.equal(result.ok, true);
  assert.equal(notifications.rows[0].read, true);
  assert.ok(notifications.rows[0].read_at);
});
