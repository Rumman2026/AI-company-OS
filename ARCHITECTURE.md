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

Every app below currently contains only a placeholder entry point
(`src/index.ts` or `src/index.tsx`) and a `Dockerfile`. No business logic is
implemented in any of them.

| App                       | Role                                    | Port (dev) |
| ------------------------- | --------------------------------------- | ---------- |
| `apps/api-gateway`        | API gateway / edge service              | 4000       |
| `apps/core-api`           | Core business API                       | 4001       |
| `apps/agent-orchestrator` | Agent orchestration engine              | 4002       |
| `apps/worker-service`     | Background job / worker processor       | 4003       |
| `apps/web-console`        | Customer-facing web console (React/TSX) | 3000       |
| `apps/admin-console`      | Internal admin interface (React/TSX)    | 3001       |
| `apps/docs-portal`        | Documentation portal (React/TSX)        | 3002       |

Ports and service wiring are defined in `docker-compose.dev.yml` and
`config/env/.env.example`.

## Confirmed: package boundaries

| Package                   | Role                                                |
| ------------------------- | --------------------------------------------------- |
| `packages/auth`           | Shared authentication utilities                     |
| `packages/db`             | Shared database utilities / repository abstractions |
| `packages/core-models`    | Shared domain types and model definitions           |
| `packages/agent-sdk`      | Shared AI agent interfaces and plugin contracts     |
| `packages/toolkit`        | Shared tooling and helper utilities                 |
| `packages/telemetry`      | Shared telemetry instrumentation helpers            |
| `packages/platform-utils` | Shared platform utility helpers                     |
| `packages/ui-kit`         | Shared UI components and design tokens              |

All packages contain only a placeholder `src/index.ts` — no implementation.

## Confirmed: platform boundaries

- **AI Company OS** is the platform; **LeadsInitiative.com** is the parent
  company that owns it. See [BUSINESSES.md](BUSINESSES.md).
- **Quant Trading OS** is a permanently separate future project and
  repository. It must never share business logic, infrastructure,
  databases, agents, security permissions, deployment systems, credentials,
  or risk systems with AI Company OS. Nothing in this repository currently
  references or integrates with Quant Trading OS.
- The three businesses (GreenCal Pressure Washing, GreenCal Mobile
  Detailing, Navarro Builders) do not yet have dedicated directories in
  this repository — there is no `apps/` or `packages/` module scoped to any
  individual business today.

## Present data and integration architecture

None implemented yet. `packages/db` and `packages/core-models` are
placeholders with no schema, migrations, or ORM configuration present in
the repository.

## Architectural constraints

- Workspace membership is limited to `apps/*` and `packages/*`
  (`pnpm-workspace.yaml`) — new deployable units belong under `apps/`,
  new shared libraries under `packages/`.
- TypeScript strict mode is enforced repo-wide via `tsconfig.base.json`;
  do not relax it per-package without a recorded decision (see
  [DECISIONS.md](DECISIONS.md)).
- `infra/` (terraform, k8s, charts, iam, secrets) currently holds only
  planning `README.md` files — no infrastructure is provisioned or
  deployed from this repository yet.

## Proposed / future architecture (not yet implemented)

The following are **proposed**, not present in the repository:

- Concrete service-to-service communication pattern (REST, gRPC, queue) —
  **TBD**.
- Database engine and schema for `packages/db` — **TBD**.
- Kubernetes/Helm deployment topology in `infra/k8s` and `infra/charts` —
  **Proposed**, planning docs only.
- IAM and secrets management approach in `infra/iam` and `infra/secrets` —
  **Proposed**, planning docs only.
- Per-business modules (directories or packages dedicated to GreenCal
  Pressure Washing, GreenCal Mobile Detailing, or Navarro Builders) —
  **Deferred**, no repository path exists yet.

Do not treat any item in this section as implemented.
