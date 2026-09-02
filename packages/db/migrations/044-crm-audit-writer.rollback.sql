-- Rollback for packages/db/migrations/044-crm-audit-writer.sql.
--
-- DROPS THE FUNCTION 044 CREATED, AND NOTHING ELSE. No table, policy, grant or
-- row is touched, because 044 created none of those either.
--
-- WHAT THIS COSTS. Running it restores the exact production defect 044 fixes:
-- every lead, job, invoice and review-request transition silently writes no
-- audit row again, because there is no other INSERT path into audit_log for an
-- interactive user and there is deliberately no INSERT policy. Audit history
-- for the period the function is absent is not recoverable afterwards. Run this
-- only to reverse a bad apply.
--
-- The application calls this function by name. Dropping it while the deployed
-- admin console still calls it turns a silent failure into a loud one - the
-- audit write returns "function does not exist" and the repositories surface
-- it - which is the correct direction, but it does mean transitions will report
-- an audit failure until the application is rolled back too.
--
-- `drop function if exists` is a no-op when the function is absent, so this
-- file is safe to re-run.

begin;

drop function if exists public.crm_write_audit_record(
  uuid, text, text, text, text, text, text, boolean, text, text);

commit;
