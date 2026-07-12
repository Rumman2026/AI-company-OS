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

## Proposed future phases

The following are **proposed** and not scheduled or committed:

- **Phase 2 (proposed)**: Implement shared platform primitives — auth,
  database layer, core domain models — enough for one business's MVP
  workflow end-to-end.
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
