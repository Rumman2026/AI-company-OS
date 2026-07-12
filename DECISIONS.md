# Decisions

Architecture decision records for AI Company OS. Status: durable reference,
not auto-loaded. Read before revisiting a past decision; update via the
`write-adr` skill. See [docs/INDEX.md](docs/INDEX.md) for routing.

Format: each record has Status, Context, Decision, Alternatives (when
known), Trade-offs, Consequences, and Related documents. Do not invent
alternatives or retroactive reasoning for decisions this document doesn't
already contain evidence for.

---

## ADR-0001: Monorepo with pnpm workspaces

**Status**: Confirmed (implemented)

**Context**: AI Company OS needs to host multiple applications and shared
packages that will be consumed by several businesses on one platform.

**Decision**: Use a single pnpm workspace monorepo with two workspace
groups, `apps/*` and `packages/*` (`pnpm-workspace.yaml`).

**Alternatives**: Not recorded in the repository — **unknown** whether
polyrepo or another workspace tool (Turborepo, Nx, Yarn workspaces) was
evaluated.

**Trade-offs**: Simplifies cross-package refactors and shared tooling at
the cost of coupling all apps/packages to one release cadence and one CI
pipeline.

**Consequences**: New deployable units go under `apps/`; new shared
libraries go under `packages/`. See [ARCHITECTURE.md](ARCHITECTURE.md).

**Related**: [ARCHITECTURE.md](ARCHITECTURE.md)

---

## ADR-0002: Quant Trading OS is permanently separate

**Status**: Confirmed

**Context**: Quant Trading OS is a future project involving financial risk
systems, distinct in purpose and risk profile from AI Company OS.

**Decision**: Quant Trading OS will be a separate repository and must never
share business logic, infrastructure, databases, agents, security
permissions, deployment systems, credentials, or risk systems with AI
Company OS.

**Alternatives**: Not recorded — this is a stated boundary, not a choice
between evaluated options.

**Trade-offs**: Precludes code reuse between the two systems even where
overlap might otherwise be convenient (e.g., shared auth or telemetry
packages).

**Consequences**: Do not add integration points, shared credentials, or
shared infrastructure between this repository and Quant Trading OS without
an explicit, separate decision record and user authorization.

**Related**: [ARCHITECTURE.md](ARCHITECTURE.md), [BUSINESSES.md](BUSINESSES.md)

---

## ADR-0003: TypeScript strict mode repo-wide

**Status**: Confirmed (implemented)

**Context**: Multiple apps and packages need consistent type safety
guarantees across a shared codebase.

**Decision**: `tsconfig.base.json` enables `strict`, `noImplicitAny`,
`noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, and
`noFallthroughCasesInSwitch` for every workspace that extends it.

**Alternatives**: Not recorded.

**Trade-offs**: Higher upfront friction per package in exchange for fewer
class of type-related runtime bugs.

**Consequences**: Do not relax these settings in an individual
app/package's `tsconfig.json` without recording a new decision here.

**Related**: [ARCHITECTURE.md](ARCHITECTURE.md)

---

## Proposed decisions (not yet made)

- Database engine and ORM for `packages/db` — **Proposed / TBD**.
- Service-to-service communication pattern (REST/gRPC/queue) — **Proposed
  / TBD**.
- Deployment target (Kubernetes via `infra/k8s`, alternative) — **Proposed
  / TBD**, planning docs only exist today.
