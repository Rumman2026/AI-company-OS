-- Invoice/Payment persistence for packages/core-models' already-built
-- Invoice/Payment types and transitionInvoice() state machine (see
-- packages/core-models/src/types/invoice.ts and
-- src/state-machines/invoice.ts) - closes the last un-persisted
-- lifecycle of the five named in this project's growth-system plan
-- (Lead and Job already have full persistence + admin-console UI).
--
-- Schema maps exactly to the existing Invoice/Payment types - no new
-- domain fields invented. `created_by`/actor-tracking columns are
-- deliberately NOT added here, unlike Estimate/Task/PhotoAsset
-- (ADR-0025): the core-models Invoice/Payment types have no such
-- field, and adding an unmapped column would be schema drift ahead of
-- an actual domain-model change.
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE - two new tables.
-- No existing table or row is altered.
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/026-restore-membership-roles-select-grant.sql.

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id),
  job_id uuid not null references jobs (id),
  lead_id uuid not null references leads (id),
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'partially-paid', 'paid', 'overdue', 'voided', 'refunded')),
  total_amount_minor_units integer not null check (total_amount_minor_units >= 0),
  total_amount_currency text not null,
  due_at timestamptz,
  created_at timestamptz not null default now()
);

alter table invoices enable row level security;

create index if not exists invoices_business_id_idx on invoices (business_id);
create index if not exists invoices_job_id_idx on invoices (job_id);
create index if not exists invoices_lead_id_idx on invoices (lead_id);

comment on table invoices is
  'Invoices for a completed Job - see packages/core-models Invoice type and its transitionInvoice() state machine. Status transitions are enforced entirely in application code (packages/db InvoiceRepository), never by a database constraint - same approach as every other stateful entity in this schema.';

drop policy if exists invoices_tenant_select on invoices;
create policy invoices_tenant_select on invoices
  for select to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()));

drop policy if exists invoices_tenant_insert on invoices;
create policy invoices_tenant_insert on invoices
  for insert to authenticated
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));

-- Included from the start (unlike estimates, which needed a follow-up
-- fix in migration 016) - status transitions require UPDATE.
drop policy if exists invoices_tenant_update on invoices;
create policy invoices_tenant_update on invoices
  for update to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()))
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id),
  invoice_id uuid not null references invoices (id),
  amount_minor_units integer not null check (amount_minor_units >= 0),
  amount_currency text not null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table payments enable row level security;

create index if not exists payments_business_id_idx on payments (business_id);
create index if not exists payments_invoice_id_idx on payments (invoice_id);

comment on table payments is
  'A recorded payment against an Invoice - see packages/core-models Payment type. Staff-entered record of fact (e.g. "we received a check for $X"), never a live payment-gateway integration - see DECISIONS.md for the ADR recording this cluster. Append-only, like audit_log/notes - no update/delete policy.';

drop policy if exists payments_tenant_select on payments;
create policy payments_tenant_select on payments
  for select to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()));

drop policy if exists payments_tenant_insert on payments;
create policy payments_tenant_insert on payments
  for insert to authenticated
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));
