-- Customer-facing approval workflow - closes the "customer approval
-- workflow" requirement from the owner's "Professional estimate
-- builder" directive. See DECISIONS.md ADR-0030.
--
-- No new RLS policy for anonymous/public access is added here - the
-- public approval route (apps/admin-console) uses the service-role
-- key (packages/db's createDbClient(), same trusted-server pattern
-- already used by apps/greencal-website's public quote intake) to
-- look up and update an Estimate by its token, deliberately bypassing
-- RLS rather than trying to express "possession of this exact token"
-- as a Postgres RLS policy. Every existing tenant-scoped
-- select/insert/update policy on `estimates` is unaffected and
-- unchanged - staff access still goes through RLS exactly as before.
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE - four additive,
-- nullable/defaulted columns and one unique index. No existing row's
-- meaning changes (every existing estimate has no active approval
-- link and was never customer-approved, which is accurate).
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/016-estimates-update-policy-fix.sql.

alter table estimates add column if not exists customer_approval_token text;
alter table estimates add column if not exists customer_approval_token_expires_at timestamptz;
alter table estimates add column if not exists customer_approved boolean not null default false;
alter table estimates add column if not exists customer_signature_name text;

create unique index if not exists estimates_customer_approval_token_idx
  on estimates (customer_approval_token)
  where customer_approval_token is not null;

comment on column estimates.customer_approval_token is
  'High-entropy, unguessable token for the public customer-approval link - see DECISIONS.md ADR-0030. Null when no active link has been generated.';
comment on column estimates.customer_approval_token_expires_at is
  'The token stops being accepted after this time (30 days from generation) - see ADR-0030.';
comment on column estimates.customer_approved is
  'True only if this Estimate was approved via the public customer-facing link, not by staff (see approved_by for staff approval).';
comment on column estimates.customer_signature_name is
  'The customer''s typed full name, captured as a lightweight, non-binding signature at the moment of public approval - not a legal e-signature service.';
