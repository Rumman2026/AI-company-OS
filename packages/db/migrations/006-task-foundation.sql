-- Task persistence for packages/core-models' Task type (added this
-- cluster - see DECISIONS.md ADR-0016). No state machine - a Task
-- moves between exactly two states (open, completed) via a plain
-- boolean, same treatment as Company and Note.
--
-- entity_type/entity_id are an OPTIONAL polymorphic reference (a Task
-- may, but need not, attach to a lead/contact/company/job) - same
-- pattern and same limitation as notes.entity_type/entity_id (see
-- migrations/005-note-foundation.sql): no real foreign key is possible
-- across that boundary, so entity_type is constrained by a check
-- constraint, and the repository layer is responsible for only ever
-- writing an entity_id that refers to a real, tenant-scoped row.
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE - a new table only.
-- No existing table or row is altered.
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/005-note-foundation.sql.

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id),
  title text not null,
  description text,
  due_at timestamptz,
  assigned_to uuid references auth.users (id),
  entity_type text check (entity_type in ('lead', 'contact', 'company', 'job')),
  entity_id uuid,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint tasks_entity_type_id_together check (
    (entity_type is null and entity_id is null) or (entity_type is not null and entity_id is not null)
  ),
  constraint tasks_completed_at_requires_completed check (
    (completed = false and completed_at is null) or (completed = true and completed_at is not null)
  )
);

alter table tasks enable row level security;

create index if not exists tasks_business_id_idx on tasks (business_id);
create index if not exists tasks_entity_idx on tasks (entity_type, entity_id);
create index if not exists tasks_assigned_to_idx on tasks (assigned_to);

comment on table tasks is
  'To-do items, optionally attached to a Lead, Contact, Company, or Job - see packages/core-models Task type and DECISIONS.md ADR-0016. Tenant-scoped like every other CRM table.';

drop policy if exists tasks_tenant_select on tasks;
create policy tasks_tenant_select on tasks
  for select to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()));

drop policy if exists tasks_tenant_insert on tasks;
create policy tasks_tenant_insert on tasks
  for insert to authenticated
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));

drop policy if exists tasks_tenant_update on tasks;
create policy tasks_tenant_update on tasks
  for update to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()))
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));
