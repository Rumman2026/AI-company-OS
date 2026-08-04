-- Working hours - closes "Working hours" from the owner's Settings
-- directive. See DECISIONS.md ADR-0031. One row per day of week
-- (0 = Sunday .. 6 = Saturday), upserted as a batch on save.
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE - one new table.
-- No existing table or row is altered.
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/020-business-service-areas.sql.

create table if not exists business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id),
  day_of_week smallint not null check (day_of_week between 0 and 6),
  opens_at time,
  closes_at time,
  closed boolean not null default false,
  created_at timestamptz not null default now(),
  constraint business_hours_unique unique (business_id, day_of_week)
);

alter table business_hours enable row level security;

create index if not exists business_hours_business_id_idx on business_hours (business_id);

comment on table business_hours is
  'One row per day of week (0=Sunday..6=Saturday) - see DECISIONS.md ADR-0031.';

drop policy if exists business_hours_tenant_select on business_hours;
create policy business_hours_tenant_select on business_hours
  for select to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()));

drop policy if exists business_hours_tenant_insert on business_hours;
create policy business_hours_tenant_insert on business_hours
  for insert to authenticated
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));

drop policy if exists business_hours_tenant_update on business_hours;
create policy business_hours_tenant_update on business_hours
  for update to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()))
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));
