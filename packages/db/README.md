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

## Cluster 21: Estimate PDF generation

No schema or repository change - `apps/admin-console`'s
`/estimates/[id]/print` route reads the existing `EstimateRepository`
and `EstimateLineItemRepository` and renders a browser-printable HTML
page. See DECISIONS.md ADR-0029.

## Cluster 22: Customer estimate-approval link

`migrations/017-estimate-customer-approval.sql` adds
`customer_approval_token` (unique, nullable), `customer_approval_token_expires_at`,
`customer_approved`, and `customer_signature_name` to `estimates`. No
RLS carve-out for anonymous access - the public route uses the
service-role key (bypasses RLS entirely), the same trusted-server
pattern `apps/greencal-website`'s public quote intake already uses.
`EstimateRepository.generateCustomerApprovalLink()` is staff-only and
tenant-scoped; `getEstimateByPublicToken()` and
`approveEstimateByCustomerToken()` are token-only (no `businessId` -
the token itself is the authorization). `EstimateLineItemRepository.listLineItemsByPublicToken()`
resolves the estimate via the same token first, so it can never leak
another estimate's line items. See DECISIONS.md ADR-0030.

`migrations/016-estimates-update-policy-fix.sql` fixes a real,
pre-existing gap found while building this: `estimates` never had a
tenant-scoped UPDATE RLS policy, even though `approveEstimate()`
(ADR-0021) and `setEstimatePricing()` (ADR-0027) both already update
it - real RLS would have silently no-op'd both; the local fake
Supabase test double doesn't enforce RLS, so this was invisible to
tests until now.

## Cluster 23: Settings — business profile, branding, service areas, working hours

Four new/extended `packages/db`-only types (not `packages/core-models`

- `businesses` is the tenant boundary itself, never a domain entity,
  always a plain `businessId: string`): `BusinessProfileRepository`
  (name/address/contact fields plus logo/color -
  `migrations/018-business-profile.sql` and
  `migrations/019-business-branding.sql`, the latter also adding a
  private `business-logos` Storage bucket),
  `BusinessServiceAreaRepository` (`migrations/020-business-service-areas.sql`),
  and `BusinessHoursRepository` (`migrations/021-business-hours.sql`,
  one row per day of week, saved via a single `upsert()` batch). See
  DECISIONS.md ADR-0031.

## Cluster 24: Team roster and role management

`migrations/022-team-roster.sql` broadens `memberships`/`membership_roles`
SELECT visibility with an _additional_ tenant-scoped policy (the
original own-row policies are kept, not dropped - the new policy's
subquery depends on them), adds a denormalized `memberships.user_email`
(backfilled from `auth.users.email` once, in the migration itself),
and adds owner-admin-gated INSERT/DELETE policies on `membership_roles`.
`TeamRosterRepository.grantRole()`/`revokeRole()` check
`actingUserRoles.includes('owner-admin')` at the application layer too
(clean error message; the RLS policy is the real enforcement);
`revokeRole()` also refuses to remove a business's last remaining
`owner-admin`. See DECISIONS.md ADR-0032.

## Cluster 26: Internal notifications and a notification center

`migrations/023-notifications.sql` adds `notifications` -
**per-recipient, not a shared business inbox**: RLS scopes
select/update to `recipient_user_id = auth.uid()`. `NotificationRepository`
is create/list/mark-read only (no state machine, same as Task).
`channel`/`event_type` are stored as free strings validated by a
database `check` constraint against `packages/core-models`'
`NotificationChannel`/`NotificationEventType` closed unions - only
`'in-app'`/`'estimate-customer-approved'` are ever actually written
today. `EstimateRepository.getEstimateByPublicToken()`/
`approveEstimateByCustomerToken()` now also return a `businessId`
alongside the `Estimate` (repository-internal detail, not added to the
domain type) so the public approval route can resolve the team roster
to notify. See DECISIONS.md ADR-0034.

## Post-launch fix: infinite RLS recursion on `memberships`/`membership_roles`

`migrations/024-fix-membership-rls-recursion.sql` - real production
incident (`42P17`, diagnosed live against the deployed app). Two of
migration 022's policies were self-referential (a policy on table T
whose own subquery also queries T), which Postgres cannot evaluate and
rejects outright rather than hanging. Fixed via two new
`SECURITY DEFINER` helper functions (`get_my_business_ids()`,
`is_owner_admin_for_business()`) - the first custom Postgres functions
in this schema - that resolve the caller's own membership without
re-invoking RLS, breaking the cycle while preserving the exact same
authorization result. See DECISIONS.md ADR-0035, which also corrects
ADR-0032's flawed reasoning about why the original policy pairing was
believed safe.

Two further incidents surfaced immediately after: `migrations/025-restore-memberships-select-grant.sql`
and `migrations/026-restore-membership-roles-select-grant.sql` each
restore a missing base table-level `SELECT` grant for `authenticated`
(Postgres `42501` - a privilege layer separate from and evaluated
before RLS). See DECISIONS.md ADR-0036. All three migrations are
confirmed run against production; `getCurrentMembership()` and the
admin-console dashboard work correctly.

## Cluster 27: Invoice + Payment persistence

`migrations/027-invoice-payment-persistence.sql` adds tenant-scoped
`invoices` (RLS with select/insert/update from creation - unlike
`estimates`' migration-016 gap, `update` ships from the start) and
`payments` (append-only - select/insert only, no update/delete, since
it is an immutable payment-outcome fact log, not a mutable entity).
`InvoiceRepository` (`createInvoice`, `getInvoice`, `listInvoices`,
`transitionInvoiceStatusForRoles`) mirrors `JobRepository` exactly,
including reuse of `resolveTransitionAcrossActorCategories()` for
role-fallback authorization against `packages/core-models`'
already-implemented `transitionInvoice()` state machine, and one audit
record per successful transition via the injected
`AuditLogRepository`. `PaymentRepository` (`createPayment`,
`listPaymentsForInvoice`) takes no audit-log dependency - `Payment` has
no state machine. See DECISIONS.md ADR-0037.

## Cluster 28: Review-Request + Review-Record persistence

`migrations/028-review-request-persistence.sql` adds tenant-scoped
`review_requests` (RLS select/insert/update, plus a
`unique (business_id, deduplication_key)` constraint enforcing
`ReviewRequest.deduplicationKey`'s documented no-duplicates purpose at
the database layer) and `review_records` (append-only, mirrors
`payments` - an immutable, staff-entered fact log, never a live
review-platform integration). `ReviewRequestRepository`/
`ReviewRecordRepository` mirror `InvoiceRepository`/
`PaymentRepository` exactly. Nearly every `ReviewRequest` transition
requires `actorCategory: 'automation'`, which no real membership role
resolves to - only `opted-out` (customer/office-manager) is reachable
from a real caller today, same intentional-unreachability pattern as
Invoice's `Overdue` edge (Cluster 27). Content (the AI-drafting/
publishing pipeline) was evaluated and explicitly deferred to Phase 2

- its state machine requires actor roles that don't exist in this
  application. See DECISIONS.md ADR-0038.

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
