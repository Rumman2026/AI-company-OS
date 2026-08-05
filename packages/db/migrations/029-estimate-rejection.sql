-- Adds a rejection status to estimates, alongside the existing draft/
-- approved statuses from migration 010 - closes the "estimate
-- approval or rejection" gap in the GreenCal MVP workflow. No state
-- machine, same reasoning as migration 010/ADR-0021: `rejectEstimate()`
-- (packages/db) is the only path from `draft` to `rejected`, and is
-- terminal like `approved` - see DECISIONS.md ADR-0039.
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE - widens an
-- existing check constraint (adds one more allowed value, does not
-- remove any) and adds two additive, nullable columns. No existing
-- row's meaning changes.
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/028-review-request-persistence.sql.

alter table estimates drop constraint if exists estimates_status_check;
alter table estimates add constraint estimates_status_check
  check (status in ('draft', 'approved', 'rejected'));

alter table estimates add column if not exists rejected_at timestamptz;
alter table estimates add column if not exists rejected_by uuid;

comment on column estimates.status is
  'draft, approved, or rejected - see packages/core-models EstimateStatus and DECISIONS.md ADR-0021/ADR-0039. No update path exists for amount/summary at any status.';
