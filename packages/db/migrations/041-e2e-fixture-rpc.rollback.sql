-- Rollback for packages/db/migrations/041-e2e-fixture-rpc.sql.
--
-- REMOVES ONLY THE ONE FUNCTION 041 CREATED. 041 was additive: one function,
-- its revokes and one EXECUTE grant. It added no table, no column, no policy
-- and no table privilege for any role, so dropping the function is the whole
-- undo - `drop function` takes its grants with it.
--
-- IT DELETES NO ROWS, DELIBERATELY. If the fixture Contact/Lead were created by
-- a previous provisioning run, they survive this rollback. That is the safer
-- default: a rollback is run when something is wrong, and having it silently
-- delete rows in a live database - even synthetic ones, even in the isolation
-- tenant - is how a rollback becomes the incident. The fixture rows are inert;
-- they belong to the CRM Isolation Test Tenant and are visible to no other
-- business.
--
-- If the fixture rows genuinely must go, delete them deliberately, by primary
-- key, Lead first (leads.contact_id references contacts.id with no
-- ON DELETE CASCADE), each scoped to the isolation tenant:
--
--   delete from public.leads
--   where id = 'f217d64b-aeef-4a0e-8fb4-f33cedd36459'
--     and business_id = '23489f4c-aa29-46fb-b639-38024f8da89c';
--   delete from public.contacts
--   where id = '6c8fa104-14d3-5d32-8a26-91363611c351'
--     and business_id = '23489f4c-aa29-46fb-b639-38024f8da89c';
--
-- WHAT THIS COSTS. apps/admin-console's `test:e2e:tenant-isolation` suite stops
-- being able to provision its fixture and fails closed at setup with a
-- PostgREST "function not found" error, which is the intended outcome: the
-- release gate reports that it could not run, rather than appearing to pass.

begin;

drop function if exists public.e2e_provision_tenant_isolation_fixture();

commit;
