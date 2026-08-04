-- Adds an approval status to estimates - closes the "approve estimate"
-- gap in the core GreenCal workflow (owner directive). No state
-- machine - see DECISIONS.md ADR-0021. `draft` is the default for
-- every existing and new row; `approved_at` is set only when status
-- becomes `approved`.
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE - two additive,
-- nullable/defaulted columns. No existing row's meaning changes (every
-- existing estimate becomes `draft`, which is accurate - none has ever
-- been through an approval step, since that step did not exist before
-- this migration).
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/009-photo-foundation.sql.

alter table estimates add column if not exists status text not null default 'draft'
  check (status in ('draft', 'approved'));
alter table estimates add column if not exists approved_at timestamptz;

comment on column estimates.status is
  'draft or approved - see packages/core-models EstimateStatus and DECISIONS.md ADR-0021. No update path exists for amount/summary at any status.';
