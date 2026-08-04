# CRM Architecture

Status: durable record of CRM Milestones 1-3 and Clusters 4-8 and
10-17 (this sprint). See [DECISIONS.md](../../DECISIONS.md) ADR-0009
(persistence), ADR-0010 (multi-tenant foundation), ADR-0011
(admin-console), ADR-0012 (Estimate/Booking/Job), ADR-0014 (Company),
ADR-0015 (Note), ADR-0016 (Task), ADR-0018 (multi-role memberships),
ADR-0020 (photos), ADR-0021 (estimate approval), ADR-0022 (audit log
read access), ADR-0023 (archive/restore), ADR-0024 (appointments
view), and ADR-0025 (activity timeline, actor tracking) for the full
rationale, and
[`packages/core-models`](../../packages/core-models/README.md) /
[`packages/db`](../../packages/db/README.md) /
[`apps/admin-console`](../../apps/admin-console/README.md) for
implementation detail.

## Cluster 4: Estimate/Booking/Job persistence

`Job` was assumed to be the next-closest entity to ready after Milestone
3 (it already has a `packages/core-models` type and state machine). But
`Job.bookingId` and `Booking.estimateId` are both required fields, so a
schema-correct `Job` needs `Estimate` and `Booking` persisted too - see
ADR-0012.

| Piece                                                                                 | Status                                                                                           |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `estimates`, `bookings`, `jobs` tables (`migrations/003-job-pipeline-foundation.sql`) | Implemented this cluster (owner-run)                                                             |
| `EstimateRepository`, `BookingRepository`, `JobRepository`                            | Implemented and unit-tested (29/29 `packages/db` tests passing, tenant-isolation cases included) |
| `JobRepository.transitionJobStatus`                                                   | Routes through core-models' `transitionJob()`, mirrors `LeadRepository` exactly                  |

**Classification: LIVE (schema).** Migration 003 has been run against
the real `Greencal-production` Supabase project (owner-confirmed).

## Cluster 5: Lead → Estimate → Booking → Job creation workflow

Adds the actual creation path, closing the gap Cluster 4 left open:

- Lead detail page (`apps/admin-console`) gains an "Add estimate" form
  (dollar amount + summary, parsed via a pure, tested
  `parseDollarsToMinorUnits()` - rejects malformed input rather than
  guessing) and lists existing Estimates.
- A "Create booking + job" form on the same page: creates the `Booking`,
  then immediately creates its `Job` (at `draft`), links
  `booking.job_id`, and best-effort attempts the `draft` → `scheduled`
  transition using the real logged-in user's actual role.
- **Real, surfaced constraint**: `transitionJob()`'s `draft` → `scheduled`
  edge only allows `office-manager`/`dispatcher` - an `owner-admin`-only
  membership (the only one that exists today) will see the Job created
  successfully but left at `draft`, with an honest on-page note
  explaining why, never a fabricated "scheduled" state.
- New **Jobs** module: list (status filter) + detail + status-transition,
  mirroring the Leads module exactly. Same honest-rejection behavior for
  any transition the current role isn't authorized for.
- `packages/ui-kit` gains `jobStatusTone` (mirrors `leadStatusTone`).

**Classification: IMPLEMENTED AND TESTED LOCALLY.** Lint, typecheck, a
local production build, and pure-logic unit tests (amount parsing,
job-status validation) all pass. Not yet deployed live (same admin-console
deployment gap as Milestone 3) - the actual create-estimate → create-booking
→ auto-create-job → best-effort-schedule chain has not been exercised
against a real browser session.

**Known limitation - resolved, see Cluster 10 below**: a single Supabase
Auth user originally could hold exactly one `role` per business. Fixed
by the multi-role membership schema (ADR-0018).

## Cluster 6: Company persistence + Contact→Company linking

Adds `Company` - the first entity built this cluster with genuinely no
prior `packages/core-models` type. See DECISIONS.md ADR-0014 for the
full rationale.

- `Company` (`packages/core-models/src/types/company.ts`): `id`, `name`,
  `primaryContactId?`, `createdAt`. **No state machine** - unlike Lead/
  Job/Estimate/etc., a Company has no meaningful lifecycle to enforce;
  this is a deliberate exception to the "every entity gets a state
  machine" pattern, not an oversight.
- `Contact` gains an optional `companyId?: CompanyId` field (additive,
  non-breaking).
- `companies` table + `contacts.company_id` column
  (`migrations/004-company-foundation.sql`), same tenant-scoped RLS
  pattern as every prior migration (`DROP POLICY IF EXISTS` +
  `CREATE POLICY`). A deferred `companies.primary_contact_id` FK is
  added via idempotent `DO` block once both tables exist.
- `CompanyRepository` (`createCompany`/`getCompany`/`listCompanies`) and
  `ContactRepository` extensions (`companyId` list filter,
  `linkCompany()`), unit-tested (`packages/db`, 33/33 tests passing).
- `apps/admin-console`: new **Companies** module (list + search + create,
  detail page listing linked contacts) mirroring the Leads/Jobs modules;
  Contact detail page gains a company-link dropdown form.

Unlike Cluster 4 (where persistence had to land before UI, since Job's
required fields forced Estimate/Booking to exist first), Company's
persistence and UI shipped together in the same cluster - there was no
dependency forcing a split, and a Company that could be created but
never linked to a Contact would be a hollow feature.

**Classification: IMPLEMENTED AND TESTED LOCALLY.** Lint, typecheck, a
local production build, and unit/pure-logic tests all pass. Migration
004 has NOT yet been run against the real `Greencal-production` Supabase
project (owner action required, same as every migration - the owner
runs these manually via the SQL Editor). Not yet deployed live (same
admin-console deployment gap as Milestones 3/Cluster 5).

## Cluster 7: Note persistence (polymorphic Lead/Contact/Company/Job attachment)

Adds `Note` - a single, entity-agnostic note type rather than one table
per entity. See DECISIONS.md ADR-0015 for the full rationale, including
why a generic `notes` table was chosen over `lead_notes`/`contact_notes`/
etc.

- `Note` (`packages/core-models/src/types/note.ts`): `id`, `entityType`
  (closed union `'lead' | 'contact' | 'company' | 'job'`), `entityId`,
  `body`, `authorId?`, `createdAt`. **No state machine.**
- `notes` table (`migrations/005-note-foundation.sql`), tenant-scoped
  RLS, **append-only** (select/insert policies only - no update/delete,
  matching the `audit_log` precedent). `entity_type` is enforced by a
  `check` constraint, since Postgres cannot express a real foreign key
  across a polymorphic reference.
- `NoteRepository` (`createNote`/`listNotes`), unit-tested
  (`packages/db`, 36/36 tests passing).
- `apps/admin-console`: a single reusable `NotesSection.astro` component
  (list + add-note form) embedded on the Lead, Contact, Company, and Job
  detail pages - one implementation, not four.

**Classification: IMPLEMENTED AND TESTED LOCALLY.** Lint, typecheck, a
local production build, and unit tests all pass. Migration 005 has NOT
yet been run against the real `Greencal-production` Supabase project
(owner action required). Not yet deployed live (same admin-console
deployment gap as every prior cluster).

## Cluster 8: Task persistence (boolean-complete, optional entity attachment)

Adds `Task` - the last of the originally-identified missing entities.
See DECISIONS.md ADR-0016 for the full rationale.

- `Task` (`packages/core-models/src/types/task.ts`): `id`, `title`,
  `description?`, `dueAt?`, `assignedTo?`, `entityType?`, `entityId?`
  (reuses `Note`'s `NotableEntityType`, but optional - a Task need not
  attach to anything), `completed: boolean`, `completedAt?`,
  `createdAt`. **No state machine** - completion is a plain boolean plus
  a `completeTask()` method, same reasoning as `Company`.
- `tasks` table (`migrations/006-task-foundation.sql`), tenant-scoped
  RLS (select/insert/update - update is needed to mark a task complete,
  unlike the append-only `notes` table). Two `check` constraints enforce
  `entity_type`/`entity_id` travel together and `completed_at` is set
  if and only if `completed` is true.
- `TaskRepository` (`createTask`/`listTasks`/`completeTask`),
  unit-tested (`packages/db`, 40/40 tests passing).
- `apps/admin-console`: a standalone `/tasks` list page (open/completed
  toggle, unattached task creation) plus a reusable `TasksSection`
  component embedded on the Lead, Contact, Company, and Job detail
  pages.

**Classification: IMPLEMENTED AND TESTED LOCALLY.** Lint, typecheck, a
local production build, and unit tests all pass. Migration 006 has NOT
yet been run against the real `Greencal-production` Supabase project
(owner action required). Not yet deployed live (same admin-console
deployment gap as every prior cluster).

This closes out the originally-identified set of missing CRM entities
(`Company`, `Task`, `Appointment`, `Note`) from the Milestone 3 "not
done" list - `Appointment` resolved via reuse of the existing `Booking`
entity, the other three now have persistence and UI.

**Next**: no further CRM entity gaps are currently identified. Remaining
work is search/filtering/CSV export/reporting, full per-permission RBAC,
and the much larger scope from the owner's "AI COMPANY OS — FINAL
EXECUTION DIRECTIVE" (multi-business isolation, infra, Hermes/Jervis/
Emma agents, SEO/AEO/GEO, commercial SaaS).

## Cluster 10: multi-role memberships

(Cluster 9, `apps/agent-orchestrator`, is agent infrastructure, not
CRM - documented in DECISIONS.md ADR-0017 and ROADMAP.md instead.)

Resolves the Cluster 5 known limitation: a single Supabase Auth user can
now hold more than one `MembershipRole` per business (e.g. `owner-admin`
**and** `office-manager`), per explicit owner direction. See
DECISIONS.md ADR-0018 for the full rationale.

- New `membership_roles` child table
  (`packages/db/migrations/007-multi-role-memberships.sql`) - fully
  additive, the existing `memberships` table and its
  `(business_id, user_id)` unique constraint are untouched. Backfills
  every existing membership's single role, then separately grants the
  real GreenCal owner an additional `office-manager` role.
- `packages/core-models` gains `resolveTransitionAcrossActorCategories()`
  - tries a transition against each of a caller's held roles in order,
    changing nothing about any individual state machine's own
    authorization rules.
- `LeadRepository`/`JobRepository` each gain a new
  `transitionXStatusForRoles()` method alongside the original
  single-actor method (left unchanged).
- `apps/admin-console`'s `CurrentMembership.role` becomes
  `CurrentMembership.roles: MembershipRole[]`; `getCurrentMembership()`
  falls back to the legacy `memberships.role` column when
  `membership_roles` has no rows yet, so this keeps working against an
  unmigrated Supabase project exactly as before.

**Classification: IMPLEMENTED AND TESTED LOCALLY.** Lint, typecheck, a
local production build, and unit tests all pass (`packages/core-models`
100/100, `packages/db` 44/44). Migration 007 has NOT yet been run
against the real `Greencal-production` Supabase project (owner action,
queued behind 004-006). Until it runs, the owner's account continues to
resolve to its existing single `owner-admin` role via the fallback path

- once run, it gains `office-manager` too and most Job/Lead transitions
  that previously required an honest rejection will succeed.

## Cluster 12: PhotoAsset persistence (before/progress/after media)

Closes the "upload before/progress/after media" gap in the core
GreenCal workflow. See DECISIONS.md ADR-0020.

- `PhotoAsset.kind` widens to `'before' | 'progress' | 'after'`
  (additive).
- `photo_assets`/`photo_pairs` tables (`migrations/009-photo-foundation.sql`)
  plus a private `job-photos` Supabase Storage bucket with tenant-scoped
  RLS on `storage.objects`.
- `PhotoAssetRepository.uploadPhoto()`/`listPhotosForJob()` - every
  publication-readiness field is stored `false`; **no automated privacy
  pipeline (EXIF stripping, GPS removal, face/plate review) exists
  anywhere in this repository**, and nothing here claims one ran.
- `apps/admin-console`: Job detail page gains a Media section (upload
  form + signed-URL thumbnail gallery).

**Classification: IMPLEMENTED AND TESTED LOCALLY.** Migration 009 has
NOT yet been run against production (owner action).

## Cluster 13: Estimate approval status

Closes the "approve estimate" gap. See DECISIONS.md ADR-0021.

- `Estimate` gains `status: 'draft' | 'approved'` and `approvedAt?` -
  no state machine, same treatment as `Company`/`Note`/`Task`.
- `EstimateRepository.approveEstimate()` - the only path to `approved`;
  rejects an already-approved estimate rather than silently no-opping.
- `apps/admin-console`'s "create booking + job" action now requires an
  **approved** estimate, enforced server-side, not just hidden in the UI.

**Classification: IMPLEMENTED AND TESTED LOCALLY.** Migration 010 has
NOT yet been run against production (owner action).

## Cluster 14: Audit log read access

Closes the "Audit logs" admin-console module gap. See DECISIONS.md
ADR-0022.

- `AuditLogRepository.listAuditRecords()` - the RLS policy making this
  safe (`audit_log_tenant_select`) already existed since migration 002;
  no schema change needed.
- `apps/admin-console`'s new `/audit-log` page, with an entity-type
  filter and links back to the Lead/Job each record concerns.

**Classification: IMPLEMENTED AND TESTED LOCALLY.**

## Cluster 15: Archive/restore for Contacts, Companies, and Leads

Closes the "Archive... Restore where appropriate" gap. See DECISIONS.md
ADR-0023.

- `archived_at` (nullable, `migrations/011-archive-support.sql`) on
  `contacts`/`companies`/`leads` only - deliberately not on Estimates/
  Bookings/Jobs, which already have terminal statuses serving the same
  purpose.
- `packages/db`-layer only: a new `Archivable{Contact,Company,Lead}`
  intersection type, not a `core-models` change. Archiving a Lead never
  changes its pipeline `status` - the two are orthogonal.
- Every `listX()` method gains `includeArchived` (default `false`).
- `apps/admin-console`: "Show archived" checkbox on each list page,
  Archive/Restore button on each detail page.

**Classification: IMPLEMENTED AND TESTED LOCALLY.** 55/55
`packages/db` tests passing. Migration 011 has NOT yet been run against
production (owner action).

## Cluster 16: Appointments view

Closes the "Appointments"/"Calendar" admin-console module gap. See
DECISIONS.md ADR-0024.

- `apps/admin-console`'s new `/appointments` page - every Booking for
  the business, grouped by date, with time/customer/linked-Job-status.
  No schema or repository change - `BookingRepository.listBookings()`
  already supported this.
- **Deliberately a chronological list, not a calendar-grid widget** -
  see the ADR for why building a full interactive calendar now would be
  over-engineering ahead of a real need (no appointment duration,
  technician-conflict checking, or availability rules exist anywhere in
  this repository yet).

**Classification: IMPLEMENTED AND TESTED LOCALLY.**

## Cluster 17: Activity Timeline and actor tracking (in progress)

See DECISIONS.md ADR-0025 for the full rationale. Two parts:

**Part 1 (this commit) - actor tracking**: `Task`/`PhotoAsset`/
`Estimate`/`Booking` gained `createdBy`/`completedBy`/`uploadedBy`/
`approvedBy` fields (`migrations/012-actor-tracking.sql`) - a real
prerequisite gap for "filterable by... employee," since none of these
four entities previously recorded which staff member performed the
action. Every `apps/admin-console` API route that creates/completes/
approves/uploads one of these now passes the calling user's id through.

**Part 2 (follow-up commit) - the timeline itself**: a new
`ActivityTimelineRepository` will compose the Contact's full history at
read time from every existing repository (Leads, Estimates, Bookings,
Jobs, Notes, Tasks, Photos, `audit_log`) rather than a separate
write-time event table - see the ADR for why. `TimelineEntryType`
includes Invoice/Payment/Call/SMS/Email/Review-request/Review-received
as named values for forward compatibility, but no code path produces
them yet - **no persistence exists anywhere in this repository for
those four entity categories**, and nothing here fabricates data for
them.

**Classification: PART 1 IMPLEMENTED AND TESTED LOCALLY.** Migration
012 has NOT yet been run against production (owner action).

## What "CRM" means in this repository today

The owner's "Master Scope Consolidation" directive asks for an internal
CRM comparable in core capability to HubSpot (contacts, companies,
properties, leads, deals, jobs, estimates, appointments, calls, tasks,
campaigns, an authenticated owner interface, search/filter/reporting,
RBAC). That is a large system. **This document describes Milestones 1-3
only** — persistence for two entities (Lead, Contact), a multi-tenant
foundation, and an authenticated UI for those same two entities — and is
honest about everything else being not yet built, not "planned in a way
that counts as done."

## What is actually implemented and verified (Milestone 1)

| Piece                                                                      | Status                                                                                                 |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `Contact`/`Lead`/`AuditLog` domain types + Lead state machine              | Already existed before this milestone (`packages/core-models`) — real, tested, unchanged               |
| `contacts`, `leads`, `audit_log` tables (Supabase, RLS, service-role only) | Implemented this milestone — `packages/db/migrations/001-crm-foundation.sql` (owner-run)               |
| `ContactRepository`, `LeadRepository`, `AuditLogRepository`                | Implemented and unit-tested this milestone (`packages/db`, 11/11 tests passing)                        |
| GreenCal intake wiring (best-effort Contact+Lead creation per new lead)    | Implemented and unit-tested this milestone (`supabase-resend-adapter.ts`, `crm-intake-adapter.ts`)     |
| `quote_leads.lead_id` link column                                          | Implemented this milestone (additive migration, owner-run) — see `supabase-migration-003-crm-link.sql` |

**Classification: LIVE AND VERIFIED (schema).** The owner has confirmed
`packages/db/migrations/001-crm-foundation.sql` and
`apps/greencal-website/src/lib/quote-form/supabase-migration-003-crm-link.sql`
were both run successfully against the real `Greencal-production`
Supabase project. `CRM_BUSINESS_ID` (see Milestone 2) has not yet been
confirmed set in Vercel, so real CRM-intake linking on a live customer
submission has not yet been independently observed end-to-end.

## Milestone 2: multi-tenant foundation

The platform must serve GreenCal Pressure Washing, GreenCal Auto
Detailing, Navarro Builders, and future clients on shared infrastructure
with strict tenant isolation (see DECISIONS.md ADR-0010). This milestone:

| Piece                                                                    | Status                                                                                                                                                                          |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `businesses`, `memberships` tables                                       | Implemented — `packages/db/migrations/002-multi-tenant-foundation.sql` (owner-run)                                                                                              |
| `business_id` on `contacts`/`leads`/`audit_log`, backfilled + `NOT NULL` | Implemented, same migration                                                                                                                                                     |
| Tenant-scoped RLS policies (`authenticated` role)                        | Implemented, same migration — written, **not yet independently verified** against live Postgres (no way to run a real cross-tenant probe from this session without credentials) |
| `ContactRepository`/`LeadRepository` require `businessId`                | Implemented and unit-tested (tenant-isolation tests included, 11/11 passing)                                                                                                    |
| GreenCal's business id as configuration (`CRM_BUSINESS_ID`)              | Implemented — never hardcoded in application code                                                                                                                               |

**Classification: IMPLEMENTED AND TESTED LOCALLY** (repository-layer
tenant isolation is unit-tested; RLS policy SQL is written and reviewed
but not yet proven against a live database with two real authenticated
sessions — that requires either the owner testing it live or a scripted
integration test run with real credentials, neither of which happened
in this session).

GreenCal Auto Detailing and Navarro Builders are **not** onboarded as
real tenants by this milestone — neither has a repository module yet
(see BUSINESSES.md). Only the schema's capacity to support them exists.

## Milestone 3: authenticated admin-console

The owner directed a tenant-aware admin UI covering nine entity types
(Contacts, Companies, Leads, Estimates, Jobs, Tasks, Appointments, Notes,
Media). A repository check at the start of this milestone confirmed only
`Contact` and `Lead` have any persistence; the other seven have no
repository, and four of them (`Company`, `Task`, `Appointment`, `Note`)
have no `packages/core-models` type at all. See DECISIONS.md ADR-0011 for
the full scoping rationale.

| Piece                                                               | Status                                                                                                |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `apps/admin-console` bootstrap (Astro server output, Vercel, React) | Implemented this milestone                                                                            |
| Login, logout, forgot/reset password (Supabase Auth)                | Implemented this milestone                                                                            |
| Session middleware (route guard, cookie refresh)                    | Implemented this milestone                                                                            |
| Tenant-aware dashboard (business name, role, lead-status counts)    | Implemented this milestone                                                                            |
| Leads: list (status filter), detail, status-transition              | Implemented this milestone - transitions route through `transitionLead()`                             |
| Contacts: list (search), detail (read-only, shows associated leads) | Implemented this milestone                                                                            |
| `packages/ui-kit` real components                                   | Implemented this milestone (Button, Badge, Table, EmptyState, ErrorBanner, LoadingSpinner, FormField) |
| `ContactRepository`/`LeadRepository` list/get methods               | Implemented and unit-tested this milestone (tenant-isolation cases included)                          |

**Classification: IMPLEMENTED AND TESTED LOCALLY.** Lint, typecheck, and
a local production build (`astro build`) all pass. **Not yet deployed** -
no Vercel project exists for `apps/admin-console` yet, and no owner
account/membership row has been created, so no real login has happened
against a live deployment. Pure-logic unit tests pass (route-guard
matching, status validation); no real browser/E2E test exists for the
login or CRM flows, since doing so would require real Supabase Auth
credentials this session does not have.

**Deferred to future milestones**: Companies, Estimates, Jobs, Tasks,
Appointments, Notes, and Media all have **no persistence layer**, so none
get UI here. Each future milestone should add the `packages/core-models`
type (if missing), a `packages/db` migration + repository (with
tenant-isolation tests, following ADR-0009/ADR-0010's pattern), and only
then a UI module - the same sequencing already used for Contact/Lead.
`Job` is the closest to ready (type + state machine already exist).

## Why persistence, not a new data model

A repository audit at the start of this milestone found `packages/core-models`
already contains a complete, tested, pure domain model — the "GreenCal
Lead-to-Job-to-Content growth system" — built in a prior session this one
has no transcript of. Its own README says persistence, API routes, UI, and
auth were deliberately excluded from that slice. Building a second,
parallel Lead/Contact model would have thrown away real, higher-quality,
already-tested design work (typed state machines, authorization rules,
audit contracts) purely because this session didn't originally know it
existed. See ADR-0009 for the full audit findings.

## Attribution honesty note

`packages/core-models`' `LeadAttribution.channel` field is required.
GreenCal's public quote form has no UTM/referrer capture today, so this
milestone records `channel: 'unknown'` — a new, honestly-named addition
to the `AttributionChannel` enum — rather than guessing `'direct'` or any
other specific channel that would assert something not actually observed.

## What is deliberately deferred (not implemented, not scheduled)

- **Companies, properties, deals, jobs, estimates, appointments, calls,
  communications, notes, tasks, campaigns, files/photos** — all defined
  as types in `packages/core-models` already (jobs, invoices, photos,
  review requests) but have **no persistence or UI** yet.
- **CSV export, activity-history/audit-trail views, reporting, tags,
  assignment.**
- **Full RBAC** beyond the four-role `MembershipRole` set already
  enforced by RLS (`owner-admin`, `office-manager`, `dispatcher`,
  `technician`) - no per-permission granularity within a role yet.
- **A live admin-console deployment** - no Vercel project exists for it
  yet (see Owner action below).
- **Job pipeline, estimate generation, and everything in the master
  directive's Systems 4–17** (Hostinger, pricing engine, Emma, Jervis,
  provider gateway expansion, SEO/AEO/GEO, Google Business Profile,
  Google Ads, outreach, website factory) — untouched by this milestone.

## Owner action required

1. Run `packages/db/migrations/002-multi-tenant-foundation.sql` in the
   Supabase SQL Editor (purely additive, safe at any time) - migrations
   001 and 003 are already confirmed applied.
2. Set `CRM_BUSINESS_ID` in Vercel (Preview + Production, for
   `apps/greencal-website`) to the seeded business row's id:
   `select id from businesses where slug = 'greencal-pressure-washing';`
3. Create your own login: Supabase dashboard → Authentication → Users →
   Add user, then link it to GreenCal via a `memberships` row - see
   `apps/admin-console/README.md`'s "Owner setup" section for the exact
   SQL.
4. Provision a Vercel project for `apps/admin-console` (separate from
   `apps/greencal-website`) and configure `SUPABASE_URL`/
   `SUPABASE_ANON_KEY` there before the first real deployment.

Until all three run and `CRM_BUSINESS_ID` is set, the best-effort
CRM-intake call in `supabase-resend-adapter.ts` will fail silently (by
design — a missing table or unset config produces the same kind of
tolerated failure as the existing best-effort
`markTestLead`/`markCustomerConfirmationStatus` calls) and no
`Contact`/`Lead` row will be created. **This never affects lead storage,
owner notification, or customer confirmation** — those are unrelated
existing paths this milestone did not touch.

## Next recommended milestone

`Job` persistence (`packages/core-models` already has the type and state
machine) plus a Jobs module in `apps/admin-console` - the closest of the
remaining seven entities to ready, and the natural next step in a Lead's
lifecycle once `booked`.
