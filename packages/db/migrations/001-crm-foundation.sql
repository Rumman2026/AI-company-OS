-- CRM foundation: persistence for the `Contact`/`Lead`/`AuditLog` entities
-- already defined in packages/core-models (see its README - a full,
-- tested, pure domain model with no persistence of its own until now).
-- See DECISIONS.md ADR-0009 for the full rationale.
--
-- This repository has no migration-runner tool (see ADR-0009) - this file
-- is the single source of truth for the required setup, documented here,
-- not applied automatically by any script. Run once, in the Supabase SQL
-- Editor for the same Supabase project GreenCal's `quote_leads` table
-- already lives in.
--
-- Security model: Row Level Security is enabled with NO permissive
-- policies, identical to quote_leads' own model (see
-- apps/greencal-website/src/lib/quote-form/supabase-schema.sql). Only the
-- service-role key (server-only) can read or write these tables. An
-- authenticated owner-role policy is intentionally deferred to the
-- admin-console milestone - do not add one here.

create extension if not exists pgcrypto;

-- Mirrors packages/core-models' Contact type exactly (id, displayName,
-- phone, email). Deduplication (find-by-phone-or-email before insert) is
-- an application-layer concern (see packages/db/src/contact-repository.ts)
-- - deliberately not a database unique constraint, since two genuinely
-- different contacts could share a phone (e.g. a shared household line)
-- and a hard constraint would silently reject a legitimate second contact.
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

create index if not exists contacts_phone_idx on contacts (phone);
create index if not exists contacts_email_idx on contacts (lower(email));

alter table contacts enable row level security;

comment on table contacts is
  'CRM Contact records - see packages/core-models Contact type and DECISIONS.md ADR-0009. Server-only access via the Supabase service-role key.';

-- Mirrors packages/core-models' Lead type and LeadStatus enum exactly.
-- Status changes must go through packages/core-models' transitionLead()
-- state machine (packages/db/src/lead-repository.ts) - never written
-- directly by any other application code.
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts (id),
  status text not null default 'new',
  attribution jsonb not null,
  duplicate_of_lead_id uuid references leads (id),
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'leads_status_check'
  ) then
    alter table leads add constraint leads_status_check
      check (status in (
        'new','contact-attempted','contacted','qualified','disqualified',
        'estimate-requested','estimate-sent','booked','lost','spam','duplicate'
      ));
  end if;
end $$;

create index if not exists leads_contact_id_idx on leads (contact_id);
create index if not exists leads_status_idx on leads (status);
create index if not exists leads_created_at_idx on leads (created_at desc);

alter table leads enable row level security;

comment on table leads is
  'CRM Lead records - see packages/core-models Lead type/state machine and DECISIONS.md ADR-0009. Server-only access via the Supabase service-role key.';

-- Mirrors packages/core-models' AuditLog type and the ProposedAuditRecord
-- shape every state-machine transition already returns. Append-only in
-- practice - no application code updates or deletes a row here.
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
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

create index if not exists audit_log_entity_idx on audit_log (entity_type, entity_id);
create index if not exists audit_log_occurred_at_idx on audit_log (occurred_at desc);

alter table audit_log enable row level security;

comment on table audit_log is
  'Append-only CRM audit trail - see packages/core-models AuditLog/ProposedAuditRecord and DECISIONS.md ADR-0009. Server-only access via the Supabase service-role key.';
