-- Team roster and role management - closes "Team permissions" from
-- the owner's Settings directive. See DECISIONS.md ADR-0032. The
-- owner explicitly confirmed broadening `memberships`/`membership_roles`
-- visibility (previously each user could only see their own row) so
-- staff can see the full team roster and change roles - a real
-- security-scope decision, not made unilaterally (see this session's
-- clarifying questions).
--
-- IMPORTANT RLS note: this migration ADDS a tenant-scoped SELECT
-- policy alongside the existing own-row SELECT policy on both tables -
-- it does NOT drop or replace the original `_own_select` policies.
-- Postgres OR-combines multiple permissive policies for the same
-- command, and the tenant-scoped policy's own subquery
-- (`select business_id from memberships where user_id = auth.uid()`)
-- itself depends on being able to see at least the user's own
-- `memberships` row - the original `_own_select` policy (a direct,
-- non-recursive `user_id = auth.uid()` check) is what makes that
-- possible. Dropping it would make the new policy self-referentially
-- unable to ever return a row.
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE - one additive
-- column (backfilled from `auth.users`, only possible because this
-- script runs with the SQL Editor's full privileges, never through the
-- app), and four new/additional policies. No existing policy is
-- dropped; no existing row's meaning changes.
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/021-business-hours.sql.

alter table memberships add column if not exists user_email text;

update memberships m
set user_email = u.email
from auth.users u
where u.id = m.user_id
  and m.user_email is null;

comment on column memberships.user_email is
  'Denormalized from auth.users.email at backfill/membership-creation time - see DECISIONS.md ADR-0032. Avoids the app ever needing to query the protected auth.users schema directly.';

-- Broaden memberships SELECT: any team member may see every
-- membership row for their own business, not just their own.
drop policy if exists memberships_tenant_select on memberships;
create policy memberships_tenant_select on memberships
  for select to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()));

-- Broaden membership_roles SELECT the same way.
drop policy if exists membership_roles_tenant_select on membership_roles;
create policy membership_roles_tenant_select on membership_roles
  for select to authenticated
  using (
    membership_id in (
      select id from memberships
      where business_id in (select business_id from memberships where user_id = auth.uid())
    )
  );

-- New: an owner-admin may grant/revoke a role for any membership in
-- their own business - scoped to owner-admin only (privilege-
-- escalation prevention: a non-owner-admin must never be able to
-- grant themselves or anyone else owner-admin). Application code
-- (packages/db's TeamRosterRepository) also checks this before
-- attempting the write, for a clean error message; this policy is the
-- real enforcement.
drop policy if exists membership_roles_owner_admin_insert on membership_roles;
create policy membership_roles_owner_admin_insert on membership_roles
  for insert to authenticated
  with check (
    exists (
      select 1 from memberships target
      where target.id = membership_roles.membership_id
        and target.business_id in (
          select m.business_id
          from memberships m
          join membership_roles mr on mr.membership_id = m.id
          where m.user_id = auth.uid() and mr.role = 'owner-admin'
        )
    )
  );

drop policy if exists membership_roles_owner_admin_delete on membership_roles;
create policy membership_roles_owner_admin_delete on membership_roles
  for delete to authenticated
  using (
    exists (
      select 1 from memberships target
      where target.id = membership_roles.membership_id
        and target.business_id in (
          select m.business_id
          from memberships m
          join membership_roles mr on mr.membership_id = m.id
          where m.user_id = auth.uid() and mr.role = 'owner-admin'
        )
    )
  );
