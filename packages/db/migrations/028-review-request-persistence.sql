-- Review-request/review-record persistence for packages/core-models'
-- already-built ReviewRequest/ReviewRecord types and
-- transitionReviewRequest() state machine (see
-- packages/core-models/src/types/review.ts and
-- src/state-machines/review-request.ts).
--
-- Content (the AI-drafting/publishing pipeline) is deliberately NOT
-- part of this migration - its state machine requires actor
-- categories ('ai-drafting-service', 'scheduled-publishing-service',
-- 'content-reviewer', 'marketing-editor') that do not exist as real
-- roles in this application, and building it now would create
-- persistence no one can operate. Deferred to Phase 2 alongside the
-- AI content-generation engine - see DECISIONS.md.
--
-- Schema maps exactly to the existing ReviewRequest/ReviewRecord
-- types - no new domain fields invented.
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE - two new tables.
-- No existing table or row is altered.
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/027-invoice-payment-persistence.sql.

create table if not exists review_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id),
  job_id uuid not null references jobs (id),
  status text not null default 'not-eligible'
    check (status in (
      'not-eligible', 'eligible', 'queued', 'sent', 'delivered', 'failed',
      'review-received', 'suppressed', 'opted-out'
    )),
  deduplication_key text not null,
  created_at timestamptz not null default now(),
  unique (business_id, deduplication_key)
);

alter table review_requests enable row level security;

create index if not exists review_requests_business_id_idx on review_requests (business_id);
create index if not exists review_requests_job_id_idx on review_requests (job_id);

comment on table review_requests is
  'Review-request lifecycle for a completed Job - see packages/core-models ReviewRequest type and its transitionReviewRequest() state machine. Nearly every transition (eligible/queued/sent/delivered/failed/review-received) is automation-only and has no automated actor wired into this application yet - only "opted-out" (customer/office-manager) is reachable from the admin-console today. Status transitions are enforced entirely in application code (packages/db ReviewRequestRepository), never by a database constraint.';

drop policy if exists review_requests_tenant_select on review_requests;
create policy review_requests_tenant_select on review_requests
  for select to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()));

drop policy if exists review_requests_tenant_insert on review_requests;
create policy review_requests_tenant_insert on review_requests
  for insert to authenticated
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));

drop policy if exists review_requests_tenant_update on review_requests;
create policy review_requests_tenant_update on review_requests
  for update to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()))
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));

create table if not exists review_records (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id),
  review_request_id uuid references review_requests (id),
  job_id uuid references jobs (id),
  source_platform text not null,
  received_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table review_records enable row level security;

create index if not exists review_records_business_id_idx on review_records (business_id);
create index if not exists review_records_job_id_idx on review_records (job_id);
create index if not exists review_records_review_request_id_idx on review_records (review_request_id);

comment on table review_records is
  'A real, received review - see packages/core-models ReviewRecord type. Staff-entered record of fact (e.g. "we received a 5-star Google review for this job"), never a live review-platform integration. Append-only, like payments - no update/delete policy.';

drop policy if exists review_records_tenant_select on review_records;
create policy review_records_tenant_select on review_records
  for select to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()));

drop policy if exists review_records_tenant_insert on review_records;
create policy review_records_tenant_insert on review_records
  for insert to authenticated
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));
