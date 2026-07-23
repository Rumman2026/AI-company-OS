-- GreenCal quote-lead storage schema (Stage 4A).
--
-- Run this once against a GreenCal-owned Supabase project. This
-- repository has no migration tooling (packages/db is a placeholder), so
-- this file is the single source of truth for the required setup -
-- documented here, not applied automatically by any script.
--
-- Security model: Row Level Security is enabled with NO permissive
-- policies. Only the service-role key (used exclusively from the trusted
-- Vercel serverless function - see src/lib/quote-form/lead-store.ts)
-- can read or write this table; the service role bypasses RLS by design.
-- Do not add an anon-role policy - browser-side writes are prohibited by
-- the approved architecture.

create extension if not exists pgcrypto;

create table if not exists quote_leads (
  lead_id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null default 'website_quote_form',
  page_path text not null,

  full_name text not null,
  phone text not null,
  email text not null,
  service text not null,
  -- Canonical city slug from src/data/cities.ts, or 'other-not-listed' -
  -- never a second, hand-typed city list (see DECISIONS.md ADR-0007).
  city text not null,
  service_location text not null,
  project_description text not null,
  preferred_contact_method text,
  preferred_timing text,
  property_type text,
  estimated_project_size text,
  consent boolean not null,

  submission_status text not null default 'received',
  lead_storage_status text not null default 'stored',
  notification_status text not null default 'pending',
  notification_provider_id text,
  notification_error_code text,

  -- Deterministic content fingerprint (see idempotency.ts) - the unique
  -- constraint below is the deduplication mechanism: a retried or
  -- accidentally repeated submission with identical content fails to
  -- insert a new row, and the application code looks up the existing row
  -- instead of creating a duplicate.
  idempotency_key text not null,
  constraint quote_leads_idempotency_key_unique unique (idempotency_key)
);

create index if not exists quote_leads_created_at_idx on quote_leads (created_at desc);
create index if not exists quote_leads_email_idx on quote_leads (email);
create index if not exists quote_leads_city_idx on quote_leads (city);

alter table quote_leads enable row level security;
-- No policies are created intentionally - see the security-model note
-- above. Do not add a policy that grants the anon or authenticated role
-- INSERT/SELECT access without a separate, explicit decision.

comment on table quote_leads is
  'GreenCal website quote-request leads. Server-only access via the Supabase service-role key. See apps/greencal-website/src/lib/quote-form/README.md.';
