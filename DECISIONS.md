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

## ADR-0004: Dedicated `apps/greencal-website` for GreenCal Pressure Washing, designated Phase 2A

**Status**: Confirmed (Checkpoint 1 — technical foundation only; content, business
facts, and production migration remain unimplemented and unapproved)

**Context**: The GreenCal Pressure Washing website redesign (Phase 2 planning
document and Architecture Addendum, see Related) required choosing where a
public, SEO-indexed marketing/lead-generation site should live in this
monorepo, and how this business-specific work fits the existing
[ROADMAP.md](ROADMAP.md) phase sequence, which names Phase 2 as shared
platform primitives and Phase 3 as an unresolved "first business-specific
module."

**Decision**:

- Create a dedicated application at `apps/greencal-website` for the GreenCal
  Pressure Washing public website.
- Do not reuse `apps/web-console` for this purpose.
- Do not create a generic, multi-business marketing application intended to
  host GreenCal Pressure Washing, GreenCal Mobile Detailing, and Navarro
  Builders content in one deployable unit.
- Classify this work as **Phase 2A** in [ROADMAP.md](ROADMAP.md): a new,
  additive phase entry, independent of Phase 2's shared-platform-primitives
  work and not consuming Phase 3's still-unresolved "which business" slot.

**Alternatives considered**:

1. **Reuse `apps/web-console`.** Rejected. `ARCHITECTURE.md`'s "Confirmed:
   application boundaries" table documents `apps/web-console` as a
   "Customer-facing **web console**" — a console conventionally denotes an
   authenticated application/dashboard, not an unauthenticated, SEO-indexed
   public marketing site. `.claude/rules/frontend.md` confirms `web-console`
   currently holds only a placeholder `src/index.tsx` with "no existing
   component structure, routing, or state management to follow" — there was
   no real architecture to reuse, only an empty scaffold and a
   purpose-mismatched name. Reusing it would also risk mixing public
   marketing content with future authenticated customer-console/portal
   functionality inside one deployable unit and one CI/deploy pipeline.
2. **Create a generic shared marketing-site application** (e.g.
   `apps/marketing-sites`) intended to host multiple businesses' websites.
   Rejected. `BUSINESSES.md` states business-specific code "should live in
   its own `apps/*` or `packages/*` module rather than being hardcoded into
   shared packages," and `PRODUCT.md`'s acceptance principles state to "keep
   the platform's shared code independent of any single business's specific
   logic unless a decision record says otherwise." Neither GreenCal Mobile
   Detailing nor Navarro Builders has any confirmed content or requirements
   yet (`BUSINESSES.md`: "No business currently has a dedicated module in
   this repository"), so designing a shared multi-tenant application now
   would be building for a hypothetical future requirement at the cost of
   deployment independence and business isolation for all three businesses.
3. **Create a dedicated `apps/greencal-website` application.** Selected.
   `docs/INDEX.md` already names this exact shape as a deferred candidate
   rule scope — `apps/<business>-website/**` — anticipating per-business
   website modules before this decision was made. `ARCHITECTURE.md`'s
   "Proposed / future architecture" section separately names "per-business
   modules... dedicated to GreenCal Pressure Washing, GreenCal Mobile
   Detailing, or Navarro Builders" as the intended future shape. ADR-0001's
   consequence ("new deployable units go under `apps/`") permits it.

**Why `apps/web-console` was rejected**: see alternative 1 above — a
documented purpose mismatch (authenticated console vs. public marketing
site) and no real architecture to actually reuse, only a name and an empty
scaffold.

**Why a generic multi-business marketing application was rejected**: see
alternative 2 above — it would couple three businesses' content, deploys,
and blast radius together before any of the other two businesses has a
confirmed requirement, contradicting `BUSINESSES.md`'s and `PRODUCT.md`'s
stated business-isolation principles.

**Why `apps/greencal-website` was selected**: see alternative 3 above — it
is the shape the repository's own documentation already anticipated, gives
GreenCal Pressure Washing full deployment/business isolation, and leaves
`apps/web-console` available for its originally documented purpose.

**Trade-offs**: Does not reuse the existing `web-console` placeholder
directory, so a second/third business website (Mobile Detailing, Navarro
Builders) will each need their own new `apps/*` entry rather than sharing
one deploy — mitigated by factoring genuinely shared design-system pieces
into `packages/ui-kit` once a real second example exists, not before.

**Consequences**:

- `apps/greencal-website` is a real, deployable Astro application; see
  [ARCHITECTURE.md](ARCHITECTURE.md) for its entry in the application-
  boundaries table.
- `apps/web-console` is left untouched — not deleted, not repurposed — and
  remains available for an eventual authenticated customer-console/portal
  use case matching its documented purpose.
- `packages/ui-kit` was **not** modified as part of this decision;
  GreenCal-specific design tokens and styles live under
  `apps/greencal-website` only for this checkpoint.
- [ROADMAP.md](ROADMAP.md) gains a Phase 2A entry, described as business-
  specific frontend work with no dependency on Phase 2's shared platform
  primitives. Phase 2's and Phase 3's existing text are unchanged by this
  ADR.
- A new path-scoped rule, `.claude/rules/websites.md`, governs
  `apps/greencal-website/**` going forward.

**Phase 2A designation**: This work is Phase 2A, not a redefinition of
Phase 2 (which remains "shared platform primitives," proposed and
unstarted) and not a resolution of Phase 3's "which business, TBD" (which
remains open for GreenCal Mobile Detailing and/or Navarro Builders). See
[ROADMAP.md](ROADMAP.md).

**Deferred decisions** (not made by this ADR): the production framework
choice for any _other_ business's future website; whether/when to extract a
shared marketing-site template package once a second business website
exists; all content, business-fact, and production-migration decisions
listed in the Phase 2 plan and Architecture Addendum (service list, brand
assets, address/NAP data, reviews, licensing/insurance claims, hosting,
DNS, domain, analytics, Search Console).

**Related**: [ARCHITECTURE.md](ARCHITECTURE.md), [BUSINESSES.md](BUSINESSES.md),
[ROADMAP.md](ROADMAP.md), [PRODUCT.md](PRODUCT.md), [docs/INDEX.md](docs/INDEX.md),
`.claude/rules/websites.md`

---

## Proposed decisions (not yet made)

- Database engine and ORM for `packages/db` — **Proposed / TBD**.
- Service-to-service communication pattern (REST/gRPC/queue) — **Proposed
  / TBD**.
- Deployment target (Kubernetes via `infra/k8s`, alternative) — **Proposed
  / TBD**, planning docs only exist today.
