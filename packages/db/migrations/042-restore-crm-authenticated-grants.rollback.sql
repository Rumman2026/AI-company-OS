-- Rollback for packages/db/migrations/042-restore-crm-authenticated-grants.sql.
--
-- REVOKES EXACTLY THE FOUR GRANTS 042 ISSUED, AND NOTHING ELSE. Each statement
-- below names its table, its role and its specific privileges, mirroring one
-- line of 042. There is deliberately no `revoke all`, no
-- `revoke ... on all tables in schema public`, and no mention of any table 042
-- did not touch - a blanket revoke here would strip privileges that migrations
-- 025, 026, 030, 034, 035, 037 and 038 restored, and the resulting outage would
-- look exactly like the incident this migration series exists to fix.
--
-- WHAT THIS DOES NOT TOUCH:
--   * RLS. 042 created, altered and dropped no policy; neither does this. The
--     tenant-scoped policies from migrations 002, 005 and 006 remain in force
--     and unchanged.
--   * `service_role`, `anon`, `postgres`, or PUBLIC. 042 granted them nothing,
--     so there is nothing here to take back. Migration 041's EXECUTE grant to
--     `service_role` is untouched.
--   * Any privilege on `leads`, `jobs`, `estimates`, `invoices`, `bookings`,
--     `businesses`, `memberships`, `payments` or any other table.
--   * Any row. No data is read, written or deleted.
--
-- WHAT THIS COSTS. Running it restores the exact production defect 042 fixes:
-- the Contacts pages, the Tasks page, every per-entity note and task list, the
-- Lead detail page's contact name, and the Activity Timeline all fail with
-- Postgres 42501 again - and several of them fail SILENTLY, rendering blank
-- rather than erroring, because their call sites test `if (result.ok)` and skip
-- on failure. Run this only to reverse a bad apply, never as routine cleanup.
--
-- `revoke` on a privilege the role does not hold is a no-op, not an error, so
-- this file is safe to re-run.

begin;

revoke select, insert, update on public.contacts from authenticated;

revoke select, insert, update on public.tasks from authenticated;

revoke select, insert on public.notes from authenticated;

revoke select on public.audit_log from authenticated;

commit;
