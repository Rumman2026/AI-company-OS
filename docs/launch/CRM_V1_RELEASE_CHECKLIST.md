# CRM V1 Release Checklist

Status: durable, actively maintained. **This file is the canonical current CRM
V1 release checklist.** Incident narrative, investigation records and history
stay in [CRM_V1_RELEASE_READINESS.md](CRM_V1_RELEASE_READINESS.md); owner-facing
actions stay in [OWNER_ACTIONS_REQUIRED.md](OWNER_ACTIONS_REQUIRED.md). Nothing
here is new scope - every line is extracted from those two documents.

## Release condition

CRM V1 cannot be marked released while any row below marked `Live, verified` is
not, or while the cross-tenant isolation suite has an unresolved failing
assertion. BLOCKER-002 is explicitly non-blocking per owner decision and does
not gate release.

## Checklist

| Area | Status |
| --- | --- |
| Lead | Live, verified |
| Estimate (create/approve/reject) | Live, verified |
| Booking + Job creation | Live, verified - BLOCKER-001 resolved |
| Job status progression | Live, verified (`draft -> scheduled` in production) |
| Invoice + Payment | Live, verified - creation, payment, Paid transition, persistence |
| Review request | Code-complete (Cluster 28); **production verification pending** |
| Activity Timeline (incl. Invoice/Payment/Review) | Code-complete (ADR-0039); **production verification pending** |
| Notes, Tasks, Media, Notifications, Settings, Service Packages | Previously verified live in production |
| Timestamp display (America/Los_Angeles) | Live, verified - commit `d05d65f` |
| Booking duplicate-prevention (app-layer) | Live - UI hides the form once a Booking exists |
| Booking duplicate-prevention (DB-layer constraint) | Deferred, low-priority - BLOCKER-002. Not release-blocking. |
| Cross-tenant isolation (Playwright E2E) | **8/9 production assertions passing; seeded-lead-own-tenant check FAILING (open)** |

## Open engineering work - this is what gates release

**Cross-tenant isolation: the seeded-lead-in-own-tenant check is failing.**
Steps 8-9 of `apps/admin-console/tests/e2e/tenant-isolation.e2e.spec.ts` assert
that a pre-seeded Tenant B Lead is visible only to Tenant B. Tenant B navigating
to its **own** Lead (`f217d64b-aeef-4a0e-8fb4-f33cedd36459`) gets an error
banner instead of the Lead:

```
Lead not found: Cannot coerce the result to a single JSON object.
```

That exact text is a PostgREST/Supabase error - a `.single()`-style query
returning zero or more than one row - not this app's normal not-found copy. It
is a real signal, not a test false-negative. Root cause not yet diagnosed. Per
the readiness document: if the Lead exists with the correct `business_id`, the
Lead-by-id read path (`apps/admin-console/src/pages/leads/[id].astro` and its
repository query) likely has a real `.single()`-on-unexpected-row-count bug
independent of RLS, needing code-level investigation rather than another SQL
round-trip.

## Resolved

- **BLOCKER-001** - booking creation failing in production with SQLSTATE
  `42501`. Resolved, confirmed live; migrations `033`, `034`, `035` all run
  against production. Root cause: missing `authenticated` base grants on
  `bookings` and `jobs`.

## Explicitly non-release-blocking

- **BLOCKER-002** - one orphan `Booking` row and no DB-level duplicate
  prevention. **Deferred, low-priority data-cleanup, NOT release-blocking**,
  downgraded by explicit owner decision. The app layer already prevents new
  duplicates.

## Owner-required, not engineering work

Current disposition only; [OWNER_ACTIONS_REQUIRED.md](OWNER_ACTIONS_REQUIRED.md)
is authoritative.

- **0f** - orphan-booking investigation, then migration `036` (BLOCKER-002).
  Owner action, and non-release-blocking.
- **1** - prevent Supabase auto-pause from silently killing lead capture
  (urgent).
- **3e, 4, 6, 7** - optional decisions; none required for v1.

## Deferred beyond v1

See [DEFERRED_PHASES.md](DEFERRED_PHASES.md).
