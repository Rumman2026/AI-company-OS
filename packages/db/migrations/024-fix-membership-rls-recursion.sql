-- Fixes a real production incident: "infinite recursion detected in
-- policy for relation 'memberships'" (Postgres error 42P17), thrown by
-- every query that touches `memberships` - which is nearly the whole
-- app, since almost every other table's tenant-scoped RLS policy
-- resolves the caller's business_id by querying `memberships`.
--
-- ROOT CAUSE: migrations/022-team-roster.sql added
-- `memberships_tenant_select`, a policy ON `memberships` whose own
-- USING clause contains a subquery that ALSO queries `memberships`:
--
--   using (business_id in (select business_id from memberships where user_id = auth.uid()))
--
-- ADR-0032 reasoned that keeping the original, non-recursive
-- `memberships_own_select` policy alongside this one would give the
-- inner subquery a "safe base case" to resolve against, avoiding
-- recursion. That reasoning was WRONG: Postgres does not selectively
-- apply only the non-recursive policy to the inner subquery - it
-- applies the full OR-combined policy set every time the table is
-- referenced, including inside that same policy's own subquery. Since
-- one member of that combined set is self-referential, every access
-- path into `memberships` under RLS (direct, or nested from another
-- table's policy) re-triggers evaluation of the same broken policy set
-- again, without end - Postgres detects this cycle and raises 42P17
-- rather than actually hanging.
--
-- A second, independent instance of the identical bug: migrations/
-- 022's `membership_roles_owner_admin_insert`/`_delete` are policies
-- ON `membership_roles` whose subqueries join `membership_roles`
-- (aliased `mr`) again - self-referential the same way, on a
-- different table.
--
-- THE FIX: two SECURITY DEFINER helper functions that resolve the
-- caller's own business/role membership by querying `memberships`/
-- `membership_roles` directly, AS THE FUNCTION OWNER - not as the
-- querying role - so that internal query never re-invokes RLS and
-- never re-enters the policy being evaluated. `set search_path` is
-- required hardening for any SECURITY DEFINER function (prevents a
-- search_path-hijacking privilege-escalation attack). This preserves
-- the exact authorization model ADR-0032 intended (any team member
-- sees the full roster; only an owner-admin can grant/revoke a role) -
-- it does not remove or weaken it, only changes HOW the check is
-- computed so it terminates.
--
-- Only the four genuinely self-referential policies from migration
-- 022 are touched. Every other table's tenant-scoped policy (contacts,
-- leads, estimates, businesses, etc.) references `memberships` from a
-- DIFFERENT table's policy, which is not itself recursive - those only
-- ever broke as a downstream symptom of `memberships` being
-- unqueryable, and resolve automatically once `memberships` does. No
-- RLS is disabled anywhere; least-privilege is unchanged.
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE - two new functions
-- and four policies replaced in place (drop + create under the same
-- names, not new/duplicate policies). No table, column, or row is
-- altered.
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/023-notifications.sql.

create or replace function get_my_business_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select business_id from memberships where user_id = auth.uid();
$$;

revoke all on function get_my_business_ids() from public;
grant execute on function get_my_business_ids() to authenticated;

comment on function get_my_business_ids() is
  'Every business_id the calling user (auth.uid()) holds a membership in - SECURITY DEFINER so this never re-invokes RLS on memberships, breaking the self-referential recursion memberships_tenant_select/membership_roles_tenant_select otherwise cause. See DECISIONS.md ADR-0035.';

create or replace function is_owner_admin_for_business(p_business_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from memberships m
    join membership_roles mr on mr.membership_id = m.id
    where m.user_id = auth.uid()
      and m.business_id = p_business_id
      and mr.role = 'owner-admin'
  );
$$;

revoke all on function is_owner_admin_for_business(uuid) from public;
grant execute on function is_owner_admin_for_business(uuid) to authenticated;

comment on function is_owner_admin_for_business(uuid) is
  'True if the calling user (auth.uid()) holds owner-admin for the given business - SECURITY DEFINER so this never re-invokes RLS on membership_roles, breaking the self-referential recursion membership_roles_owner_admin_insert/_delete otherwise cause. See DECISIONS.md ADR-0035.';

-- Replaces the recursive subquery with the helper function - same
-- authorization result (every team member sees every membership row
-- for their own business), no self-reference.
drop policy if exists memberships_tenant_select on memberships;
create policy memberships_tenant_select on memberships
  for select to authenticated
  using (business_id in (select get_my_business_ids()));

-- Same fix, same reasoning, for membership_roles' tenant-wide SELECT.
drop policy if exists membership_roles_tenant_select on membership_roles;
create policy membership_roles_tenant_select on membership_roles
  for select to authenticated
  using (
    membership_id in (
      select id from memberships where business_id in (select get_my_business_ids())
    )
  );

-- Replaces the self-joining membership_roles subquery with the
-- boolean helper function - same authorization result (only an
-- existing owner-admin may grant/revoke a role), no self-reference.
drop policy if exists membership_roles_owner_admin_insert on membership_roles;
create policy membership_roles_owner_admin_insert on membership_roles
  for insert to authenticated
  with check (
    exists (
      select 1 from memberships target
      where target.id = membership_roles.membership_id
        and is_owner_admin_for_business(target.business_id)
    )
  );

drop policy if exists membership_roles_owner_admin_delete on membership_roles;
create policy membership_roles_owner_admin_delete on membership_roles
  for delete to authenticated
  using (
    exists (
      select 1 from memberships target
      where target.id = membership_roles.membership_id
        and is_owner_admin_for_business(target.business_id)
    )
  );
