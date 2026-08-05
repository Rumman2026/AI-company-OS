-- Fixes a real production incident found during the GreenCal V1.0
-- smoke test: "Create booking + job" (Lead detail page) failed with
-- Postgres 42501, "permission denied for table bookings." Both
-- bookings and jobs are fixed in the same migration because the same
-- button/API route creates a Booking then immediately creates its
-- Job and attempts a best-effort status transition - the same class
-- of missing-grant gap already confirmed for leads (migration 030)
-- and estimates (migration 032) would block the very next step of
-- this same action even if only bookings were fixed now.
--
-- This migration does not modify migrations 003 (bookings/jobs table
-- and original policy definitions). It idempotently reasserts the
-- same tenant-scoped SELECT/INSERT/UPDATE policies migration 003
-- originally specified for both tables, and separately grants exactly
-- the base privileges `apps/admin-console`'s authenticated session
-- exercises: SELECT (list/get), INSERT (create), UPDATE
-- (BookingRepository.linkJob(), JobRepository's status transitions).
-- No DELETE - no code path deletes a Booking or Job. `service_role`
-- is untouched.
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE - policies
-- restored to their original migration-003 definitions, plus
-- additive GRANTs. Does not disable or broaden RLS.
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/032-estimates-update-policy-and-grants-recovery.sql.

drop policy if exists bookings_tenant_select on bookings;
create policy bookings_tenant_select on bookings
  for select to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()));

drop policy if exists bookings_tenant_insert on bookings;
create policy bookings_tenant_insert on bookings
  for insert to authenticated
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));

drop policy if exists bookings_tenant_update on bookings;
create policy bookings_tenant_update on bookings
  for update to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()))
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));

drop policy if exists jobs_tenant_select on jobs;
create policy jobs_tenant_select on jobs
  for select to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()));

drop policy if exists jobs_tenant_insert on jobs;
create policy jobs_tenant_insert on jobs
  for insert to authenticated
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));

drop policy if exists jobs_tenant_update on jobs;
create policy jobs_tenant_update on jobs
  for update to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()))
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));

grant select, insert, update on public.bookings to authenticated;
grant select, insert, update on public.jobs to authenticated;

notify pgrst, 'reload schema';
