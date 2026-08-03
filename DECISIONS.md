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

## ADR-0005: Production domain for `apps/greencal-website` is `https://www.greencalpressurewashing.com`

**Status**: Confirmed (domain value only — see scope note below)

**Context**: ADR-0004 explicitly deferred the production domain decision for
`apps/greencal-website` ("Deferred decisions: ... hosting, DNS, domain,
analytics, Search Console"), and `.claude/rules/websites.md` requires "its
own explicit user authorization" before any hosting/DNS/domain
configuration is added. `astro.config.mjs` left `site` unset for this
reason, and `BaseLayout.astro` deliberately omitted canonical URL and
`og:url` with an in-file comment citing the same unresolved decision. A
5-day revenue-launch sprint (Stage 2) requires canonical URLs, a
`sitemap.xml`, and production-ready Open Graph/Twitter metadata ahead of
paid Google Ads traffic, all of which need a base URL to be correct.

**Decision**: The user has explicitly confirmed and authorized the
production domain for GreenCal Pressure Washing as
`https://www.greencalpressurewashing.com`. This value is authorized for use
as:

- `site` in `apps/greencal-website/astro.config.mjs`.
- The base URL for `<link rel="canonical">` on every indexable route.
- The base URL for `sitemap.xml` and the `Sitemap:` directive in
  `robots.txt`.
- The value for `og:url` and Twitter Card URL metadata.

GreenCal is a service-area business. This ADR does **not** authorize
publishing a public street address, and does not touch or resolve the
NAP (name/address/phone) inconsistency or the `LocalBusiness`/
`ProfessionalService` structured-data prohibition documented in
`.claude/rules/websites.md` — those remain separately gated.

**Scope note**: This ADR authorizes only the domain **value** for the four
uses listed above. It does not authorize DNS changes, hosting/server
configuration, live deployment, analytics or tracking-script installation,
Google Search Console setup, or any other production integration — each of
those remains gated by `.claude/rules/websites.md` and requires its own
separate, explicit user authorization.

**Consequences**:

- `apps/greencal-website/astro.config.mjs` sets `site:
'https://www.greencalpressurewashing.com'`, enabling `Astro.site`-derived
  canonical URLs and sitemap generation.
- `BaseLayout.astro`'s existing comment explaining the omission of
  canonical/`og:url` (citing ADR-0004) is now resolved and can be replaced
  with real canonical/OG URL output.
- `robots.txt` gains a `Sitemap:` directive pointing at
  `https://www.greencalpressurewashing.com/sitemap.xml`.
- Deploying the site so that this domain actually resolves to it (DNS,
  hosting) remains a separate, unauthorized action — this ADR records only
  that the URL space is now confirmed for the purpose of generating correct
  metadata ahead of that deployment.

**Deferred decisions** (still not made by this ADR): DNS/hosting
configuration and live deployment; analytics/tracking installation; Google
Search Console setup; NAP (name/address/phone) resolution and any
`LocalBusiness`/`ProfessionalService` structured data; brand/OG image
assets (still none exist in the repository).

**Related**: [ADR-0004](#adr-0004-dedicated-appsgreencal-website-for-greencal-pressure-washing-designated-phase-2a),
`.claude/rules/websites.md`

---

## ADR-0006: Vercel, Supabase, and Resend approved for `apps/greencal-website` live quote delivery

**Status**: Confirmed (stack approval only - see scope note below)

**Context**: The Stage 3 quote form's production adapter (`unavailableAdapter`)
always returns `pending_configuration` because `apps/greencal-website` had
no server runtime, database, or email-delivery mechanism (ADR-0004: Astro
`output: 'static'`, no adapter). This is the launch blocker: the form
cannot store or deliver real leads. The owner explicitly approved a
specific GreenCal-owned stack to resolve it.

**Decision**: The following GreenCal-owned stack is approved for live
quote-lead delivery, and only this stack:

- **Vercel** for hosting and the serverless runtime that executes the
  trusted quote-submission endpoint.
- The **official `@astrojs/vercel` adapter** for Astro/Vercel integration.
- **Supabase** as the durable source of truth for stored leads.
- **Resend** as the notification-email channel, sending to the approved
  recipient `greencaliforniacorporation@gmail.com`.

No other hosting provider, database, or email-delivery provider is
authorized. Do not introduce SendGrid, Mailgun, Postmark, direct SMTP,
Firebase, or any other CRM/database/hosting/email provider without a
separate, explicit owner approval.

**Scope note**: This ADR authorizes implementing against these three
providers' APIs/SDKs only. It does **not** authorize: production
deployment, DNS cutover, merging to `main`, creating provider accounts on
the owner's behalf, or exposing credentials. Real activation (an owner-
provisioned Supabase project, Resend account, and Vercel project, with
real environment variables configured) is a separate, later step - see
`apps/greencal-website/src/lib/quote-form/README.md`'s activation
checklist.

**Runtime model**: `output` remains `'static'` (ADR-0004 unchanged) - the
Vercel adapter is required only so the single on-demand route
(`src/pages/api/quote-submit.ts`, `export const prerender = false`) has a
trusted server runtime. Every other page remains prerendered. This is the
least invasive compatible architecture: no other route was converted to
server rendering.

**Consequences**:

- `apps/greencal-website/astro.config.mjs` adds the `@astrojs/vercel`
  adapter.
- `apps/greencal-website/package.json` adds `@astrojs/vercel`,
  `@supabase/supabase-js`, `resend`, and `tslib` (a required transitive
  dependency of `@supabase/functions-js` that this repository's pnpm
  hoisted-linker configuration does not resolve automatically without an
  explicit top-level declaration - discovered and fixed during
  implementation).
- The existing Stage 3 `QuoteSubmissionAdapter` interface, typed
  `QuoteSubmissionResult` states, and `submitQuoteForm` orchestration are
  reused unchanged - only a new adapter implementation
  (`supabase-resend-adapter.ts`) and its two injected dependencies
  (`lead-store.ts`, `notification-sender.ts`) were added.
- `@astrojs/vercel` does not support the `astro preview` command
  (verified directly: "The @astrojs/vercel adapter does not support the
  preview command"). Local/CI testing uses `astro dev` instead - see
  `playwright.config.ts`. Full production-runtime verification requires a
  real Vercel deployment, out of scope for this stage.

**Related**: [ADR-0004](#adr-0004-dedicated-appsgreencal-website-for-greencal-pressure-washing-designated-phase-2a),
[ADR-0005](#adr-0005-production-domain-for-appsgreencal-website-is-httpswwwgreencalpressurewashingcom),
`apps/greencal-website/src/lib/quote-form/README.md`

---

## ADR-0007: Approved GreenCal service and city-coverage scope (services/cities centralized, LA County removed)

**Status**: Confirmed (owner-directed scope update)

**Context**: `apps/greencal-website` originally published a residential-only,
two-service scope (`roof-cleaning`, `house-washing`) with no defined
service-area city list. The owner directed an expanded, final approved
scope covering residential, commercial, and multi-family/HOA exterior
cleaning, modeled structurally on the published service-category and
city-coverage architecture of `washedoutpressurewashing.com` (inspected
2026-07-22) - used only as a reference for scope/IA/UX structure, never
copied for wording, branding, claims, or design (see BUSINESS_FACTS.md and
the source note there).

**Decision**:

- Adopt exactly the approved service categories in BUSINESS_FACTS.md:
  3 residential, 7 commercial, 2 multi-family/HOA pages (13 selectable
  quote-form service options including "Other Exterior Cleaning
  Request", reviewed manually).
- Adopt exactly the approved 80-city list in BUSINESS_FACTS.md, spanning
  San Diego, Orange, and Riverside Counties only.
- **Remove Los Angeles County** from all public scope statements. The
  site previously made no LA-County-specific claim in committed content,
  so this is a forward-looking exclusion, not a retraction of a
  published claim - see the test suite's explicit LA County absence
  guard.
- Centralize the city list in one typed source, `src/data/cities.ts` -
  every city-dependent feature (navigation, quote form, service-area
  pages, sitemap, structured data, footer, internal links) derives from
  it. No second, separately-typed city list exists anywhere in the app.
- Centralize the service list in `src/data/services.ts` (real pages) and
  `src/data/quote-form-service-options.ts` (the superset of selectable
  quote-form options, since some multi-family/HOA sub-requests map to a
  shared page rather than each getting a near-duplicate page).

**Why city pages are not automatically indexable**: The approved city
list defines coverage, not automatic SEO publication. No real
per-city project reference, local proof, or verified geographic/
regulatory detail exists for any of the 80 approved cities. Every
`CityRecord` therefore starts `publishStatus: 'draft'` / `indexable:
false`, and the dynamic `/service-areas/[city]` route renders every city
page but marks each `noindex` and excludes it from `sitemap.xml.ts`
until a future stage adds genuine, unique, owner-verified content per
city (see `.claude/rules/websites.md`'s verified-content requirement).
The three county pages (`/service-areas/{county}`) and the
`/service-areas` index remain indexable: their content (a factual
coverage list, a disclaimer, and links to real service pages) does not
depend on unverified per-city claims.

**Why the reference website is not copied**: `washedoutpressurewashing.com`
was inspected only to verify a reasonable service-category structure and
city-coverage pattern for a Southern California pressure-washing
business. No wording, branding, logo, images, reviews, ratings,
statistics, licenses, pricing, or company identity from that site was
reproduced - all GreenCal copy in the new pages is original, and every
claim is either omitted or written in the safe, factual register already
established for this site (no "top rated," no guarantee language, no
unverified license/insurance claims - see `.claude/rules/websites.md`).

**How future city or service additions require owner approval**: Any
city outside the 80-entry list, any county outside San Diego/Orange/
Riverside, or any service outside the approved categories requires a
separate, explicit owner-approved scope update (a new ADR or an amendment
to this one) - this repository's automated tests (see
`tests/scope-exclusions.spec.ts`) fail the build if an excluded service,
an unapproved city, or Los Angeles County appears in navigation, the
quote form, structured data, or generated pages.

**Excluded services** (see BUSINESS_FACTS.md for the full list): auto/
mobile detailing, car/fleet washing, pool cleaning/maintenance/repair,
carpet/upholstery cleaning, paver/concrete/driveway/brick/stone sealing,
holiday/permanent lighting, landscaping, painting, roofing/gutter/solar
installation or repair, janitorial/maid service. A concrete pool deck may
still be cleaned as a concrete surface - this is explicitly not "pool
cleaning."

**Alternatives considered**: Publishing all 80 city pages as indexable
immediately (rejected - would mean either fabricating local
content/proof or publishing thin, duplicative pages, both prohibited by
`.claude/rules/websites.md`). Maintaining separate city lists per feature
(rejected - directly contradicts the owner's explicit centralization
requirement and risks silent drift).

**Trade-offs**: The reusable city-page system exists and is fully built
(all 80 pages render correctly), but most city pages carry no SEO value
until real content is added - a deliberate, disclosed trade-off favoring
honesty over premature indexing.

**Consequences**: `src/data/cities.ts`, `src/data/services.ts`,
`src/data/quote-form-service-options.ts`, navigation, the quote form,
`sitemap.xml.ts`, structured data, and the full test suite were updated

- see the Stage report for the complete file list. `/roof`,
  `/residential-services`, and `/restoration/house-washing` now redirect
  (301) to their replacements rather than remaining live pages.

**Reversible**: Yes - service/city scope is data-driven; reverting or
amending the approved lists does not require a structural rewrite.

**Owner approval required for future changes**: Yes - any addition to
the approved service or city scope.

**Related**: BUSINESS_FACTS.md, [ADR-0004](#adr-0004-dedicated-appsgreencal-website-for-greencal-pressure-washing-designated-phase-2a),
`.claude/rules/websites.md`, `apps/greencal-website/src/data/cities.ts`,
`apps/greencal-website/src/data/services.ts`

---

## ADR-0008: Cost-efficient multi-model cloud infrastructure direction (Hostinger VPS + Docker Compose, provider-neutral AI gateway)

**Status**: Confirmed (direction and repository-preparation scope only —
see scope note below; provisioning, credentials, and deployment remain
separately gated)

**Context**: The "Proposed decisions" section below previously listed
deployment target (Kubernetes via `infra/k8s`, or an alternative) as
**TBD**. The owner has now explicitly authorized a specific target cloud
architecture and directed a "Cost-Efficient Multi-Model Cloud
Infrastructure Preparation Stage": repository structure, provider-neutral
contracts, placeholder adapters, Docker Compose templates, and
documentation — explicitly **not** provisioning, credential connection,
real AI-provider calls, Hostinger setup, or deployment.

A read-only audit of the existing monorepo (apps, packages, infra, CI,
config, docs) found:

- `apps/worker-service` already exists and is documented in
  [ARCHITECTURE.md](ARCHITECTURE.md) as "Background job / worker
  processor" — an empty Phase 1 placeholder.
- `packages/agent-sdk` already exists and is documented as "Shared AI
  agent interfaces and plugin contracts" — an empty Phase 1 placeholder.
- `packages/telemetry` already exists ("Shared telemetry instrumentation
  helpers") — an empty Phase 1 placeholder.
- `config/policies/README.md` already documents itself as the planning
  home for policy/governance guidance.
- `infra/terraform`, `infra/k8s`, `infra/iam`, `infra/secrets`,
  `infra/charts` remain planning-only `README.md` stubs; no infrastructure
  is provisioned anywhere in this repository.
- `apps/api-gateway` already exists, documented as "API gateway / edge
  service" for the platform's own APIs — a different concern from an
  AI-provider routing gateway.
- No "Hermes" or "Jervis" code exists anywhere in the repository.

**Decision**:

1. **Deployment target**: Resolve the previously open deployment-target
   decision in favor of a **Hostinger VPS running Docker Compose**
   (reverse proxy, n8n, PostgreSQL, Redis, an AI gateway, agent workers,
   monitoring) — **not** Kubernetes. `infra/k8s` and `infra/charts` remain
   unused planning stubs; this ADR does not activate them. Public
   websites continue on **Vercel** (already true for
   `apps/greencal-website` per ADR-0006); business/application data
   continues toward **Supabase Cloud** where appropriate; **GitHub** and
   GitHub Actions remain the source of truth for branches, review, and
   CI/CD gating.
2. **AI provider set**: Approve exactly seven AI providers for future
   integration, each with a distinct role: **Anthropic/Claude**
   (orchestration, architecture, security-sensitive review, final
   high-impact decisions), **OpenAI** (customer-facing automation,
   structured tool use, vision, future voice), **Z.AI/GLM** (default
   low-cost text/data/coding worker), **DeepSeek** (inexpensive fallback
   and batch analysis), **Perplexity** (current web research only),
   **Gemini** (image/video/multimodal), **Kimi Code CLI** (restricted
   secondary coding worker, isolated branches only). Grok/xAI and Sakana
   AI are explicitly excluded from this and all future integration work.
3. **Routing model**: A single primary provider is selected per task
   through a deterministic router (rules/templates/stored facts first,
   then one AI provider); escalation to Claude is conditional and
   exception-based (low confidence, conflicting facts, pricing/legal
   language, upset customer, high-value lead, provider disagreement,
   security/production impact, policy-engine flag, or owner-approval
   requirement) — not a chain that calls every provider for every task.
4. **Reuse over duplication**: Implement agent-worker execution inside
   the existing `apps/worker-service` rather than creating a new
   `apps/agent-worker`. Implement provider/agent contracts and capability
   descriptors inside the existing `packages/agent-sdk` rather than
   creating a new `packages/agent-contracts`. Both existing
   apps/packages keep their documented names and current empty state
   until this work actually lands.
5. **New, non-duplicating additions**: `apps/ai-gateway` (provider-neutral
   AI routing gateway, distinct from `apps/api-gateway`), `apps/jervis-api`
   (control/orchestration API — no prior art exists), `packages/task-router`,
   `packages/context-builder`, `packages/semantic-cache`,
   `packages/policy-engine` (runtime companion to the planning guidance in
   `config/policies/README.md`), `packages/job-queue`,
   `packages/audit-logger` (a distinct, compliance-oriented audit trail —
   see trade-offs — not a replacement for `packages/telemetry`),
   `packages/cost-controller`, `packages/provider-adapters`,
   `infra/hostinger`, `infra/docker`, `infra/monitoring`, `infra/backups`.

**Alternatives considered**:

1. **Kubernetes deployment target** (`infra/k8s`, already scaffolded as a
   planning stub). Rejected for this stage: higher operational complexity
   and cost than justified at current single-VPS, single-business-launch
   scale, and in tension with the explicit cost-efficiency objective.
2. **New `apps/agent-worker` and `packages/agent-contracts`** as separate
   from `apps/worker-service`/`packages/agent-sdk`. Rejected: both
   existing placeholders already document the exact intended purpose:
   creating parallel new ones would mean two apps/packages claiming the
   same stated role, contradicting the requirement to prove no reusable
   equivalent exists first.
3. **A provider chain that calls every AI provider for every task, or
   calling multiple providers redundantly for the same routine task**.
   Rejected in favor of one selected primary provider per task type with
   defined, bounded escalation — for cost, latency, and complexity
   reasons.

**Trade-offs**: Hostinger VPS + Docker Compose is cheaper and simpler to
operate than Kubernetes but provides no automatic multi-node failover;
acceptable at current scale, revisit if/when load or availability
requirements change. Keeping provider/agent contracts inside
`packages/agent-sdk` grows that package's scope beyond its current empty
placeholder, which `ARCHITECTURE.md`'s package-boundaries table must
reflect. Splitting `packages/audit-logger` out from `packages/telemetry`
adds a second logging-shaped package; justified because audit trails
(compliance-grade, immutable, security/spend/escalation events) have
different retention and integrity requirements than general telemetry
instrumentation, but the two packages' READMEs must cross-reference each
other so the split reads as deliberate, not accidental.

**Consequences**:

- `ARCHITECTURE.md`'s confirmed application and package boundary tables
  gain rows for the new apps/packages listed above, at the same Phase 1
  placeholder fidelity as existing entries (no production business logic,
  no real provider calls, no real credentials).
- `ROADMAP.md` gains a new, explicitly in-progress/scaffold phase entry
  for this cloud-infrastructure-preparation work, additive to and
  independent of the existing Phase 2/2A/3/4+ entries.
- `docs/INDEX.md` gains routing entries for the new `docs/cloud/*.md` and
  `docs/agents/*.md` documents and an extended path-scoped rule covering
  the new apps/packages.
- No production system, credential, account connection, real AI-provider
  API call, or deployment happens as a result of this ADR.

**Scope note**: This ADR authorizes repository structure preparation,
provider-neutral TypeScript contracts/capability descriptors, placeholder
(non-network-calling) adapters, Docker Compose templates, and
documentation only. It does **not** authorize: connecting real provider
accounts or credentials, real paid API calls, Hostinger VPS provisioning,
DNS/hosting changes, or any production deployment — each remains a
separate, explicitly gated future decision requiring its own owner
authorization.

**Deferred decisions** (still not made by this ADR): Database engine/ORM
for `packages/db`; exact service-to-service communication pattern
(REST/gRPC/queue) beyond what the task-router/job-queue placeholders
assume; real Hostinger VPS provisioning steps; real provider-account
connection and credential storage; production deployment of any of the
new apps.

**Related**: [ARCHITECTURE.md](ARCHITECTURE.md), [ROADMAP.md](ROADMAP.md),
[docs/INDEX.md](docs/INDEX.md), [BUSINESSES.md](BUSINESSES.md),
[PRODUCT.md](PRODUCT.md), `docs/cloud/CLOUD_ARCHITECTURE.md`,
[ADR-0006](#adr-0006-vercel-supabase-and-resend-approved-for-appsgreencal-website-live-quote-delivery)

---

## ADR-0009: `packages/db` persistence engine, and CRM Milestone 1 scope (Lead/Contact persistence for the existing Growth System domain model)

**Status**: Confirmed (Milestone 1 implemented this sprint; remaining CRM
feature scope explicitly deferred — see scope note)

**Context**: The owner's "Master Scope Consolidation" directive requires
advancing an internal CRM (System 3) as the next highest-priority,
non-blocked system, following GreenCal's production launch. A repository
audit before starting this work found that `packages/core-models` is
**not** the empty placeholder `ARCHITECTURE.md` describes — it already
contains a complete, tested, pure domain model (README: "GreenCal
Lead-to-Job-to-Content growth system") covering ~28 typed entities
(`Lead`, `Contact`, `Customer`, `Estimate`, `Booking`, `Job`, `Invoice`,
`Payment`, `ReviewRequest`, `ContentDraft`, `PublishedProject`,
`FormSubmission`, `CallRecord`, `AuditLog`, and more) and five full state
machines (Lead, Job, Invoice, Content, Review Request) with authorization
rules, precondition checks, and typed audit-record output — built from a
prior "GreenCal Phase 2A" planning conversation this session has no
transcript of. That package's own README is explicit that persistence,
API routes, UI, and authentication were **deliberately excluded** from
that slice. `packages/db` remained a literal one-line placeholder
(`export const dbPlaceholder = 'db placeholder'`), and ADR-0008 explicitly
left "database engine/ORM for `packages/db`" as a deferred TBD.

This ADR resolves that TBD and scopes the first real CRM milestone as
**persistence for the existing `Lead`/`Contact` domain model**, not a new
domain model — building a second, competing set of lead/contact types
would violate the repository's own reuse requirement and would discard
already-tested authorization/audit logic.

**Decision**:

1. **Persistence engine**: `packages/db` uses **Supabase/Postgres**, via
   `@supabase/supabase-js`, with plain, hand-written, owner-run SQL
   migration files — no ORM, no migration-runner tool. This matches the
   only persistence pattern already proven in production
   (`apps/greencal-website`'s `quote_leads` table and its
   `supabase-schema.sql`/`supabase-migration-002-*.sql` files), keeps one
   database technology across the platform, and avoids introducing a
   second, inconsistent persistence convention.
2. **New tables, not a rewrite of `quote_leads`**: `contacts`, `leads`,
   and `audit_log` are new tables implementing `packages/core-models`'
   existing `Contact`/`Lead`/`AuditLog` shapes exactly (same status enum,
   same field names translated to snake_case). `quote_leads` (GreenCal's
   live, revenue-critical form-submission record) is left completely
   unmodified except one new, additive, nullable `lead_id` column — it
   plays the role of the existing `FormSubmission` type (raw intake
   record, optionally linked to a `Lead`), not the CRM `Lead` entity
   itself.
3. **State transitions only through the existing state machine**: the new
   `LeadRepository.transitionLead()` calls `core-models`'
   `transitionLead()` for every status change and persists exactly the
   `entity`/`auditRecord` it returns — it never writes a raw status column
   directly. An illegal or unauthorized transition request is rejected
   before touching the database, preserving the guarantees
   `packages/core-models`' tests already established.
4. **Best-effort, non-breaking intake wiring**: GreenCal's real production
   lead-submission path (`supabase-resend-adapter.ts`) gains one
   best-effort, try/catch-wrapped call — after a successful fresh
   `quote_leads` insert, find-or-create the `Contact`, create the `Lead`,
   and link `quote_leads.lead_id` — using the exact same never-fail
   pattern already established for `markTestLead`/
   `markCustomerConfirmationStatus`. A failure here can never change the
   customer-facing `QuoteSubmissionResult` or risk the already-working
   insert path.
5. **Authorization model for now**: only the Supabase service-role key
   (server-only) can access the new tables — RLS enabled, no
   anon/authenticated policies yet. An authenticated owner-role UI
   (`apps/admin-console`) is explicitly **deferred** to a later milestone;
   building real Supabase Auth wiring, RBAC, and a deployed console in the
   same pass as the data model was judged too large for one bounded
   cluster (see Scope note).

**Alternatives considered**:

1. **Design a new, parallel CRM data model from scratch.** Rejected:
   `packages/core-models` already has a more rigorous, tested design
   (typed state machines, authorization rules, audit contracts) than
   anything that could be safely written in one pass — reusing it is both
   less work and higher quality.
2. **Extend `quote_leads` itself into the CRM `Lead` entity** (add
   `contact_id`, full state-machine columns directly onto it). Rejected:
   conflates the raw, revenue-critical form-submission record with the
   richer CRM entity, and the master directive itself says "reuse
   production lead records — do not create a second lead database," which
   this ADR satisfies via linkage (`quote_leads.lead_id`) rather than
   duplication or in-place mutation of a table already serving production
   traffic.
3. **An ORM (Prisma/Drizzle) for `packages/db`.** Rejected for this
   milestone: introduces a second persistence convention alongside the
   proven hand-written-SQL pattern, for no benefit at current scale;
   revisit only if a real need (complex query composition, cross-table
   type generation at scale) appears later.

**Trade-offs**: Hand-written SQL migrations mean no automatic schema-drift
detection or rollback tooling — acceptable at current scale and
consistent with the existing GreenCal precedent. Deferring the
authenticated owner UI means Milestone 1 is real, tested, and wired into
production intake, but not yet something the owner can see or act on
through a web page — it currently updates only via direct Supabase table
access or a future admin-console milestone.

**Consequences**:

- `ARCHITECTURE.md`'s package-boundaries table entries for
  `packages/core-models` and `packages/db` are corrected to reflect actual
  repository state (the former was significantly underdescribed).
- `docs/crm/CRM_ARCHITECTURE.md` is created, documenting what is actually
  implemented (persistence + intake wiring) versus the full CRM feature
  list from the master directive, classified honestly.
- Every future CRM milestone (companies, deals, jobs, estimates,
  appointments, calls, tasks, campaigns, the authenticated `admin-console`
  UI, search/filter/CSV export/reporting) builds on this same
  `packages/core-models` domain model and `packages/db` persistence
  convention rather than introducing new ones.

**Scope note**: This ADR and this sprint's Milestone 1 authorize only:
the `contacts`/`leads`/`audit_log` tables, their RLS (service-role only),
`packages/db`'s repository implementation and tests, and the best-effort
GreenCal intake wiring described above. It does **not** authorize: an
authenticated admin-console UI, companies/deals/jobs/estimates/
appointments/calls/tasks/campaigns persistence, CSV export, reporting, or
any change to `quote_leads`' existing columns beyond the one additive
`lead_id` link.

**Related**: [ARCHITECTURE.md](ARCHITECTURE.md),
`docs/crm/CRM_ARCHITECTURE.md`,
[ADR-0008](#adr-0008-cost-efficient-multi-model-cloud-infrastructure-direction-hostinger-vps--docker-compose-provider-neutral-ai-gateway),
`apps/greencal-website/src/lib/quote-form/README.md`.

---

## ADR-0010: Multi-tenant CRM foundation (`businesses`/`memberships`, tenant-scoped RLS)

**Status**: Confirmed (schema, RLS policies, and repository-layer scoping
implemented this sprint; authenticated admin-console UI explicitly
deferred to the next milestone)

**Context**: The owner's "Master Scope Consolidation" directive requires
the platform's CRM to serve GreenCal Pressure Washing, GreenCal Auto
Detailing, Navarro Builders, and future clients on shared infrastructure
with strict tenant isolation, and explicitly forbids hardcoding GreenCal
business facts into shared platform code. CRM Milestone 1 (ADR-0009)
shipped `contacts`/`leads`/`audit_log` with no tenant concept at all —
every row implicitly belonged to "the one business with data." Building
an authenticated, RLS-verified admin-console UI on top of that schema
would have meant redoing the RLS/data-access work as soon as a second
tenant existed, so this ADR resolves tenancy first, as its own bounded
milestone, before any UI work begins.

**Decision**:

1. **New tables**: `businesses` (id, name, slug) and `memberships`
   (business_id, user_id referencing `auth.users`, role) — see
   `packages/db/migrations/002-multi-tenant-foundation.sql`.
2. **`business_id` added to every existing CRM table** (`contacts`,
   `leads`, `audit_log`), nullable first, backfilled to one seeded
   business row (`slug = 'greencal-pressure-washing'` — the only tenant
   with real data today), then set `NOT NULL`. Same additive-then-backfill
   pattern already proven in
   `apps/greencal-website/src/lib/quote-form/supabase-migration-002-lead-status.sql`.
   The one seed `INSERT` is real business data in a migration file, not a
   hardcoded fact in application code — every repository function,
   adapter, and UI component this ADR touches takes `businessId` as a
   parameter and contains no GreenCal-specific literal.
3. **`MembershipRole`** (`packages/db/src/membership-types.ts`) is a
   human-actor subset of `packages/core-models`' existing `ActorCategory`
   union (`owner-admin`, `office-manager`, `dispatcher`, `technician`),
   enforced identical at the SQL `CHECK` constraint and the TypeScript
   type level (a compile-time assertion keeps them in sync). This means a
   membership row maps directly to a `TransitionContext.actorCategory`
   with no translation table when the admin-console eventually calls
   `transitionLeadStatus()`.
4. **RLS**: every CRM table's `authenticated`-role policies are scoped to
   `business_id in (select business_id from memberships where user_id =
auth.uid())`. `audit_log` gets a `select` policy only — no
   `authenticated` insert policy exists, so an audit record can only ever
   be written by the trusted service-role path (a real state-machine
   transition), never directly by a client. The service-role key
   continues to bypass RLS entirely, as it already did.
5. **Repository-layer defense in depth**: `ContactRepository` and
   `LeadRepository` now require `businessId` on every call and filter by
   it explicitly (not just relying on RLS), because GreenCal's intake
   wiring runs through the service-role key, which bypasses RLS — without
   an explicit filter, a bug there could leak or corrupt another tenant's
   data even though RLS itself is correctly configured.
6. **GreenCal's own business id is configuration, not code**: a new,
   optional `CRM_BUSINESS_ID` environment variable (see
   `apps/greencal-website/src/lib/quote-form/server-config.ts`) — when
   absent, CRM intake linking is skipped entirely (already-tested
   behavior from ADR-0009), never a hardcoded fallback.

**Alternatives considered**:

1. **A single shared `business_id` constant hardcoded in `packages/db` or
   `crm-intake-adapter.ts`.** Rejected: directly violates the owner's
   explicit instruction and would require a code change (not just a
   config change) to onboard the next business.
2. **Row-level tenancy via a separate schema-per-tenant instead of a
   shared-schema `business_id` column.** Rejected for this scale: far
   higher operational complexity (per-tenant migrations, connection
   routing) for a platform currently serving one real tenant with a
   second and third still not incorporated as repository modules at all
   (see BUSINESSES.md) — revisit only if real multi-tenant scale someday
   demands it.
3. **Building the admin-console UI in the same milestone as the tenancy
   schema.** Rejected: the master directive's own operating rules say not
   to attempt everything in one pass, and UI built against a
   soon-to-change schema would be wasted work — see the Scope note.

**Trade-offs**: Every future CRM table (companies, deals, jobs, estimates,
etc.) must now include `business_id` and tenant-scoped RLS from the
start, adding a small, fixed amount of boilerplate to each — accepted as
the cost of not having to retrofit tenancy again later. The backfill
migration assumes exactly one real tenant exists today, which is true;
if that assumption were ever wrong, the backfill would silently
misattribute rows — mitigated by this being a one-time, reviewed
migration file, not a repeatable code path.

**Consequences**:

- `packages/db`'s `ContactRepository.findOrCreateContact` and
  `LeadRepository.createLead`/`transitionLeadStatus` signatures changed
  to require `businessId` — a breaking change to Milestone 1's
  repository API, applied consistently across `packages/db`'s own tests
  and GreenCal's `crm-intake-adapter.ts` in the same commit.
- `docs/crm/CRM_ARCHITECTURE.md` is updated to describe the tenant model.
- The next milestone (authenticated `apps/admin-console`) builds directly
  on this tenant model rather than needing its own redesign.

**Scope note**: This ADR authorizes the `businesses`/`memberships`
tables, `business_id` columns and RLS on the three existing CRM tables,
and the repository/adapter signature changes needed to pass `businessId`
through. It does **not** authorize: the admin-console UI itself (login,
dashboard, any CRM view), onboarding GreenCal Auto Detailing or Navarro
Builders as real tenants (no repository module exists for either yet —
see BUSINESSES.md), or persistence for any entity beyond
`Contact`/`Lead`/`AuditLog`.

**Related**: [ADR-0009](#adr-0009-packagesdb-persistence-engine-and-crm-milestone-1-scope-leadcontact-persistence-for-the-existing-growth-system-domain-model),
`docs/crm/CRM_ARCHITECTURE.md`, [BUSINESSES.md](BUSINESSES.md).

---

## Proposed decisions (not yet made)

- Service-to-service communication pattern (REST/gRPC/queue) beyond the
  new task-router/job-queue placeholders (see ADR-0008) — **Proposed /
  TBD**.
