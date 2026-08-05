# GreenCal CRM V1 Release Readiness

Status: durable, actively maintained. Tracks what blocks CRM V1 from
being declared complete. See [ROADMAP.md](../../ROADMAP.md) for the
full cluster history and [docs/launch/OWNER_ACTIONS_REQUIRED.md](OWNER_ACTIONS_REQUIRED.md)
for pending owner actions.

## Critical blockers (must be resolved before CRM V1)

### BLOCKER-001: Booking creation fails in production with SQLSTATE 42501

**Status**: Open, deferred (owner decision) - not fixed, not silently
buried. CRM V1 cannot be declared complete while this is open.

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

## Release-readiness checklist (CRM V1)

| Area                                                           | Status                                                                       |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Lead                                                           | Live, verified                                                               |
| Estimate (create/approve/reject)                               | Live, verified this session                                                  |
| **Booking + Job creation**                                     | **BLOCKED - see BLOCKER-001**                                                |
| Job status progression                                         | Code-complete; not independently verified live (blocked on the above)        |
| Invoice + Payment                                              | Code-complete (Cluster 27); production verification pending real Job records |
| Review request                                                 | Code-complete (Cluster 28); production verification pending                  |
| Activity Timeline (incl. Invoice/Payment/Review entries)       | Code-complete (ADR-0039); production verification pending                    |
| Notes, Tasks, Media, Notifications, Settings, Service Packages | Previously verified live in production (pre-dates this session's incidents)  |

CRM V1 cannot be marked released while any row above is not
`Live, verified`.
