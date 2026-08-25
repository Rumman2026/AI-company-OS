-- Rollback for packages/db/migrations/039-jervis-integration-rpcs.sql.
--
-- REMOVES ONLY OBJECTS 039 CREATED. 039 was additive, so undoing it touches no
-- pre-existing CRM table, no RLS policy, no membership, no customer data and no
-- unrelated schema. Every statement below names one Jervis object; there is no
-- cascade and no blanket drop.
--
-- `drop schema jervis_private` (without CASCADE) is the last statement and acts
-- as a check: if anything unexpected was created in that schema, the drop fails
-- and an operator looks, rather than a CASCADE silently taking it too.
--
-- THIS DELETES THE ALLOWLIST AND THE IDEMPOTENCY LEDGER. Dropping
-- `jervis_idempotency` discards the record of which keys were already honoured,
-- so a Jervis retry after a rollback-and-reapply would create a second CRM
-- record rather than returning the first. If that matters, dump both tables
-- before running this.
--
-- USUALLY YOU DO NOT WANT THIS FILE. To stop one integration identity, revoke it
-- and leave everything else standing:
--
--   update jervis_private.jervis_integration_identities
--   set revoked_at = now()
--   where user_id = '<uuid>' and business_id = '<uuid>';
--
-- That takes effect on the next call, needs no migration, and preserves the
-- record of what that identity did. Dropping the whole mechanism is for
-- withdrawing the feature, not for withdrawing access.

begin;

drop function if exists public.jervis_append_audit_event(
  uuid, text, uuid, text, text, text, text, text, text);
drop function if exists public.jervis_create_follow_up_task(
  uuid, text, text, timestamptz, text, uuid, text, text);
drop function if exists public.jervis_create_lead(uuid, uuid, text, text, text);
drop function if exists public.jervis_create_contact(uuid, text, text, text, text, text);

drop function if exists jervis_private.jervis_audit(
  uuid, text, text, text, text, text, text, text);
drop function if exists jervis_private.jervis_claim(uuid, text, text, text);
drop function if exists jervis_private.jervis_require_correlation(text);
drop function if exists jervis_private.jervis_authorize(uuid);
drop function if exists jervis_private.jervis_fingerprint(jsonb);

drop table if exists jervis_private.jervis_idempotency;
drop table if exists jervis_private.jervis_integration_identities;

-- No CASCADE, deliberately: this succeeds only if the schema is now empty.
drop schema if exists jervis_private;

commit;
