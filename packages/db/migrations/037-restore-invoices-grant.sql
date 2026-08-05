-- Fixes a real production incident found during CRM V1 smoke testing:
-- creating an Invoice from a Job failed with Postgres 42501,
-- "permission denied for table invoices."
--
-- Same class of issue as bookings/jobs (migrations 033-035): the
-- still-undetermined grant-stripping mechanism already documented in
-- DECISIONS.md ADR-0035/ADR-0036, now affecting `invoices`. Scoped to
-- exactly what apps/admin-console's authenticated session performs
-- against invoices: SELECT (list/get), INSERT (create), UPDATE
-- (status transitions). No DELETE - no code path deletes an Invoice.
--
-- RLS policies on invoices are not modified here - this is a base
-- table-privilege grant only, applied on the same evidence-based
-- pattern as every prior fix in this incident chain. If RLS is later
-- proven to be a separate, additional problem on this table, that
-- will be fixed only on its own runtime evidence, not preemptively.
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE - one additive
-- GRANT. Does not disable or alter RLS.
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/035-restore-jobs-grant.sql.

GRANT SELECT, INSERT, UPDATE
ON public.invoices
TO authenticated;
