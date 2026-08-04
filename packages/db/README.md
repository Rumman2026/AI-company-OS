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

## Cluster 6: Company persistence + Contact→Company linking

`migrations/004-company-foundation.sql` adds `companies` (tenant-scoped,
same RLS pattern) and an additive `contacts.company_id` column, plus a
deferred `companies.primary_contact_id` FK (added via idempotent `DO`
block once both tables exist, mirroring the `bookings.job_id` circular-FK
pattern from Cluster 4). See DECISIONS.md ADR-0014 for why `Company` has
no state machine, unlike every other entity in this package.
`CompanyRepository` is create/get/list only. `ContactRepository` gained a
`companyId` list filter and a `linkCompany()` method.

## Cluster 7: Note persistence (polymorphic Lead/Contact/Company/Job attachment)

`migrations/005-note-foundation.sql` adds a single `notes` table
(tenant-scoped, append-only - select/insert RLS policies only) rather
than a table per entity. See DECISIONS.md ADR-0015 for why `entityType`
is a closed union enforced by a `check` constraint (Postgres cannot
express a real foreign key across the polymorphic `entity_type`/
`entity_id` reference - the repository layer is responsible for only
ever writing an `entity_id` that refers to a real, tenant-scoped row).
`NoteRepository` is create/list only.

## Cluster 8: Task persistence (boolean-complete, optional entity attachment)

`migrations/006-task-foundation.sql` adds a `tasks` table (tenant-scoped,
select/insert/update RLS - update is needed to mark a task complete).
See DECISIONS.md ADR-0016 for why `Task` has no state machine (a plain
`completed: boolean` plus `completeTask()`, same reasoning as `Company`)
and why its `entityType`/`entityId` (reusing `Note`'s
`NotableEntityType`) are optional together, unlike `Note`'s required
attachment. Two `check` constraints keep `entity_type`/`entity_id` and
`completed`/`completed_at` internally consistent at the database level.
`TaskRepository` is create/list/complete.

## Cluster 10: multi-role memberships

`migrations/007-multi-role-memberships.sql` adds `membership_roles`
(one row per `(membership_id, role)` pair) so a single Supabase Auth
user can hold more than one `MembershipRole` per business - fully
additive, `memberships` and its `(business_id, user_id)` unique
constraint are untouched. See DECISIONS.md ADR-0018.
`LeadRepository.transitionLeadStatusForRoles()` and
`JobRepository.transitionJobStatusForRoles()` are new methods (the
original single-actor `transitionLeadStatus`/`transitionJobStatus` are
unchanged) that try a transition against each of several candidate
`ActorCategory` values via `@ai-company-os/core-models`'
`resolveTransitionAcrossActorCategories()`.

## Cluster 12: PhotoAsset persistence (before/progress/after media)

`migrations/009-photo-foundation.sql` adds `photo_assets`/`photo_pairs`
plus a private `job-photos` Storage bucket with tenant-scoped RLS on
`storage.objects`. `MinimalSupabaseClient` widened to
`Pick<SupabaseClient, 'from' | 'storage'>` (additive). See DECISIONS.md
ADR-0020 for why every publication-readiness field is stored `false` -
no automated privacy pipeline exists in this repository.

## Cluster 13: Estimate approval status

`migrations/010-estimate-approval.sql` adds `status`/`approved_at` to
`estimates`. `EstimateRepository.approveEstimate()` is the only path
from `draft` to `approved`. See DECISIONS.md ADR-0021.

## Cluster 14: Audit log read access

`AuditLogRepository.listAuditRecords()` - no schema change; the RLS
policy making this safe already existed. See DECISIONS.md ADR-0022.

## Cluster 15: Archive/restore for Contacts, Companies, and Leads

`migrations/011-archive-support.sql` adds `archived_at` to `contacts`/
`companies`/`leads` only (not Estimates/Bookings/Jobs, which already
have terminal statuses for the same purpose). `ArchivableContact`/
`ArchivableCompany`/`ArchivableLead` (packages/db-layer intersection
types, not core-models changes) and `archiveX()`/`restoreX()` methods;
every `listX()` gains `includeArchived` (default `false`). See
DECISIONS.md ADR-0023.

## Cluster 17: Activity Timeline and actor tracking

`migrations/012-actor-tracking.sql` adds `created_by`/`completed_by`
(Task), `uploaded_by` (PhotoAsset), `created_by`/`approved_by`
(Estimate), and `created_by` (Booking) - closes a real gap blocking
"filterable by... employee." `ActivityTimelineRepository.listTimelineForContact()`
composes a Contact's complete chronological history at read time from
every existing repository - no separate event-sourcing table. See
DECISIONS.md ADR-0025 for the full design, including why
`TimelineEntryType` includes several event types
(Invoice/Payment/Call/SMS/Email/Review-request/Review-received) that
this repository cannot yet produce any entries for.

## Cluster 18: Estimate line items and service-package catalog

`migrations/013-estimate-line-items.sql` adds `service_packages` and
`estimate_line_items`. `EstimateLineItemRepository` enforces the same
"mutable only while draft" rule already established for `Estimate`
(ADR-0021) - `createLineItem()`/`deleteLineItem()` reject once the
parent Estimate is approved. See DECISIONS.md ADR-0026.

## Cluster 19: Estimate tax, discount, and deposit

`migrations/014-estimate-pricing.sql` adds five nullable columns to
`estimates`: `tax_rate_basis_points`, `discount_amount_minor_units` +
`discount_amount_currency`, `deposit_amount_minor_units` +
`deposit_amount_currency`. `EstimateRepository.setEstimatePricing()`
enforces the same "mutable only while draft" rule already established
for `Estimate` (ADR-0021/ADR-0026) - rejects once the estimate is
approved. Totals math (`calculateEstimateTotals()`) lives in
`packages/core-models`, not here - this package only persists the raw
rate/discount/deposit fields. See DECISIONS.md ADR-0027.

## Cluster 20: Estimate photo attachments

`migrations/015-estimate-attachments.sql` adds `estimate_attachments`
and a new private `estimate-attachments` Storage bucket.
`EstimateAttachmentRepository` reuses `PhotoAssetRepository`'s
upload/signed-URL pattern, but is a deliberately separate type/table
from `photo_assets` - an estimate attachment is always a private
reference image, never a candidate for public marketing use, so none
of `photo_assets`' publication-readiness columns apply. Not gated by
Estimate status - unlike line items and pricing, attaching a photo is
always allowed. See DECISIONS.md ADR-0028.

## What is deliberately excluded

An authenticated owner interface for Bookings (every other listed
entity now has one), full RBAC UI, CSV export/reporting, and any
automated media-processing pipeline (EXIF stripping, GPS removal,
face/plate detection, human review). GreenCal Mobile Detailing and
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
