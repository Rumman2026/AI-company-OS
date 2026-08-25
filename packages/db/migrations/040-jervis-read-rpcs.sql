-- Jervis integration read path: four narrow SECURITY DEFINER read RPCs.
-- See DECISIONS.md ADR-0042.
--
-- WHAT THIS FIXES. The first live Jervis -> Leader write loop passed end to end
-- and then failed on readback: `GET /rest/v1/contacts` returned 403,
-- "permission denied for table contacts", with Supabase's stock hint to grant
-- SELECT to `authenticated`.
--
-- THE HINT MUST NOT BE FOLLOWED HERE, and the reason is the same one migration
-- 039 exists for: `authenticated` is a SHARED role. Granting it SELECT on
-- `contacts` changes what every signed-in human CRM user can read, in every
-- business they belong to, to solve one machine identity's read. This migration
-- adds no table grant at all.
--
-- SEPARATELY, AND NOT FIXED HERE: the missing grants on `contacts`, `tasks`,
-- `notes` and `audit_log` look like the same grant drift migrations 025, 026,
-- 030 and 032-038 keep repairing - migration 030 predicted this table by name
-- ("contacts is the next most likely, since the Lead detail page also reads
-- it"), and apps/admin-console does read all four through an authenticated
-- session. That is a real defect in the human read path and it is reported
-- separately; deciding it is not this migration's business, and Jervis does not
-- need it either way.
--
-- WHY DEFINER FOR A READ. Only because the direct SELECT grant is deliberately
-- absent. These functions expose a fixed column list for one tenant's records
-- and mutate nothing.
--
-- NOT FOUND AND NOT YOURS ARE INDISTINGUISHABLE, deliberately. Every function
-- returns zero rows rather than raising when the record is another tenant's:
-- telling a caller that a record exists but is not theirs is itself a
-- cross-tenant disclosure.
--
-- AUTHORIZATION IS MIGRATION 039'S, REUSED. `jervis_private.jervis_authorize`
-- is called first and unconditionally in every function below. There is no
-- second authorization model here, because two places that decide access is one
-- place too many.
--
-- FAIL CLOSED ON COLLISION, as in 039: `create function` without `or replace`.
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE. Additive only: four
-- functions. No table, column, row, policy or existing grant is altered.
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/039-jervis-integration-rpcs.sql.

begin;

-- ---------------------------------------------------------------------------
-- Contact
-- ---------------------------------------------------------------------------
--
-- The column list is the interface. `business_id` is returned so the caller can
-- assert the tenant it got back is the tenant it asked for, rather than trusting
-- this function to have done it.
create function public.jervis_get_contact(
  p_business_id uuid,
  p_contact_id  uuid
) returns table (
  id           uuid,
  business_id  uuid,
  display_name text,
  email        text,
  phone        text,
  archived_at  timestamptz,
  created_at   timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform jervis_private.jervis_authorize(p_business_id);

  return query
  select c.id, c.business_id, c.display_name, c.email, c.phone,
         c.archived_at, c.created_at
  from public.contacts c
  where c.id = p_contact_id
    -- BOTH predicates. The tenant is not inferred from the row; a tenant-A
    -- caller supplying a tenant-B id gets nothing.
    and c.business_id = p_business_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Lead
-- ---------------------------------------------------------------------------

create function public.jervis_get_lead(
  p_business_id uuid,
  p_lead_id     uuid
) returns table (
  id                   uuid,
  business_id          uuid,
  contact_id           uuid,
  status               text,
  attribution          jsonb,
  duplicate_of_lead_id uuid,
  archived_at          timestamptz,
  created_at           timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform jervis_private.jervis_authorize(p_business_id);

  return query
  select l.id, l.business_id, l.contact_id, l.status, l.attribution,
         l.duplicate_of_lead_id, l.archived_at, l.created_at
  from public.leads l
  where l.id = p_lead_id
    and l.business_id = p_business_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Task
-- ---------------------------------------------------------------------------
--
-- `assigned_to` is deliberately NOT returned. It is a `auth.users` id - the
-- identity of a human staff member - and nothing in the Jervis readback needs
-- it. A read RPC should expose the fields the caller uses, not every column the
-- table happens to have.
create function public.jervis_get_task(
  p_business_id uuid,
  p_task_id     uuid
) returns table (
  id           uuid,
  business_id  uuid,
  title        text,
  description  text,
  due_at       timestamptz,
  entity_type  text,
  entity_id    uuid,
  completed    boolean,
  completed_at timestamptz,
  created_at   timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform jervis_private.jervis_authorize(p_business_id);

  return query
  select t.id, t.business_id, t.title, t.description, t.due_at,
         t.entity_type, t.entity_id, t.completed, t.completed_at, t.created_at
  from public.tasks t
  where t.id = p_task_id
    and t.business_id = p_business_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Audit events for one workflow
-- ---------------------------------------------------------------------------
--
-- BOTH ARGUMENTS ARE REQUIRED, AND THAT IS THE POINT. A read that took only a
-- business id would be "give me this tenant's entire audit history" - the whole
-- record of every action ever taken, returned to an automation that needs one
-- workflow. The correlation id is what bounds it to the thread Jervis actually
-- ran, and `jervis_require_correlation` rejects a blank one rather than letting
-- it degrade into that unbounded read.
--
-- This answers "what happened in this workflow?" and nothing wider.
create function public.jervis_get_audit_events_by_correlation(
  p_business_id    uuid,
  p_correlation_id text
) returns table (
  id             uuid,
  business_id    uuid,
  entity_type    text,
  entity_id      text,
  action         text,
  previous_value text,
  new_value      text,
  actor_category text,
  actor_id       text,
  automated      boolean,
  occurred_at    timestamptz,
  reason         text,
  correlation_id text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_correlation text;
begin
  perform jervis_private.jervis_authorize(p_business_id);
  v_correlation := jervis_private.jervis_require_correlation(p_correlation_id);

  return query
  select a.id, a.business_id, a.entity_type, a.entity_id, a.action,
         a.previous_value, a.new_value, a.actor_category, a.actor_id,
         a.automated, a.occurred_at, a.reason, a.correlation_id
  from public.audit_log a
  where a.business_id = p_business_id
    and a.correlation_id = v_correlation
  -- Deterministic order so a readback renders the workflow in the sequence it
  -- happened; `id` breaks ties between rows written in the same statement.
  order by a.occurred_at, a.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Callable surface
-- ---------------------------------------------------------------------------
--
-- Identical posture to 039: `anon` and `PUBLIC` revoked explicitly, EXECUTE to
-- `authenticated` because Supabase offers no narrower grantee, and the real
-- per-identity boundary is `jervis_private.jervis_authorize` inside each body.
-- Every statement names one function; none is schema-wide.

revoke all on function public.jervis_get_contact(uuid, uuid) from public, anon;
revoke all on function public.jervis_get_lead(uuid, uuid) from public, anon;
revoke all on function public.jervis_get_task(uuid, uuid) from public, anon;
revoke all on function public.jervis_get_audit_events_by_correlation(uuid, text)
  from public, anon;

grant execute on function public.jervis_get_contact(uuid, uuid) to authenticated;
grant execute on function public.jervis_get_lead(uuid, uuid) to authenticated;
grant execute on function public.jervis_get_task(uuid, uuid) to authenticated;
grant execute on function public.jervis_get_audit_events_by_correlation(uuid, text)
  to authenticated;

comment on function public.jervis_get_contact(uuid, uuid) is
  'Jervis integration readback: one Contact in one business. SECURITY DEFINER only because authenticated holds no SELECT on contacts; authorization is jervis_private.jervis_authorize() in the body. Returns zero rows for another tenant''s id - not-found and not-yours are deliberately indistinguishable. See DECISIONS.md ADR-0042.';
comment on function public.jervis_get_lead(uuid, uuid) is
  'Jervis integration readback: one Lead in one business. Read-only; Lead transitions belong to packages/core-models. See DECISIONS.md ADR-0042.';
comment on function public.jervis_get_task(uuid, uuid) is
  'Jervis integration readback: one follow-up Task in one business. `assigned_to` is deliberately not exposed. See DECISIONS.md ADR-0042.';
comment on function public.jervis_get_audit_events_by_correlation(uuid, text) is
  'Jervis integration readback: the audit rows for ONE workflow in one business, in order. Both arguments are required so this can never become an unbounded tenant-wide audit read. See DECISIONS.md ADR-0042.';

commit;
