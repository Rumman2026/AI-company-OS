-- Archive/restore support for Contacts, Companies, and Leads - closes
-- the "Archive... Restore where appropriate" requirement named for
-- every admin-console module in the owner's execution directive.
-- Deliberately NOT added to Estimates/Bookings/Jobs, which already have
-- workflow-driven terminal statuses ('lost'/'canceled'/'completed')
-- serving the same "no longer active" purpose - see DECISIONS.md
-- ADR-0023.
--
-- `archived_at` is a pure list-visibility/administrative concern, not a
-- core-models domain concept - it deliberately does NOT replace or
-- interact with Lead.status. An archived Lead keeps its real status;
-- archiving only removes it from the default admin-console list view.
--
-- SAFE TO RUN AGAINST THE LIVE PRODUCTION DATABASE - three additive,
-- nullable columns. No existing row's meaning changes (every existing
-- row becomes "not archived", which is accurate).
--
-- Run once, in the Supabase SQL Editor, after
-- packages/db/migrations/010-estimate-approval.sql.

alter table contacts add column if not exists archived_at timestamptz;
alter table companies add column if not exists archived_at timestamptz;
alter table leads add column if not exists archived_at timestamptz;

create index if not exists contacts_archived_at_idx on contacts (archived_at);
create index if not exists companies_archived_at_idx on companies (archived_at);
create index if not exists leads_archived_at_idx on leads (archived_at);

comment on column contacts.archived_at is
  'Set when a staff member archives this Contact from the default admin-console list view - see DECISIONS.md ADR-0023. Does not delete or otherwise affect the record.';
comment on column companies.archived_at is
  'Set when a staff member archives this Company from the default admin-console list view - see DECISIONS.md ADR-0023.';
comment on column leads.archived_at is
  'Set when a staff member archives this Lead from the default admin-console list view - see DECISIONS.md ADR-0023. Independent of Lead.status - archiving never changes the Lead pipeline status.';

-- contacts/companies already have tenant-scoped update policies from
-- earlier migrations (contacts: migration 002; companies: migration
-- 004) that cover any column, including this new one, with no change
-- needed. leads' existing tenant-scoped update policy (migration 002)
-- likewise already covers this column.
