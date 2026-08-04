-- Internal notifications and a notification center - closes "Internal
-- notifications" and "Notification center" from the owner's
-- Notifications directive. See DECISIONS.md ADR-0034.
--
-- Per-recipient, not a shared business-wide inbox: each notification
-- belongs to exactly one staff member (recipient_user_id) - the
-- select/update policies below scope to `recipient_user_id = auth.uid()`,
-- not `business_id`, so a team member never sees another member's
-- notifications.
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE - one new table.
-- No existing table or row is altered.
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/022-team-roster.sql.

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id),
  recipient_user_id uuid not null,
  channel text not null check (channel in ('in-app', 'email', 'sms')),
  event_type text not null
    check (event_type in ('estimate-customer-approved', 'lead-created', 'job-status-changed', 'task-assigned')),
  title text not null,
  body text,
  entity_type text check (entity_type in ('lead', 'contact', 'company', 'job')),
  entity_id uuid,
  read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;

create index if not exists notifications_business_id_idx on notifications (business_id);
create index if not exists notifications_recipient_user_id_idx on notifications (recipient_user_id);

comment on table notifications is
  'Per-recipient staff notifications - see packages/core-models Notification type and DECISIONS.md ADR-0034. channel is only ever "in-app" today; "email"/"sms" are modeled for forward-compatible filtering only, mirroring TimelineEntryType (ADR-0025).';

drop policy if exists notifications_recipient_select on notifications;
create policy notifications_recipient_select on notifications
  for select to authenticated
  using (recipient_user_id = auth.uid());

drop policy if exists notifications_recipient_update on notifications;
create policy notifications_recipient_update on notifications
  for update to authenticated
  using (recipient_user_id = auth.uid())
  with check (recipient_user_id = auth.uid());

-- Lets an authenticated team member create a notification for another
-- member of their own business (e.g. a future "assign a task and
-- notify" flow) - not required by today's one real trigger
-- (estimate-customer-approved), which runs via the service-role
-- client on the public approval route and so bypasses RLS entirely.
drop policy if exists notifications_tenant_insert on notifications;
create policy notifications_tenant_insert on notifications
  for insert to authenticated
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));
