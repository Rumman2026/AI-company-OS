-- Third and (per current evidence) final step in the same incident as
-- migration 025: after granting SELECT on `memberships` (and, per the
-- owner's own confirmation, `businesses`) to `authenticated`, the same
-- debug endpoint now reaches `membership_roles` and fails identically:
-- Postgres 42501, "permission denied for table membership_roles" - the
-- same missing-base-table-grant issue, one table further into the
-- same nested query (memberships -> businesses -> membership_roles),
-- not a new or different problem.
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE - a single
-- additive GRANT. Does not disable or alter RLS in any way - the RLS
-- policies fixed in migration 024 (membership_roles_tenant_select,
-- membership_roles_owner_admin_insert, membership_roles_owner_admin_delete,
-- plus the untouched membership_roles_own_select) still fully govern
-- which rows are visible once this base table-level access is
-- restored. Grants SELECT only - the authenticated client never
-- inserts or deletes membership_roles rows directly except through
-- TeamRosterRepository.grantRole()/revokeRole() (see DECISIONS.md
-- ADR-0032), which this migration does not touch or need to; those
-- INSERT/DELETE grants are a separate concern from this incident and
-- are not added here without evidence they too were lost.
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/025-restore-memberships-select-grant.sql.

grant select on public.membership_roles to authenticated;

-- Verification (read-only, safe to run as part of the same script) -
-- confirms authenticated now holds SELECT on all three tables this
-- incident touched.
select table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'authenticated'
  and table_schema = 'public'
  and table_name in ('memberships', 'businesses', 'membership_roles')
  and privilege_type = 'SELECT'
order by table_name;
