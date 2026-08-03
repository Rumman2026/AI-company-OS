# CRM Architecture

Status: durable record of CRM Milestone 1 and Milestone 2 (this sprint).
See [DECISIONS.md](../../DECISIONS.md) ADR-0009 (persistence) and
ADR-0010 (multi-tenant foundation) for the full rationale, and
[`packages/core-models`](../../packages/core-models/README.md) /
[`packages/db`](../../packages/db/README.md) for implementation detail.

## What "CRM" means in this repository today

The owner's "Master Scope Consolidation" directive asks for an internal
CRM comparable in core capability to HubSpot (contacts, companies,
properties, leads, deals, jobs, estimates, appointments, calls, tasks,
campaigns, an authenticated owner interface, search/filter/reporting,
RBAC). That is a large system. **This document describes Milestone 1
only** — persistence for two of those entities, wired into GreenCal's
real production lead intake — and is honest about everything else being
not yet built, not "planned in a way that counts as done."

## What is actually implemented and verified (Milestone 1)

| Piece                                                                      | Status                                                                                                 |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `Contact`/`Lead`/`AuditLog` domain types + Lead state machine              | Already existed before this milestone (`packages/core-models`) — real, tested, unchanged               |
| `contacts`, `leads`, `audit_log` tables (Supabase, RLS, service-role only) | Implemented this milestone — `packages/db/migrations/001-crm-foundation.sql` (owner-run)               |
| `ContactRepository`, `LeadRepository`, `AuditLogRepository`                | Implemented and unit-tested this milestone (`packages/db`, 11/11 tests passing)                        |
| GreenCal intake wiring (best-effort Contact+Lead creation per new lead)    | Implemented and unit-tested this milestone (`supabase-resend-adapter.ts`, `crm-intake-adapter.ts`)     |
| `quote_leads.lead_id` link column                                          | Implemented this milestone (additive migration, owner-run) — see `supabase-migration-003-crm-link.sql` |

**Classification: IMPLEMENTED AND TESTED LOCALLY.** Not yet
`LIVE AND VERIFIED` in production — the two new migrations
(`packages/db/migrations/001-crm-foundation.sql` and
`apps/greencal-website/src/lib/quote-form/supabase-migration-003-crm-link.sql`)
have not been run against the real Supabase project yet (owner action,
see below), so no real `contacts`/`leads` row has actually been created
by a real customer submission as of this document.

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

- **Authenticated owner interface** (`apps/admin-console` remains an
  empty Phase 1 placeholder). Today, viewing or changing a `Lead`'s
  status requires either direct Supabase table access or a future
  milestone's UI/API.
- **RBAC beyond service-role-only access.** No Supabase Auth wiring, no
  owner-role RLS policy exists yet.
- **Companies, properties, deals, jobs, estimates, appointments, calls,
  communications, notes, tasks, campaigns, files/photos** — all defined
  as types in `packages/core-models` already (jobs, invoices, photos,
  review requests) but have **no persistence** yet.
- **Search, filtering, sorting, CSV export, activity-history views,
  reporting, tags, assignment.**
- **Job pipeline, estimate generation, and everything in the master
  directive's Systems 4–17** (Hostinger, pricing engine, Emma, Jervis,
  provider gateway expansion, SEO/AEO/GEO, Google Business Profile,
  Google Ads, outreach, website factory) — untouched by this milestone.

## Owner action required

Run these three migrations once, in the Supabase SQL Editor, **in this
order** (all are purely additive and documented as safe at any time):

1. `packages/db/migrations/001-crm-foundation.sql`
2. `apps/greencal-website/src/lib/quote-form/supabase-migration-003-crm-link.sql`
3. `packages/db/migrations/002-multi-tenant-foundation.sql`

Then set `CRM_BUSINESS_ID` in Vercel (Preview + Production) to the
seeded business row's id:
`select id from businesses where slug = 'greencal-pressure-washing';`

Until all three run and `CRM_BUSINESS_ID` is set, the best-effort
CRM-intake call in `supabase-resend-adapter.ts` will fail silently (by
design — a missing table or unset config produces the same kind of
tolerated failure as the existing best-effort
`markTestLead`/`markCustomerConfirmationStatus` calls) and no
`Contact`/`Lead` row will be created. **This never affects lead storage,
owner notification, or customer confirmation** — those are unrelated
existing paths this milestone did not touch.

## Next recommended milestone

Authenticated `apps/admin-console` UI (login/session, tenant-scoped
dashboard, Lead list + Lead detail) built directly on this tenant
foundation and the repositories both milestones already built — the
smallest slice that would let the owner actually see and act on CRM data
through a web page rather than the Supabase table editor.
