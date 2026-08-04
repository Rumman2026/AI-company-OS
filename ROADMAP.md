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
