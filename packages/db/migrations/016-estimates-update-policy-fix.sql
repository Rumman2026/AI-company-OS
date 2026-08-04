-- Fixes a real gap: estimates never got a tenant-scoped UPDATE RLS
-- policy, even though EstimateRepository.approveEstimate()
-- (migrations/010-estimate-approval.sql, ADR-0021) and
-- EstimateRepository.setEstimatePricing()
-- (migrations/014-estimate-pricing.sql, ADR-0027) both call
-- client.from('estimates').update(...). Every other table with an
-- update-capable repository method already has this policy -
-- contacts/leads (migrations/002-multi-tenant-foundation.sql),
-- bookings/jobs (migrations/003-job-pipeline-foundation.sql),
-- companies (migrations/004-company-foundation.sql), tasks
-- (migrations/006-task-foundation.sql), service_packages
-- (migrations/013-estimate-line-items.sql) - estimates was missed.
-- Without this policy, approveEstimate() and setEstimatePricing()
-- silently update zero rows against real RLS-enforced Postgres (the
-- local fake-supabase test double used by packages/db's unit tests
-- does not enforce RLS, so this gap was invisible to local tests).
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE - one new policy.
-- No existing table, column, or row is altered.
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/015-estimate-attachments.sql.

drop policy if exists estimates_tenant_update on estimates;
create policy estimates_tenant_update on estimates
  for update to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()))
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));
