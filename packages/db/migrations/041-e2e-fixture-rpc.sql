-- The E2E cross-tenant-isolation fixture provisioner: ONE no-argument
-- SECURITY DEFINER function that owns its fixture constants. See DECISIONS.md
-- ADR-0042.
--
-- WHY THIS EXISTS AT ALL. apps/admin-console's release-gating
-- tenant-isolation E2E suite needs one throwaway Contact and one throwaway
-- Lead to exist inside the CRM Isolation Test Tenant, so it can prove that
-- Tenant B sees its own row and none of Tenant A's. Until now the suite created
-- those rows itself, through the service-role key, with direct
-- `insert into contacts` / `insert into leads` calls. That only works if
-- `service_role` holds INSERT on those tables, and on this project it
-- deliberately does not.
--
-- WHY NOT JUST GRANT service_role THE TABLE PRIVILEGES. Because the grant is
-- permanent, unscoped, and invisible at the call site. `grant insert on
-- contacts, leads to service_role` does not say "for the isolation fixture" -
-- it says "for anything, in any business, forever", and every future holder of
-- the secret key inherits it. The blast radius of a grant is every row in every
-- tenant; the blast radius of a function is its body. This is the same argument
-- migration 039 makes for the Jervis write path, applied to a much smaller
-- problem, and it lands harder here: the caller is a TEST.
--
-- WHY NO ARGUMENTS. A `e2e_provision_fixture(p_business_id, p_contact_id, ...)`
-- would be a general-purpose row writer wearing a test-shaped name, and the
-- authorization story would reduce to "we trust the caller to pass the right
-- UUIDs". This function takes nothing. Every id, the tenant slug, the tenant
-- name, the contact identity and the lead's shape are constants in the DECLARE
-- block below. There is no argument an attacker (or a careless test edit) can
-- supply to make it touch a different business, a different contact, or a
-- different lead. Non-generalizable is the security property.
--
-- WHY NO DYNAMIC SQL. Every statement below is static, fully schema-qualified
-- text. There is no `execute`, no `format()`, no `quote_ident` - so there is no
-- construction step in which a value could become an identifier. Combined with
-- `search_path = ''` (nothing resolves by search; an attacker who can create
-- objects on some schema cannot shadow a table this code reads), what the
-- function calls is exactly what is written here.
--
-- SECURITY DEFINER IS NOT AUTHORIZATION. It only means "run as the owner" - it
-- is what lets this function reach `public.contacts` and `public.leads`, which
-- `service_role` has no grant on. Who may call it is decided entirely by the
-- EXECUTE grant at the bottom of this file: revoked from `public`, `anon` and
-- `authenticated`, granted to `service_role` alone. Unlike migration 039's
-- RPCs - where every Supabase Auth user shares the `authenticated` role, so
-- per-identity checks had to move inside the body - the caller here IS a
-- distinct Postgres role, so "grant execute to exactly that role" is
-- expressible and is used. Supabase's Security Advisor will flag this as
-- privileged API surface and that flag is correct.
--
-- FAIL CLOSED ON EVERY CONFLICT. The function refuses, loudly, rather than
-- repairing anything it did not create:
--   * the business id must exist AND its slug AND name must match the expected
--     synthetic tenant - three independent checks, so renaming or repointing
--     that row stops this function rather than redirecting it;
--   * if the fixed Contact id already belongs to a row whose business, name,
--     email or phone differ from the fixture, it raises - it never overwrites;
--   * if the fixed Lead id already belongs to a row pointing at a different
--     business or a different contact, it raises - it never re-parents.
-- It writes exactly two rows, both addressed by primary key, both inside the
-- isolation tenant. No statement in this file can reach a row belonging to
-- GreenCal, Navarro, or any other business.
--
-- IDEMPOTENT, INCLUDING THE PARTS THE E2E RUN CHANGES. `insert .. on conflict
-- (id) do nothing` makes creation safe to repeat, and the identity check then
-- runs against the row that is actually there - whether this call created it or
-- a previous one did. Two fields are additionally RESET to their canonical
-- values on every call: `leads.archived_at`/`leads.status`, and
-- `contacts.archived_at`. This is deliberate and is the one place this function
-- writes to a row it did not create. The E2E suite's own last step ARCHIVES the
-- fixture lead (that is the functional check it exists to perform), so without
-- the reset the second consecutive run would find an archived lead, which the
-- list page correctly hides, and the suite would fail for a reason that has
-- nothing to do with tenant isolation. Identity is never reset - only
-- lifecycle state, only on these two rows, addressed by primary key.
--
-- WHAT IT RETURNS. The fixture's own ids and the identity fields this file
-- already hard-codes, plus four booleans saying what this call did. Nothing
-- else - no key, no token, no row from any other tenant, and no column
-- (`auth.users` ids, other contacts) the caller has no use for.
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE. Additive only: one new
-- function and its grants. No existing table, column, policy or grant is
-- altered, and nothing here grants any table privilege to any role. Applying
-- this migration writes NO rows - the fixture rows are created the first time
-- the function is CALLED, which only the E2E provisioner does, and only under
-- E2E_ALLOW_FIXTURE_MUTATION=true (see
-- apps/admin-console/tests/e2e/fixture-provisioner.ts).
--
-- `create function` WITHOUT `or replace`, per migration 039's convention: if a
-- function of this name already exists, this migration aborts and an operator
-- investigates, rather than silently overwriting something unexpected in a
-- production database. Recovering from a genuine partial apply is
-- 041-e2e-fixture-rpc.rollback.sql's job.
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/040-jervis-read-rpcs.sql.

begin;

create function public.e2e_provision_tenant_isolation_fixture()
returns table (
  business_id          uuid,
  business_slug        text,
  business_name        text,
  contact_id           uuid,
  contact_display_name text,
  contact_email        text,
  contact_phone        text,
  lead_id              uuid,
  lead_business_id     uuid,
  lead_contact_id      uuid,
  lead_status          text,
  contact_created      boolean,
  lead_created         boolean,
  contact_reset        boolean,
  lead_reset           boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- ---------------------------------------------------------------------
  -- THE FIXTURE. These are the function's authorization boundary, not its
  -- configuration. Changing any of them is a migration, reviewed as one.
  -- ---------------------------------------------------------------------
  c_business_id    constant uuid := '23489f4c-aa29-46fb-b639-38024f8da89c';
  c_business_slug  constant text := 'crm-isolation-test-tenant';
  c_business_name  constant text := 'CRM Isolation Test Tenant';

  c_contact_id     constant uuid := '6c8fa104-14d3-5d32-8a26-91363611c351';
  c_contact_name   constant text := 'E2E Throwaway Contact';
  c_contact_email  constant text := 'e2e-throwaway-contact@example.com';
  c_contact_phone  constant text := '+15550000000';

  c_lead_id        constant uuid := 'f217d64b-aeef-4a0e-8fb4-f33cedd36459';
  c_lead_status    constant text := 'new';
  -- Fixed, not now(): a value that changes per call is not a fixture, and
  -- would make "did this call change anything?" unanswerable.
  c_lead_attribution constant jsonb :=
    '{"channel": "unknown", "leadCreatedAt": "2026-01-01T00:00:00.000Z"}'::jsonb;

  v_slug   text;
  v_name   text;
  v_rows   integer;

  v_c_business_id uuid;
  v_c_name        text;
  v_c_email       text;
  v_c_phone       text;

  v_l_business_id uuid;
  v_l_contact_id  uuid;

  v_contact_created boolean := false;
  v_lead_created    boolean := false;
  v_contact_reset   boolean := false;
  v_lead_reset      boolean := false;
begin
  -- -----------------------------------------------------------------------
  -- 1. The tenant guard. Runs first, before anything is written.
  -- -----------------------------------------------------------------------
  --
  -- THREE CHECKS, NOT ONE. Existence alone would let this function keep
  -- writing if that id were ever reassigned; slug and name are what pin it to
  -- the synthetic isolation tenant specifically. If the row is gone or has
  -- been repurposed, the correct outcome is a refusal, not a redirect.
  select b.slug, b.name into v_slug, v_name
  from public.businesses b
  where b.id = c_business_id;

  if not found then
    raise exception
      'e2e fixture: the isolation-test business % does not exist - refusing to provision',
      c_business_id using errcode = '42501';
  end if;

  if v_slug is distinct from c_business_slug or v_name is distinct from c_business_name then
    raise exception
      'e2e fixture: business % is not the expected synthetic isolation tenant (slug/name mismatch) - refusing to write to any other business',
      c_business_id using errcode = '42501';
  end if;

  -- -----------------------------------------------------------------------
  -- 2-5. The Contact.
  -- -----------------------------------------------------------------------
  --
  -- Create-if-absent, then verify unconditionally. `on conflict (id) do
  -- nothing` is what makes a repeat call - or a concurrent one - a no-op
  -- instead of a unique-violation, and the verification below then runs
  -- against whatever row is actually present, whether this call inserted it or
  -- not. A row this function did NOT create, sitting on the fixture id with
  -- different data, reaches the raise.
  insert into public.contacts (id, business_id, display_name, phone, email)
  values (c_contact_id, c_business_id, c_contact_name, c_contact_phone, c_contact_email)
  on conflict (id) do nothing;

  get diagnostics v_rows = row_count;
  v_contact_created := v_rows > 0;

  select c.business_id, c.display_name, c.email, c.phone
    into v_c_business_id, v_c_name, v_c_email, v_c_phone
  from public.contacts c
  where c.id = c_contact_id;

  if not found then
    raise exception
      'e2e fixture: Contact % is absent immediately after provisioning - refusing to proceed',
      c_contact_id using errcode = '55000';
  end if;

  if v_c_business_id is distinct from c_business_id
     or v_c_name is distinct from c_contact_name
     or v_c_email is distinct from c_contact_email
     or v_c_phone is distinct from c_contact_phone then
    raise exception
      'e2e fixture: Contact % already exists with conflicting data - refusing to overwrite a row this fixture does not own',
      c_contact_id using errcode = '22023';
  end if;

  -- Lifecycle state only, addressed by primary key AND tenant. Identity was
  -- proven to match immediately above; nothing here can alter it.
  --
  -- ALIASED, AND EVERY COLUMN QUALIFIED. `returns table` makes
  -- `business_id`/`contact_id` plpgsql OUT variables, so a bare
  -- `where business_id = ...` here would be an ambiguous column reference and
  -- this function would fail at runtime, not at create time. The alias is what
  -- keeps these references columns.
  update public.contacts as c
  set archived_at = null
  where c.id = c_contact_id
    and c.business_id = c_business_id
    and c.archived_at is not null;

  get diagnostics v_rows = row_count;
  v_contact_reset := v_rows > 0;

  -- -----------------------------------------------------------------------
  -- 6-9. The Lead.
  -- -----------------------------------------------------------------------
  --
  -- Reached only after the Contact above is confirmed to be the fixture
  -- Contact in the fixture tenant, so `contact_id` below can never point at
  -- another tenant's contact.
  insert into public.leads (id, business_id, contact_id, status, attribution)
  values (c_lead_id, c_business_id, c_contact_id, c_lead_status, c_lead_attribution)
  on conflict (id) do nothing;

  get diagnostics v_rows = row_count;
  v_lead_created := v_rows > 0;

  select l.business_id, l.contact_id
    into v_l_business_id, v_l_contact_id
  from public.leads l
  where l.id = c_lead_id;

  if not found then
    raise exception
      'e2e fixture: Lead % is absent immediately after provisioning - refusing to proceed',
      c_lead_id using errcode = '55000';
  end if;

  if v_l_business_id is distinct from c_business_id
     or v_l_contact_id is distinct from c_contact_id then
    raise exception
      'e2e fixture: Lead % already exists against a different business/contact - refusing to re-parent a row this fixture does not own',
      c_lead_id using errcode = '22023';
  end if;

  -- The reset the E2E suite's own archive step makes necessary - see the
  -- IDEMPOTENT note in this file's header. Scoped by primary key, tenant AND
  -- contact, and it writes nothing when the row is already canonical.
  update public.leads as l
  set status = c_lead_status,
      archived_at = null
  where l.id = c_lead_id
    and l.business_id = c_business_id
    and l.contact_id = c_contact_id
    and (l.status is distinct from c_lead_status or l.archived_at is not null);

  get diagnostics v_rows = row_count;
  v_lead_reset := v_rows > 0;

  -- -----------------------------------------------------------------------
  -- 16. Return the verification record. Constants and booleans only.
  -- -----------------------------------------------------------------------
  business_id          := c_business_id;
  business_slug        := v_slug;
  business_name        := v_name;
  contact_id           := c_contact_id;
  contact_display_name := c_contact_name;
  contact_email        := c_contact_email;
  contact_phone        := c_contact_phone;
  lead_id              := c_lead_id;
  lead_business_id     := v_l_business_id;
  lead_contact_id      := v_l_contact_id;
  lead_status          := c_lead_status;
  contact_created      := v_contact_created;
  lead_created         := v_lead_created;
  contact_reset        := v_contact_reset;
  lead_reset           := v_lead_reset;
  return next;
end;
$$;

-- ---------------------------------------------------------------------------
-- The privilege model. This block, not SECURITY DEFINER, is who may call it.
-- ---------------------------------------------------------------------------
--
-- `from public` removes the EXECUTE that Postgres grants to PUBLIC by default
-- on every new function. `anon` and `authenticated` are then revoked
-- explicitly - redundant while they hold nothing beyond PUBLIC, and the point
-- is that it stays true if that ever changes. Without these, a signed-in CRM
-- user (or an anonymous caller) could invoke this over the Data API, since the
-- function lives in the exposed `public` schema.
revoke all on function public.e2e_provision_tenant_isolation_fixture() from public;
revoke all on function public.e2e_provision_tenant_isolation_fixture() from anon;
revoke all on function public.e2e_provision_tenant_isolation_fixture() from authenticated;

-- The only grant in this migration, and it is EXECUTE on one function. There
-- is deliberately no `grant select/insert/update/delete on ... to service_role`
-- anywhere in this file: the whole point is that the test path gains exactly
-- this one capability and no table access.
grant execute on function public.e2e_provision_tenant_isolation_fixture() to service_role;

comment on function public.e2e_provision_tenant_isolation_fixture() is
  'Provisions and verifies the single synthetic Contact/Lead fixture used by apps/admin-console''s cross-tenant isolation E2E suite, inside the CRM Isolation Test Tenant only - see DECISIONS.md ADR-0042. Takes no arguments: every id, the tenant slug/name and the contact identity are constants in the body, so it cannot be aimed at another business, contact or lead. Idempotent; fails closed on any identity conflict. EXECUTE is granted to service_role alone - never anon or authenticated - and this migration grants no table privileges to any role.';

commit;
