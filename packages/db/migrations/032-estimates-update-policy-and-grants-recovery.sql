-- Fixes a real production incident found during the GreenCal V1.0
-- smoke test: creating an Estimate failed with Postgres 42501,
-- "permission denied for table estimates."
--
-- Diagnosis (read-only queries against production): RLS is enabled on
-- estimates, but only two of the three expected tenant-scoped
-- policies exist - estimates_tenant_select and estimates_tenant_insert.
-- estimates_tenant_update does not exist, meaning
-- `migrations/016-estimates-update-policy-fix.sql` never actually
-- applied to this production database, despite being recorded as
-- owner-confirmed run in OWNER_ACTIONS_REQUIRED.md §3b - the same
-- discrepancy already found for migration 014 (see migration 031).
-- Separately, `authenticated` has no SELECT or INSERT base-table
-- grant on estimates either - the same missing-grant class as
-- `leads` (migration 030) and `memberships`/`businesses`/
-- `membership_roles` (ADR-0035/ADR-0036).
--
-- This migration is NOT a re-run of 016 (never modified once
-- deployed). It restores the same UPDATE policy 016 originally
-- specified, using an identical `drop policy if exists` + `create
-- policy` idempotent form, and separately grants exactly the base
-- privileges `apps/admin-console`'s authenticated session actually
-- exercises against estimates today: SELECT (list/get),
-- INSERT (EstimateRepository.createEstimate(), via the Lead page's
-- "Add estimate" form), and UPDATE (approveEstimate(),
-- rejectEstimate(), setEstimatePricing(),
-- generateCustomerApprovalLink()). No DELETE - no code path deletes
-- an Estimate. `service_role` is untouched.
--
-- Scope note: a broader audit of every table apps/admin-console
-- touches was considered (and found at least one more real gap -
-- audit_log has no INSERT policy in any migration). Per explicit
-- direction, that broader fix is deferred - this repository fixes
-- permission gaps only once a real runtime failure proves them, not
-- preemptively across tables that haven't failed yet. If a
-- transition-driven action (Job scheduling, Invoice/ReviewRequest
-- transitions) hits "permission denied for table audit_log", that is
-- the confirming evidence for that specific fix, applied then.
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE - one policy
-- restored to its original migration-016 definition, plus additive
-- GRANTs. Does not disable or broaden RLS.
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/031-estimate-pricing-columns-recovery.sql.

drop policy if exists estimates_tenant_update on estimates;
create policy estimates_tenant_update on estimates
  for update to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()))
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));

grant select, insert, update on public.estimates to authenticated;

notify pgrst, 'reload schema';
