-- Restores the base table privileges for `authenticated` on the NINE remaining
-- CRM tables whose RLS policies exist but whose GRANTs do not. The same defect
-- migration 042 fixed for `contacts`, `tasks`, `notes` and `audit_log` - found
-- by auditing every table rather than the four that had been reported.
--
-- HOW THESE WERE FOUND, AND WHY 042 WAS NOT ENOUGH. 042 was written from the
-- four tables a failing screen pointed at. Signing in as a real CRM user and
-- probing EVERY table in the schema found nine more returning 42501, including
-- `review_requests` and `review_records` - which means the Review Request
-- feature has never worked in production, while the release checklist recorded
-- it as "code-complete, production verification pending". Verified live against
-- Greencal-production 2026-09-02 with `has_table_privilege`.
--
-- THE SELECTION RULE IS THE SAME AS 042, AND IT IS THE WHOLE RULE. Each grant
-- below is exactly the set of operations that table's own tenant-scoped RLS
-- policies already define, and nothing else:
--
--   companies              002  select, insert, update
--   estimate_line_items    013  select, insert, delete
--   review_requests        028  select, insert, update
--   review_records         028  select, insert
--   photo_assets           009  select, insert
--   photo_pairs            009  select, insert
--   service_packages       020  select, insert, update
--   business_hours         021  select, insert, update
--   business_service_areas 020  select, insert, delete
--
-- DELETE APPEARS HERE, AND 042 HAD NONE. That difference is the rule working,
-- not an exception to it. `estimate_line_items` and `business_service_areas`
-- each declare a tenant-scoped DELETE policy, because removing a line item from
-- a draft estimate and removing a service area from a business profile are
-- ordinary edits the application already offers. The other seven get no DELETE,
-- because they declare none. A DELETE grant on a table with no DELETE policy
-- would be inert today and a latent hazard the moment someone adds one.
--
-- WHAT IS DELIBERATELY NOT GRANTED:
--   * Any privilege to `anon`. An unauthenticated session reaches none of this.
--   * Any privilege to `service_role`. Migration 041 gave the E2E/service path
--     EXECUTE on one function and no table access; a grant here would silently
--     undo that.
--   * `quote_leads`. It has NO authenticated policy in any migration - it is
--     written by apps/greencal-website's service-role intake adapter and read
--     server-side. Absent policies mean absent intent, so it is excluded even
--     though it shares the same 42501 symptom.
--   * `notifications`. The table DOES NOT EXIST in production: migration 023
--     creates it and was never applied. Granting on a missing table would fail
--     the whole transaction. That is a separate, larger gap - see the note below.
--   * TRUNCATE, REFERENCES, TRIGGER, `all privileges`, and any policy or schema
--     change. RLS remains the authority over which rows are visible.
--
-- A SEPARATE GAP, NOT FIXED HERE. `notifications` (migration 023) is absent
-- from production entirely. That is a missing migration, not a missing grant,
-- and applying an unreviewed table-creating migration alongside a grant repair
-- would bundle two very different risks into one owner decision.
--
-- IDEMPOTENT BY GRANT SEMANTICS: `grant` on an already-held privilege is a
-- no-op, not an error, so this file is safe to re-run. Additive only - no
-- policy is created, altered or dropped, no table or column is touched, RLS is
-- not disabled or weakened, and no privilege is removed from any role.
--
-- Run once, in the Supabase SQL Editor or through the trusted Leader migration
-- executor, after packages/db/migrations/042-restore-crm-authenticated-grants.sql.

begin;

-- Contacts' parent record. Read by the Companies pages and the company link on
-- a Contact; INSERT/UPDATE back the create and link-company endpoints.
grant select, insert, update on public.companies to authenticated;

-- Line items are edited as a set while an Estimate is a draft, which is why
-- this is the one CRM table besides business_service_areas that declares a
-- DELETE policy: removing a line is an ordinary edit, not an administrative act.
grant select, insert, delete on public.estimate_line_items to authenticated;

-- The Review Request feature. Both tables returned 42501 in production, so this
-- feature has never worked there despite being recorded as code-complete.
grant select, insert, update on public.review_requests to authenticated;
grant select, insert on public.review_records to authenticated;

-- Job photos. `photo_pairs` is the before/after pairing over `photo_assets`;
-- both declare select+insert and neither declares update or delete.
grant select, insert on public.photo_assets to authenticated;
grant select, insert on public.photo_pairs to authenticated;

-- Business settings.
grant select, insert, update on public.service_packages to authenticated;
grant select, insert, update on public.business_hours to authenticated;
grant select, insert, delete on public.business_service_areas to authenticated;

commit;
