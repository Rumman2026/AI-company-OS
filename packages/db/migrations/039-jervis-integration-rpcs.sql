-- Jervis integration write path: a private control plane plus four narrow
-- SECURITY DEFINER RPCs. See DECISIONS.md ADR-0041.
--
-- WHY RPCs AND NOT TABLE GRANTS. Jervis needs to create a Contact, a Lead, a
-- follow-up Task and an audit row in one tenant. The obvious move -
-- `grant insert on contacts, tasks, audit_log to authenticated` - is wrong, and
-- not because of RLS. `authenticated` is a SHARED role: every signed-in human
-- CRM user holds it. Granting INSERT there hands every logged-in team member a
-- write capability this application never gave them, in every business they
-- belong to. Most importantly it would let any session insert `audit_log` rows,
-- and an append-only audit trail that any authenticated session can write is not
-- an audit trail. The blast radius of a grant is every current and future member
-- of every business; the blast radius of a function is its body.
--
-- WHY THE BODY IS THE AUTHORIZATION BOUNDARY, NOT THE GRANT. Supabase Auth users
-- do not each get their own Postgres role - they all execute as `authenticated`.
-- So "grant execute to just the integration identity" is not expressible, and a
-- design resting on it would be secure only in its description. EXECUTE must be
-- granted to `authenticated`, and the per-identity check therefore has to live
-- INSIDE each function, keyed on `auth.uid()`, before any mutation.
--
-- SECURITY DEFINER IS NOT AUTHORIZATION. It only means "run as the owner". It is
-- what lets these functions reach tables `authenticated` has no grant on; it
-- decides nothing about who may call them. Supabase's Security Advisor will flag
-- these as privileged API surface and that flag is correct.
--
-- `search_path = ''` ON EVERY FUNCTION. An empty search path means an attacker
-- who can create objects in some schema on the path cannot shadow a table or
-- function this code resolves - because nothing is resolved by search at all.
-- Every relation and function below is schema-qualified, `pg_catalog` builtins
-- included, so the code says exactly what it calls.
--
-- FAIL CLOSED ON COLLISION. `create schema` / `create table` / `create function`
-- are used WITHOUT `if not exists` and WITHOUT `or replace`. If any of these
-- objects already exists, this migration aborts and an operator investigates,
-- rather than silently adopting or overwriting something unexpected in a
-- production database. Recovering from a genuine partial apply is the rollback
-- file's job, not a silent no-op's.
--
-- THIS MIGRATION SEEDS NO IDENTITY. It creates the mechanism. Provisioning the
-- dedicated Jervis Auth user and inserting its allowlist row is a separate,
-- controlled setup step - hard-coding a generated user UUID into a migration
-- would make the authorization list part of schema history rather than
-- operational state.
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE. Additive only: one new
-- schema, two new tables in it, five private helpers and four public functions.
-- No existing table, column, row, policy or grant is altered, and every revoke
-- below names one Jervis-owned object - there is no blanket
-- `revoke ... on all tables in schema`, which would also hit objects a future
-- migration adds to the same schema.
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/038-restore-payments-grant.sql.

begin;

-- ---------------------------------------------------------------------------
-- Private control plane
-- ---------------------------------------------------------------------------
--
-- A DEDICATED SCHEMA, not a generic `private`. A shared private schema becomes a
-- junk drawer that several features revoke and grant on independently, and the
-- first one to write a blanket `revoke ... on all tables` breaks the others.
-- `jervis_private` is owned by this migration and named for it.
--
-- NOT EXPOSED THROUGH THE DATA API. PostgREST only serves schemas listed in the
-- project's "Exposed schemas" setting; `jervis_private` must never be added to
-- it. That, plus the revokes below, is why these tables carry no RLS policies:
-- they are unreachable by `anon` and `authenticated` entirely, and a policy
-- would imply they were reachable and merely filtered.

create schema jervis_private;

revoke all on schema jervis_private from public;
revoke all on schema jervis_private from anon, authenticated;

-- The allowlist. A row here states that one Supabase Auth user is a Jervis
-- integration identity FOR ONE BUSINESS.
--
-- PRIMARY KEY IS (user_id, business_id), not user_id alone. Phase 1 authorizes
-- exactly one row - the integration identity in CRM Isolation Test Tenant - but
-- Jervis will eventually hold explicit authority in more than one business, and
-- that should be an INSERT, not a migration that rewrites the key.
--
-- `revoked_at` rather than DELETE: withdrawing authority is an event worth
-- keeping, and every check below requires `revoked_at is null`.
create table jervis_private.jervis_integration_identities (
  user_id     uuid not null references auth.users (id),
  business_id uuid not null references public.businesses (id),
  label       text not null check (pg_catalog.length(pg_catalog.btrim(label)) > 0),
  created_at  timestamptz not null default pg_catalog.now(),
  revoked_at  timestamptz,
  primary key (user_id, business_id)
);

comment on table jervis_private.jervis_integration_identities is
  'Which Supabase Auth user is a Jervis integration identity, for which business - see DECISIONS.md ADR-0041. NOT exposed through the Data API; the SECURITY DEFINER RPCs read it as owner. A row here is necessary but not sufficient: every RPC independently re-checks public.memberships.';

-- Database-enforced idempotency.
--
-- THE UNIQUENESS BOUNDARY DELIBERATELY EXCLUDES THE CALLING USER. An earlier
-- draft keyed this on (integration_user_id, business_id, operation,
-- idempotency_key), which is wrong the first time Jervis's credentials rotate:
-- the replacement identity would find no claim for a key the previous identity
-- had already honoured, and would perform the same business operation a second
-- time. Idempotency is a property of the BUSINESS OPERATION, not of whoever
-- happened to be holding the credential. `claimed_by_user_id` records who did
-- it, for provenance, and takes no part in the key.
--
-- `request_hash` is what makes the key safe to trust. Without it the same key
-- reused with different data silently returns the first resource - so a retry
-- that had actually corrected the customer's name would report success and
-- change nothing. The hash covers every material argument, so a changed payload
-- is a loud rejection instead.
--
-- ONLY THE DIGEST IS STORED. The canonical payload contains a customer's name,
-- email and phone; none of that needs to be retained a second time merely to
-- compare two requests.
create table jervis_private.jervis_idempotency (
  business_id         uuid not null references public.businesses (id),
  operation           text not null,
  idempotency_key     text not null
                      check (pg_catalog.length(pg_catalog.btrim(idempotency_key)) > 0),
  request_hash        text not null check (pg_catalog.length(request_hash) = 64),
  -- Null between the claim and the write completing. A concurrent caller on the
  -- same key blocks on this row's lock and reads it once committed.
  resource_id         uuid,
  claimed_by_user_id  uuid not null,
  created_at          timestamptz not null default pg_catalog.now(),
  primary key (business_id, operation, idempotency_key)
);

comment on table jervis_private.jervis_idempotency is
  'Transactional idempotency claims for the Jervis integration RPCs - see DECISIONS.md ADR-0041. Keyed on (business_id, operation, idempotency_key) and deliberately NOT on the calling user, so a credential rotation cannot replay a completed operation. request_hash binds the key to the payload: the same key with different data is rejected, never silently satisfied from the first result.';

-- ---------------------------------------------------------------------------
-- Private helpers
-- ---------------------------------------------------------------------------

-- Canonical request fingerprint.
--
-- `jsonb` rather than a concatenated string: jsonb normalises key order and
-- whitespace, so two logically identical payloads always produce identical
-- bytes, and a value containing a delimiter cannot be made to look like a
-- different field boundary.
--
-- `extensions.digest` because pgcrypto lives in the `extensions` schema on this
-- project, and with `search_path = ''` nothing resolves unqualified anyway.
create function jervis_private.jervis_fingerprint(p_payload jsonb)
returns text
language sql
immutable
security definer
set search_path = ''
as $$
  select pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(p_payload::pg_catalog.text, 'UTF8'), 'sha256'),
    'hex'
  );
$$;

revoke all on function jervis_private.jervis_fingerprint(jsonb) from public;
revoke all on function jervis_private.jervis_fingerprint(jsonb) from anon, authenticated;

-- The authorization boundary.
--
-- CALLED FIRST AND UNCONDITIONALLY BY EVERY RPC, before any mutation. Factored
-- into one function deliberately: four hand-copied authorization blocks are four
-- places for one to drift, and the one that drifts is the one nobody re-reads.
--
-- TWO INDEPENDENT CHECKS, ON PURPOSE:
--   1. the allowlist - is this caller a Jervis integration identity for this
--      business at all? This is what refuses an ordinary authenticated human,
--      who will never have a row here.
--   2. public.memberships - does that user CURRENTLY hold a live membership in
--      the business? This is what makes revoking access in the CRM's own model
--      take effect immediately, without touching the allowlist.
-- Neither alone is sufficient. `p_business_id` is never trusted - it is only
-- ever confirmed against `auth.uid()`.
create function jervis_private.jervis_authorize(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'jervis: unauthenticated' using errcode = '42501';
  end if;

  if not exists (
    select 1 from jervis_private.jervis_integration_identities
    where user_id = auth.uid()
      and business_id = p_business_id
      and revoked_at is null
  ) then
    raise exception 'jervis: caller is not an active integration identity for this business'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.memberships
    where user_id = auth.uid()
      and business_id = p_business_id
  ) then
    raise exception 'jervis: caller holds no membership in this business'
      using errcode = '42501';
  end if;
end;
$$;

revoke all on function jervis_private.jervis_authorize(uuid) from public;
revoke all on function jervis_private.jervis_authorize(uuid) from anon, authenticated;

-- Shared argument validation for every public RPC.
create function jervis_private.jervis_require_correlation(p_correlation_id text)
returns text
language plpgsql
immutable
security definer
set search_path = ''
as $$
begin
  -- MANDATORY, NOT OPTIONAL. Automation that creates operational state which
  -- cannot be traced back to the workflow that caused it is exactly the record
  -- that becomes unexplainable three months later.
  if p_correlation_id is null
     or pg_catalog.length(pg_catalog.btrim(p_correlation_id)) = 0 then
    raise exception 'jervis: correlation_id is required and may not be blank'
      using errcode = '22023';
  end if;
  return pg_catalog.btrim(p_correlation_id);
end;
$$;

revoke all on function jervis_private.jervis_require_correlation(text) from public;
revoke all on function jervis_private.jervis_require_correlation(text)
  from anon, authenticated;

-- Claim an idempotency key, or resolve a previous claim.
--
-- Returns (claimed, resource_id):
--   claimed = true  -> the caller owns the claim and must perform the write
--   claimed = false -> a previous or concurrent caller did; resource_id is theirs
--
-- The FOR UPDATE is the whole point. Under READ COMMITTED the winner's
-- uncommitted row is invisible to a concurrent loser, so a plain SELECT would
-- return nothing and the loser would wrongly conclude the key was free. FOR
-- UPDATE blocks on the winner's row lock until it commits, then reads it.
--
-- THE LOOP HANDLES THE WINNER ROLLING BACK. If the first caller's own write
-- fails, its claim disappears with the transaction, and the waiting caller finds
-- no row once the lock releases. Without the retry it would return NULL as
-- though a resource existed. With it, the key is simply free again.
create function jervis_private.jervis_claim(
  p_business_id uuid, p_operation text, p_idempotency_key text, p_request_hash text
) returns table (claimed boolean, resource_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows integer;
  v_hash text;
  v_resource uuid;
  v_key text;
begin
  if p_idempotency_key is null
     or pg_catalog.length(pg_catalog.btrim(p_idempotency_key)) = 0 then
    raise exception 'jervis: idempotency_key is required and may not be blank'
      using errcode = '22023';
  end if;
  v_key := pg_catalog.btrim(p_idempotency_key);

  for _attempt in 1..2 loop
    insert into jervis_private.jervis_idempotency
      (business_id, operation, idempotency_key, request_hash, claimed_by_user_id)
    values (p_business_id, p_operation, v_key, p_request_hash, auth.uid())
    on conflict (business_id, operation, idempotency_key) do nothing;

    get diagnostics v_rows = row_count;
    if v_rows > 0 then
      claimed := true;
      resource_id := null;
      return next;
      return;
    end if;

    v_hash := null;
    v_resource := null;

    select i.request_hash, i.resource_id
      into v_hash, v_resource
    from jervis_private.jervis_idempotency i
    where i.business_id = p_business_id
      and i.operation = p_operation
      and i.idempotency_key = v_key
    for update;

    if found then
      -- THE PAYLOAD CHECK. Reusing a key with different data is a caller bug,
      -- and silently returning the first resource would report success for a
      -- change that never happened.
      if v_hash is distinct from p_request_hash then
        raise exception
          'jervis: idempotency_key reused with a different payload for % on this business',
          p_operation using errcode = '22023';
      end if;
      claimed := false;
      resource_id := v_resource;
      return next;
      return;
    end if;
    -- No row: the previous claimant rolled back. Loop and claim it.
  end loop;

  raise exception 'jervis: could not settle idempotency claim for %', p_operation
    using errcode = '40001';
end;
$$;

revoke all on function jervis_private.jervis_claim(uuid, text, text, text) from public;
revoke all on function jervis_private.jervis_claim(uuid, text, text, text)
  from anon, authenticated;

-- Record the audit row for a Jervis mutation.
--
-- ACTOR IDENTITY IS DERIVED, NEVER ACCEPTED. `actor_category` is 'automation'
-- (already an ActorCategory in packages/core-models, alongside the four
-- membership roles and 'customer'), `automated` is true, and `actor_id` comes
-- from auth.uid(). A caller-supplied actor is exactly how an integration
-- identity would claim to be a human user, so the parameter does not exist.
create function jervis_private.jervis_audit(
  p_business_id uuid, p_entity_type text, p_entity_id text, p_action text,
  p_previous_value text, p_new_value text, p_reason text, p_correlation_id text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.audit_log (
    business_id, entity_type, entity_id, action,
    previous_value, new_value,
    actor_category, actor_id, automated,
    occurred_at, reason, correlation_id
  ) values (
    p_business_id, p_entity_type, p_entity_id, p_action,
    coalesce(p_previous_value, ''), coalesce(p_new_value, ''),
    'automation', auth.uid()::pg_catalog.text, true,
    pg_catalog.now(), p_reason, p_correlation_id
  )
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function jervis_private.jervis_audit(
  uuid, text, text, text, text, text, text, text) from public;
revoke all on function jervis_private.jervis_audit(
  uuid, text, text, text, text, text, text, text) from anon, authenticated;

-- ---------------------------------------------------------------------------
-- The four callable RPCs
-- ---------------------------------------------------------------------------

create function public.jervis_create_contact(
  p_business_id     uuid,
  p_display_name    text,
  p_email           text,
  p_phone           text,
  p_correlation_id  text,
  p_idempotency_key text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claimed boolean;
  v_existing uuid;
  v_id uuid;
  v_correlation text;
  v_hash text;
begin
  perform jervis_private.jervis_authorize(p_business_id);
  v_correlation := jervis_private.jervis_require_correlation(p_correlation_id);

  if p_display_name is null
     or pg_catalog.length(pg_catalog.btrim(p_display_name)) = 0 then
    raise exception 'jervis: display_name is required' using errcode = '22023';
  end if;

  -- EVERY MATERIAL ARGUMENT, the correlation id included: a different workflow
  -- reusing a key is a different request, not a replay of this one.
  v_hash := jervis_private.jervis_fingerprint(pg_catalog.jsonb_build_object(
    'op', 'create_contact',
    'business_id', p_business_id,
    'display_name', pg_catalog.btrim(p_display_name),
    'email', p_email,
    'phone', p_phone,
    'correlation_id', v_correlation));

  select c.claimed, c.resource_id into v_claimed, v_existing
  from jervis_private.jervis_claim(
    p_business_id, 'create_contact', p_idempotency_key, v_hash) c;
  if not v_claimed then
    return v_existing;
  end if;

  insert into public.contacts (business_id, display_name, email, phone)
  values (p_business_id, pg_catalog.btrim(p_display_name), p_email, p_phone)
  returning id into v_id;

  update jervis_private.jervis_idempotency
  set resource_id = v_id
  where business_id = p_business_id and operation = 'create_contact'
    and idempotency_key = pg_catalog.btrim(p_idempotency_key);

  perform jervis_private.jervis_audit(
    p_business_id, 'contact', v_id::pg_catalog.text, 'contact.created',
    '', 'created', 'created by Jervis integration', v_correlation);

  return v_id;
end;
$$;

create function public.jervis_create_lead(
  p_business_id     uuid,
  p_contact_id      uuid,
  p_channel         text,
  p_correlation_id  text,
  p_idempotency_key text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claimed boolean;
  v_existing uuid;
  v_id uuid;
  v_correlation text;
  v_hash text;
  v_channel text;
begin
  perform jervis_private.jervis_authorize(p_business_id);
  v_correlation := jervis_private.jervis_require_correlation(p_correlation_id);

  -- THE REFERENTIAL TENANT CHECK. RLS is not in play here - this function runs
  -- as owner - so the tenant of a referenced row must be asserted explicitly.
  -- Without this, a caller authorized for one tenant could attach a Lead to
  -- another business's Contact and leave a cross-tenant edge in the graph that
  -- no read path would ever surface.
  if not exists (
    select 1 from public.contacts
    where id = p_contact_id and business_id = p_business_id
  ) then
    raise exception 'jervis: contact does not belong to this business'
      using errcode = '42501';
  end if;

  v_channel := coalesce(nullif(pg_catalog.btrim(p_channel), ''), 'unknown');

  v_hash := jervis_private.jervis_fingerprint(pg_catalog.jsonb_build_object(
    'op', 'create_lead',
    'business_id', p_business_id,
    'contact_id', p_contact_id,
    'channel', v_channel,
    'correlation_id', v_correlation));

  select c.claimed, c.resource_id into v_claimed, v_existing
  from jervis_private.jervis_claim(
    p_business_id, 'create_lead', p_idempotency_key, v_hash) c;
  if not v_claimed then
    return v_existing;
  end if;

  -- `status` is left to the column default ('new'). The Lead state machine
  -- lives in packages/core-models and transitions belong to it; this function
  -- creates a Lead at its documented initial state and never moves one.
  insert into public.leads (business_id, contact_id, attribution)
  values (
    p_business_id, p_contact_id,
    pg_catalog.jsonb_build_object('channel', v_channel, 'leadCreatedAt', pg_catalog.now())
  )
  returning id into v_id;

  update jervis_private.jervis_idempotency
  set resource_id = v_id
  where business_id = p_business_id and operation = 'create_lead'
    and idempotency_key = pg_catalog.btrim(p_idempotency_key);

  perform jervis_private.jervis_audit(
    p_business_id, 'lead', v_id::pg_catalog.text, 'lead.created',
    '', 'new', 'created by Jervis integration', v_correlation);

  return v_id;
end;
$$;

create function public.jervis_create_follow_up_task(
  p_business_id     uuid,
  p_title           text,
  p_description     text,
  p_due_at          timestamptz,
  p_entity_type     text,
  p_entity_id       uuid,
  p_correlation_id  text,
  p_idempotency_key text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claimed boolean;
  v_existing uuid;
  v_id uuid;
  v_correlation text;
  v_hash text;
  v_belongs boolean;
begin
  perform jervis_private.jervis_authorize(p_business_id);
  v_correlation := jervis_private.jervis_require_correlation(p_correlation_id);

  if p_title is null or pg_catalog.length(pg_catalog.btrim(p_title)) = 0 then
    raise exception 'jervis: title is required' using errcode = '22023';
  end if;

  -- entity_type/entity_id are the optional polymorphic reference tasks already
  -- uses; the table's own check constraint requires both or neither. No real
  -- foreign key is possible across that boundary, so the tenant check is this
  -- function's responsibility - the same responsibility migration 006 assigns
  -- to the repository layer.
  if (p_entity_type is null) <> (p_entity_id is null) then
    raise exception 'jervis: entity_type and entity_id must be given together'
      using errcode = '22023';
  end if;

  if p_entity_type is not null then
    v_belongs := case p_entity_type
      when 'lead' then exists (
        select 1 from public.leads where id = p_entity_id and business_id = p_business_id)
      when 'contact' then exists (
        select 1 from public.contacts where id = p_entity_id and business_id = p_business_id)
      when 'company' then exists (
        select 1 from public.companies where id = p_entity_id and business_id = p_business_id)
      when 'job' then exists (
        select 1 from public.jobs where id = p_entity_id and business_id = p_business_id)
      else null
    end;

    if v_belongs is null then
      raise exception 'jervis: unsupported entity_type %', p_entity_type
        using errcode = '22023';
    end if;
    if not v_belongs then
      raise exception 'jervis: referenced % does not belong to this business', p_entity_type
        using errcode = '42501';
    end if;
  end if;

  -- `at time zone 'UTC'` so the fingerprint does not move with the session's
  -- TimeZone setting - the same instant must always hash the same way.
  v_hash := jervis_private.jervis_fingerprint(pg_catalog.jsonb_build_object(
    'op', 'create_follow_up_task',
    'business_id', p_business_id,
    'title', pg_catalog.btrim(p_title),
    'description', p_description,
    'due_at', (p_due_at at time zone 'UTC')::pg_catalog.text,
    'entity_type', p_entity_type,
    'entity_id', p_entity_id,
    'correlation_id', v_correlation));

  select c.claimed, c.resource_id into v_claimed, v_existing
  from jervis_private.jervis_claim(
    p_business_id, 'create_follow_up_task', p_idempotency_key, v_hash) c;
  if not v_claimed then
    return v_existing;
  end if;

  -- `assigned_to` is deliberately left null: it references auth.users, and a
  -- Jervis-created task is not assigned to the integration identity - it is
  -- work for a human who has not been chosen yet.
  insert into public.tasks (business_id, title, description, due_at, entity_type, entity_id)
  values (p_business_id, pg_catalog.btrim(p_title), p_description, p_due_at,
          p_entity_type, p_entity_id)
  returning id into v_id;

  update jervis_private.jervis_idempotency
  set resource_id = v_id
  where business_id = p_business_id and operation = 'create_follow_up_task'
    and idempotency_key = pg_catalog.btrim(p_idempotency_key);

  perform jervis_private.jervis_audit(
    p_business_id, 'task', v_id::pg_catalog.text, 'task.created',
    '', 'open', 'created by Jervis integration', v_correlation);

  return v_id;
end;
$$;

create function public.jervis_append_audit_event(
  p_business_id     uuid,
  p_entity_type     text,
  p_entity_id       uuid,
  p_action          text,
  p_previous_value  text,
  p_new_value       text,
  p_reason          text,
  p_correlation_id  text,
  p_idempotency_key text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claimed boolean;
  v_existing uuid;
  v_id uuid;
  v_correlation text;
  v_hash text;
  v_belongs boolean;
begin
  perform jervis_private.jervis_authorize(p_business_id);
  v_correlation := jervis_private.jervis_require_correlation(p_correlation_id);

  if p_action is null or pg_catalog.length(pg_catalog.btrim(p_action)) = 0 then
    raise exception 'jervis: action is required' using errcode = '22023';
  end if;

  -- THE ENTITY MUST BE THIS TENANT'S. `audit_log.entity_id` is text and
  -- `entity_type` is unconstrained, so without this check the function would be
  -- a way to write a history entry ABOUT another business's record while
  -- stamping it with this business's id - a fabricated audit trail, which is
  -- worse than a missing one. `p_entity_id` is typed uuid here specifically so
  -- it can be checked; free-text entity ids are not accepted.
  v_belongs := case p_entity_type
    when 'lead' then exists (
      select 1 from public.leads where id = p_entity_id and business_id = p_business_id)
    when 'contact' then exists (
      select 1 from public.contacts where id = p_entity_id and business_id = p_business_id)
    when 'task' then exists (
      select 1 from public.tasks where id = p_entity_id and business_id = p_business_id)
    else null
  end;

  if v_belongs is null then
    raise exception 'jervis: unsupported entity_type %', p_entity_type
      using errcode = '22023';
  end if;
  if not v_belongs then
    raise exception 'jervis: referenced % does not belong to this business', p_entity_type
      using errcode = '42501';
  end if;

  v_hash := jervis_private.jervis_fingerprint(pg_catalog.jsonb_build_object(
    'op', 'append_audit_event',
    'business_id', p_business_id,
    'entity_type', p_entity_type,
    'entity_id', p_entity_id,
    'action', pg_catalog.btrim(p_action),
    'previous_value', p_previous_value,
    'new_value', p_new_value,
    'reason', p_reason,
    'correlation_id', v_correlation));

  select c.claimed, c.resource_id into v_claimed, v_existing
  from jervis_private.jervis_claim(
    p_business_id, 'append_audit_event', p_idempotency_key, v_hash) c;
  if not v_claimed then
    return v_existing;
  end if;

  v_id := jervis_private.jervis_audit(
    p_business_id, p_entity_type, p_entity_id::pg_catalog.text,
    pg_catalog.btrim(p_action),
    p_previous_value, p_new_value, p_reason, v_correlation);

  update jervis_private.jervis_idempotency
  set resource_id = v_id
  where business_id = p_business_id and operation = 'append_audit_event'
    and idempotency_key = pg_catalog.btrim(p_idempotency_key);

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Callable surface
-- ---------------------------------------------------------------------------
--
-- EXECUTE to `authenticated` is the narrowest grant Supabase permits - see the
-- header. `anon` and `PUBLIC` are revoked explicitly rather than relied upon to
-- be absent, and the function bodies are the real per-identity boundary. Every
-- revoke names one Jervis function; none is a blanket schema-wide statement.

revoke all on function public.jervis_create_contact(uuid, text, text, text, text, text)
  from public, anon;
revoke all on function public.jervis_create_lead(uuid, uuid, text, text, text)
  from public, anon;
revoke all on function public.jervis_create_follow_up_task(
  uuid, text, text, timestamptz, text, uuid, text, text) from public, anon;
revoke all on function public.jervis_append_audit_event(
  uuid, text, uuid, text, text, text, text, text, text) from public, anon;

grant execute on function public.jervis_create_contact(uuid, text, text, text, text, text)
  to authenticated;
grant execute on function public.jervis_create_lead(uuid, uuid, text, text, text)
  to authenticated;
grant execute on function public.jervis_create_follow_up_task(
  uuid, text, text, timestamptz, text, uuid, text, text) to authenticated;
grant execute on function public.jervis_append_audit_event(
  uuid, text, uuid, text, text, text, text, text, text) to authenticated;

comment on function public.jervis_create_contact(uuid, text, text, text, text, text) is
  'Jervis integration: create a Contact in one business. SECURITY DEFINER because authenticated holds no INSERT on contacts by design; authorization is jervis_private.jervis_authorize() in the body, not the EXECUTE grant. See DECISIONS.md ADR-0041.';
comment on function public.jervis_create_lead(uuid, uuid, text, text, text) is
  'Jervis integration: create a Lead at its initial status against a Contact in the SAME business. Never transitions a Lead - the state machine lives in packages/core-models. See DECISIONS.md ADR-0041.';
comment on function public.jervis_create_follow_up_task(uuid, text, text, timestamptz, text, uuid, text, text) is
  'Jervis integration: create a follow-up Task, optionally attached to a lead/contact/company/job in the SAME business. See DECISIONS.md ADR-0041.';
comment on function public.jervis_append_audit_event(uuid, text, uuid, text, text, text, text, text, text) is
  'Jervis integration: append one audit_log row about an entity in the SAME business. Actor is derived from auth.uid(), never supplied. See DECISIONS.md ADR-0041.';

commit;
