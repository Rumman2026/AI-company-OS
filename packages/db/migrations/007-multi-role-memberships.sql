-- Multi-role memberships: lets a single (business_id, user_id)
-- membership hold more than one role at once (e.g. owner-admin AND
-- office-manager) - see DECISIONS.md ADR-0018. Fully additive: the
-- existing `memberships` table and its `(business_id, user_id)` unique
-- constraint are untouched, and `memberships.role` is left in place as
-- the legacy single-role column - nothing reads it destructively and
-- nothing here can break an existing membership.
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE - a new table, a
-- backfill insert, and one additive grant for the existing GreenCal
-- owner. No existing row is altered or removed.
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/006-task-foundation.sql.

create table if not exists membership_roles (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references memberships (id) on delete cascade,
  role text not null check (role in ('owner-admin', 'office-manager', 'dispatcher', 'technician')),
  created_at timestamptz not null default now(),
  constraint membership_roles_unique unique (membership_id, role)
);

alter table membership_roles enable row level security;

create index if not exists membership_roles_membership_id_idx on membership_roles (membership_id);

comment on table membership_roles is
  'Multiple roles per membership (business_id/user_id pair) - see DECISIONS.md ADR-0018. memberships.role remains the legacy single-role column for backward compatibility; this table is the source of truth for multi-role reads going forward.';

-- Backfill: every existing membership's single role becomes its first
-- membership_roles row. Idempotent - re-running this insert after roles
-- have already been backfilled or added does nothing further for rows
-- that already exist.
insert into membership_roles (membership_id, role)
select m.id, m.role
from memberships m
where not exists (
  select 1 from membership_roles mr where mr.membership_id = m.id and mr.role = m.role
);

-- RLS: a user may read their own membership_roles rows (needed for
-- apps/admin-console's getCurrentMembership() to resolve all held
-- roles). No client insert/update/delete policy - granting or revoking
-- a role is an owner/service-role-only action, done here via SQL or a
-- future owner-only admin action, never by a logged-in user themselves.
drop policy if exists membership_roles_own_select on membership_roles;
create policy membership_roles_own_select on membership_roles
  for select to authenticated
  using (membership_id in (select id from memberships where user_id = auth.uid()));

-- Grants the existing GreenCal Pressure Washing owner an additional
-- office-manager role, alongside their existing owner-admin role -
-- resolves the real limitation documented in DECISIONS.md ADR-0013
-- (an owner-admin-only membership could not perform most Lead/Job
-- transitions, which require office-manager/dispatcher). Looked up by
-- business slug and owner email, not a pasted UUID - self-correcting
-- against a transcription error, same pattern as every membership
-- SQL block earlier in this project.
insert into membership_roles (membership_id, role)
select m.id, 'office-manager'
from memberships m
join businesses b on b.id = m.business_id
join auth.users u on u.id = m.user_id
where b.slug = 'greencal-pressure-washing'
  and u.email = 'greencaliforniacorporation@gmail.com'
  and not exists (
    select 1 from membership_roles mr where mr.membership_id = m.id and mr.role = 'office-manager'
  );

-- Verification (read-only) - run separately, after the block above, so
-- a typo here can never roll back the schema changes above it (see the
-- earlier hard lesson in this project's migration history: never append
-- a possibly-erroring "just for verification" statement to the same
-- paste as real schema changes).
--
-- select b.slug as business_slug, u.email as owner_email,
--        array_agg(mr.role order by mr.role) as roles
-- from membership_roles mr
-- join memberships m on m.id = mr.membership_id
-- join businesses b on b.id = m.business_id
-- join auth.users u on u.id = m.user_id
-- where b.slug = 'greencal-pressure-washing'
-- group by b.slug, u.email;
