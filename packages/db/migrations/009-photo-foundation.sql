-- Photo persistence for packages/core-models' PhotoAsset type - closes
-- the "upload before/progress/after media" gap in the core GreenCal
-- workflow (owner directive). See DECISIONS.md ADR-0020.
--
-- IMPORTANT, honest scope note: this migration and its repository only
-- store an uploaded original and the publication-readiness fields
-- PhotoAsset already defines (metadata_stripped, gps_data_removed,
-- privacy_review_passed, human_publication_approved,
-- publication_consent_granted). No EXIF-stripping, GPS-removal, face/
-- license-plate detection, or human-review workflow is implemented
-- anywhere in this repository yet - every uploaded photo is inserted
-- with all of those fields false, so packages/core-models'
-- evaluatePhotoPublicationEligibility() correctly reports it as
-- not-yet-publishable. Nothing here fabricates that privacy processing
-- happened.
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE - two new tables and
-- one new private Storage bucket. No existing table or row is altered.
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/008-additional-business-tenants.sql.

create table if not exists photo_assets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id),
  job_id uuid not null references jobs (id),
  kind text not null check (kind in ('before', 'progress', 'after')),
  private_original_ref text not null,
  public_derivative_ref text,
  metadata_stripped boolean not null default false,
  gps_data_removed boolean not null default false,
  privacy_review_passed boolean not null default false,
  face_review_passed boolean,
  license_plate_review_passed boolean,
  human_publication_approved boolean not null default false,
  publication_consent_granted boolean not null default false,
  publication_status text not null default 'not-published'
    check (publication_status in ('not-published', 'publishable', 'published', 'taken-down')),
  caption text,
  alt_text_draft text,
  created_at timestamptz not null default now()
);

alter table photo_assets enable row level security;

create index if not exists photo_assets_business_id_idx on photo_assets (business_id);
create index if not exists photo_assets_job_id_idx on photo_assets (job_id);

comment on table photo_assets is
  'Job before/progress/after photos - see packages/core-models PhotoAsset type and DECISIONS.md ADR-0020. Every publication-readiness field defaults false; no automated privacy-processing pipeline exists yet.';

drop policy if exists photo_assets_tenant_select on photo_assets;
create policy photo_assets_tenant_select on photo_assets
  for select to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()));

drop policy if exists photo_assets_tenant_insert on photo_assets;
create policy photo_assets_tenant_insert on photo_assets
  for insert to authenticated
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));

create table if not exists photo_pairs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id),
  job_id uuid not null references jobs (id),
  before_photo_id uuid not null references photo_assets (id),
  after_photo_id uuid not null references photo_assets (id),
  human_confirmed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table photo_pairs enable row level security;

create index if not exists photo_pairs_business_id_idx on photo_pairs (business_id);
create index if not exists photo_pairs_job_id_idx on photo_pairs (job_id);

comment on table photo_pairs is
  'Confirmed before/after photo pairings for a Job - see packages/core-models PhotoPair type.';

drop policy if exists photo_pairs_tenant_select on photo_pairs;
create policy photo_pairs_tenant_select on photo_pairs
  for select to authenticated
  using (business_id in (select business_id from memberships where user_id = auth.uid()));

drop policy if exists photo_pairs_tenant_insert on photo_pairs;
create policy photo_pairs_tenant_insert on photo_pairs
  for insert to authenticated
  with check (business_id in (select business_id from memberships where user_id = auth.uid()));

-- Private Storage bucket for original photo uploads (never public - a
-- public URL is only ever meaningful for a future publicDerivativeRef,
-- which nothing in this repository generates yet). Object paths are
-- expected in the form "{business_id}/{job_id}/{filename}" - the
-- policies below enforce that the leading path segment matches a
-- business the calling user actually belongs to, mirroring every table
-- RLS policy above.
insert into storage.buckets (id, name, public)
select 'job-photos', 'job-photos', false
where not exists (select 1 from storage.buckets where id = 'job-photos');

drop policy if exists job_photos_tenant_select on storage.objects;
create policy job_photos_tenant_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'job-photos'
    and (storage.foldername(name))[1]::uuid in (select business_id from memberships where user_id = auth.uid())
  );

drop policy if exists job_photos_tenant_insert on storage.objects;
create policy job_photos_tenant_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'job-photos'
    and (storage.foldername(name))[1]::uuid in (select business_id from memberships where user_id = auth.uid())
  );
