-- Rollback for packages/db/migrations/040-jervis-read-rpcs.sql.
--
-- REMOVES ONLY THE FOUR READ FUNCTIONS 040 CREATED. 040 was additive and added
-- no table, no grant on any table, and no schema, so there is nothing else to
-- undo. Migration 039's control plane and write RPCs are untouched - they do not
-- depend on these, and dropping the read path does not withdraw write access.
--
-- WHAT THIS COSTS. Jervis loses readback and its write path keeps working, which
-- is the more dangerous half to leave running blind. If the intent is to stop
-- the integration rather than just its reads, revoke the identity instead:
--
--   update jervis_private.jervis_integration_identities
--   set revoked_at = now()
--   where user_id = '<uuid>' and business_id = '<uuid>';
--
-- That stops reads and writes together, on the next call, with no migration.

begin;

drop function if exists public.jervis_get_audit_events_by_correlation(uuid, text);
drop function if exists public.jervis_get_task(uuid, uuid);
drop function if exists public.jervis_get_lead(uuid, uuid);
drop function if exists public.jervis_get_contact(uuid, uuid);

commit;
