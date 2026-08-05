-- Fixes a real production incident found during the GreenCal V1.0
-- smoke test: creating an Estimate failed with PostgREST error
-- "Could not find the 'deposit_amount_currency' column of 'estimates'
-- in the schema cache."
--
-- Diagnosis (read-only query against production before this migration
-- was written): all five columns migration 014 was supposed to add -
-- tax_rate_basis_points, discount_amount_minor_units,
-- discount_amount_currency, deposit_amount_minor_units,
-- deposit_amount_currency - are genuinely absent from public.estimates.
-- This is not a PostgREST schema-cache staleness issue (which this
-- project has seen before, see docs/launch/OWNER_ACTIONS_REQUIRED.md
-- §1) - the columns never existed. `packages/db/migrations/014-estimate-pricing.sql`
-- was recorded as "owner-confirmed run" in OWNER_ACTIONS_REQUIRED.md
-- §3b alongside migrations 001-023, but that record is now
-- demonstrably wrong for 014 specifically - the exact reason it was
-- skipped or failed while being recorded as applied is not
-- determinable from this repository.
--
-- This migration is NOT a re-run of 014 (which is never modified once
-- deployed - see this project's migration conventions). It is a new,
-- forward-only migration that adds exactly the same five columns with
-- identical types, nullability, defaults, and constraints as 014
-- originally specified, using the same idempotent `if not exists`
-- form. If 014 partially applied on some other environment, this
-- migration is still safe to run there too - every statement is a
-- no-op for any column that already exists.
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE - five additive,
-- nullable columns. No existing row's meaning changes.
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/030-restore-leads-select-update-grant.sql.

alter table estimates add column if not exists tax_rate_basis_points integer
  check (tax_rate_basis_points is null or tax_rate_basis_points >= 0);
alter table estimates add column if not exists discount_amount_minor_units integer
  check (discount_amount_minor_units is null or discount_amount_minor_units >= 0);
alter table estimates add column if not exists discount_amount_currency text;
alter table estimates add column if not exists deposit_amount_minor_units integer
  check (deposit_amount_minor_units is null or deposit_amount_minor_units >= 0);
alter table estimates add column if not exists deposit_amount_currency text;

comment on column estimates.tax_rate_basis_points is
  'Sales tax rate in basis points (825 = 8.25%) - see packages/core-models calculateEstimateTotals() and DECISIONS.md ADR-0027.';
comment on column estimates.discount_amount_minor_units is
  'A fixed-amount discount off the subtotal, not a percentage - see DECISIONS.md ADR-0027.';
comment on column estimates.deposit_amount_minor_units is
  'Amount due upfront if the customer accepts - never subtracted from the computed total.';

-- Force PostgREST to pick up the new columns immediately rather than
-- waiting for its own cache refresh cycle.
notify pgrst, 'reload schema';
