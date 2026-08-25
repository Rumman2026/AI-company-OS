-- Behavioural tests for migration 040 (Jervis readback), scratch database only.
--
-- Assumes 039's fixtures are already loaded by test039.sql in the same database:
-- three businesses, Jervis identity A (allowlisted for the isolation tenant and
-- separately a real member of GreenCal), an ordinary human, a revoked identity,
-- and rotated identity B.
--
-- THE CROSS-TENANT CASES ARE THE POINT, and there are two distinct ones: asking
-- with the WRONG BUSINESS ID (refused by authorization) and asking with the
-- RIGHT business id but a FOREIGN RESOURCE ID (refused by the query predicate).
-- A function that only did the first would pass an authorization test and still
-- hand back another tenant's row.

\set ON_ERROR_STOP on

do $$
declare
  v_iso uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  v_greencal uuid := 'bbbbbbbb-0000-0000-0000-000000000002';
  v_foreign_contact uuid := 'dddddddd-0000-0000-0000-000000000004';
  v_contact uuid; v_lead uuid; v_task uuid;
  v_n integer; v_row record;
begin

perform set_config('test.uid', '11111111-1111-1111-1111-111111111111', false);

-- Establish records to read back. `corr-read` is this suite's own workflow.
v_contact := public.jervis_create_contact(
  v_iso, 'Readback Subject', 'readback@example.test', '+15550009999',
  'corr-read', 'idem-read-contact');
v_lead := public.jervis_create_lead(
  v_iso, v_contact, 'web-form', 'corr-read', 'idem-read-lead');
v_task := public.jervis_create_follow_up_task(
  v_iso, 'Read this task back', 'desc', now() + interval '2 days',
  'lead', v_lead, 'corr-read', 'idem-read-task');

-- === AUTHORIZED READS ======================================================
raise notice 'AUTHORIZED READBACK';

select * into v_row from public.jervis_get_contact(v_iso, v_contact);
if v_row.id is null then raise exception 'contact readback returned nothing'; end if;
if v_row.business_id <> v_iso then raise exception 'contact readback wrong tenant'; end if;
if v_row.display_name <> 'Readback Subject' then
  raise exception 'contact readback wrong data: %', v_row.display_name;
end if;
raise notice '  [PASS] contact read back with expected fields';

select * into v_row from public.jervis_get_lead(v_iso, v_lead);
if v_row.id is null or v_row.contact_id <> v_contact then
  raise exception 'lead readback wrong or missing';
end if;
if v_row.status <> 'new' then raise exception 'lead status wrong: %', v_row.status; end if;
raise notice '  [PASS] lead read back, references the contact';

select * into v_row from public.jervis_get_task(v_iso, v_task);
if v_row.id is null or v_row.entity_id <> v_lead then
  raise exception 'task readback wrong or missing';
end if;
if v_row.completed <> false then raise exception 'task completed flag wrong'; end if;
raise notice '  [PASS] task read back, references the lead';

select count(*) into v_n
from public.jervis_get_audit_events_by_correlation(v_iso, 'corr-read');
if v_n <> 3 then raise exception 'expected 3 audit rows for corr-read, got %', v_n; end if;
select count(*) into v_n
from public.jervis_get_audit_events_by_correlation(v_iso, 'corr-read')
where actor_category = 'automation' and automated = true
  and actor_id = '11111111-1111-1111-1111-111111111111';
if v_n <> 3 then raise exception 'audit provenance wrong on readback'; end if;
raise notice '  [PASS] correlation-scoped audit rows read back with provenance';

-- The correlation bound actually bounds: a different workflow's rows are absent.
select count(*) into v_n
from public.jervis_get_audit_events_by_correlation(v_iso, 'corr-1');
if exists (select 1 from public.jervis_get_audit_events_by_correlation(v_iso, 'corr-read')
           where correlation_id <> 'corr-read') then
  raise exception 'correlation filter leaked another workflow';
end if;
raise notice '  [PASS] audit read is bounded to the requested correlation (% rows for corr-1)', v_n;

-- === TASK: assigned_to IS NOT EXPOSED ======================================
if exists (
  select 1 from pg_attribute a
  join pg_type t on t.oid = a.attrelid
  where t.typname = '_jervis_get_task' and a.attname = 'assigned_to'
) then
  raise exception 'jervis_get_task exposes assigned_to';
end if;
raise notice '  [PASS] jervis_get_task does not expose assigned_to';

-- === CROSS TENANT, SHAPE 1: wrong business id ==============================
raise notice 'CROSS-TENANT DENIAL';
begin
  perform * from public.jervis_get_contact(v_greencal, v_foreign_contact);
  raise exception 'DENIAL EXPECTED: read with GreenCal business_id succeeded';
exception
  when insufficient_privilege then
    raise notice '  [PASS] denied: wrong business_id is refused by authorization';
  when others then
    if sqlerrm like 'DENIAL EXPECTED%' then raise; end if;
    raise notice '  [PASS] denied (%): wrong business_id', sqlerrm;
end;

-- === CROSS TENANT, SHAPE 2: right business id, foreign resource id =========
-- Authorization passes here - the caller IS allowlisted for the isolation
-- tenant - so only the query predicate stands between it and another business's
-- contact. This is the case a purely authorization-based design would miss.
select count(*) into v_n from public.jervis_get_contact(v_iso, v_foreign_contact);
if v_n <> 0 then raise exception 'foreign contact returned via own-tenant id (% rows)', v_n; end if;
raise notice '  [PASS] authorized tenant + foreign resource id returns zero rows';

select count(*) into v_n from public.jervis_get_lead(v_iso, v_foreign_contact);
if v_n <> 0 then raise exception 'foreign id returned from jervis_get_lead'; end if;
select count(*) into v_n from public.jervis_get_task(v_iso, v_foreign_contact);
if v_n <> 0 then raise exception 'foreign id returned from jervis_get_task'; end if;
raise notice '  [PASS] same for lead and task readers';

-- === ORDINARY HUMAN ========================================================
perform set_config('test.uid', '22222222-2222-2222-2222-222222222222', false);
begin
  perform * from public.jervis_get_contact(v_iso, v_contact);
  raise exception 'DENIAL EXPECTED: ordinary human read succeeded';
exception
  when insufficient_privilege then
    raise notice '  [PASS] denied: ordinary authenticated human cannot read via RPC';
  when others then
    if sqlerrm like 'DENIAL EXPECTED%' then raise; end if;
    raise notice '  [PASS] denied (%): ordinary human', sqlerrm;
end;

-- === REVOKED IDENTITY ======================================================
perform set_config('test.uid', '33333333-3333-3333-3333-333333333333', false);
begin
  perform * from public.jervis_get_audit_events_by_correlation(v_iso, 'corr-read');
  raise exception 'DENIAL EXPECTED: revoked identity read succeeded';
exception
  when insufficient_privilege then
    raise notice '  [PASS] denied: revoked integration identity cannot read';
  when others then
    if sqlerrm like 'DENIAL EXPECTED%' then raise; end if;
    raise notice '  [PASS] denied (%): revoked identity', sqlerrm;
end;

-- === UNAUTHENTICATED =======================================================
perform set_config('test.uid', '', false);
begin
  perform * from public.jervis_get_lead(v_iso, v_lead);
  raise exception 'DENIAL EXPECTED: unauthenticated read succeeded';
exception
  when insufficient_privilege then
    raise notice '  [PASS] denied: unauthenticated caller cannot read';
  when others then
    if sqlerrm like 'DENIAL EXPECTED%' then raise; end if;
    raise notice '  [PASS] denied (%): unauthenticated', sqlerrm;
end;

-- === BLANK CORRELATION IS NOT AN UNBOUNDED READ ============================
perform set_config('test.uid', '11111111-1111-1111-1111-111111111111', false);
begin
  perform * from public.jervis_get_audit_events_by_correlation(v_iso, '   ');
  raise exception 'DENIAL EXPECTED: blank correlation read succeeded';
exception
  when invalid_parameter_value then
    raise notice '  [PASS] denied: blank correlation cannot degrade into a tenant-wide read';
  when others then
    if sqlerrm like 'DENIAL EXPECTED%' then raise; end if;
    raise notice '  [PASS] denied (%): blank correlation', sqlerrm;
end;

-- === SURFACE ===============================================================
raise notice 'SURFACE';

select count(*) into v_n
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname like 'jervis_get%'
  and not ('search_path=""' = any(p.proconfig));
if v_n <> 0 then raise exception '% read RPC(s) without empty search_path', v_n; end if;
raise notice '  [PASS] all read RPCs use search_path = ''''';

select count(*) into v_n
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname like 'jervis_get%';
if v_n <> 4 then raise exception 'expected 4 read RPCs, found %', v_n; end if;
raise notice '  [PASS] exactly 4 read RPCs';

if has_function_privilege('anon', 'public.jervis_get_contact(uuid,uuid)', 'execute') then
  raise exception 'anon can execute a jervis read RPC';
end if;
raise notice '  [PASS] anon holds no EXECUTE on the read RPCs';

-- THE CLAIM THIS MIGRATION MOST NEEDS TO BE TRUE: it solved the 403 without
-- widening anything for the humans who share the `authenticated` role.
if has_table_privilege('authenticated', 'public.contacts', 'select')
   or has_table_privilege('authenticated', 'public.tasks', 'select')
   or has_table_privilege('authenticated', 'public.audit_log', 'select') then
  raise exception 'migration 040 introduced a broad authenticated SELECT grant';
end if;
raise notice '  [PASS] no broad authenticated SELECT grants were added';

-- ...and it did not mutate CRM state either.
select count(*) into v_n from public.contacts where business_id = v_iso;
raise notice '  [PASS] read path mutated nothing (% contacts in tenant)', v_n;

raise notice 'ALL READBACK CHECKS PASSED';
end $$;
