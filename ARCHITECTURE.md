# Architecture

Status: reflects the repository as of the Phase 1 scaffold (commit `62a1abe`,
2026-07-11). This document is a durable reference — read it when changing
repository structure, cross-service contracts, or platform boundaries. It is
not loaded automatically into every session; see [docs/INDEX.md](docs/INDEX.md).

## Confirmed: repository architecture

AI Company OS is a **pnpm workspace monorepo** (`pnpm-workspace.yaml`)
containing two workspace groups:

- `apps/*` — deployable applications and services
- `packages/*` — shared libraries consumed by apps

Root tooling: TypeScript (`tsconfig.base.json`, strict mode), ESLint
(`.eslintrc.js`), Prettier (`prettier.config.js`), Husky + lint-staged for
pre-commit formatting, and a GitHub Actions CI skeleton
(`.github/workflows/ci.yml`) that runs `pnpm lint` and `pnpm typecheck` on
push/PR to `main` and `develop`.

## Confirmed: application boundaries

Every app below except `apps/greencal-website` currently contains only a
placeholder entry point (`src/index.ts` or `src/index.tsx`) and a
`Dockerfile`, with no business logic implemented.

`apps/greencal-website` has a real static-site technical foundation (Astro,
TypeScript, plain CSS, Playwright/Chromium smoke tests) as of Phase 2A
Checkpoint 1 — see [DECISIONS.md](DECISIONS.md) ADR-0004 — but no business
content: no verified business claims, no address, no `LocalBusiness`
structured data, and no quote form. It has no `Dockerfile` (not required for
this checkpoint) and is not wired into `docker-compose.dev.yml`.

| App                       | Role                                                                 | Port (dev)   |
| ------------------------- | -------------------------------------------------------------------- | ------------ |
| `apps/api-gateway`        | API gateway / edge service                                           | 4000         |
| `apps/core-api`           | Core business API                                                    | 4001         |
| `apps/agent-orchestrator` | Agent orchestration engine                                           | 4002         |
| `apps/worker-service`     | Background job / worker processor; agent-worker execution (ADR-0008) | 4003         |
| `apps/web-console`        | Customer-facing web console (React/TSX)                              | 3000         |
| `apps/admin-console`      | Internal admin interface (React/TSX)                                 | 3001         |
| `apps/docs-portal`        | Documentation portal (React/TSX)                                     | 3002         |
| `apps/greencal-website`   | GreenCal Pressure Washing public marketing website (Astro, static)   | 4321         |
| `apps/ai-gateway`         | Provider-neutral AI routing gateway (ADR-0008)                       | 4100 (cloud) |
| `apps/jervis-api`         | Owner-facing control API: health, budgets, kill switches (ADR-0008)  | 4101 (cloud) |

Ports and service wiring for the backend/console apps are defined in
`docker-compose.dev.yml` and `config/env/.env.example`; `apps/greencal-website`
is not part of that Docker Compose wiring during Checkpoint 1.
`apps/ai-gateway` and `apps/jervis-api` are not part of local dev Docker
Compose wiring — their (future) cloud-stack ports/env are defined in
`infra/docker/docker-compose.cloud.yml` and `infra/docker/.env.cloud.example`
(see ADR-0008); nothing there is provisioned or deployed.

## Confirmed: package boundaries

| Package                      | Role                                                                                                                                                                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/auth`              | Shared authentication utilities                                                                                                                                                                                                                     |
| `packages/db`                | Persistence (Supabase/Postgres) for the domain model in `packages/core-models` - real, tenant-scoped `Contact`/`Lead`/`AuditLog` repositories as of DECISIONS.md ADR-0009/ADR-0010 (`businesses`/`memberships` + RLS)                               |
| `packages/core-models`       | Real, tested, pure domain model for a GreenCal-originated "Lead-to-Job-to-Content growth system" - ~28 typed entities and five state machines (Lead, Job, Invoice, Content, Review Request); no persistence, API, or UI of its own (see its README) |
| `packages/agent-sdk`         | Shared AI agent interfaces and provider-neutral contracts (ADR-0008)                                                                                                                                                                                |
| `packages/toolkit`           | Shared tooling and helper utilities                                                                                                                                                                                                                 |
| `packages/telemetry`         | Shared telemetry instrumentation helpers                                                                                                                                                                                                            |
| `packages/platform-utils`    | Shared platform utility helpers                                                                                                                                                                                                                     |
| `packages/ui-kit`            | Shared UI components and design tokens                                                                                                                                                                                                              |
| `packages/provider-adapters` | Placeholder adapters for the 7 approved AI providers (ADR-0008)                                                                                                                                                                                     |
| `packages/task-router`       | Deterministic-first task routing (ADR-0008)                                                                                                                                                                                                         |
| `packages/context-builder`   | Compact, task-scoped context packages (ADR-0008)                                                                                                                                                                                                    |
| `packages/semantic-cache`    | Normalized-key response cache (ADR-0008)                                                                                                                                                                                                            |
| `packages/policy-engine`     | Escalation and authority rule enforcement (ADR-0008)                                                                                                                                                                                                |
| `packages/job-queue`         | In-memory job queue for agent-worker execution (ADR-0008)                                                                                                                                                                                           |
| `packages/audit-logger`      | Secret-redacted audit trail, distinct from telemetry (ADR-0008)                                                                                                                                                                                     |
| `packages/cost-controller`   | Per-provider/agent/business budget tracking and kill switches (ADR-0008)                                                                                                                                                                            |

`packages/auth`, `toolkit`, `platform-utils`, and `ui-kit` contain only a
placeholder `src/index.ts` — no implementation. `packages/agent-sdk` now
contains real provider-neutral contracts (types only, no logic); the nine
packages added under ADR-0008 contain real, tested placeholder logic but
make no real AI-provider network call anywhere. `packages/core-models`
contains a real, tested, pure domain model (no persistence/API/UI - see
its README); `packages/db` contains real Supabase-backed persistence for
a first slice of that model (`Contact`, `Lead`, `AuditLog`) as of
DECISIONS.md ADR-0009 — see `docs/crm/CRM_ARCHITECTURE.md` for what is
and is not implemented.

## Confirmed: platform boundaries

- **AI Company OS** is the platform; **LeadsInitiative.com** is the parent
  company that owns it. See [BUSINESSES.md](BUSINESSES.md).
- **Quant Trading OS** is a permanently separate future project and
  repository. It must never share business logic, infrastructure,
  databases, agents, security permissions, deployment systems, credentials,
  or risk systems with AI Company OS. Nothing in this repository currently
  references or integrates with Quant Trading OS.
- GreenCal Pressure Washing has one dedicated directory in this repository,
  `apps/greencal-website` (technical foundation only — see ADR-0004 in
  [DECISIONS.md](DECISIONS.md)). GreenCal Mobile Detailing and Navarro
  Builders do not yet have dedicated directories — there is no `apps/` or
  `packages/` module scoped to either business today.

## Present data and integration architecture

- **GreenCal's live production lead pipeline**: Supabase/Postgres
  `quote_leads` table (`apps/greencal-website`, see ADR-0006 and
  `supabase-schema.sql`), reached only from a trusted Vercel serverless
  function using the service-role key.
- **CRM foundation (Milestone 1, ADR-0009)**: `packages/core-models`
  defines the domain model (`Contact`, `Lead`, and 26 other typed
  entities, five state machines); `packages/db` persists a first slice
  of it (`contacts`, `leads`, `audit_log` tables, hand-written SQL
  migrations, no ORM) in the same Supabase project. GreenCal's
  `quote_leads` table gained one additive `lead_id` link column;
  everything else about it is unchanged. See
  `docs/crm/CRM_ARCHITECTURE.md` for exactly what is and is not
  implemented.

## Architectural constraints

- Workspace membership is limited to `apps/*` and `packages/*`
  (`pnpm-workspace.yaml`) — new deployable units belong under `apps/`,
  new shared libraries under `packages/`.
- TypeScript strict mode is enforced repo-wide via `tsconfig.base.json`;
  do not relax it per-package without a recorded decision (see
  [DECISIONS.md](DECISIONS.md)).
- `infra/terraform`, `infra/k8s`, `infra/charts`, `infra/iam`, and
  `infra/secrets` currently hold only planning `README.md` files.
  `infra/hostinger`, `infra/docker`, `infra/monitoring`, and
  `infra/backups` (added under ADR-0008) hold planning docs plus
  template files (Docker Compose, Prometheus scrape config, backup
  script) — no infrastructure is provisioned or deployed from this
  repository yet, from any `infra/` subdirectory.

## Proposed / future architecture (not yet implemented)

The following are **proposed**, not present in the repository:

- Concrete service-to-service communication pattern (REST, gRPC, queue) —
  **TBD**.
- Database engine and schema for `packages/db` — **TBD**.
- Kubernetes/Helm deployment topology in `infra/k8s` and `infra/charts` —
  **Superseded for the cloud-infrastructure track**: ADR-0008 selects
  Hostinger VPS + Docker Compose (`infra/hostinger`, `infra/docker`)
  instead; `infra/k8s`/`infra/charts` remain unused planning stubs.
- IAM and secrets management approach in `infra/iam` and `infra/secrets` —
  **Proposed**, planning docs only.
- Per-business modules for GreenCal Mobile Detailing and Navarro Builders —
  **Deferred**, no repository path exists yet. (GreenCal Pressure Washing's
  module, `apps/greencal-website`, now exists as a technical foundation
  only — see ADR-0004 in [DECISIONS.md](DECISIONS.md).)
- Real Hostinger VPS provisioning, real AI-provider account connections,
  and any production deployment of `apps/ai-gateway`, `apps/jervis-api`,
  or the agent-worker role of `apps/worker-service` — **Proposed /
  authorized-direction-only**, see ADR-0008's scope note. Not provisioned,
  connected, or deployed.

Do not treat any item in this section as implemented.
