-- Adds tax/discount/deposit fields to Estimates - closes the
-- "Taxes / Discounts / Deposits" requirements from the owner's
-- directive. See DECISIONS.md ADR-0027.
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE - five additive,
-- nullable columns. No existing row's meaning changes (an existing
-- estimate with no tax/discount/deposit set behaves exactly as before -
-- calculateEstimateTotals() treats missing values as zero).
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/013-estimate-line-items.sql.

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
