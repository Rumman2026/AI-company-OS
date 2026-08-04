-- Estimate photo attachments - closes the "Attach photos" requirement
-- from the owner's "Professional estimate builder" directive. See
-- DECISIONS.md ADR-0028.
--
-- Deliberately a separate, minimal table from photo_assets
-- (migrations/009-photo-foundation.sql), not a widened version of it:
-- photo_assets models a Job's before/progress/after documentation with
-- a public-marketing publication workflow that has no meaning for an
-- estimate attachment, which is always a private, internal-only
-- reference image and is never a candidate for public before/after
-- marketing use.
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE - one new table and
-- one new private Storage bucket. No existing table or row is altered.
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/014-estimate-pricing.sql.

create table if not exists estimate_attachments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id),
  estimate_id uuid not null references estimates (id),
  storage_ref text not null,
  file_name text not null,
  caption text,
  uploaded_by uuid,
  created_at timestamptz not null default now()
);

alter table estimate_attachments enable row level security;

create index if not exists estimate_attachments_business_id_idx on estimate_attachments (business_id);
create index if not exists estimate_attachments_estimate_id_idx on estimate_attachments (estimate_id);

comment on table estimate_attachments is
  'Private reference photos attached to an Estimate - see packages/core-models EstimateAttachment type and DECISIONS.md ADR-0028. Never a candidate for public marketing use, unlike photo_assets.';

drop policy if exists estimate_attachments_tenant_select on estimate_attachments;
create policy estimate_attachments_tenant_select on estimate_attachments
  for select to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()));

drop policy if exists estimate_attachments_tenant_insert on estimate_attachments;
create policy estimate_attachments_tenant_insert on estimate_attachments
  for insert to authenticated
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));

drop policy if exists estimate_attachments_tenant_delete on estimate_attachments;
create policy estimate_attachments_tenant_delete on estimate_attachments
  for delete to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()));

-- Private Storage bucket for estimate attachment uploads (never
-- public). Object paths are expected in the form
-- "{business_id}/{estimate_id}/{filename}" - the policies below
-- enforce that the leading path segment matches a business the
-- calling user actually belongs to, mirroring job-photos' policies.
insert into storage.buckets (id, name, public)
select 'estimate-attachments', 'estimate-attachments', false
where not exists (select 1 from storage.buckets where id = 'estimate-attachments');

drop policy if exists estimate_attachments_storage_tenant_select on storage.objects;
create policy estimate_attachments_storage_tenant_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'estimate-attachments'
    and (storage.foldername(name))[1]::uuid in (select business_id from memberships where user_id = auth.uid())
  );

drop policy if exists estimate_attachments_storage_tenant_insert on storage.objects;
create policy estimate_attachments_storage_tenant_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'estimate-attachments'
    and (storage.foldername(name))[1]::uuid in (select business_id from memberships where user_id = auth.uid())
  );

drop policy if exists estimate_attachments_storage_tenant_delete on storage.objects;
create policy estimate_attachments_storage_tenant_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'estimate-attachments'
    and (storage.foldername(name))[1]::uuid in (select business_id from memberships where user_id = auth.uid())
  );
