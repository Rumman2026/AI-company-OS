-- Multi-tenant foundation: `businesses` + `memberships`, tenant-scoped
-- `business_id` on every CRM table, and tenant-isolated RLS policies for
-- the authenticated role. See DECISIONS.md ADR-0010.
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE. New columns are added
-- nullable first, backfilled to a single seed business row (the only
-- tenant with any real data today - GreenCal Pressure Washing), then set
-- NOT NULL - same backfill pattern already used in
-- apps/greencal-website's supabase-migration-002-lead-status.sql. No
-- existing row's contact/lead/audit data is altered.
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/001-crm-foundation.sql.

create extension if not exists pgcrypto;

-- One row per tenant business on this platform (GreenCal Pressure
-- Washing, GreenCal Auto Detailing, Navarro Builders, future clients).
-- `name` and `slug` are DATA, not code - see ADR-0010 for why this table
-- existing does not violate "never hardcode GreenCal business facts into
-- shared platform code": the seed insert below is the one, isolated,
-- clearly-labeled exception, not a pattern for application code to
-- follow.
create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  constraint businesses_slug_unique unique (slug)
);

alter table businesses enable row level security;

comment on table businesses is
  'Tenant businesses on this platform - see DECISIONS.md ADR-0010. RLS: a user may only see businesses they hold a membership in (see policy below); the service-role key bypasses RLS as usual.';

-- Links a Supabase Auth user (auth.users) to a business with a role.
-- `role` intentionally reuses a subset of packages/core-models'
-- ActorCategory string values (see MembershipRole in
-- packages/db/src/membership-types.ts) so a membership row maps directly
-- to an ActorCategory for state-machine transitions with no translation
-- table.
create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id),
  user_id uuid not null references auth.users (id),
  role text not null,
  created_at timestamptz not null default now(),
  constraint memberships_business_user_unique unique (business_id, user_id)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'memberships_role_check'
  ) then
    alter table memberships add constraint memberships_role_check
      check (role in ('owner-admin','office-manager','dispatcher','technician'));
  end if;
end $$;

create index if not exists memberships_user_id_idx on memberships (user_id);
create index if not exists memberships_business_id_idx on memberships (business_id);

alter table memberships enable row level security;

comment on table memberships is
  'Which Supabase Auth user belongs to which business, with what role - see DECISIONS.md ADR-0010. A user may only see their own membership rows (RLS below).';

-- Seed the one real tenant with data today. This INSERT is the single,
-- deliberate, clearly-labeled exception to "never hardcode GreenCal
-- business facts into shared platform code" - it is data in a migration
-- file, not a code path any application logic branches on.
insert into businesses (id, name, slug)
select gen_random_uuid(), 'GreenCal Pressure Washing', 'greencal-pressure-washing'
where not exists (select 1 from businesses where slug = 'greencal-pressure-washing');

-- Add business_id to every existing CRM table, nullable first.
alter table contacts add column if not exists business_id uuid references businesses (id);
alter table leads add column if not exists business_id uuid references businesses (id);
alter table audit_log add column if not exists business_id uuid references businesses (id);

-- Backfill every existing row to the seed business (the only tenant with
-- any real data as of this migration).
update contacts set business_id = (select id from businesses where slug = 'greencal-pressure-washing')
  where business_id is null;
update leads set business_id = (select id from businesses where slug = 'greencal-pressure-washing')
  where business_id is null;
update audit_log set business_id = (select id from businesses where slug = 'greencal-pressure-washing')
  where business_id is null;

alter table contacts alter column business_id set not null;
alter table leads alter column business_id set not null;
alter table audit_log alter column business_id set not null;

create index if not exists contacts_business_id_idx on contacts (business_id);
create index if not exists leads_business_id_idx on leads (business_id);
create index if not exists audit_log_business_id_idx on audit_log (business_id);

-- Tenant-isolation RLS policies for the `authenticated` role (Supabase
-- Auth users - the future admin-console). The service-role key continues
-- to bypass RLS entirely, as it does today - these policies only ever
-- apply to a real logged-in user's session.
create policy if not exists businesses_member_select on businesses
  for select to authenticated
  using (id in (select business_id from memberships where user_id = auth.uid()));

create policy if not exists memberships_own_select on memberships
  for select to authenticated
  using (user_id = auth.uid());

create policy if not exists contacts_tenant_select on contacts
  for select to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()));

create policy if not exists contacts_tenant_insert on contacts
  for insert to authenticated
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));

create policy if not exists contacts_tenant_update on contacts
  for update to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()))
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));

create policy if not exists leads_tenant_select on leads
  for select to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()));

create policy if not exists leads_tenant_insert on leads
  for insert to authenticated
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));

create policy if not exists leads_tenant_update on leads
  for update to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()))
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));

create policy if not exists audit_log_tenant_select on audit_log
  for select to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()));

comment on column contacts.business_id is 'Tenant owner of this contact - see DECISIONS.md ADR-0010.';
comment on column leads.business_id is 'Tenant owner of this lead - see DECISIONS.md ADR-0010.';
comment on column audit_log.business_id is 'Tenant owner of this audit record - see DECISIONS.md ADR-0010.';
