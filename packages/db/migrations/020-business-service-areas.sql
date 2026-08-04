-- Service areas - closes "Service areas" from the owner's Settings
-- directive. See DECISIONS.md ADR-0031. A simple named-area list (e.g.
-- "Sacramento", "Elk Grove") - deliberately not tied to the
-- programmatic-SEO CityId/CityService types already in
-- packages/core-models (packages/core-models/src/ids.ts) - those model
-- public marketing pages for apps/greencal-website, a different
-- concern from a business's own internal "where do we serve" list.
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE - one new table.
-- No existing table or row is altered.
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/019-business-branding.sql.

create table if not exists business_service_areas (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id),
  area_name text not null,
  created_at timestamptz not null default now(),
  constraint business_service_areas_unique unique (business_id, area_name)
);

alter table business_service_areas enable row level security;

create index if not exists business_service_areas_business_id_idx on business_service_areas (business_id);

comment on table business_service_areas is
  'Named cities/regions a business serves - see DECISIONS.md ADR-0031.';

drop policy if exists business_service_areas_tenant_select on business_service_areas;
create policy business_service_areas_tenant_select on business_service_areas
  for select to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()));

drop policy if exists business_service_areas_tenant_insert on business_service_areas;
create policy business_service_areas_tenant_insert on business_service_areas
  for insert to authenticated
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));

drop policy if exists business_service_areas_tenant_delete on business_service_areas;
create policy business_service_areas_tenant_delete on business_service_areas
  for delete to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()));
