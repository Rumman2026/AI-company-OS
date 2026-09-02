-- The CRM audit writer.
--
-- THE DEFECT THIS FIXES. `audit_log` has RLS enabled, a tenant SELECT policy
-- (migration 002) and NO INSERT POLICY IN ANY MIGRATION - deliberately, because
-- migration 001 recorded the trail as "server-only access via the Supabase
-- service-role key". The admin console does not use the service-role key; it
-- calls Supabase as the signed-in user. So every audit INSERT it has ever
-- attempted failed with 42501 at the privilege layer, and all six call sites
-- discarded the result. Lead, job, invoice and review-request transitions have
-- been reporting success while writing no audit row. The history already lost
-- is unrecoverable; this stops the loss.
--
-- WHY A FUNCTION AND NOT A GRANT. `grant insert on audit_log to authenticated`
-- plus an INSERT policy would work and would be wrong. A policy can constrain
-- WHICH ROWS a caller may insert, but not WHAT THEY CLAIM INSIDE those rows:
-- with a direct INSERT, any authenticated user could write an audit row
-- attributing an action to a different user, to a role they do not hold, to an
-- automated process, or at a time they choose. An append-only compliance trail
-- whose contents the subject can forge is worse than no trail, because it looks
-- authoritative. This function is the only INSERT path, so the four fields that
-- decide accountability are set by the database and are not parameters.
--
-- THE FORGERY MODEL, AND WHAT DEFEATS EACH ATTACK:
--
--   Claim another user's action     -> `actor_id` IS NOT A PARAMETER. It is
--                                      auth.uid(), always. Following the same
--                                      rule as jervis_private.jervis_audit in
--                                      migration 039.
--   Claim a role you do not hold    -> `p_actor_category` is verified against
--                                      the roles the caller actually holds in
--                                      THIS business, across both memberships
--                                      and membership_roles. A technician
--                                      cannot file an owner-admin approval.
--   Claim to be an automated system -> the same check rejects it: 'automation',
--                                      'customer', 'ai-drafting-service' and
--                                      'scheduled-publishing-service' are not
--                                      membership roles, so no interactive
--                                      caller can ever assert them. Automated
--                                      writers keep using the service-role key.
--   Disguise a manual act as a bot  -> `p_automated` must be false. It is
--                                      rejected rather than silently rewritten,
--                                      so a call site that would have written a
--                                      misattributed row fails loudly instead.
--   Write into another tenant       -> membership in `p_business_id` is
--                                      required, mirroring the tenant rule in
--                                      audit_log_tenant_select exactly.
--   Backdate or postdate an entry   -> `occurred_at` IS NOT A PARAMETER. It is
--                                      pg_catalog.now(). Ordering in an
--                                      append-only trail must come from the
--                                      server, not from the client asserting
--                                      when it thinks something happened.
--   Hijack an unqualified name      -> `set search_path = ''` and every builtin
--                                      schema-qualified. No dynamic SQL exists
--                                      in this function, so there is nothing to
--                                      inject into.
--
-- WHAT IS NOT GRANTED. No table privilege is added to anyone. `audit_log` stays
-- closed to INSERT at the privilege layer for `authenticated`, `anon` and
-- PUBLIC, which is what makes this function the only way in. `anon` cannot
-- execute it. No policy is created, altered or dropped; the SELECT policy from
-- migration 002 remains the sole authority on who can READ the trail.
--
-- APPEND-ONLY IS PRESERVED. This function only inserts. No UPDATE or DELETE
-- path to audit_log is created here or anywhere else.

begin;

create or replace function public.crm_write_audit_record(
  p_business_id     uuid,
  p_entity_type     text,
  p_entity_id       text,
  p_action          text,
  p_previous_value  text,
  p_new_value       text,
  p_actor_category  text,
  p_automated       boolean,
  p_reason          text,
  p_correlation_id  text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_id  uuid;
begin
  v_uid := auth.uid();

  if v_uid is null then
    raise exception 'crm_audit: unauthenticated'
      using errcode = '42501';
  end if;

  if p_business_id is null then
    raise exception 'crm_audit: business_id is required'
      using errcode = '22023';
  end if;

  -- Same tenant rule as audit_log_tenant_select (migration 002).
  if not exists (
    select 1
    from public.memberships
    where user_id = v_uid
      and business_id = p_business_id
  ) then
    raise exception 'crm_audit: caller holds no membership in this business'
      using errcode = '42501';
  end if;

  -- The claimed role must be one the caller actually holds in this business.
  -- Checked across both tables because migration 007 added membership_roles for
  -- multi-role staff while memberships.role stayed as the primary role.
  if p_actor_category is null or not exists (
    select 1
    from public.memberships m
    where m.user_id = v_uid
      and m.business_id = p_business_id
      and m.role = p_actor_category
    union all
    select 1
    from public.memberships m
    join public.membership_roles r on r.membership_id = m.id
    where m.user_id = v_uid
      and m.business_id = p_business_id
      and r.role = p_actor_category
  ) then
    raise exception
      'crm_audit: actor_category % is not a role held by the caller in this business',
      coalesce(p_actor_category, '<null>')
      using errcode = '42501';
  end if;

  -- Rejected, never rewritten: an interactive caller asserting an automated
  -- actor is a misattribution, and silently correcting it would hide the bug.
  if coalesce(p_automated, false) then
    raise exception 'crm_audit: an interactive caller may not record an automated actor'
      using errcode = '42501';
  end if;

  if p_entity_type is null or pg_catalog.btrim(p_entity_type) = '' then
    raise exception 'crm_audit: entity_type is required' using errcode = '22023';
  end if;

  if p_entity_id is null or pg_catalog.btrim(p_entity_id) = '' then
    raise exception 'crm_audit: entity_id is required' using errcode = '22023';
  end if;

  if p_action is null or pg_catalog.btrim(p_action) = '' then
    raise exception 'crm_audit: action is required' using errcode = '22023';
  end if;

  insert into public.audit_log (
    business_id, entity_type, entity_id, action,
    previous_value, new_value,
    actor_category, actor_id, automated,
    occurred_at, reason, correlation_id
  ) values (
    p_business_id, p_entity_type, p_entity_id, p_action,
    coalesce(p_previous_value, ''), coalesce(p_new_value, ''),
    p_actor_category, v_uid::pg_catalog.text, false,
    pg_catalog.now(), p_reason, p_correlation_id
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.crm_write_audit_record(
  uuid, text, text, text, text, text, text, boolean, text, text) from public;
revoke all on function public.crm_write_audit_record(
  uuid, text, text, text, text, text, text, boolean, text, text) from anon;
grant execute on function public.crm_write_audit_record(
  uuid, text, text, text, text, text, text, boolean, text, text) to authenticated;

comment on function public.crm_write_audit_record(
  uuid, text, text, text, text, text, text, boolean, text, text) is
  'The only INSERT path into audit_log for an interactive user. actor_id and occurred_at are set by the database, never by the caller, and the claimed actor_category is verified against the roles the caller holds in that business - see migration 044 for the forgery model.';

commit;
