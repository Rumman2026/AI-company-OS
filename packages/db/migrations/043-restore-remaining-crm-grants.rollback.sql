-- Rollback for packages/db/migrations/043-restore-remaining-crm-grants.sql.
--
-- REVOKES EXACTLY THE NINE GRANTS 043 ISSUED, AND NOTHING ELSE. Each statement
-- mirrors one line of 043 - same table, same role, same privilege set. There is
-- deliberately no `revoke all`, no `revoke ... on all tables in schema public`,
-- and no mention of any table 043 did not touch. A blanket revoke here would
-- strip the privileges migrations 025, 026, 030, 034, 035, 037, 038 and 042
-- restored, and the resulting outage would look exactly like the incident this
-- migration series exists to fix.
--
-- WHAT THIS DOES NOT TOUCH:
--   * RLS. 043 created, altered and dropped no policy; neither does this.
--   * `contacts`, `tasks`, `notes`, `audit_log` - migration 042's grants stand.
--   * `anon`, `service_role`, `postgres`, PUBLIC. 043 granted them nothing.
--   * Any row. No data is read, written or deleted.
--
-- WHAT THIS COSTS. Running it restores the exact production defect 043 fixes:
-- the Companies pages, estimate line items, the entire Review Request feature,
-- job photos, service packages, business hours and service areas all fail with
-- Postgres 42501 again - and most fail SILENTLY, rendering blank rather than
-- erroring, because their call sites test `if (result.ok)` and skip. Run this
-- only to reverse a bad apply, never as routine cleanup.
--
-- Applying it is production DDL and requires its own owner approval, bound to
-- this file's own path and hash, exactly as the forward migration does.
--
-- `revoke` on a privilege the role does not hold is a no-op, not an error, so
-- this file is safe to re-run.

begin;

revoke select, insert, update on public.companies from authenticated;
revoke select, insert, delete on public.estimate_line_items from authenticated;
revoke select, insert, update on public.review_requests from authenticated;
revoke select, insert on public.review_records from authenticated;
revoke select, insert on public.photo_assets from authenticated;
revoke select, insert on public.photo_pairs from authenticated;
revoke select, insert, update on public.service_packages from authenticated;
revoke select, insert, update on public.business_hours from authenticated;
revoke select, insert, delete on public.business_service_areas from authenticated;

commit;
