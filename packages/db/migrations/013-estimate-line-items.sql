-- Estimate line items and a reusable service-package catalog - closes
-- the "Professional estimate builder / Service packages / Line item
-- editor" requirements from the owner's directive. See DECISIONS.md
-- ADR-0026.
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE - two new tables.
-- No existing table or row is altered. Existing Estimates (a single
-- proposed_amount/summary, no line items) remain fully valid - line
-- items are optional, additive detail, not a replacement.
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/012-actor-tracking.sql.

create table if not exists service_packages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id),
  name text not null,
  description text,
  default_unit_price_minor_units integer not null check (default_unit_price_minor_units >= 0),
  default_unit_price_currency text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table service_packages enable row level security;

create index if not exists service_packages_business_id_idx on service_packages (business_id);

comment on table service_packages is
  'Reusable, tenant-defined service catalog entries - see packages/core-models ServicePackage type and DECISIONS.md ADR-0026.';

drop policy if exists service_packages_tenant_select on service_packages;
create policy service_packages_tenant_select on service_packages
  for select to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()));

drop policy if exists service_packages_tenant_insert on service_packages;
create policy service_packages_tenant_insert on service_packages
  for insert to authenticated
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));

drop policy if exists service_packages_tenant_update on service_packages;
create policy service_packages_tenant_update on service_packages
  for update to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()))
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));

create table if not exists estimate_line_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id),
  estimate_id uuid not null references estimates (id),
  description text not null,
  quantity integer not null check (quantity > 0),
  unit_price_minor_units integer not null check (unit_price_minor_units >= 0),
  unit_price_currency text not null,
  line_total_minor_units integer not null check (line_total_minor_units >= 0),
  line_total_currency text not null,
  service_package_id uuid references service_packages (id),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table estimate_line_items enable row level security;

create index if not exists estimate_line_items_business_id_idx on estimate_line_items (business_id);
create index if not exists estimate_line_items_estimate_id_idx on estimate_line_items (estimate_id);

comment on table estimate_line_items is
  'Priced lines on an Estimate - see packages/core-models EstimateLineItem type and DECISIONS.md ADR-0026. Only mutable while the parent Estimate is draft - enforced by packages/db, not by a database constraint (mirrors ADR-0021''s existing approach for Estimate itself).';

drop policy if exists estimate_line_items_tenant_select on estimate_line_items;
create policy estimate_line_items_tenant_select on estimate_line_items
  for select to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()));

drop policy if exists estimate_line_items_tenant_insert on estimate_line_items;
create policy estimate_line_items_tenant_insert on estimate_line_items
  for insert to authenticated
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));

drop policy if exists estimate_line_items_tenant_delete on estimate_line_items;
create policy estimate_line_items_tenant_delete on estimate_line_items
  for delete to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()));
