-- A scratch stand-in for the parts of Greencal-production that migration 039
-- touches, so 039 can be applied and exercised WITHOUT going near the real
-- database.
--
-- FAITHFUL WHERE IT MATTERS, and no wider. Column names, types, null-ness and
-- the constraints 039 relies on are copied from migrations 001/002/004/006 --
-- if any of those differ, 039 must fail here rather than in production. What is
-- deliberately NOT reproduced is Supabase's auth schema and RLS policies: this
-- scratch DB validates that 039 parses, creates its objects, and that its
-- authorization and idempotency logic behave. Tenant isolation itself is proven
-- separately against the real project, where the real policies live.
--
-- `auth.uid()` is stubbed by a settable GUC so a test can act as different
-- callers. In production it is Supabase's own function; 039 calls it fully
-- qualified either way.

-- pgcrypto lives in the `extensions` schema on Greencal-production, and 039
-- calls `extensions.digest` fully qualified. Installing it anywhere else here
-- would make the migration pass locally and fail in production.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid()
);

-- The stub. Real Supabase reads the JWT; this reads a session setting so tests
-- can switch identity without minting tokens.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('test.uid', true), '')::uuid
$$;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id),
  user_id uuid not null references auth.users (id),
  role text not null,
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id),
  display_name text not null,
  phone text,
  email text,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id),
  contact_id uuid not null references public.contacts (id),
  status text not null default 'new'
    check (status in ('new','contact-attempted','contacted','qualified','disqualified',
                      'estimate-requested','estimate-sent','booked','lost','spam','duplicate')),
  attribution jsonb not null,
  duplicate_of_lead_id uuid references public.leads (id),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id),
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id),
  title text not null,
  description text,
  due_at timestamptz,
  assigned_to uuid references auth.users (id),
  entity_type text check (entity_type in ('lead','contact','company','job')),
  entity_id uuid,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint tasks_entity_type_id_together check (
    (entity_type is null and entity_id is null)
    or (entity_type is not null and entity_id is not null))
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id),
  entity_type text not null,
  entity_id text not null,
  action text not null,
  previous_value text not null,
  new_value text not null,
  actor_category text not null,
  actor_id text,
  automated boolean not null,
  occurred_at timestamptz not null,
  reason text,
  correlation_id text,
  created_at timestamptz not null default now()
);

-- Roles Supabase provides and 039's revokes/grants name.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end $$;
