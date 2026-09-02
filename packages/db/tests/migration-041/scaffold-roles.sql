-- Addendum to ../migration-039/scaffold.sql for migration 041.
--
-- 039's scaffold already reproduces `public.businesses`, `public.contacts` and
-- `public.leads` faithfully (columns, types, null-ness, the leads_status_check
-- constraint) - 041 touches nothing else, so it is reused rather than copied.
-- What 039's scaffold does not need, and 041 does, is the three Supabase roles:
-- 041's entire authorization story is which of them holds EXECUTE, and that
-- cannot be asserted against roles that do not exist.
--
-- `nologin` because nothing here authenticates; these exist to be granted to
-- and revoked from, and to be switched into with SET ROLE.

do $$
begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
end $$;

-- Mirrors Supabase: these roles can see the `public` schema, and hold no
-- privilege on the CRM tables. This is the state migration 041 exists because
-- of - `service_role` cannot read or write contacts/leads directly here, so if
-- the function body were removed the tests below would fail for the same
-- reason production does.
grant usage on schema public to anon, authenticated, service_role;
revoke all on public.businesses from anon, authenticated, service_role;
revoke all on public.contacts   from anon, authenticated, service_role;
revoke all on public.leads      from anon, authenticated, service_role;
