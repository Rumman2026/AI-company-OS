-- GreenCal quote-lead storage: Migration 002 - lead status lifecycle,
-- consent timestamp, test-lead flag, and customer-confirmation tracking.
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION quote_leads TABLE AT ANY TIME.
-- Every change here is purely additive (new nullable/defaulted columns
-- only - no column is renamed, retyped, or dropped; no existing row is
-- modified except to backfill the new columns with sensible defaults).
-- The application code that inserts new leads (lead-store.ts) does not
-- require any of these columns to exist to keep working - Postgres
-- applies the DEFAULT values below automatically for columns the
-- application does not explicitly set. Run this whenever convenient;
-- it does not need to happen before or during a deployment.
--
-- Run once, in the Supabase SQL Editor for the GreenCal-owned project,
-- after supabase-schema.sql has already been applied.

-- Lead lifecycle status - lets the owner track a lead from first
-- contact through to won/lost without any other tooling. Not written by
-- application code today (new leads default to 'new'); update manually
-- via the Supabase table editor, or a future admin tool.
alter table quote_leads add column if not exists status text not null default 'new';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'quote_leads_status_check'
  ) then
    alter table quote_leads add constraint quote_leads_status_check
      check (status in ('new','contacted','estimate_scheduled','estimate_sent','won','lost','spam','archived'));
  end if;
end $$;

create index if not exists quote_leads_status_idx on quote_leads (status);

-- Consent timestamp - the schema already required `consent = true` to
-- accept a submission (see supabase-schema.sql); this records *when*
-- that consent was captured, distinct from `created_at` in case a
-- future submission path captures consent separately from storage time.
-- Backfill existing rows from created_at (their actual submission time)
-- before defaulting new rows to now().
alter table quote_leads add column if not exists consent_at timestamptz;
update quote_leads set consent_at = created_at where consent_at is null;
alter table quote_leads alter column consent_at set default now();
alter table quote_leads alter column consent_at set not null;

-- Explicit test-lead flag - set only via LeadStore.markTestLead(), a
-- best-effort follow-up call triggered by the internal `__testLead`
-- request field (never present in the public quote form). Lets test
-- submissions be filtered out of real lead reporting without relying on
-- free-text name/description conventions alone.
alter table quote_leads add column if not exists is_test_lead boolean not null default false;
create index if not exists quote_leads_is_test_lead_idx on quote_leads (is_test_lead);

-- Customer-confirmation tracking - mirrors the existing
-- notification_status/notification_provider_id/notification_error_code
-- columns (which track the OWNER notification), but for the
-- customer-facing confirmation email introduced alongside this
-- migration. Nullable: unset means "not attempted" (e.g. an idempotent
-- replay, which intentionally sends no second confirmation).
alter table quote_leads add column if not exists customer_confirmation_status text;
alter table quote_leads add column if not exists customer_confirmation_provider_id text;
alter table quote_leads add column if not exists customer_confirmation_error_code text;

comment on column quote_leads.status is
  'Lead lifecycle status for owner tracking - see Migration 002. Not set by application code beyond the new-row default.';
comment on column quote_leads.consent_at is
  'When consent was captured - backfilled from created_at for pre-migration rows.';
comment on column quote_leads.is_test_lead is
  'True only for a deliberately labeled test submission (internal __testLead marker) - never set by the public quote form.';
comment on column quote_leads.customer_confirmation_status is
  'sent | failed | null (not attempted, e.g. idempotent replay) - the customer-facing confirmation email, distinct from notification_status (the owner email).';
