-- Enforces "one booking per estimate" at the database layer, not just
-- the admin-console UI (which now hides the "Create booking + job"
-- form once an approved Estimate already has a Booking). Closes a
-- real gap surfaced during the BLOCKER-001 incident: with no
-- constraint, a user could accidentally create more than one Booking
-- for the same Estimate (this is exactly how the orphan booking
-- described in DECISIONS.md/CRM_V1_RELEASE_READINESS.md happened -
-- an earlier failed attempt during the incident left a Booking row
-- with no linked Job, and nothing prevented a second attempt from
-- creating another).
--
-- IMPORTANT - run the orphan-booking investigation query first (see
-- docs/launch/CRM_V1_RELEASE_READINESS.md) and resolve any existing
-- duplicate estimate_id values before running this migration. Adding
-- a unique constraint over existing duplicate data fails outright
-- (Postgres validates all existing rows against a new constraint) -
-- that failure is the correct, safe behavior (it refuses to silently
-- pick a "winner" between two real rows), not a bug in this
-- migration.
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE once no duplicate
-- estimate_id values remain in `bookings` - adds one constraint, no
-- existing column or row is altered.
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/035-restore-jobs-grant.sql, and only after
-- confirming (via the investigation query) that no two bookings share
-- the same estimate_id.

alter table bookings add constraint bookings_estimate_id_unique unique (estimate_id);

comment on constraint bookings_estimate_id_unique on bookings is
  'One Booking per Estimate - see DECISIONS.md and docs/launch/CRM_V1_RELEASE_READINESS.md (BLOCKER-001). Enforced here in addition to the admin-console UI hiding the create-booking form once a Booking already exists for an approved Estimate.';
