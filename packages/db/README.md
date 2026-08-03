# DB Package

Persistence for the domain model already defined in
[`@ai-company-os/core-models`](../core-models/README.md) - read that
package's README first. This package does not define entities or business
rules; it only stores and retrieves what core-models already models, and
routes every state change through core-models' own state machines.

See [DECISIONS.md](../../DECISIONS.md) ADR-0009 (persistence engine, why
new tables rather than repurposing GreenCal's `quote_leads`) and ADR-0010
(multi-tenant foundation) for the full rationale and what is explicitly
deferred.

## What this package contains (Milestone 1 + Milestone 2)

- `migrations/001-crm-foundation.sql` - `contacts`, `leads`, and
  `audit_log` tables. Hand-written SQL, run once by the owner in the
  Supabase SQL Editor - there is no migration-runner tool, matching the
  only precedent already proven in production
  (`apps/greencal-website`'s `supabase-schema.sql`).
- `migrations/002-multi-tenant-foundation.sql` - `businesses`,
  `memberships` tables; `business_id` added to every CRM table above;
  tenant-scoped RLS policies for the `authenticated` role (see ADR-0010).
- `ContactRepository` (`contact-repository.ts`) - find-or-create a
  `Contact` by phone or email, scoped to a `businessId`.
- `LeadRepository` (`lead-repository.ts`) - create a `Lead` at its initial
  `new` status, and transition an existing `Lead`'s status, both scoped
  to a `businessId`. Every transition calls core-models'
  `transitionLead()` - this package never writes a status value that
  function didn't return.
- `AuditLogRepository` (`audit-log-repository.ts`) - persists exactly the
  `ProposedAuditRecord` a state-machine transition returns, scoped to a
  `businessId`.
- `MembershipRole` (`membership-types.ts`) - the human-actor subset of
  core-models' `ActorCategory` that a real admin-console user's role can
  hold.
- `createDbClient()` - a thin Supabase client factory, constructed only
  from a trusted server context with the service-role key.

Every repository call requires an explicit `businessId` - this is
defense in depth, not just decoration: the service-role key bypasses RLS
entirely, so the repository layer's own filtering is what actually
prevents a cross-tenant leak on that path (RLS handles it for an
authenticated admin-console session).

## Cluster 4: Estimate/Booking/Job persistence

`migrations/003-job-pipeline-foundation.sql` adds `estimates`,
`bookings`, `jobs` - tenant-scoped exactly like `contacts`/`leads`. See
DECISIONS.md ADR-0012 for why all three were added together (`Job` and
`Booking` both have required foreign keys one level up the chain -
`Job.bookingId`, `Booking.estimateId` - so a schema-correct `Job` cannot
exist without the others). `EstimateRepository`/`BookingRepository` are
create/get/list only (no state machine exists for those two entities in
core-models); `JobRepository` mirrors `LeadRepository` exactly, routing
every status change through core-models' `transitionJob()`.

## What is deliberately excluded

An authenticated owner interface for Estimates/Bookings/Jobs (no UI yet

- persistence only), the actual Lead→Estimate→Booking→Job creation
  workflow (no app calls `createEstimate`/`createBooking` yet), full RBAC
  UI, companies/tasks/appointments/notes/media persistence,
  search/filtering/CSV export/reporting. GreenCal Mobile Detailing and
  Navarro Builders are not onboarded as real tenants - only the schema's
  capacity to support them exists. See `docs/crm/CRM_ARCHITECTURE.md` for
  the full status breakdown.

## Security model

Row Level Security is enabled on every table. The service-role key
(server-only) bypasses RLS entirely, as before. The `authenticated` role
gets tenant-scoped policies (`business_id` must match a `memberships` row
for the calling `auth.uid()`) on `contacts`/`leads`/`businesses`/
`memberships`; `audit_log` has a `select`-only policy - no client can
ever insert an audit record directly. Never construct `createDbClient()`
from browser-reachable code.

## Scripts

- `pnpm run lint` - ESLint
- `pnpm run typecheck` - `tsc --noEmit`
- `pnpm run test` - `tsx --test "tests/**/*.test.ts"` (Node's built-in test
  runner, same pattern as `@ai-company-os/core-models` and
  `@ai-company-os/audit-logger`)
- `pnpm run format` - Prettier
