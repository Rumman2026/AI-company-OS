# CRM Architecture

Status: durable record of CRM Milestones 1-3 and Cluster 4 (this
sprint). See [DECISIONS.md](../../DECISIONS.md) ADR-0009 (persistence),
ADR-0010 (multi-tenant foundation), ADR-0011 (admin-console), and
ADR-0012 (Estimate/Booking/Job) for the full rationale, and
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

**Known limitation, not silently worked around**: a single Supabase Auth
user can hold exactly one `role` per business (`memberships`' unique
constraint is `(business_id, user_id)`). The owner's `owner-admin`
membership cannot also act as `office-manager` day-to-day - most Job/Lead
transitions require that role. Two real options exist if the owner wants
one account to do both: (a) change the existing membership row's `role`
to `office-manager` (trading away owner-only actions like marking
something `lost`/`canceled`), or (b) a future schema change allowing
multiple roles per business per user - not built, since it's a real
design decision, not a bug fix.

**Next**: persistence + UI for the entities still with none - `Company`
first (needs a new `packages/core-models` type, since none exists),
or `Task`/`Appointment`/`Note` (also need new types).

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
