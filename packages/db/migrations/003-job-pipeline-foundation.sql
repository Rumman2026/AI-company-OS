-- Estimate/Booking/Job persistence for packages/core-models' existing
-- types and Job state machine. See DECISIONS.md ADR-0012.
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE - purely additive new
-- tables, tenant-scoped exactly like contacts/leads/audit_log (ADR-0010).
-- No existing table is altered.
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/002-multi-tenant-foundation.sql.

-- Job.bookingId and Booking.estimateId are both required (non-optional)
-- in packages/core-models - creating a real, schema-correct Job requires
-- a Booking to already exist, which requires an Estimate to already
-- exist. All three are created together here rather than Job in
-- isolation, to avoid loosening a domain-model invariant the existing,
-- tested types already enforce.

create table if not exists estimates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id),
  lead_id uuid not null references leads (id),
  proposed_amount_minor_units integer not null,
  proposed_amount_currency text not null,
  summary text not null,
  created_at timestamptz not null default now()
);

alter table estimates enable row level security;

create index if not exists estimates_business_id_idx on estimates (business_id);
create index if not exists estimates_lead_id_idx on estimates (lead_id);

comment on table estimates is
  'Estimate records - see packages/core-models Estimate type and DECISIONS.md ADR-0012. Server-only/RLS access, tenant-scoped like every other CRM table.';

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id),
  lead_id uuid not null references leads (id),
  estimate_id uuid not null references estimates (id),
  -- job_id is nullable and has no FK yet - a booking can exist before its
  -- job does. The FK to jobs(id) is added further down, once the jobs
  -- table exists (a deliberate, standard circular-reference pattern:
  -- jobs.booking_id -> bookings.id is NOT NULL; bookings.job_id -> jobs.id
  -- is nullable and added after).
  job_id uuid,
  scheduled_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table bookings enable row level security;

create index if not exists bookings_business_id_idx on bookings (business_id);
create index if not exists bookings_lead_id_idx on bookings (lead_id);
create index if not exists bookings_estimate_id_idx on bookings (estimate_id);

comment on table bookings is
  'Booking records - see packages/core-models Booking type and DECISIONS.md ADR-0012.';

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id),
  lead_id uuid not null references leads (id),
  booking_id uuid not null references bookings (id),
  status text not null default 'draft',
  technician_id uuid,
  scheduled_at timestamptz,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'jobs_status_check'
  ) then
    alter table jobs add constraint jobs_status_check
      check (status in (
        'draft','scheduled','assigned','in-progress','service-completed',
        'awaiting-office-review','completed','follow-up-required','canceled'
      ));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_job_id_fkey'
  ) then
    alter table bookings add constraint bookings_job_id_fkey
      foreign key (job_id) references jobs (id);
  end if;
end $$;

alter table jobs enable row level security;

create index if not exists jobs_business_id_idx on jobs (business_id);
create index if not exists jobs_lead_id_idx on jobs (lead_id);
create index if not exists jobs_booking_id_idx on jobs (booking_id);
create index if not exists jobs_status_idx on jobs (status);

comment on table jobs is
  'Job records - see packages/core-models Job type/state machine (transitionJob) and DECISIONS.md ADR-0012. Every status change must route through transitionJob(), never a raw column write.';

-- Tenant-isolation RLS policies for the `authenticated` role, same
-- pattern as ADR-0010's contacts/leads policies. DROP POLICY IF EXISTS +
-- CREATE POLICY is the correct idempotent pattern (CREATE POLICY has no
-- IF NOT EXISTS clause - see migration 002's fix history).

drop policy if exists estimates_tenant_select on estimates;
create policy estimates_tenant_select on estimates
  for select to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()));

drop policy if exists estimates_tenant_insert on estimates;
create policy estimates_tenant_insert on estimates
  for insert to authenticated
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));

drop policy if exists bookings_tenant_select on bookings;
create policy bookings_tenant_select on bookings
  for select to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()));

drop policy if exists bookings_tenant_insert on bookings;
create policy bookings_tenant_insert on bookings
  for insert to authenticated
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));

drop policy if exists bookings_tenant_update on bookings;
create policy bookings_tenant_update on bookings
  for update to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()))
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));

drop policy if exists jobs_tenant_select on jobs;
create policy jobs_tenant_select on jobs
  for select to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()));

drop policy if exists jobs_tenant_insert on jobs;
create policy jobs_tenant_insert on jobs
  for insert to authenticated
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));

drop policy if exists jobs_tenant_update on jobs;
create policy jobs_tenant_update on jobs
  for update to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()))
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));
