-- Seeds the `businesses` table with GreenCal Mobile Detailing and
-- Navarro Builders, the two remaining businesses this platform powers
-- (see BUSINESSES.md) - see DECISIONS.md ADR-0019 for the full
-- rationale. Only `name` (an approved fact from BUSINESSES.md) and
-- `slug` (a technical identifier derived from it, following the same
-- convention as `greencal-pressure-washing`) are inserted - no address,
-- phone, services, pricing, or any other business fact is fabricated or
-- assumed. Every other CRM table (contacts, leads, companies, notes,
-- tasks, estimates, bookings, jobs) is already `business_id`-scoped and
-- entirely tenant-generic - no schema change is required for either
-- business to use the existing CRM once a real owner/staff Supabase
-- Auth user is created and linked via a `memberships` row (a separate,
-- genuinely required owner action - not fabricated here).
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE - two new rows in an
-- existing table. No existing row is altered.
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/007-multi-role-memberships.sql.

insert into businesses (id, name, slug)
select gen_random_uuid(), 'GreenCal Mobile Detailing', 'greencal-mobile-detailing'
where not exists (select 1 from businesses where slug = 'greencal-mobile-detailing');

insert into businesses (id, name, slug)
select gen_random_uuid(), 'Navarro Builders', 'navarro-builders'
where not exists (select 1 from businesses where slug = 'navarro-builders');
