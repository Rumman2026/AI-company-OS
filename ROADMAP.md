# Roadmap

Status: durable reference, not auto-loaded. Read before assuming a phase is
complete. See [docs/INDEX.md](docs/INDEX.md) for routing.

## Completed work (repository evidence)

**Phase 1 — Repository scaffold** (commit `62a1abe`, initial commit)

- pnpm workspace monorepo structure (`apps/*`, `packages/*`).
- TypeScript, ESLint, Prettier, Husky/lint-staged tooling configured at the
  root.
- Placeholder apps: `api-gateway`, `core-api`, `agent-orchestrator`,
  `worker-service`, `web-console`, `admin-console`, `docs-portal` — each
  with a minimal entry point and `Dockerfile`, no business logic.
- Placeholder packages: `auth`, `db`, `core-models`, `agent-sdk`,
  `toolkit`, `telemetry`, `platform-utils`, `ui-kit` — each with a minimal
  entry point, no implementation.
- `docker-compose.dev.yml` wiring all placeholder services together for
  local development.
- Documentation, config, infra, and test directory structure created with
  planning `README.md` files (`docs/`, `config/`, `infra/`, `tests/`).
- CI skeleton (`.github/workflows/ci.yml`) running lint and typecheck.
- Claude Code instruction system: root `CLAUDE.md`, `.claude/rules/`,
  `.claude/skills/`, and this set of durable reference docs.

## Current phase

**Phase 1 (scaffold)** — no business logic has been implemented. This is
the present state; do not describe later phases as started without new
repository evidence.

**Phase 2A (in progress) — GreenCal Pressure Washing website, revenue-launch sprint**

- Scope: `apps/greencal-website`, an Astro site with one on-demand server
  route. See [DECISIONS.md](DECISIONS.md) ADR-0004 (dedicated app),
  ADR-0005 (production domain), ADR-0006 (Vercel/Supabase/Resend stack),
  ADR-0007 (approved service/city scope).
- Phase 2A is additive and independent of Phase 2 (shared platform
  primitives, below) — it does not depend on auth, a database, or core
  domain models, and its existence does not mean Phase 2 has started.
  Phase 2A does not resolve Phase 3's "which business" designation for
  GreenCal Mobile Detailing or Navarro Builders — those remain open.
- Implemented with repository evidence: the approved residential (3),
  commercial (7), and multi-family/HOA (2) service pages; an 80-city
  service-area directory (`/service-areas`, three indexable county pages;
  individual city pages render but stay `noindex`/unpublished pending
  real per-city content, per ADR-0007); an accessible `/contact-us` quote
  form with a typed, provider-neutral submission boundary (Stage 3); and
  a live server-side delivery path to Supabase (lead storage) and Resend
  (owner notification) via the ADR-0006 stack, deployed on Vercel at
  `https://www.greencalpressurewashing.com` (production deployment
  `a6ff791`, verified `READY`, 2026-07-24).
- **Stage 4B credential activation is done and verified live**
  (2026-07-26): real Supabase and Resend credentials are configured in
  Vercel for both Preview and Production; `main` is Vercel's Production
  Branch. A single controlled test lead reached
  `https://www.greencalpressurewashing.com/api/quote-submit` and
  returned the honest `success` state with a real Supabase row and a
  real Resend notification confirmed — no fabricated result, no
  runtime errors. See
  `apps/greencal-website/src/lib/quote-form/README.md`'s "Production
  verification record" for the lead id and the three configuration
  defects (network, schema-cache, grants) found and fixed along the
  way. Not yet independently verified: an actual live duplicate-
  submission (idempotent-replay) test — unit-tested only so far.
- No About, reviews, blog, or gallery content exists. Service pages
  carry `Service`-type structured data (`ServiceStructuredData.astro`),
  scoped to the approved service list only — no `LocalBusiness`/
  `ProfessionalService` structured data exists, per the unresolved NAP
  restriction in `.claude/rules/websites.md`.

**Cloud infrastructure preparation (in progress) — provider-neutral AI gateway/router scaffold**

- Scope: repository-preparation only. See [DECISIONS.md](DECISIONS.md)
  ADR-0008 for the full decision record.
- Implemented with repository evidence: provider-neutral contracts in
  `packages/agent-sdk`; placeholder (non-network-calling) adapters for
  the 7 approved AI providers in `packages/provider-adapters`; a
  deterministic-first task router in `packages/task-router`; supporting
  packages `context-builder`, `semantic-cache`, `policy-engine`,
  `job-queue`, `audit-logger`, `cost-controller`; new apps
  `apps/ai-gateway` and `apps/jervis-api`; agent-worker execution added
  to the existing `apps/worker-service`; Docker Compose templates for a
  future Hostinger VPS stack in `infra/docker`, `infra/hostinger`,
  `infra/monitoring`, `infra/backups`; the GreenCal Website and Lead
  Health Agent design in `docs/agents/`; and the `docs/cloud/*` reference
  set.
- This is additive and independent of Phase 2A (GreenCal website) and
  the Growth-system domain contracts track below — no shared code with
  either yet.
- **Not done**: no AI provider account is connected, no real API call has
  been made, no Hostinger VPS is provisioned, and nothing in this track
  is deployed. See ADR-0008's scope note.

**Cluster 9 (implemented, tested locally) — agent orchestrator: named-agent authorization (ADR-0017)**

- Scope: see [DECISIONS.md](DECISIONS.md) ADR-0017.
- Implemented with repository evidence: `apps/agent-orchestrator`
  (previously an empty Phase 1 placeholder) now authorizes which named
  agent (`emma`, `estimate-agent`, `scheduling-agent`,
  `operations-agent`, `review-agent`, `seo-agent`, `media-agent`,
  `followup-agent` - `src/agent-registry.ts`) may handle a given task
  type, before anything reaches the job queue or a provider - an
  unauthorized pairing is rejected and audit-logged, never enqueued
  (7/7 `apps/agent-orchestrator` tests passing). A new shared
  `RoutedTaskJob` type in `packages/task-router` replaces a private,
  duplicated copy in `apps/worker-service`; `apps/worker-service` now
  threads the job's real `agentId`/`businessId` into `routeTask()`
  instead of a hardcoded literal, fixing cost/audit misattribution.
- Lint and typecheck pass repo-wide; `packages/task-router` and
  `apps/worker-service`'s existing tests still pass unchanged.
- **Not done**: no real provider network call, no Emma voice/chat
  implementation, no Hermes. Every placeholder adapter still returns
  `not-implemented` (see `packages/provider-adapters`), so dispatching
  any real task today honestly resolves to `not-implemented`, not a
  fabricated success - this is expected Phase 1 fidelity, not a bug.

**Cluster 10 (implemented, tested locally) — multi-role memberships (ADR-0018)**

- Scope: see [DECISIONS.md](DECISIONS.md) ADR-0018 and
  `docs/crm/CRM_ARCHITECTURE.md`.
- Implemented with repository evidence: a new `membership_roles` child
  table (`packages/db/migrations/007-multi-role-memberships.sql`,
  fully additive - `memberships` and its `(business_id, user_id)`
  unique constraint are untouched); `packages/core-models` gained
  `resolveTransitionAcrossActorCategories()` (100/100 tests passing,
  including the new resolution-logic tests); `LeadRepository`/
  `JobRepository` each gained a `transitionXStatusForRoles()` method
  alongside the original, unmodified single-actor method (44/44
  `packages/db` tests passing); `apps/admin-console`'s
  `CurrentMembership.role` became `CurrentMembership.roles:
MembershipRole[]`, with a fallback to the legacy `memberships.role`
  column so an unmigrated Supabase project keeps working unchanged.
  Resolves the ADR-0013 known limitation (owner-admin-only membership
  couldn't also act as office-manager) per explicit owner direction.
- Lint, typecheck, a local production build, and unit tests all pass.
- **Not done**: migration 007 has not yet been run against production
  (owner action, queued behind 004-006). Until it runs, the owner's
  account keeps resolving to its single existing `owner-admin` role via
  the fallback path.

**Cluster 11 (implemented, tested locally) — GreenCal Mobile Detailing / Navarro Builders multi-tenant CRM scaffolding (ADR-0019)**

- Scope: see [DECISIONS.md](DECISIONS.md) ADR-0019.
- Implemented with repository evidence: `businesses` rows for both
  businesses (name/slug only - the name is an already-approved fact
  from `BUSINESSES.md`, the slug is a technical identifier derived from
  it, not a fabricated business fact), making the entire existing CRM
  (Leads/Jobs/Companies/Notes/Tasks, every `apps/admin-console` screen)
  immediately usable for either business the moment a real owner
  membership is created - the framework was already fully
  tenant-generic (confirmed: zero hardcoded `greencal-pressure-washing`
  references anywhere in `apps/admin-console`'s CRM code).
- **Deliberately not built, and why**: a public marketing website for
  either business (like `apps/greencal-website`). `BUSINESSES.md`
  currently and correctly states neither business has a dedicated
  repository module, and `.claude/rules/websites.md` explicitly warns
  against designing a shared multi-business template prematurely. "The
  same framework as GreenCal Pressure Washing" is interpreted here as
  the multi-tenant CRM architecture (ADR-0010) specifically, not a
  second/third marketing website - that is a materially different,
  larger, separately-scoped deliverable (its own app, its own domain,
  its own eventual Vercel deployment with the tslib packaging
  complexity already documented at length in
  `apps/greencal-website/astro.config.mjs`) that was not inferred from
  this instruction alone. Flagged back to the owner rather than guessed.
- **Not done**: no owner/staff Supabase Auth user or membership exists
  for either business yet (a real owner action, not something to
  fabricate).

**Cluster 12 (implemented, tested locally) — PhotoAsset persistence, before/progress/after media (ADR-0020)**

- Scope: see [DECISIONS.md](DECISIONS.md) ADR-0020. Closes a named gap
  in the owner's core GreenCal workflow.
- Implemented with repository evidence: `PhotoAsset.kind` widened to
  include `'progress'`; `photo_assets`/`photo_pairs` tables plus a
  private `job-photos` Supabase Storage bucket with tenant-scoped RLS
  (`packages/db/migrations/009-photo-foundation.sql`);
  `PhotoAssetRepository` (52/52 `packages/db` tests passing total,
  including 3 new photo tests); `apps/admin-console` Job detail page
  gains a Media section (upload + signed-URL gallery).
- Lint, typecheck, a local production build, and unit tests all pass.
- **Not done**: migration 009 has not yet been run against production
  (owner action). No automated privacy-processing pipeline exists (EXIF
  stripping, GPS removal, face/plate detection, human review) - every
  uploaded photo is honestly stored as not-yet-publishable.

**Cluster 13 (implemented, tested locally) — Estimate approval status (ADR-0021)**

- Scope: see [DECISIONS.md](DECISIONS.md) ADR-0021.
- Implemented with repository evidence: `Estimate` gains
  `status: 'draft' | 'approved'` and `approvedAt?` (no state machine);
  `EstimateRepository.approveEstimate()`; `apps/admin-console`'s
  booking-creation route now requires an approved estimate, enforced
  server-side.
- Lint, typecheck, a local production build, and unit tests all pass.
- **Not done**: migration 010 has not yet been run against production
  (owner action). No estimate-editing feature exists yet (so the
  "revision controls" requirement is satisfied by there being nothing
  to silently edit) - a future edit feature must create a new Estimate
  row rather than mutate one in place.

**Cluster 14 (implemented, tested locally) — Audit log read access (ADR-0022)**

- Scope: see [DECISIONS.md](DECISIONS.md) ADR-0022.
- Implemented with repository evidence: `AuditLogRepository.listAuditRecords()`
  (no schema change - the RLS policy already existed); `apps/admin-console`
  gains an `/audit-log` page with an entity-type filter.
- Lint, typecheck, a local production build, and unit tests all pass.

**Cluster 15 (implemented, tested locally) — Archive/restore for Contacts, Companies, Leads (ADR-0023)**

- Scope: see [DECISIONS.md](DECISIONS.md) ADR-0023. Closes the
  "Archive... Restore where appropriate" gap named for every
  admin-console module in the owner's directive.
- Implemented with repository evidence: `archived_at`
  (`packages/db/migrations/011-archive-support.sql`) on `contacts`/
  `companies`/`leads` only; `Archivable{Contact,Company,Lead}`
  (packages/db-layer intersection types, not core-models changes);
  `archiveX()`/`restoreX()` methods; every `listX()` gains
  `includeArchived` (55/55 `packages/db` tests passing total).
  `apps/admin-console`: "Show archived" checkbox on each list page,
  Archive/Restore button on each detail page.
- Lint, typecheck, a local production build, and unit tests all pass.
- **Not done**: migration 011 has not yet been run against production
  (owner action). Archive/restore not added to Estimates/Bookings/Jobs
  (already have terminal statuses serving the same purpose - see the
  ADR).

**Cluster 16 (implemented, tested locally) — Appointments view (ADR-0024)**

- Scope: see [DECISIONS.md](DECISIONS.md) ADR-0024. Closes the
  "Appointments"/"Calendar" admin-console module gap.
- Implemented with repository evidence: new `apps/admin-console`
  `/appointments` page listing every Booking for the business, grouped
  by date - no schema or repository change, `BookingRepository.listBookings()`
  already supported this.
- Lint, typecheck, a local production build, and unit tests all pass.
- **Deliberately not built**: a full interactive calendar-grid widget
  (month/week views, drag-to-reschedule, availability-conflict
  checking) - a chronological list is the simplest reliable
  implementation the current data model supports; see the ADR for why
  building the richer widget now would be over-engineering ahead of a
  real need.

**Cluster 17, part 1 (implemented, tested locally) — actor tracking (ADR-0025)**

- Scope: see [DECISIONS.md](DECISIONS.md) ADR-0025. Prerequisite for
  "filterable by... employee" in the upcoming Activity Timeline
  (Cluster 17, part 2).
- Implemented with repository evidence: `Task` gained `createdBy`/
  `completedBy`; `PhotoAsset` gained `uploadedBy` (and a newly-required
  `uploadedAt`, matching every other entity's `createdAt` convention);
  `Estimate` gained `createdBy`/`approvedBy`; `Booking` gained
  `createdBy` (`packages/db/migrations/012-actor-tracking.sql`). Every
  `apps/admin-console` API route that creates/completes/approves/
  uploads one of these now passes the real logged-in user's id through.
  55/55 `packages/db` tests and 100/100 `packages/core-models` tests
  still passing.
- Lint, typecheck, a local production build, and unit tests all pass.
- **Not done**: migration 012 has not yet been run against production
  (owner action).

**Cluster 17, part 2 (implemented, tested locally) — Activity Timeline (ADR-0025)**

- Scope: see [DECISIONS.md](DECISIONS.md) ADR-0025. Closes "Every
  customer has a complete chronological activity timeline... filterable
  by type, employee, and date."
- Implemented with repository evidence: `ActivityTimelineRepository.listTimelineForContact()`
  (`packages/db`) composes a Contact's complete history at read time
  from Leads, Estimates, Bookings, Jobs, Notes, Tasks, Photos, and
  `audit_log` - no separate event-sourcing table, no schema change
  beyond part 1's actor-tracking columns (61/61 `packages/db` tests
  passing total, 6 new). `apps/admin-console`'s Contact detail page
  gains an "Activity Timeline" section with type/employee/date filters.
- Lint, typecheck, a local production build, and unit tests all pass.
- **Honest scope limits, not silently worked around**: `TimelineEntryType`
  includes Invoice/Payment/Call/SMS/Email/Review-request/Review-received
  as named values, but no code path produces any of them - no
  persistence exists anywhere in this repository for those four entity
  categories, and the UI states this directly rather than fabricating
  entries. The employee filter is populated from actor ids already
  present in that Contact's own timeline, not a resolved staff-roster
  dropdown - broadening `memberships` RLS to show the full team roster
  is a real, separate security-scope decision, not made here.
- Reusable across GreenCal Auto Detailing and Navarro Builders by
  construction - every repository the timeline composes is already
  generic and `business_id`-scoped; no GreenCal-specific code exists
  anywhere in this cluster.

**Cluster 18 (implemented, tested locally) — Estimate line items and service-package catalog (ADR-0026)**

- Scope: see [DECISIONS.md](DECISIONS.md) ADR-0026. Closes "Estimate
  Line Items": "Professional estimate builder / Service packages /
  Line item editor" (the first three of nine sub-requirements in that
  section - see "Not done" below for the rest).
- Implemented with repository evidence: `ServicePackage` (reusable
  catalog, no state machine) and `EstimateLineItem`
  (`description`/`quantity`/`unitPrice`/`lineTotal` - `lineTotal` is a
  stored write-time snapshot, never recomputed from a linked package's
  current price) - new `packages/core-models` types,
  `packages/db/migrations/013-estimate-line-items.sql`.
  `EstimateLineItemRepository` enforces the existing "mutable only
  while draft" rule from ADR-0021 (70/70 `packages/db` tests passing
  total, 9 new). `apps/admin-console` gains `/estimates/[id]` (the
  actual estimate builder: line-item table, add form with an optional
  service-package picker, computed subtotal) and `/service-packages`
  (catalog management).
- Lint, typecheck, a local production build, and unit tests all pass.
- **Not done, tracked as separate immediately-following clusters, per
  "commit each logical feature separately"**: taxes, discounts,
  deposits, attaching photos to an Estimate, PDF generation, and a
  customer-facing approval workflow. Migration 013 has not yet been run
  against production (owner action).

**Cluster 19 (implemented, tested locally) — Estimate tax, discount, and deposit (ADR-0027)**

- Scope: see [DECISIONS.md](DECISIONS.md) ADR-0027. Closes "Taxes /
  Discounts / Deposits" from the "Estimate Line Items" directive.
- Implemented with repository evidence: `Estimate` gains
  `taxRateBasisPoints?` (integer basis points), `discountAmount?`
  (fixed `Money`, not a percentage), and `depositAmount?` (tracked
  separately, never subtracted from `total`) -
  `packages/db/migrations/014-estimate-pricing.sql` adds the five
  backing columns. `calculateEstimateTotals()` (new,
  `packages/core-models`) is a pure integer-only function; discount is
  applied before tax and floored at zero. `EstimateRepository.setEstimatePricing()`
  enforces the existing "mutable only while draft" rule from
  ADR-0021/ADR-0026 (73/73 `packages/db` tests passing total, 3 new;
  106/106 `packages/core-models` tests passing total, 6 new).
  `apps/admin-console`'s `/estimates/[id]` page gains a pricing form
  and a totals breakdown display driven by the same function used
  server-side.
- Lint, typecheck, a local production build, and unit tests all pass.
- **Not done, tracked as separate immediately-following clusters**:
  attaching photos to an Estimate, PDF generation, and a
  customer-facing approval workflow. Migration 014 has not yet been run
  against production (owner action).

**Cluster 20 (implemented, tested locally) — Estimate photo attachments (ADR-0028)**

- Scope: see [DECISIONS.md](DECISIONS.md) ADR-0028. Closes "Attach
  photos" from the "Estimate Line Items" directive.
- Implemented with repository evidence: `EstimateAttachment` (new,
  `packages/core-models`) is a deliberately minimal type, separate from
  `PhotoAsset` - an estimate attachment is always a private reference
  image, never a candidate for public marketing use, so `PhotoAsset`'s
  publication-workflow fields don't apply.
  `packages/db/migrations/015-estimate-attachments.sql` adds
  `estimate_attachments` and a new private `estimate-attachments`
  Storage bucket. `EstimateAttachmentRepository` reuses
  `PhotoAssetRepository`'s upload/signed-URL pattern (76/76
  `packages/db` tests passing total, 3 new). `apps/admin-console`'s
  `/estimates/[id]` page gains an Attachments section (list with
  signed-URL links, upload form, remove buttons) - not gated by
  Estimate status, unlike line items and pricing.
- Lint, typecheck, a local production build, and unit tests all pass.
- **Not done, tracked as separate immediately-following clusters**: PDF
  generation and a customer-facing approval workflow. Migration 015 has
  not yet been run against production (owner action).

**Cluster 21 (implemented, tested locally) — Estimate PDF generation (ADR-0029)**

- Scope: see [DECISIONS.md](DECISIONS.md) ADR-0029. Closes "PDF
  generation" from the "Estimate Line Items" directive.
- Implemented with repository evidence: `apps/admin-console` gains
  `/estimates/[id]/print`, a standalone (no `AdminLayout` chrome) HTML
  page rendering the same Estimate/line-items/totals data as the
  detail page, with `@media print` CSS. Uses the browser's native
  "Print > Save as PDF" - no new PDF-rendering dependency. Shows the
  calling user's real `membership.businessName`, never fabricated
  branding (Settings/Company-profile branding is separate, not-yet-built
  work). No schema or `packages/db` change - this route only reads
  existing repositories.
- Lint, typecheck, a local production build, and unit tests all pass.
- **Not done, tracked as a separate immediately-following cluster**: a
  customer-facing approval workflow.

**Cluster 22 (implemented, tested locally) — Customer estimate-approval link (ADR-0030)**

- Scope: see [DECISIONS.md](DECISIONS.md) ADR-0030. Closes "customer
  approval workflow" - the last of the nine "Estimate Line Items"
  sub-requirements. **First public, unauthenticated, state-mutating
  route in `apps/admin-console`** - scope (one-click approval + typed
  name as a lightweight signature, 30-day token expiry, service-role
  key) was confirmed with the owner before building rather than
  decided unilaterally, since it touches security architecture and a
  new secret.
- Implemented with repository evidence: `Estimate` gains
  `customerApprovalToken?`, `customerApprovalTokenExpiresAt?`,
  `customerApproved?`, `customerSignatureName?` -
  `packages/db/migrations/017-estimate-customer-approval.sql`. New
  `EstimateRepository` methods `generateCustomerApprovalLink()`
  (staff-only), `getEstimateByPublicToken()`, and
  `approveEstimateByCustomerToken()` (token-only); new
  `EstimateLineItemRepository.listLineItemsByPublicToken()` (87/87
  `packages/db` tests passing total, 9 new). `apps/admin-console`
  gains `/approve/[token]` (public page) and
  `/api/public/estimates/[token]/approve` (public POST), both using a
  new service-role client (`getSupabaseServiceRoleEnv()`) - every
  other route keeps using the anon-key, RLS-enforced client
  unchanged. The `/estimates/[id]` page gains a "Generate customer
  approval link" button.
- **Also fixes a real, pre-existing bug found while building this**:
  `estimates` never had a tenant-scoped UPDATE RLS policy
  (`migrations/016-estimates-update-policy-fix.sql`), even though
  `approveEstimate()` (Cluster 15/ADR-0021) and `setEstimatePricing()`
  (Cluster 19/ADR-0027) already update it - real Postgres RLS would
  have silently updated zero rows; invisible to local tests since the
  fake Supabase test double doesn't enforce RLS.
- Lint, typecheck, a local production build, and unit tests all pass.
- **"Estimate Line Items" (all nine owner-specified sub-requirements:
  builder, service packages, line item editor, taxes, discounts,
  deposits, photo attachments, PDF generation, customer approval) is
  now fully complete.** Migrations 016 and 017 have not yet been run
  against production (owner action).
  `SUPABASE_SERVICE_ROLE_KEY` must be added to `apps/admin-console`'s
  deployment environment once it is deployed.

**Cluster 23 (implemented, tested locally) — Settings: business profile, branding, service areas, working hours (ADR-0031)**

- Scope: see [DECISIONS.md](DECISIONS.md) ADR-0031. Closes four of the
  nine "Settings" sub-items: Company profile/Business information,
  Branding/Logos, Service areas, Working hours. Team permissions and
  Security settings are separate, immediately-following clusters; AI
  preferences is intentionally not built - no AI agent is wired into
  GreenCal's live workflow yet, so a settings toggle for one would
  control nothing real (confirmed with the owner rather than guessed).
- Implemented with repository evidence: seven new nullable columns on
  `businesses` (`migrations/018-business-profile.sql`, plus the
  tenant-scoped UPDATE policy `businesses` was missing);
  `logo_storage_ref`/`primary_color` and a new private
  `business-logos` bucket (`migrations/019-business-branding.sql`);
  new `business_service_areas` (`migrations/020-business-service-areas.sql`,
  deliberately not tied to the growth-system `CityId` types - a
  different, public-marketing concern); new `business_hours`, one row
  per day of week, saved as a single upserted batch
  (`migrations/021-business-hours.sql`). All four repositories are
  `packages/db`-only types, matching `businesses`' status as the
  tenant boundary rather than a domain entity (101/101 `packages/db`
  tests passing total, 16 new). `apps/admin-console` gains `/settings`
  (hub) and four sub-pages.
- Lint, typecheck, a local production build, and unit tests all pass.
- **Not done, tracked as separate immediately-following clusters**:
  Team permissions (needs a `memberships` RLS-broadening decision,
  confirmed with the owner - implementation next) and Security
  settings (change-password only, per the owner's confirmed scope).
  Migrations 018-021 have not yet been run against production (owner
  action).

**Cluster 24 (implemented, tested locally) — Team roster and role management (ADR-0032)**

- Scope: see [DECISIONS.md](DECISIONS.md) ADR-0032. Closes "Team
  permissions" from Settings. Broadening `memberships` visibility was
  explicitly deferred as "a real, separate security-scope decision" in
  ADR-0025 (Activity Timeline) - this ADR is that decision, made only
  after the owner explicitly confirmed it.
- Implemented with repository evidence:
  `migrations/022-team-roster.sql` adds an _additional_ tenant-scoped
  SELECT policy to `memberships`/`membership_roles` (the original
  own-row policies are kept, not dropped - the new policy's subquery
  depends on them), a denormalized `memberships.user_email`
  (backfilled once from `auth.users.email` directly in the migration,
  avoiding any `SECURITY DEFINER` function or `.rpc()` call), and
  owner-admin-gated INSERT/DELETE policies on `membership_roles`
  (privilege-escalation prevention). New `TeamRosterRepository`
  (109/109 `packages/db` tests passing total, 8 new) - `revokeRole()`
  refuses to remove a business's last remaining `owner-admin`.
  `apps/admin-console` gains `/settings/team`.
- Lint, typecheck, a local production build, and unit tests all pass.
  The RLS/privilege-escalation logic itself is inherently untestable
  against real Postgres in this environment - correctness rests on the
  migration's own reasoning and code review (documented in ADR-0032),
  same limitation already noted for the migration-016 RLS fix.
- Migration 022 has not yet been run against production (owner
  action).

**Cluster 25 (implemented, tested locally) — Security settings: change password (ADR-0033)**

- Scope: see [DECISIONS.md](DECISIONS.md) ADR-0033. Closes "Security
  settings" - the last of the nine "Settings" sub-items. **This closes
  all nine owner-specified Settings sub-requirements** (AI preferences
  was explicitly skipped, confirmed with the owner rather than
  guessed - no AI agent is wired into GreenCal's live workflow for a
  settings toggle to control).
- Implemented with repository evidence: `apps/admin-console` gains
  `/settings/security` and `/api/settings/security/change-password.ts`,
  using only Supabase Auth's existing `updateUser()` (the same call
  the existing email-based `/reset-password` flow already uses) -
  re-verified against the submitted current password via
  `signInWithPassword()` first, since `updateUser()` alone doesn't
  require that proof for an already-authenticated session. No new
  infrastructure, no `packages/db`/`packages/core-models` change.
- Lint, typecheck, a local production build, and unit tests all pass.

**Cluster 26 (implemented, tested locally) — Internal notifications and a notification center (ADR-0034)**

- Scope: see [DECISIONS.md](DECISIONS.md) ADR-0034. Closes "Internal
  notifications" and "Notification center" - real, in-app only. **ACTION
  REQUIRED (external credential)**: Email events, SMS events, Customer
  notifications, and Emma integration hooks remain blocked - no
  Resend/SMS-provider credential is configured for `apps/admin-console`,
  no customer-facing portal exists, and no real Emma implementation
  exists to hook into (ADR-0008's scope note). Per the owner's own
  standing instruction to build what's real and flag what needs a
  credential, rather than fabricate the rest.
- Implemented with repository evidence: new `Notification`
  (`packages/core-models`, no state machine) - `NotificationChannel`/
  `NotificationEventType` are deliberately supersets of what any code
  path produces (mirrors `TimelineEntryType`, ADR-0025); only
  `'in-app'`/`'estimate-customer-approved'` are ever actually written.
  `notifications` (`migrations/023-notifications.sql`) is
  per-recipient, not a shared business inbox. The one real trigger:
  when a customer approves an Estimate via the public link (ADR-0030),
  the approve route notifies every team member of that business
  (113/113 `packages/db` tests passing total, 4 new).
  `EstimateRepository.getEstimateByPublicToken()`/
  `approveEstimateByCustomerToken()` now also return `businessId`
  (repository-internal, not added to the `Estimate` domain type) so
  the public route can resolve the team roster. `apps/admin-console`
  gains `/notifications` (list, unread filter, mark-read).
- Lint, typecheck, a local production build, and unit tests all pass.
- Migration 023 has not yet been run against production (owner
  action).

**Post-launch fix (SQL written, not yet verified live) — infinite RLS recursion on memberships/membership_roles (ADR-0035)**

- Scope: see [DECISIONS.md](DECISIONS.md) ADR-0035. A real production
  incident, diagnosed live against the deployed admin-console (Postgres
  `42P17`, "infinite recursion detected in policy for relation
  memberships") - not a code bug, a real gap in two of migration 022's
  RLS policies that were self-referential (a policy on table T whose
  own subquery also queries T). Broke nearly the entire app, since
  almost every other table's RLS resolves the caller's business via
  `memberships`.
- Fix: `migrations/024-fix-membership-rls-recursion.sql` adds two new
  `SECURITY DEFINER` helper functions (`get_my_business_ids()`,
  `is_owner_admin_for_business()`) - the first custom Postgres
  functions in this schema - and replaces the four broken policies'
  subqueries with calls to them, preserving the exact authorization
  model ADR-0032 intended without the recursion. This ADR also formally
  corrects ADR-0032's flawed reasoning about why the original policy
  pairing was believed safe.
- **Not yet done**: migration 024 has not been run against production;
  the temporary diagnostic route
  (`apps/admin-console/src/pages/api/debug/membership.ts`) and verbose
  `getCurrentMembership()` logging added while investigating this
  incident should be removed once the fix is confirmed live.

**Growth-system domain contracts (in progress) — `packages/core-models`**

- Scope: a first, provider-neutral coding slice for the GreenCal
  Lead-to-Job-to-Content growth system's domain layer — branded IDs, a
  floating-point-free `Money` type, and full state-machine behavior (typed
  transitions, actor authorization, precondition evidence) for five
  lifecycles: Lead, Job, Invoice, Content, and Review Request. Still no
  API, UI, or provider integration.
- This is the first repository evidence toward Phase 2's "core domain
  models" component below. Phase 2 as a whole is **not** complete — auth
  remains an unimplemented placeholder.

**CRM Milestone 1 (in progress) — persistence + GreenCal intake wiring (`packages/db`, ADR-0009)**

- Scope: see [DECISIONS.md](DECISIONS.md) ADR-0009 and
  `docs/crm/CRM_ARCHITECTURE.md` for the full, honest done-vs-deferred
  breakdown.
- Implemented with repository evidence: real Supabase-backed
  `ContactRepository`/`LeadRepository`/`AuditLogRepository` in
  `packages/db` (11/11 unit tests passing, hand-written SQL migration);
  every Lead status change routes through `packages/core-models`'
  existing `transitionLead()` state machine, never a raw column write.
  `apps/greencal-website`'s live production intake path
  (`supabase-resend-adapter.ts`) gained a best-effort, non-breaking call
  that creates a `Contact`+`Lead` for every fresh real submission and
  links it back via `quote_leads.lead_id` — this is the first place
  `packages/core-models` is actually consumed outside its own tests.
- Migrations 001 (`packages/db`) and 003 (`quote_leads.lead_id` link)
  have been run against the real `Greencal-production` Supabase project
  (owner-confirmed).

**CRM Milestone 2 (in progress) — multi-tenant foundation (`businesses`/`memberships`, ADR-0010)**

- Scope: see [DECISIONS.md](DECISIONS.md) ADR-0010 and
  `docs/crm/CRM_ARCHITECTURE.md` for the full, honest done-vs-deferred
  breakdown.
- Implemented with repository evidence: `businesses`/`memberships`
  tables, `business_id` added to `contacts`/`leads`/`audit_log`
  (backfilled, `NOT NULL`), tenant-scoped RLS policies for the
  `authenticated` role, and `ContactRepository`/`LeadRepository` now
  require `businessId` on every call (11/11 unit tests passing,
  including tenant-isolation cases). GreenCal's business id is
  configuration (`CRM_BUSINESS_ID`), never hardcoded in code.
- Migration 002 has been run against the real `Greencal-production`
  Supabase project (owner-confirmed): `businesses`/`memberships` exist,
  RLS is enabled, all tenant-scoped policies exist, and the owner's own
  Supabase Auth user is linked to GreenCal Pressure Washing with the
  `owner-admin` role. GreenCal Mobile Detailing and Navarro Builders are
  not onboarded as real tenants (neither has a repository module yet).

**CRM Milestone 3 (in progress) — authenticated admin-console (`apps/admin-console`, ADR-0011)**

- Scope: see [DECISIONS.md](DECISIONS.md) ADR-0011 and
  `docs/crm/CRM_ARCHITECTURE.md` for the full, honest done-vs-deferred
  breakdown.
- Implemented with repository evidence: `apps/admin-console` is now a
  real Astro (server output) + React + Vercel application - previously
  a fully empty Phase 1 placeholder. Login, logout, forgot/reset
  password, and session middleware via Supabase Auth
  (`@supabase/ssr`); a tenant-aware dashboard; full Leads (list, detail,
  status transition) and Contacts (list, detail, read-only) modules,
  every query scoped by the authenticated user's real `memberships`
  row - never a client-supplied `businessId`. Uses the Supabase anon key
  plus the user's session, not the service-role key, so RLS actually
  applies to every query. `packages/ui-kit` gained its first real
  content (Button, Badge, Table, EmptyState, ErrorBanner, LoadingSpinner,
  FormField). Lint, typecheck, a local production build, and pure-logic
  unit tests (route-guard matching, status validation) all pass.
- The owner's Supabase Auth user is created and linked as `owner-admin`
  for GreenCal Pressure Washing (see Milestone 2 above).
- **Not done**: no Vercel project exists for `apps/admin-console` yet
  (not deployed live); no real browser/E2E test exists (would need a
  real password entered through a real browser session, which was
  deliberately never requested from the owner). Estimates, Tasks,
  Appointments, and Notes have no dedicated UI here (Jobs and Companies
  gained UI in later clusters, see below) — `Task`, `Appointment`, and
  `Note` have no `packages/core-models` type at all yet.
  Search/CSV-export/reporting and full per-permission RBAC (beyond the
  four enforced `MembershipRole` values) are unimplemented.

**CRM Cluster 4 (done) — Estimate/Booking/Job persistence (ADR-0012)**

- Scope: see [DECISIONS.md](DECISIONS.md) ADR-0012 and
  `docs/crm/CRM_ARCHITECTURE.md`.
- Implemented with repository evidence: `estimates`, `bookings`, `jobs`
  tables (`packages/db/migrations/003-job-pipeline-foundation.sql`,
  tenant-scoped like every other CRM table); `EstimateRepository`,
  `BookingRepository`, `JobRepository` (29/29 `packages/db` tests
  passing total, tenant-isolation cases included for all three); every
  Job status change routes through core-models' existing
  `transitionJob()`, mirroring `LeadRepository` exactly.
- **Classification: LIVE (schema).** Migration 003 has been run against
  the real `Greencal-production` Supabase project (owner-confirmed).

**CRM Cluster 5 (implemented, tested locally) — Lead → Estimate → Booking → Job creation workflow**

- Scope: see `docs/crm/CRM_ARCHITECTURE.md`.
- Implemented with repository evidence: Lead detail page gains
  "Add estimate" and "Create booking + job" forms; a new Jobs module
  (list with status filter, detail, status transition) mirroring Leads;
  `packages/ui-kit` gained `jobStatusTone`. A "draft" → "scheduled" Job
  transition is attempted best-effort using the real logged-in user's
  role, with an honest on-page note (never a fabricated state) when the
  current `owner-admin`-only membership isn't authorized for that edge.
- Lint, typecheck, a local production build, and pure-logic unit tests
  (amount parsing, job-status validation) all pass.
- **Not done**: not deployed live (same admin-console deployment gap as
  Milestone 3). The actual create-estimate → create-booking →
  auto-create-job → best-effort-schedule chain has not been exercised
  against a real browser session. **Known limitation, not silently
  worked around**: `memberships`' `(business_id, user_id)` unique
  constraint means one Supabase Auth user can hold exactly one role per
  business — the owner's `owner-admin` membership cannot also act as
  `office-manager` day-to-day, which most Job/Lead transitions require.
  Not fixed without owner input (real design decision, see ADR-0013).

**CRM Cluster 6 (implemented, tested locally) — Company persistence + Contact→Company linking (ADR-0014)**

- Scope: see [DECISIONS.md](DECISIONS.md) ADR-0014 and
  `docs/crm/CRM_ARCHITECTURE.md`.
- Implemented with repository evidence: `Company` is a new
  `packages/core-models` type (no state machine — deliberate); `Contact`
  gains an optional `companyId` field; `companies` table +
  `contacts.company_id` column
  (`packages/db/migrations/004-company-foundation.sql`, tenant-scoped
  RLS); `CompanyRepository` and `ContactRepository.linkCompany()`
  (33/33 `packages/db` tests passing total); a new Companies module
  (list/search/create, detail with linked contacts) in
  `apps/admin-console`, plus a company-link form on the Contact detail
  page.
- Lint, typecheck, a local production build, and unit/pure-logic tests
  all pass.
- **Not done**: migration 004 has not yet been run against production
  (owner action). Not deployed live (same admin-console deployment gap
  as Milestone 3/Cluster 5).

**CRM Cluster 7 (implemented, tested locally) — Note persistence (ADR-0015)**

- Scope: see [DECISIONS.md](DECISIONS.md) ADR-0015 and
  `docs/crm/CRM_ARCHITECTURE.md`.
- Implemented with repository evidence: `Note` is a new
  `packages/core-models` type (`entityType`/`entityId`/`body`/
  `authorId?` - no state machine); a single, polymorphic `notes` table
  (`packages/db/migrations/005-note-foundation.sql`, tenant-scoped,
  append-only RLS) rather than one table per entity; `NoteRepository`
  (36/36 `packages/db` tests passing total); a reusable `NotesSection`
  component embedded on the Lead, Contact, Company, and Job detail pages
  in `apps/admin-console`.
- Lint, typecheck, a local production build, and unit tests all pass.
- **Not done**: migration 005 has not yet been run against production
  (owner action). Not deployed live (same admin-console deployment gap
  as every prior cluster). `Appointment` was evaluated and found to
  already be covered by the existing `Booking` entity - not built as a
  separate type.

**CRM Cluster 8 (implemented, tested locally) — Task persistence (ADR-0016)**

- Scope: see [DECISIONS.md](DECISIONS.md) ADR-0016 and
  `docs/crm/CRM_ARCHITECTURE.md`.
- Implemented with repository evidence: `Task` is a new
  `packages/core-models` type (`title`/`dueAt?`/`assignedTo?`/
  `entityType?`/`entityId?`/`completed: boolean`/`completedAt?` - no
  state machine, completion is a plain boolean); `tasks` table
  (`packages/db/migrations/006-task-foundation.sql`, tenant-scoped,
  with `check` constraints keeping the entity-attachment and
  completion fields internally consistent); `TaskRepository`
  (40/40 `packages/db` tests passing total); a standalone `/tasks` list
  page plus a reusable `TasksSection` component embedded on the Lead,
  Contact, Company, and Job detail pages in `apps/admin-console`.
- Lint, typecheck, a local production build, and unit tests all pass.
- **Not done**: migration 006 has not yet been run against production
  (owner action). Not deployed live (same admin-console deployment gap
  as every prior cluster).
- **This closes out the originally-identified set of missing CRM
  entities** (`Company`, `Task`, `Appointment`, `Note`) from the
  Milestone 3 "not done" list - `Appointment` resolved via reuse of the
  existing `Booking` entity.

## Proposed future phases

The following are **proposed** and not scheduled or committed:

- **Phase 2 (proposed)**: Implement shared platform primitives — auth,
  database layer, core domain models — enough for one business's MVP
  workflow end-to-end. Core domain models now has initial, provider-neutral
  repository evidence in `packages/core-models` (see above); auth and the
  database layer remain unstarted.
- **Phase 3 (proposed)**: Stand up the first business-specific module
  (which business, **TBD**).
- **Phase 4+ (proposed)**: Agent orchestration and automation features
  (`apps/agent-orchestrator`, `packages/agent-sdk`).

Sequencing, dates, and scope for all proposed phases are **TBD**.

## Dependencies

- Business-specific work (Phase 3+) depends on product scoping decisions
  in [PRODUCT.md](PRODUCT.md) that are currently unresolved.
- Infrastructure/deployment work depends on decisions not yet recorded in
  [DECISIONS.md](DECISIONS.md) (hosting, database engine, IAM approach).

## Acceptance gates

- No phase should be marked complete without corresponding repository
  evidence (working code, passing checks) — see the `verify-work` skill.
- Business feature work requires an approved plan — see the `plan-feature`
  skill.

## Risks

- Placeholder services currently have no tests (`tests/*` directories are
  empty planning stubs) — expanding scaffolding without adding tests
  increases regression risk once real logic lands.
- `infra/secrets` is scaffold-only; real secrets must never be committed
  to this repository (see security guidance in
  [.claude/rules/security.md](.claude/rules/security.md)).

## Deferred work

- CRM-specific and website-specific modules/rules — deferred until a real
  directory exists (see [docs/INDEX.md](docs/INDEX.md) for the deferred
  rule scopes and their trigger paths).
- Kubernetes/Terraform/IAM implementation in `infra/` — planning docs only.
