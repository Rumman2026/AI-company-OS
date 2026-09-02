-- Behavioral proof for packages/db/migrations/041-e2e-fixture-rpc.sql, against
-- a scratch database. Never Greencal-production.
--
-- Run with ON_ERROR_STOP=1: every check below raises on failure, so psql's
-- exit status is the result. See README.md in this directory for the exact
-- sequence.
--
-- WHAT IT PROVES, in order:
--   1. a first call creates both fixture rows, in the isolation tenant only;
--   2. a second identical call changes nothing (idempotent) and says so;
--   3. archiving the Lead the way the E2E suite does, then re-provisioning,
--      restores canonical state - which is what makes consecutive E2E runs
--      repeatable;
--   4. a conflicting Contact on the fixture id is refused, not overwritten;
--   5. a Lead on the fixture id pointing at another business is refused, not
--      re-parented;
--   6. a repurposed isolation-tenant business row is refused, not redirected;
--   7. `service_role` can execute the function and still cannot touch the
--      tables directly; `anon` and `authenticated` cannot execute it at all.
--
-- Check 7 is the one that cannot be replaced by reading the SQL: it is
-- Postgres, not the migration text, that decides who ended up holding what.

\set ON_ERROR_STOP on

begin;

-- ---------------------------------------------------------------------------
-- Fixtures: the isolation tenant, plus a second business to prove nothing
-- reaches it.
-- ---------------------------------------------------------------------------
insert into public.businesses (id, name, slug) values
  ('23489f4c-aa29-46fb-b639-38024f8da89c', 'CRM Isolation Test Tenant', 'crm-isolation-test-tenant'),
  ('11111111-1111-4111-8111-111111111111', 'GreenCal Pressure Washing', 'greencal-pressure-washing');

-- ---------------------------------------------------------------------------
-- 1. First call creates both rows.
-- ---------------------------------------------------------------------------
create temporary table r as
  select * from public.e2e_provision_tenant_isolation_fixture();

do $$
declare v record;
begin
  select * into v from r;
  if not v.contact_created or not v.lead_created then
    raise exception 'expected the first call to create both rows, got contact_created=% lead_created=%',
      v.contact_created, v.lead_created;
  end if;
  if v.contact_reset or v.lead_reset then
    raise exception 'nothing should have needed resetting on a fresh provision';
  end if;
  if v.business_id <> '23489f4c-aa29-46fb-b639-38024f8da89c'
     or v.contact_id <> '6c8fa104-14d3-5d32-8a26-91363611c351'
     or v.lead_id <> 'f217d64b-aeef-4a0e-8fb4-f33cedd36459'
     or v.lead_business_id <> v.business_id
     or v.lead_contact_id <> v.contact_id
     or v.lead_status <> 'new' then
    raise exception 'first call returned an unexpected fixture: %', v;
  end if;
end $$;

do $$
begin
  if (select count(*) from public.contacts) <> 1
     or (select count(*) from public.leads) <> 1 then
    raise exception 'the provisioner must create exactly one Contact and one Lead';
  end if;
  if exists (select 1 from public.contacts
             where business_id <> '23489f4c-aa29-46fb-b639-38024f8da89c')
     or exists (select 1 from public.leads
                where business_id <> '23489f4c-aa29-46fb-b639-38024f8da89c') then
    raise exception 'the provisioner wrote outside the isolation tenant';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Idempotent: a second identical call creates nothing and resets nothing.
-- ---------------------------------------------------------------------------
do $$
declare v record;
begin
  select * into v from public.e2e_provision_tenant_isolation_fixture();
  if v.contact_created or v.lead_created or v.contact_reset or v.lead_reset then
    raise exception 'second call should have been a pure no-op, got %', v;
  end if;
  if (select count(*) from public.contacts) <> 1
     or (select count(*) from public.leads) <> 1 then
    raise exception 'second call duplicated a row';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Repeatability: the E2E suite archives the Lead; provisioning restores it.
-- ---------------------------------------------------------------------------
update public.leads
set archived_at = now(), status = 'lost'
where id = 'f217d64b-aeef-4a0e-8fb4-f33cedd36459';

do $$
declare v record;
begin
  select * into v from public.e2e_provision_tenant_isolation_fixture();
  if not v.lead_reset then
    raise exception 'an archived fixture Lead must be reported as reset';
  end if;
  if v.lead_created then
    raise exception 'restoring must not create a second Lead';
  end if;
  if exists (select 1 from public.leads
             where id = 'f217d64b-aeef-4a0e-8fb4-f33cedd36459'
               and (archived_at is not null or status <> 'new')) then
    raise exception 'the fixture Lead was not restored to canonical state';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. A conflicting Contact on the fixture id is refused, never overwritten.
-- ---------------------------------------------------------------------------
update public.contacts
set display_name = 'Somebody Real'
where id = '6c8fa104-14d3-5d32-8a26-91363611c351';

do $$
begin
  perform public.e2e_provision_tenant_isolation_fixture();
  raise exception 'expected a refusal on a conflicting Contact';
exception when sqlstate '22023' then
  null;
end $$;

do $$
begin
  if not exists (select 1 from public.contacts
                 where id = '6c8fa104-14d3-5d32-8a26-91363611c351'
                   and display_name = 'Somebody Real') then
    raise exception 'the conflicting Contact was overwritten - it must be left untouched';
  end if;
end $$;

update public.contacts
set display_name = 'E2E Throwaway Contact'
where id = '6c8fa104-14d3-5d32-8a26-91363611c351';

-- ---------------------------------------------------------------------------
-- 5. A Lead on the fixture id belonging elsewhere is refused, never re-parented.
-- ---------------------------------------------------------------------------
insert into public.contacts (id, business_id, display_name)
values ('22222222-2222-4222-8222-222222222222',
        '11111111-1111-4111-8111-111111111111', 'A Real GreenCal Customer');

update public.leads
set business_id = '11111111-1111-4111-8111-111111111111',
    contact_id  = '22222222-2222-4222-8222-222222222222'
where id = 'f217d64b-aeef-4a0e-8fb4-f33cedd36459';

do $$
begin
  perform public.e2e_provision_tenant_isolation_fixture();
  raise exception 'expected a refusal on a Lead belonging to another business';
exception when sqlstate '22023' then
  null;
end $$;

do $$
begin
  if not exists (select 1 from public.leads
                 where id = 'f217d64b-aeef-4a0e-8fb4-f33cedd36459'
                   and business_id = '11111111-1111-4111-8111-111111111111') then
    raise exception 'the foreign Lead was re-parented - it must be left untouched';
  end if;
end $$;

update public.leads
set business_id = '23489f4c-aa29-46fb-b639-38024f8da89c',
    contact_id  = '6c8fa104-14d3-5d32-8a26-91363611c351'
where id = 'f217d64b-aeef-4a0e-8fb4-f33cedd36459';

-- ---------------------------------------------------------------------------
-- 6. A repurposed isolation-tenant row is refused, not redirected. Existence
--    alone is not the guard - slug and name are.
-- ---------------------------------------------------------------------------
update public.businesses
set slug = 'some-other-tenant'
where id = '23489f4c-aa29-46fb-b639-38024f8da89c';

do $$
begin
  perform public.e2e_provision_tenant_isolation_fixture();
  raise exception 'expected a refusal when the tenant slug no longer matches';
exception when sqlstate '42501' then
  null;
end $$;

update public.businesses
set slug = 'crm-isolation-test-tenant'
where id = '23489f4c-aa29-46fb-b639-38024f8da89c';

update public.businesses
set name = 'Renamed Tenant'
where id = '23489f4c-aa29-46fb-b639-38024f8da89c';

do $$
begin
  perform public.e2e_provision_tenant_isolation_fixture();
  raise exception 'expected a refusal when the tenant name no longer matches';
exception when sqlstate '42501' then
  null;
end $$;

update public.businesses
set name = 'CRM Isolation Test Tenant'
where id = '23489f4c-aa29-46fb-b639-38024f8da89c';

-- ---------------------------------------------------------------------------
-- 7. The privilege model, as Postgres actually resolved it.
-- ---------------------------------------------------------------------------
do $$
begin
  if not pg_catalog.has_function_privilege(
       'service_role', 'public.e2e_provision_tenant_isolation_fixture()', 'execute') then
    raise exception 'service_role must hold EXECUTE on the fixture function';
  end if;
  if pg_catalog.has_function_privilege(
       'anon', 'public.e2e_provision_tenant_isolation_fixture()', 'execute') then
    raise exception 'anon must NOT hold EXECUTE on the fixture function';
  end if;
  if pg_catalog.has_function_privilege(
       'authenticated', 'public.e2e_provision_tenant_isolation_fixture()', 'execute') then
    raise exception 'authenticated must NOT hold EXECUTE on the fixture function';
  end if;
end $$;

-- The other half of the claim: EXECUTE is ALL service_role got. If migration
-- 041 ever grows a table grant, these fail.
do $$
declare t text;
begin
  foreach t in array array['public.contacts', 'public.leads', 'public.businesses'] loop
    if pg_catalog.has_table_privilege('service_role', t, 'select')
       or pg_catalog.has_table_privilege('service_role', t, 'insert')
       or pg_catalog.has_table_privilege('service_role', t, 'update')
       or pg_catalog.has_table_privilege('service_role', t, 'delete') then
      raise exception 'service_role must hold no direct privilege on % - the function is the only path', t;
    end if;
  end loop;
end $$;

-- And it genuinely works as that role, through the function, with no table
-- access of its own. SECURITY DEFINER is what bridges the gap.
set local role service_role;

do $$
declare v record;
begin
  select * into v from public.e2e_provision_tenant_isolation_fixture();
  if v.lead_id <> 'f217d64b-aeef-4a0e-8fb4-f33cedd36459' then
    raise exception 'service_role call returned the wrong fixture: %', v;
  end if;
end $$;

do $$
begin
  perform 1 from public.contacts;
  raise exception 'service_role should not be able to read public.contacts directly';
exception when insufficient_privilege then
  null;
end $$;

reset role;

-- Nothing is committed: this script proves behavior, it does not leave state.
rollback;

\echo 'migration 041: all checks passed'
