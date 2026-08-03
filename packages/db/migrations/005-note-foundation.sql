-- Note persistence for packages/core-models' Note type (added this
-- cluster - see DECISIONS.md ADR-0015). No state machine - a Note has
-- no lifecycle, same treatment as Company.
--
-- entity_type/entity_id form a polymorphic reference (a Note can attach
-- to a lead, contact, company, or job) - no foreign key is possible
-- across that boundary in Postgres, so entity_type is constrained by a
-- check constraint instead, matching the closed NotableEntityType union
-- in packages/core-models/src/types/note.ts. It is the caller's (the
-- repository layer's) responsibility to have already verified entity_id
-- refers to a real, tenant-scoped row before inserting - the database
-- itself cannot enforce that across a polymorphic reference.
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE - a new table only.
-- No existing table or row is altered.
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/004-company-foundation.sql.

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id),
  entity_type text not null check (entity_type in ('lead', 'contact', 'company', 'job')),
  entity_id uuid not null,
  body text not null,
  author_id uuid references auth.users (id),
  created_at timestamptz not null default now()
);

alter table notes enable row level security;

create index if not exists notes_business_id_idx on notes (business_id);
create index if not exists notes_entity_idx on notes (entity_type, entity_id);

comment on table notes is
  'Freeform notes attached to a Lead, Contact, Company, or Job - see packages/core-models Note type and DECISIONS.md ADR-0015. Tenant-scoped like every other CRM table.';

drop policy if exists notes_tenant_select on notes;
create policy notes_tenant_select on notes
  for select to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()));

drop policy if exists notes_tenant_insert on notes;
create policy notes_tenant_insert on notes
  for insert to authenticated
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));
