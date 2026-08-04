-- Actor tracking for Task/PhotoAsset/Estimate/Booking - closes a real
-- gap blocking "filterable by... employee" in the Activity Timeline
-- (owner directive) - see DECISIONS.md ADR-0025. Every existing
-- create/complete/approve/upload path had no record of which staff
-- member performed it (Lead/Job transitions already do, via
-- audit_log.actor_id).
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE - five additive,
-- nullable columns. No existing row is altered.
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/011-archive-support.sql.

alter table tasks add column if not exists created_by uuid references auth.users (id);
alter table tasks add column if not exists completed_by uuid references auth.users (id);

alter table photo_assets add column if not exists uploaded_by uuid references auth.users (id);

alter table estimates add column if not exists created_by uuid references auth.users (id);
alter table estimates add column if not exists approved_by uuid references auth.users (id);

alter table bookings add column if not exists created_by uuid references auth.users (id);

comment on column tasks.created_by is 'The actor who created this Task - see DECISIONS.md ADR-0025.';
comment on column tasks.completed_by is 'The actor who marked this Task completed.';
comment on column photo_assets.uploaded_by is 'The actor who uploaded this photo - see DECISIONS.md ADR-0025.';
comment on column estimates.created_by is 'The actor who created this Estimate - see DECISIONS.md ADR-0025.';
comment on column estimates.approved_by is 'The actor who approved this Estimate.';
comment on column bookings.created_by is 'The actor who created this Booking - see DECISIONS.md ADR-0025.';
