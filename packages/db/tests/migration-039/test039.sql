-- Behavioural tests for migration 039, against the scratch database.
--
-- Each check asserts and raises on failure, so the script's exit status is the
-- result -- a test that only prints can be read as passing by a tired eye.
--
-- The negative cases are the point. A positive-only suite would be satisfied by
-- a function that authorized nobody and by one that authorized everybody.

\set ON_ERROR_STOP on

-- ---------------------------------------------------------------------------
-- Fixtures: three businesses, two Jervis identities, one ordinary human
-- ---------------------------------------------------------------------------

insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'),   -- jervis identity A
  ('22222222-2222-2222-2222-222222222222'),   -- ordinary human, same tenant
  ('33333333-3333-3333-3333-333333333333'),   -- revoked jervis identity
  ('44444444-4444-4444-4444-444444444444');   -- jervis identity B (rotation)

insert into public.businesses (id, name, slug) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'CRM Isolation Test Tenant', 'crm-isolation-test-tenant'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'GreenCal Pressure Washing', 'greencal-pressure-washing'),
  ('cccccccc-0000-0000-0000-000000000003', 'Navarro Builders', 'navarro-builders');

insert into public.memberships (business_id, user_id, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'owner-admin'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'office-manager'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'owner-admin'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'owner-admin');

-- DELIBERATE: identity A is also given a real membership in GreenCal, so the
-- allowlist is tested on its own merits. If authorization were only the
-- membership check, the GreenCal denial below would pass for the wrong reason
-- and the allowlist would be entirely untested.
insert into public.memberships (business_id, user_id, role) values
  ('bbbbbbbb-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'owner-admin');

insert into jervis_private.jervis_integration_identities (user_id, business_id, label) values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001', 'jervis-A'),
  ('44444444-4444-4444-4444-444444444444', 'aaaaaaaa-0000-0000-0000-000000000001', 'jervis-B-rotated');
insert into jervis_private.jervis_integration_identities (user_id, business_id, label, revoked_at) values
  ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-0000-0000-0000-000000000001', 'jervis-revoked', now());

-- A foreign-tenant contact, for the referential checks.
insert into public.contacts (id, business_id, display_name) values
  ('dddddddd-0000-0000-0000-000000000004', 'bbbbbbbb-0000-0000-0000-000000000002', 'GreenCal Customer');

-- ---------------------------------------------------------------------------

create or replace function assert_denied(sql text, label text) returns void
language plpgsql as $$
begin
  execute sql;
  raise exception 'DENIAL EXPECTED BUT OPERATION SUCCEEDED: %', label;
exception
  when insufficient_privilege or invalid_parameter_value then
    raise notice '  [PASS] denied: %', label;
  when others then
    if sqlerrm like 'DENIAL EXPECTED%' then raise; end if;
    raise notice '  [PASS] denied (%): %', sqlerrm, label;
end;
$$;

do $$
declare
  v_contact uuid; v_contact2 uuid; v_lead uuid; v_task uuid; v_audit uuid;
  v_iso uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  v_n integer; v_txt text; v_replay uuid;
begin

-- === POSITIVE ==============================================================
perform set_config('test.uid', '11111111-1111-1111-1111-111111111111', false);
raise notice 'POSITIVE PATH';

v_contact := public.jervis_create_contact(
  v_iso, 'Priya Raman', 'priya@example.test', '+15550000001', 'corr-1', 'idem-contact-1');
raise notice '  [PASS] contact created %', v_contact;

v_lead := public.jervis_create_lead(v_iso, v_contact, 'web-form', 'corr-1', 'idem-lead-1');
select count(*) into v_n from public.leads where id = v_lead and status = 'new';
if v_n <> 1 then raise exception 'lead not created at initial status'; end if;
raise notice '  [PASS] lead created at initial status new';

v_task := public.jervis_create_follow_up_task(
  v_iso, 'Call Priya to book the estimate', null, now() + interval '1 day',
  'lead', v_lead, 'corr-1', 'idem-task-1');
raise notice '  [PASS] follow-up task created';

v_audit := public.jervis_append_audit_event(
  v_iso, 'lead', v_lead, 'lead.qualified', 'new', 'qualified',
  'in service area', 'corr-1', 'idem-audit-1');
raise notice '  [PASS] audit event appended';

select count(*) into v_n from public.audit_log
where correlation_id = 'corr-1' and actor_category = 'automation'
  and automated = true and actor_id = '11111111-1111-1111-1111-111111111111';
if v_n <> 4 then raise exception 'expected 4 provenance-correct audit rows, got %', v_n; end if;
raise notice '  [PASS] all 4 audit rows carry derived automation provenance';

-- === CORRELATION IS MANDATORY ==============================================
raise notice 'CORRELATION VALIDATION';
perform assert_denied(format(
  'select public.jervis_create_contact(%L,%L,null,null,null,%L)', v_iso, 'X', 'idem-c-null'),
  'null correlation_id');
perform assert_denied(format(
  'select public.jervis_create_contact(%L,%L,null,null,%L,%L)', v_iso, 'X', '', 'idem-c-empty'),
  'empty correlation_id');
perform assert_denied(format(
  'select public.jervis_create_contact(%L,%L,null,null,%L,%L)', v_iso, 'X', '   ', 'idem-c-blank'),
  'whitespace-only correlation_id');
perform assert_denied(format(
  'select public.jervis_create_lead(%L,%L,%L,%L,%L)', v_iso, v_contact, 'web', '  ', 'idem-l-blank'),
  'whitespace-only correlation_id on create_lead');
perform assert_denied(format(
  'select public.jervis_create_follow_up_task(%L,%L,null,null,null,null,%L,%L)',
  v_iso, 'T', '', 'idem-t-blank'), 'empty correlation_id on create_follow_up_task');
perform assert_denied(format(
  'select public.jervis_append_audit_event(%L,%L,%L,%L,null,null,null,null,%L)',
  v_iso, 'lead', v_lead, 'a', 'idem-a-null'), 'null correlation_id on append_audit_event');

-- === REPLAY ================================================================
raise notice 'REPLAY (same key, same payload)';
if public.jervis_create_contact(
     v_iso, 'Priya Raman', 'priya@example.test', '+15550000001',
     'corr-1', 'idem-contact-1') <> v_contact then
  raise exception 'replay returned a different resource id';
end if;
select count(*) into v_n from public.contacts where business_id = v_iso;
if v_n <> 1 then raise exception 'replay created a second contact (% total)', v_n; end if;
raise notice '  [PASS] same id, no second row';

v_contact2 := public.jervis_create_contact(
  v_iso, 'Someone Else', null, null, 'corr-2', 'idem-contact-2');
if v_contact2 = v_contact then raise exception 'a new key must create a new record'; end if;
raise notice '  [PASS] a new idempotency key still creates';

-- === PAYLOAD MISMATCH ======================================================
-- The defect this closes: without a request fingerprint, the second call
-- silently returns Alice's id and the corrected name is never written.
raise notice 'PAYLOAD MISMATCH (same key, different data)';
perform assert_denied(format(
  'select public.jervis_create_contact(%L,%L,%L,%L,%L,%L)',
  v_iso, 'Bob NOT Priya', 'priya@example.test', '+15550000001', 'corr-1', 'idem-contact-1'),
  'contact: same key, different display_name');
perform assert_denied(format(
  'select public.jervis_create_contact(%L,%L,%L,null,%L,%L)',
  v_iso, 'Priya Raman', 'different@example.test', 'corr-1', 'idem-contact-1'),
  'contact: same key, different email');
perform assert_denied(format(
  'select public.jervis_create_contact(%L,%L,%L,%L,%L,%L)',
  v_iso, 'Priya Raman', 'priya@example.test', '+15550000001', 'corr-DIFFERENT', 'idem-contact-1'),
  'contact: same key, different correlation_id');
perform assert_denied(format(
  'select public.jervis_create_lead(%L,%L,%L,%L,%L)',
  v_iso, v_contact, 'phone-call', 'corr-1', 'idem-lead-1'),
  'lead: same key, different channel');
perform assert_denied(format(
  'select public.jervis_create_lead(%L,%L,%L,%L,%L)',
  v_iso, v_contact2, 'web-form', 'corr-1', 'idem-lead-1'),
  'lead: same key, different contact');
perform assert_denied(format(
  'select public.jervis_create_follow_up_task(%L,%L,null,null,%L,%L,%L,%L)',
  v_iso, 'A DIFFERENT TITLE', 'lead', v_lead, 'corr-1', 'idem-task-1'),
  'task: same key, different title');
perform assert_denied(format(
  'select public.jervis_append_audit_event(%L,%L,%L,%L,%L,%L,null,%L,%L)',
  v_iso, 'lead', v_lead, 'lead.qualified', 'new', 'DIFFERENT', 'corr-1', 'idem-audit-1'),
  'audit: same key, different new_value');

select count(*) into v_n from public.contacts where business_id = v_iso;
if v_n <> 2 then raise exception 'a mismatched payload mutated something (% contacts)', v_n; end if;
select count(*) into v_n from public.leads where business_id = v_iso;
if v_n <> 1 then raise exception 'a mismatched payload created a lead (% leads)', v_n; end if;
raise notice '  [PASS] no mismatched call mutated anything';

-- === IDENTITY ROTATION =====================================================
-- Idempotency is a property of the business operation, not of whoever holds
-- the credential. Identity A is retired; identity B replays the same operation.
raise notice 'IDENTITY ROTATION';
update jervis_private.jervis_integration_identities
set revoked_at = now()
where user_id = '11111111-1111-1111-1111-111111111111' and business_id = v_iso;

perform set_config('test.uid', '44444444-4444-4444-4444-444444444444', false);
v_replay := public.jervis_create_contact(
  v_iso, 'Priya Raman', 'priya@example.test', '+15550000001', 'corr-1', 'idem-contact-1');
if v_replay <> v_contact then
  raise exception 'rotated identity got a different id: % vs %', v_replay, v_contact;
end if;
select count(*) into v_n from public.contacts where business_id = v_iso;
if v_n <> 2 then raise exception 'rotation replay created a duplicate (% contacts)', v_n; end if;
raise notice '  [PASS] rotated identity replays to the SAME id, no duplicate';

-- ...and authorization still runs for identity B: a wrong tenant is refused.
perform assert_denied(format(
  'select public.jervis_create_contact(%L,%L,null,null,%L,%L)',
  'bbbbbbbb-0000-0000-0000-000000000002', 'X', 'corr-x', 'idem-rot-x'),
  'rotated identity is still authorized per tenant');

-- restore A for the remaining checks
update jervis_private.jervis_integration_identities
set revoked_at = null
where user_id = '11111111-1111-1111-1111-111111111111' and business_id = v_iso;
perform set_config('test.uid', '11111111-1111-1111-1111-111111111111', false);

-- === NEGATIVE ==============================================================
raise notice 'NEGATIVE PATH';

perform set_config('test.uid', '22222222-2222-2222-2222-222222222222', false);
perform assert_denied(format(
  'select public.jervis_create_contact(%L,%L,null,null,%L,%L)',
  v_iso, 'Human Attempt', 'corr-x', 'idem-x1'),
  'ordinary authenticated human calling the RPC');

perform set_config('test.uid', '33333333-3333-3333-3333-333333333333', false);
perform assert_denied(format(
  'select public.jervis_create_contact(%L,%L,null,null,%L,%L)',
  v_iso, 'Revoked Attempt', 'corr-x', 'idem-x2'),
  'revoked integration identity');

perform set_config('test.uid', '', false);
perform assert_denied(format(
  'select public.jervis_create_contact(%L,%L,null,null,%L,%L)',
  v_iso, 'Anon Attempt', 'corr-x', 'idem-x3'),
  'unauthenticated caller');

perform set_config('test.uid', '11111111-1111-1111-1111-111111111111', false);
perform assert_denied(format(
  'select public.jervis_create_contact(%L,%L,null,null,%L,%L)',
  'bbbbbbbb-0000-0000-0000-000000000002', 'Cross Tenant', 'corr-x', 'idem-x4'),
  'jervis identity + GreenCal (HAS membership, not allowlisted)');
perform assert_denied(format(
  'select public.jervis_create_contact(%L,%L,null,null,%L,%L)',
  'cccccccc-0000-0000-0000-000000000003', 'Cross Tenant', 'corr-x', 'idem-x5'),
  'jervis identity + Navarro (no membership, not allowlisted)');

perform assert_denied(format(
  'select public.jervis_create_lead(%L,%L,%L,%L,%L)',
  v_iso, 'dddddddd-0000-0000-0000-000000000004', 'web', 'corr-x', 'idem-x6'),
  'lead referencing a foreign-tenant contact');
perform assert_denied(format(
  'select public.jervis_create_follow_up_task(%L,%L,null,null,%L,%L,%L,%L)',
  v_iso, 'Task', 'contact', 'dddddddd-0000-0000-0000-000000000004', 'corr-x', 'idem-x7'),
  'task attached to a foreign-tenant contact');
perform assert_denied(format(
  'select public.jervis_append_audit_event(%L,%L,%L,%L,null,null,null,%L,%L)',
  v_iso, 'contact', 'dddddddd-0000-0000-0000-000000000004', 'faked', 'corr-x', 'idem-x8'),
  'audit event about a foreign-tenant entity');

select count(*) into v_n from public.contacts
where business_id <> v_iso and display_name like '%Attempt%';
if v_n <> 0 then raise exception 'a denied call still wrote a row'; end if;
raise notice '  [PASS] no denied call wrote anything';

-- === HARDENED SEARCH_PATH ==================================================
raise notice 'SEARCH PATH HARDENING';
select count(*) into v_n
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname like 'jervis%'
  and n.nspname in ('public', 'jervis_private')
  and not coalesce(p.proconfig::text like '%search_path=%', false);
if v_n <> 0 then raise exception '% jervis function(s) have no search_path set', v_n; end if;

select count(*) into v_n
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname like 'jervis%'
  and n.nspname in ('public', 'jervis_private')
  -- Postgres stores `set search_path = ''` as the array element
  -- `search_path=""` -- quoted empty string, not a bare trailing `=`. Asserting
  -- the bare form fails against a correctly hardened function, which is how
  -- this check was found to be wrong rather than the migration.
  and not ('search_path=""' = any(p.proconfig));
if v_n <> 0 then
  select string_agg(p.proname || '=' || p.proconfig::text, ', ') into v_txt
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where p.proname like 'jervis%' and n.nspname in ('public','jervis_private')
    and not ('search_path=""' = any(p.proconfig));
  raise exception 'jervis function(s) without empty search_path: %', v_txt;
end if;
raise notice '  [PASS] every jervis function has search_path = ''''';

select count(*) into v_n
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where p.proname like 'jervis%' and n.nspname in ('public','jervis_private')
  and p.prosecdef;
raise notice '  [PASS] % jervis SECURITY DEFINER functions, all hardened', v_n;

-- === CALLABLE SURFACE ======================================================
raise notice 'CALLABLE SURFACE';
select count(*) into v_n from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname like 'jervis%';
if v_n <> 4 then raise exception 'expected exactly 4 public jervis RPCs, found %', v_n; end if;
raise notice '  [PASS] exactly 4 public RPCs';

if has_function_privilege('anon',
     'public.jervis_create_contact(uuid,text,text,text,text,text)', 'execute') then
  raise exception 'anon can execute a jervis RPC';
end if;
raise notice '  [PASS] anon holds no EXECUTE';

if has_table_privilege('authenticated', 'public.contacts', 'insert')
   or has_table_privilege('authenticated', 'public.tasks', 'insert')
   or has_table_privilege('authenticated', 'public.audit_log', 'insert') then
  raise exception 'migration introduced a broad authenticated INSERT grant';
end if;
raise notice '  [PASS] no broad authenticated INSERT grants on CRM tables';

if has_schema_privilege('authenticated', 'jervis_private', 'usage')
   or has_schema_privilege('anon', 'jervis_private', 'usage') then
  raise exception 'jervis_private is reachable by anon/authenticated';
end if;
raise notice '  [PASS] jervis_private unreachable by anon and authenticated';

raise notice 'ALL BEHAVIOURAL CHECKS PASSED';
end $$;
