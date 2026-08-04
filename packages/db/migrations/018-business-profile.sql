-- Business profile fields - closes "Company profile / Business
-- information" from the owner's Settings directive. See DECISIONS.md
-- ADR-0031. `businesses` (migrations/002-multi-tenant-foundation.sql,
-- ADR-0010) has only ever had id/name/slug/created_at - this adds the
-- address/contact fields a real business profile needs.
--
-- Also adds the tenant-scoped UPDATE policy `businesses` was missing -
-- it has only ever had a SELECT policy (businesses_member_select), so
-- no team member could update their own business's profile before now.
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE - seven additive,
-- nullable columns and one new policy. No existing row is altered.
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/017-estimate-customer-approval.sql.

alter table businesses add column if not exists address text;
alter table businesses add column if not exists city text;
alter table businesses add column if not exists state text;
alter table businesses add column if not exists postal_code text;
alter table businesses add column if not exists phone text;
alter table businesses add column if not exists email text;
alter table businesses add column if not exists website text;

comment on column businesses.address is 'Street address - see DECISIONS.md ADR-0031. Nullable: not every tenant has entered one yet.';

drop policy if exists businesses_tenant_update on businesses;
create policy businesses_tenant_update on businesses
  for update to authenticated
  using (id in (select business_id from memberships where user_id = auth.uid()))
  with check (id in (select business_id from memberships where user_id = auth.uid()));
