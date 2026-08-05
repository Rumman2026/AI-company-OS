-- Fixes a real production incident found during CRM V1 smoke testing:
-- recording a Payment failed with Postgres 42501, "permission denied
-- for table payments."
--
-- Same class of issue as bookings/jobs/invoices (migrations 033-035,
-- 037): the still-undetermined grant-stripping mechanism already
-- documented in DECISIONS.md ADR-0035/ADR-0036, now affecting
-- `payments`. Scoped to exactly what PaymentRepository
-- (packages/db/src/payment-repository.ts) performs: SELECT (list) and
-- INSERT (create) only - there is no UPDATE anywhere in that
-- repository. `payments` is append-only by design (same pattern as
-- `notes`/`review_records`), so UPDATE and DELETE are both
-- deliberately excluded here, not just DELETE.
--
-- RLS policies on payments are not modified here - this is a base
-- table-privilege grant only, applied on the same evidence-based
-- pattern as every prior fix in this incident chain.
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE - one additive
-- GRANT. Does not disable or alter RLS.
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/037-restore-invoices-grant.sql.

GRANT SELECT, INSERT
ON public.payments
TO authenticated;
