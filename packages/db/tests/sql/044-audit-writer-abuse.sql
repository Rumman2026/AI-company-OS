-- Executable abuse tests for migrations/044-crm-audit-writer.sql.
--
-- The .test.ts assertions beside this file prove the SQL TEXT contains each
-- defence. They cannot prove the defences WORK - a check with an inverted
-- condition, a role lookup against the wrong column, or an exception handler
-- that swallows its own error would all pass a text assertion and still let a
-- technician file an owner-admin approval in another tenant.
--
-- So this script builds the smallest schema 044 needs, loads the REAL migration
-- file unmodified, and then actually attempts each attack against real
-- PostgreSQL, asserting the refusal. It runs in a throwaway database created
-- and dropped by scripts/test/run-044-abuse.sh, touches no real data, and needs
-- no credentials.
--
-- Supabase pieces emulated here: the `auth` schema and `auth.uid()` (which
-- reads the request JWT claim), and the `anon` / `authenticated` roles.

\set ON_ERROR_STOP on

-- ---------------------------------------------------------------------------
-- Harness: the minimum of the real schema that 044 touches
-- ---------------------------------------------------------------------------

create schema if not exists auth;

-- Supabase's auth.uid() reads the verified JWT subject. A GUC stands in for it
-- so a test can act as a chosen user without an auth server.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end $$;

grant usage on schema public, auth to anon, authenticated;

create table public.businesses (id uuid primary key);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id),
  user_id uuid not null,
  role text not null check (role in ('owner-admin','office-manager','dispatcher','technician')),
  constraint memberships_business_user_unique unique (business_id, user_id)
);

create table public.membership_roles (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.memberships (id) on delete cascade,
  role text not null check (role in ('owner-admin','office-manager','dispatcher','technician')),
  constraint membership_roles_unique unique (membership_id, role)
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  previous_value text not null,
  new_value text not null,
  actor_category text not null,
  actor_id text,
  automated boolean not null,
  occurred_at timestamptz not null,
  reason text,
  correlation_id text,
  created_at timestamptz not null default now()
);

-- Exactly as in production: RLS on, a tenant SELECT policy, and NO insert
-- policy and NO insert grant for authenticated. This is what makes the function
-- the only way in, so the harness must reproduce it faithfully.
alter table public.audit_log enable row level security;
create policy audit_log_tenant_select on public.audit_log
  for select to authenticated
  using (business_id in (select business_id from public.memberships where user_id = auth.uid()));

grant select on public.audit_log to authenticated;
grant select on public.memberships, public.membership_roles to authenticated;

-- Fixtures: two tenants, three users.
--   alice  - technician in tenant A
--   bob    - owner-admin in tenant B
--   carol  - technician in tenant A, ALSO owner-admin via membership_roles
insert into public.businesses (id) values
  ('aaaaaaaa-0000-4000-8000-000000000001'),
  ('bbbbbbbb-0000-4000-8000-000000000002');

insert into public.memberships (id, business_id, user_id, role) values
  ('11111111-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000001','a11ce000-0000-4000-8000-000000000001','technician'),
  ('22222222-0000-4000-8000-000000000002','bbbbbbbb-0000-4000-8000-000000000002','b0b00000-0000-4000-8000-000000000002','owner-admin'),
  ('33333333-0000-4000-8000-000000000003','aaaaaaaa-0000-4000-8000-000000000001','ca201000-0000-4000-8000-000000000003','technician');

insert into public.membership_roles (membership_id, role) values
  ('33333333-0000-4000-8000-000000000003','owner-admin');

-- ---------------------------------------------------------------------------
-- The real migration, loaded unmodified
-- ---------------------------------------------------------------------------

\ir ../../migrations/044-crm-audit-writer.sql

-- ---------------------------------------------------------------------------
-- Attacks
-- ---------------------------------------------------------------------------

create or replace function pg_temp.expect_refused(
  p_label text, p_uid text, p_business uuid, p_category text, p_automated boolean
) returns void language plpgsql as $$
begin
  perform pg_catalog.set_config('request.jwt.claim.sub', coalesce(p_uid, ''), true);
  begin
    perform public.crm_write_audit_record(
      p_business, 'lead', 'lead-1', 'status-change', 'new', 'contacted',
      p_category, p_automated, null, null);
    raise exception 'ABUSE TEST FAILED: % was ALLOWED', p_label;
  exception
    when sqlstate '42501' then
      raise notice '  refused (as required): %', p_label;
  end;
end $$;

do $$
declare
  v_tenant_a uuid := 'aaaaaaaa-0000-4000-8000-000000000001';
  v_tenant_b uuid := 'bbbbbbbb-0000-4000-8000-000000000002';
  v_alice text := 'a11ce000-0000-4000-8000-000000000001';
  v_bob   text := 'b0b00000-0000-4000-8000-000000000002';
  v_carol text := 'ca201000-0000-4000-8000-000000000003';
  v_id uuid;
  v_row public.audit_log%rowtype;
  v_before timestamptz;
begin
  -- 1. The legitimate case must actually work, or every refusal below is
  --    meaningless - a function that refuses everything would "pass" them all.
  perform pg_catalog.set_config('request.jwt.claim.sub', v_alice, true);
  -- now(), not clock_timestamp(): the function stamps transaction time, which
  -- is by definition at or before any later clock reading in the same
  -- transaction. Comparing against a clock reading would fail on a correct
  -- implementation.
  v_before := now();
  v_id := public.crm_write_audit_record(
    v_tenant_a, 'lead', 'lead-1', 'status-change', 'new', 'contacted',
    'technician', false, 'called back', 'corr-1');
  select * into v_row from public.audit_log where id = v_id;

  if v_row.actor_id is distinct from v_alice then
    raise exception 'ABUSE TEST FAILED: actor_id was %, expected the caller %', v_row.actor_id, v_alice;
  end if;
  if v_row.automated then
    raise exception 'ABUSE TEST FAILED: automated was stored true';
  end if;
  if v_row.occurred_at not between v_before - interval '5 seconds'
                               and clock_timestamp() + interval '5 seconds' then
    raise exception
      'ABUSE TEST FAILED: occurred_at (%) is not server time - it looks client-assigned',
      v_row.occurred_at;
  end if;
  raise notice '  allowed (as required): a technician auditing their own tenant';

  -- 2. CROSS-TENANT. Bob is a real, fully privileged owner-admin - in tenant B.
  --    He must not be able to write a single row into tenant A.
  perform pg_temp.expect_refused(
    'cross-tenant write: tenant B owner-admin into tenant A', v_bob, v_tenant_a, 'owner-admin', false);

  -- 3. ROLE FORGERY. Alice is a technician; an owner-admin approval filed under
  --    her name would be a privilege claim the audit trail cannot support.
  perform pg_temp.expect_refused(
    'role forgery: technician claiming owner-admin', v_alice, v_tenant_a, 'owner-admin', false);

  -- 4. NON-MEMBERSHIP CATEGORIES. These exist in the ActorCategory union but are
  --    not membership roles, so no interactive caller may ever assert them.
  perform pg_temp.expect_refused(
    'category forgery: claiming to be automation', v_alice, v_tenant_a, 'automation', false);
  perform pg_temp.expect_refused(
    'category forgery: claiming to be a customer', v_alice, v_tenant_a, 'customer', false);
  perform pg_temp.expect_refused(
    'category forgery: claiming ai-drafting-service', v_alice, v_tenant_a, 'ai-drafting-service', false);

  -- 5. AUTOMATION FORGERY. Disguising a manual act as a machine's.
  perform pg_temp.expect_refused(
    'automation forgery: interactive caller setting automated=true', v_alice, v_tenant_a, 'technician', true);

  -- 6. UNAUTHENTICATED. No JWT at all.
  perform pg_temp.expect_refused(
    'unauthenticated caller', null, v_tenant_a, 'technician', false);

  -- 7. A STRANGER. Well-formed uuid, no membership anywhere.
  perform pg_temp.expect_refused(
    'stranger with no membership in any tenant',
    'deadbeef-0000-4000-8000-00000000dead', v_tenant_a, 'technician', false);

  -- 8. MULTI-ROLE STAFF. Carol holds owner-admin through membership_roles, not
  --    memberships.role. She MUST be allowed - this is the check that a lazy
  --    implementation reading only memberships.role would get wrong, and it is
  --    the reason the function queries both tables.
  perform pg_catalog.set_config('request.jwt.claim.sub', v_carol, true);
  v_id := public.crm_write_audit_record(
    v_tenant_a, 'lead', 'lead-2', 'status-change', 'new', 'qualified',
    'owner-admin', false, null, null);
  if v_id is null then
    raise exception 'ABUSE TEST FAILED: multi-role staff was refused a role they hold';
  end if;
  raise notice '  allowed (as required): staff using a role held via membership_roles';

  -- 9. Carol still cannot claim a role she holds in NEITHER table.
  perform pg_temp.expect_refused(
    'role forgery: multi-role staff claiming dispatcher', v_carol, v_tenant_a, 'dispatcher', false);

  raise notice 'ALL FORGERY AND CROSS-TENANT ATTACKS REFUSED';
end $$;

-- 10. THE FUNCTION MUST BE THE ONLY WAY IN. If `authenticated` can insert
--     directly, every check above is decoration.
do $$
begin
  set local role authenticated;
  perform pg_catalog.set_config('request.jwt.claim.sub', 'a11ce000-0000-4000-8000-000000000001', true);
  begin
    insert into public.audit_log (
      business_id, entity_type, entity_id, action, previous_value, new_value,
      actor_category, actor_id, automated, occurred_at)
    values (
      'aaaaaaaa-0000-4000-8000-000000000001','lead','x','forged','','',
      'owner-admin','somebody-else', true, '1999-01-01');
    raise exception 'ABUSE TEST FAILED: authenticated inserted into audit_log DIRECTLY';
  exception
    when insufficient_privilege then
      raise notice '  refused (as required): direct INSERT by authenticated';
  end;
  reset role;
end $$;

-- 11. anon must not be able to execute the function at all.
do $$
begin
  set local role anon;
  begin
    perform public.crm_write_audit_record(
      'aaaaaaaa-0000-4000-8000-000000000001','lead','x','a','','','technician',false,null,null);
    raise exception 'ABUSE TEST FAILED: anon executed the audit writer';
  exception
    when insufficient_privilege then
      raise notice '  refused (as required): anon executing the function';
  end;
  reset role;
end $$;

-- 12. Nothing forged got through: only the two legitimate rows exist, both
--     attributed to the user who actually made the call.
do $$
declare v_count int; v_bad int;
begin
  select count(*) into v_count from public.audit_log;
  if v_count <> 2 then
    raise exception 'ABUSE TEST FAILED: expected exactly 2 audit rows, found %', v_count;
  end if;
  select count(*) into v_bad from public.audit_log
   where actor_id not in ('a11ce000-0000-4000-8000-000000000001','ca201000-0000-4000-8000-000000000003')
      or automated
      or business_id <> 'aaaaaaaa-0000-4000-8000-000000000001';
  if v_bad <> 0 then
    raise exception 'ABUSE TEST FAILED: % forged or misattributed row(s) present', v_bad;
  end if;
  raise notice 'AUDIT TRAIL CLEAN: 2 rows, both correctly attributed, none forged';
end $$;
