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
- **Not done**: `packages/db/migrations/002-multi-tenant-foundation.sql`
  has not yet been run against production (owner action). RLS policies
  are written and reviewed but not independently verified against a live
  database with two real authenticated sessions — that requires either
  the owner testing it live or a scripted integration test with real
  credentials, neither of which happened in this session. No
  authenticated owner interface exists yet (`apps/admin-console` remains
  an empty Phase 1 placeholder) — viewing or changing CRM data today
  requires direct Supabase table access. GreenCal Auto Detailing and
  Navarro Builders are not onboarded as real tenants (neither has a
  repository module yet). Companies, deals, jobs, estimates,
  appointments, calls, tasks, campaigns, search/filter/reporting, and a
  full RBAC UI are all unimplemented.

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
