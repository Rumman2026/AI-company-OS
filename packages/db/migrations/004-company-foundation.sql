-- Company persistence for packages/core-models' Company type (added
-- this cluster - see DECISIONS.md ADR-0014). No state machine - a
-- Company has no lifecycle, same treatment as contacts.
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE - a new table plus
-- one additive, nullable column on the existing contacts table. No
-- existing row is altered.
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/003-job-pipeline-foundation.sql.

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id),
  name text not null,
  primary_contact_id uuid,
  created_at timestamptz not null default now()
);

alter table companies enable row level security;

create index if not exists companies_business_id_idx on companies (business_id);

comment on table companies is
  'Company records - see packages/core-models Company type and DECISIONS.md ADR-0014. Tenant-scoped like every other CRM table.';

-- A Contact may belong to a Company - additive, nullable, no existing
-- row touched.
alter table contacts add column if not exists company_id uuid references companies (id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'companies_primary_contact_id_fkey'
  ) then
    alter table companies add constraint companies_primary_contact_id_fkey
      foreign key (primary_contact_id) references contacts (id);
  end if;
end $$;

create index if not exists contacts_company_id_idx on contacts (company_id);

comment on column contacts.company_id is 'The Company this Contact belongs to, if any - see DECISIONS.md ADR-0014.';

drop policy if exists companies_tenant_select on companies;
create policy companies_tenant_select on companies
  for select to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()));

drop policy if exists companies_tenant_insert on companies;
create policy companies_tenant_insert on companies
  for insert to authenticated
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));

drop policy if exists companies_tenant_update on companies;
create policy companies_tenant_update on companies
  for update to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()))
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));
