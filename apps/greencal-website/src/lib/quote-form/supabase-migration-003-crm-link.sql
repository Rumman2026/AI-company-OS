-- GreenCal quote-lead storage: Migration 003 - link to the new CRM Lead
-- entity (see packages/db/migrations/001-crm-foundation.sql and
-- DECISIONS.md ADR-0009).
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION quote_leads TABLE AT ANY TIME.
-- Purely additive: one new, nullable column. No existing column is
-- renamed, retyped, or dropped; no existing row is modified.
--
-- quote_leads plays the role of packages/core-models' FormSubmission type
-- (the raw intake record) - this column is its optional link to the CRM
-- Lead entity, populated best-effort by
-- src/lib/quote-form/supabase-resend-adapter.ts after a successful fresh
-- insert. A lead-linking failure never affects lead storage, notification,
-- or the customer-facing result - see that file's try/catch wrapping.
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/001-crm-foundation.sql has already been applied
-- (the foreign key below requires the `leads` table to exist).

alter table quote_leads add column if not exists lead_id uuid references leads (id);
create index if not exists quote_leads_lead_id_idx on quote_leads (lead_id);

comment on column quote_leads.lead_id is
  'Best-effort link to the CRM leads table (packages/db) - null means linking was not attempted or failed; never blocks lead storage. See DECISIONS.md ADR-0009.';
