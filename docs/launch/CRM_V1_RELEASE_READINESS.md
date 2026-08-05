# GreenCal CRM V1 Release Readiness

Status: durable, actively maintained. Tracks what blocks CRM V1 from
being declared complete. See [ROADMAP.md](../../ROADMAP.md) for the
full cluster history and [docs/launch/OWNER_ACTIONS_REQUIRED.md](OWNER_ACTIONS_REQUIRED.md)
for pending owner actions.

## Critical blockers (must be resolved before CRM V1)

### BLOCKER-001: Booking creation fails in production with SQLSTATE 42501

**Status**: **RESOLVED**, confirmed live in production. Kept below in
full for the historical record - do not delete this section.

**Resolution evidence**: after `migrations/034-restore-bookings-grant.sql`
and `035-restore-jobs-grant.sql` both ran, the owner reproduced the
exact original failing workflow live in the production admin-console:
"Create booking + job" completed successfully, producing a real
`Booking` row linked to a real `Job` row, with the Job's best-effort
`draft → scheduled` transition also succeeding (`"Scheduled 8/5/2026,
12:30 PM · Job: scheduled"` shown on the Lead detail page). Root
cause, confirmed by direct query evidence (not inferred): `authenticated`'s
base table-level `SELECT`/`INSERT`/`UPDATE` grants on `bookings` and,
separately, on `jobs`, had been stripped by the same still-undetermined
mechanism already documented in DECISIONS.md ADR-0035/ADR-0036 for
`memberships`/`businesses`/`membership_roles` - both tables showed the
identical fingerprint (`REFERENCES`/`TRIGGER`/`TRUNCATE` present,
`SELECT`/`INSERT`/`UPDATE`/`DELETE` absent) before their respective
grant-restoration migrations ran. RLS itself was never the problem on
either table - policies were confirmed correct throughout.

**All temporary diagnostic code has been removed** (commit reverting
`40ad4b1`/`ebaa5ab`/`459e4c8`/`cde1a92`/`f7f4611`'s route/repository
changes back to the pre-incident state - plain redirect-on-failure
behavior, no diagnostic logging beyond the permanent structured
error-path log pattern already used elsewhere in this codebase).
Confirmed via typecheck/lint/test/build all passing after the revert.

**Exact migrations that resolved this**: `033-bookings-jobs-policy-and-grants-recovery.sql`,
`034-restore-bookings-grant.sql`, `035-restore-jobs-grant.sql` - all
three confirmed run against `Greencal-production`.

**A related, separate, lower-severity issue was found while resolving
this** - see BLOCKER-002 below.

<details>
<summary>Full original incident record (historical - kept for reference)</summary>

**Status (at time of writing, now superseded)**: Open, deferred (owner
decision) - not fixed, not silently buried. CRM V1 could not be
declared complete while this was open.

**Exact failing workflow**: Lead detail page → approved Estimate →
"Create booking + job" → fails before either record is confirmed
usable end-to-end in production.

**Confirmed evidence** (from real production runtime logs and browser
responses, not inferred):

- The request reaches `apps/admin-console/src/pages/api/estimates/[id]/bookings.ts`'s
  `POST` handler (`entered createBooking route` log fires).
- `BookingRepository.createBooking()` (`packages/db/src/booking-repository.ts`)
  is entered (`createBooking: before insert` log fires, with the
  correct `authenticatedRole`/`authUid`/`businessId`/`estimateId`).
- The first INSERT into `public.bookings` fails.
- SQLSTATE `42501`.
- Visible application error: `permission denied for table bookings`.
- The full Postgrest error object (`code`/`message`/`details`/`hint`)
  has **not** been successfully captured - neither from Vercel Runtime
  Logs (the expanded payload could not be located/copied) nor from the
  browser-rendered diagnostic response (commit `f7f4611`) as of this
  writing.

**What has already been tried, in order**:

1. `migrations/033-bookings-jobs-policy-and-grants-recovery.sql` -
   reasserted `bookings_tenant_select/_insert/_update` RLS policies
   (confirmed present and correct via direct query) and granted
   `SELECT, INSERT, UPDATE` on `public.bookings` to `authenticated`.
   Confirmed run - error persisted.
2. `migrations/034-restore-bookings-grant.sql` - re-issued the
   identical grant statement, after a direct query showed
   `authenticated` held only `REFERENCES`/`TRIGGER`/`TRUNCATE` on
   `bookings` (not `SELECT`/`INSERT`/`UPDATE`/`DELETE`) - the
   fingerprint of a partial `REVOKE`, not an omission. Confirmed run -
   error persisted.
3. `40ad4b1` - structured error-path logging inside
   `BookingRepository.createBooking()` (permanent).
4. `ebaa5ab` - runtime-identity diagnostic (Supabase project
   hostname/ref, client type, auth uid, roles) logged before the
   insert (temporary).
5. `459e4c8` - unconditional entry log as the literal first statement
   in the route handler (temporary).
6. `cde1a92` - structured pre-insert log (table/operation/role/uid/
   business/estimate) plus an explicit success/failure log immediately
   after the insert (temporary).
7. `f7f4611` - widened `CreateBookingResult`'s failure variant with
   optional `code`/`details`/`hint` fields, and changed the route to
   return the full error object as a JSON HTTP response instead of
   redirecting, specifically because the Vercel Runtime Logs payload
   could not be captured. **Not yet confirmed working** - the last
   reported browser output was the example JSON from this document's
   own instructions, copied verbatim (including the literal `"..."`
   placeholders), not real observed values.

**Current unresolved questions**:

- The actual `code`/`message`/`details`/`hint` values for this
  specific 42501 have never been directly observed by anyone in this
  investigation - every attempt to capture them (Vercel log
  inspection, then a browser-rendered diagnostic) has returned
  template/placeholder text instead of real data. It is not yet known
  whether this is a tooling/access problem on the reporting side, or
  whether the diagnostic response itself is not actually reaching the
  browser as intended.
- Whether `bookings` is affected by the same "partial REVOKE"
  mechanism already seen on `memberships`/`businesses`/
  `membership_roles`/`leads`/`estimates` (ADR-0035, ADR-0036, and the
  `leads`/`estimates` incidents this same session) - a real
  mechanism affecting at least 6 tables now, still not determinable
  from this repository (no Supabase dashboard/audit-log access).
- Whether the `f7f4611` diagnostic response is actually being served
  by the deployment the owner is testing against - unconfirmed.

**Exact files and routes involved**:

- `apps/admin-console/src/pages/leads/[id].astro` - the "Create
  booking + job" form (`action="/api/estimates/${id}/bookings"`).
- `apps/admin-console/src/pages/api/estimates/[id]/bookings.ts` - the
  `POST` handler; currently returns a temporary JSON diagnostic
  response (not a redirect) when the booking insert fails.
- `packages/db/src/booking-repository.ts` - `BookingRepository.createBooking()`,
  where the INSERT itself executes and the error is first observed.
- `packages/db/migrations/033-bookings-jobs-policy-and-grants-recovery.sql`,
  `034-restore-bookings-grant.sql` - the grant/policy fixes already
  applied to production.

**Reproduction steps**:

1. Log into the production admin-console as the GreenCal owner
   account.
2. Navigate to a Lead with an **approved** Estimate.
3. Fill in a date/time in "Schedule the approved estimate for."
4. Click **Create booking + job**.
5. Observe the failure (currently: a JSON diagnostic response; prior
   to `f7f4611`: a redirect back to the Lead page with
   `?error=permission%20denied%20for%20table%20bookings`).

**Required final acceptance test** (all must pass before this blocker
is closed):

1. The full `{code, message, details, hint}` object for this specific
   failure is captured and reviewed.
2. The root cause is identified with evidence (not inferred) as one
   of: missing INSERT privilege, failing RLS `WITH CHECK`, failing
   `SELECT` during `insert().select()`, or another specific,
   named cause.
3. The smallest correct fix is applied and confirmed run against
   production.
4. "Create booking + job" succeeds end-to-end from the real
   admin-console UI, producing a real `Booking` row linked to a real
   `Job` row.
5. The Job appears correctly on its own detail page and on the
   originating Lead's page.
6. All temporary diagnostic code (items 4-7 above, each marked
   "temporary" in its own commit) is removed and the route restored to
   its normal redirect-based behavior, confirmed via a clean
   `git diff` against the pre-incident version plus passing
   typecheck/lint/test/build.

**Standing rules while this blocker is open** (per owner directive):

- Do not build new work on top of an assumption that booking/job
  creation succeeds in production.
- Any feature requiring a real `Job` record must use an isolated,
  clearly-marked test fixture or seeded record - never a live
  production booking/job created through the broken path.
- Do not weaken RLS or use the service-role key in the browser to
  bypass this blocker.
- Do not remove the existing diagnostic evidence (items 3-7 above)
  until the acceptance test above passes.
- CRM V1 is **not** complete until this blocker is fixed and the full
  Lead → Estimate → Booking → Job → Invoice → Payment workflow passes
  end-to-end in production.

</details>

### BLOCKER-002: Orphan Booking with no linked Job, and no DB-level duplicate prevention

**Status**: **Deferred - low-priority data-cleanup task, NOT release-blocking.**
Downgraded by explicit owner decision after multiple SQL-diagnostic
round-trips produced no new information beyond what was already
confirmed. No further engineering time is being spent on this until
it is explicitly picked back up.

- **Description**: one orphan `Booking` row
  (`1e825d58-1182-46ca-81dd-cf4d07ad6a5c`, `job_id IS NULL`) exists in
  production for Estimate `cb1a14bf-11d0-4d6f-bb69-e113572e29bf`,
  alongside the real, successfully job-linked Booking
  (`0b537df0-4906-4dc8-a668-516e90968493`,
  `job_id = 71d8129f-f497-41be-a2a3-5f23bac7ab2b`) for the same
  Estimate.
- **Current evidence**: confirmed via direct query -
  `select estimate_id, count(*) from bookings group by estimate_id having count(*) > 1;`
  returns exactly one row (this Estimate, count 2). No other
  duplicate exists anywhere else in the table.
- **Possible root cause**: an earlier "Create booking + job" attempt
  during the BLOCKER-001 incident reached the `bookings` INSERT
  successfully (in a brief window where that table's grant happened
  to be present) but failed at the `jobs` INSERT (which still lacked
  its own grant at that point), leaving a Booking with no Job.
- **Proposed future fix**: run the single-row `DELETE` already drafted
  in this document's git history (scoped by exact `id` +
  `estimate_id` + `job_id is null`, three-way guarded against ever
  touching the real booking), confirm no duplicate `estimate_id`
  values remain, then run `migrations/036-bookings-one-per-estimate.sql`
  to add the `unique(estimate_id)` constraint.
- **Why it is not release-blocking**: it is one inert, orphaned row
  with no Job attached - nothing in the application reads or displays
  it in a way that could confuse a user or corrupt a workflow (the
  Lead page only shows "Job: {status}" when a `job_id` is present,
  and the admin-console UI already hides the "Create booking + job"
  form for this Estimate specifically because a Booking already
  exists for it - both the real one and this orphan). It is
  historical noise, not a functional defect. The CRM workflow itself
  (Lead → Estimate → Booking → Job → ...) is fully operational.

**How it happened**: during the BLOCKER-001 investigation, at least
one earlier "Create booking + job" attempt against the same approved
Estimate reached the `bookings` INSERT successfully (in a window where
that table's grant happened to be present) but failed at the `jobs`
INSERT (which still lacked its grant at that point) - leaving a real
`Booking` row with `job_id = null` and no corresponding `Job`. Nothing
in the schema or application code prevented a second, later attempt
against the same Estimate from creating a second Booking once both
grants were fixed - which is exactly what happened (the working
Booking shown in the resolution evidence above is a second, separate
row from the orphan).

**Fixes applied**:

1. **Application layer**: the Lead detail page
   (`apps/admin-console/src/pages/leads/[id].astro`) now hides the
   "Create booking + job" form once the approved Estimate already has
   a Booking (of any kind, orphaned or fully linked) - shows a message
   pointing to the existing Booking/Job in the list above instead.
2. **Database layer**: `migrations/036-bookings-one-per-estimate.sql`
   adds `unique (estimate_id)` on `bookings` - the authoritative,
   race-condition-proof enforcement. **This migration must not be run
   until the orphan-booking investigation query below confirms no two
   existing `bookings` rows share the same `estimate_id`** - Postgres
   validates all existing rows against a new unique constraint, so it
   will fail outright (correctly) if a real duplicate still exists.

**Orphan-booking investigation** (read-only, run in Supabase SQL
Editor):

```sql
select b.id as booking_id, b.estimate_id, b.job_id, b.scheduled_at, b.created_at,
       e.status as estimate_status, e.summary as estimate_summary,
       l.id as lead_id
from bookings b
join estimates e on e.id = b.estimate_id
join leads l on l.id = b.lead_id
where b.job_id is null
order by b.created_at;
```

This finds every Booking with no linked Job (the orphan should be
exactly one row here, dated around 8/13/2026 per the scheduled time
reported) and shows its `estimate_id` directly, so it's possible to
confirm whether it shares an `estimate_id` with any other Booking:

```sql
select estimate_id, count(*) as booking_count
from bookings
group by estimate_id
having count(*) > 1;
```

If this second query returns any rows, migration 036 cannot be run
until those duplicates are resolved (see below). If it returns zero
rows, migration 036 is safe to run immediately.

**Proposed safest cleanup/repair** (do not delete automatically - this
is real production data, however incomplete):

- **Option A (recommended if the orphan's Estimate is the same one now
  correctly booked)**: leave the orphan Booking row in place as a
  historical record of the failed attempt (it is harmless - nothing
  reads or displays a Booking with no Job in a way that would confuse
  a user, since the Lead page already only shows "Job: {status}" when
  a `job_id` is present), but manually create the missing Job for it
  **only if** it turns out to be a different Estimate than the one
  already successfully booked - reconcile by comparing `estimate_id`
  values from the query above.
- **Option B**: if the orphan is confirmed to be a duplicate attempt
  against the _same_ Estimate that already has a working Booking+Job,
  it is genuinely a leftover artifact of the incident with no
  independent value - delete only that specific row by its exact
  `booking_id` (never a bulk delete), after the owner explicitly
  confirms which row via the investigation query's output.
- Do not guess which option applies without running the query above
  first.

## Release-readiness checklist (CRM V1)

| Area                                                           | Status                                                                      |
| -------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Lead                                                           | Live, verified                                                              |
| Estimate (create/approve/reject)                               | Live, verified this session                                                 |
| **Booking + Job creation**                                     | **Live, verified** - BLOCKER-001 resolved                                   |
| Job status progression                                         | Live, verified (best-effort `draft → scheduled` succeeded in production)    |
| Invoice + Payment                                              | Code-complete (Cluster 27); production verification in progress             |
| Review request                                                 | Code-complete (Cluster 28); production verification pending                 |
| Activity Timeline (incl. Invoice/Payment/Review entries)       | Code-complete (ADR-0039); production verification pending                   |
| Notes, Tasks, Media, Notifications, Settings, Service Packages | Previously verified live in production (pre-dates this session's incidents) |
| Booking duplicate-prevention (app-layer)                       | Live - UI hides the form once a Booking exists for an Estimate              |
| Booking duplicate-prevention (DB-layer constraint)             | Deferred, low-priority - see BLOCKER-002. Not release-blocking.             |

CRM V1 cannot be marked released while any row above marked
`Live, verified` is not - BLOCKER-002 is explicitly non-blocking per
owner decision and does not gate release.
