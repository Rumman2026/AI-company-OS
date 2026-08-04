-- Branding/logo fields - closes "Branding / Logos" from the owner's
-- Settings directive. See DECISIONS.md ADR-0031.
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE - two additive,
-- nullable columns and one new private Storage bucket. No existing
-- row is altered.
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/018-business-profile.sql.

alter table businesses add column if not exists logo_storage_ref text;
alter table businesses add column if not exists primary_color text;

comment on column businesses.logo_storage_ref is 'Path in the business-logos Storage bucket - see DECISIONS.md ADR-0031. Null until a team member uploads one.';
comment on column businesses.primary_color is 'A hex color (e.g. #1a7f37) for future branded UI/PDF/print use - free text, lightly validated in apps/admin-console, not enforced at the database level.';

-- Private Storage bucket for logo uploads (never public - displayed
-- via short-lived signed URLs, same pattern as job-photos and
-- estimate-attachments). Object paths are expected in the form
-- "{business_id}/{filename}".
insert into storage.buckets (id, name, public)
select 'business-logos', 'business-logos', false
where not exists (select 1 from storage.buckets where id = 'business-logos');

drop policy if exists business_logos_tenant_select on storage.objects;
create policy business_logos_tenant_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1]::uuid in (select business_id from memberships where user_id = auth.uid())
  );

drop policy if exists business_logos_tenant_insert on storage.objects;
create policy business_logos_tenant_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1]::uuid in (select business_id from memberships where user_id = auth.uid())
  );
