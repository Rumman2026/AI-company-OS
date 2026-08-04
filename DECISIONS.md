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

## ADR-0011: Admin-console architecture (Astro SSR + Supabase Auth session, RLS-enforced data access) — CRM Milestone 3

**Status**: Confirmed (login/session, dashboard, Leads and Contacts
modules implemented this sprint; Companies/Estimates/Jobs/Tasks/
Appointments/Notes/Media explicitly deferred — see scope note)

**Context**: `apps/admin-console` was a fully empty Phase 1 placeholder
(no framework installed at all — see `.claude/rules/frontend.md`) before
this milestone. The owner's directive requires an authenticated,
tenant-aware admin UI covering nine entity types. A repository check at
the start of this milestone found only `Contact` and `Lead` have any
persistence (`packages/db`, ADR-0009/ADR-0010); `Job` and `Estimate`
exist as `packages/core-models` types with no repository; `Company`,
`Task`, `Appointment`, and `Note` have no type or repository at all.
Building UI CRUD for entities with no data model would mean fabricating
one under time pressure or faking the UI against nothing real — both
explicitly forbidden by the owner's own completion standard. This ADR
therefore scopes Milestone 3 to what can be real: authentication,
session handling, and the two entities that already have genuine
persistence.

**Decision**:

1. **Framework**: Astro with `output: 'server'` (every page is
   authenticated/dynamic, unlike `apps/greencal-website`'s
   mostly-static site) plus `@astrojs/vercel` and `@astrojs/react` for
   interactive islands — reusing the only framework/deployment pattern
   already proven in this repository, while still satisfying
   `ARCHITECTURE.md`'s "React/TSX" description for `admin-console`
   through React islands rather than introducing a second framework
   (Next.js, etc.) into the repository for the first time.
2. **Session**: `@supabase/ssr`'s cookie-based server client — secure,
   httpOnly session cookies refreshed by `src/middleware.ts` on every
   request; a route not in the allow-list (`/login`,
   `/forgot-password`, `/reset-password`, their API routes) redirects
   to `/login` without a valid session.
3. **Data access uses the anon key, not the service-role key**: unlike
   `packages/db`'s existing repositories (constructed with the
   service-role key for GreenCal's trusted server-side intake path),
   admin-console constructs its Supabase client with the anon key plus
   the authenticated user's session, so every query is subject to
   ADR-0010's tenant-scoped RLS policies at the database level - not
   just the repository layer's own `businessId` filtering. The same
   `ContactRepository`/`LeadRepository` functions are reused unchanged
   (they're generic over `MinimalSupabaseClient`); only the client
   construction differs. Both layers - RLS and repository filtering -
   now independently enforce tenant isolation for this path.
4. **`businessId` is never client-supplied**: every admin-console page
   and API route resolves the current user's business from their real
   `memberships` row (`user_id = auth.uid()`, enforced by the
   `memberships_own_select` RLS policy) — never from a query
   parameter, form field, or request body. This closes the
   tenant-escalation risk a naive implementation could introduce.
5. **Audit-safe actions**: a Lead status change made through
   admin-console records the _real_ authenticated user as `actorId` and
   maps their `memberships.role` (a `MembershipRole`) directly to
   `TransitionContext.actorCategory` — no service-account or generic
   "system" actor is used for a human-initiated action.
6. **`packages/ui-kit` gains its first real content**: `Button`, `Badge`,
   `Table`, `EmptyState`, `ErrorBanner`, `LoadingSpinner`, and
   `FormField` React components plus a small design-token set — per
   `.claude/rules/frontend.md`'s existing instruction to put shared UI
   in `ui-kit` rather than duplicating it per app. `admin-console` is
   the first real consumer; `web-console`/`docs-portal` remain
   untouched placeholders.
7. **No public self-registration**: `admin-console` has a login page,
   not a signup page. The owner's own first user account is created via
   the Supabase dashboard (Authentication → Users), consistent with
   normal practice for an internal admin tool serving multiple tenants —
   self-serve signup would need its own invitation/approval design this
   ADR does not scope.

**Alternatives considered**:

1. **Next.js (or another framework new to this repository).** Rejected:
   Astro + `@astrojs/vercel` is the only server-deployment pattern
   already proven end-to-end here (including the hard-won Vercel
   packaging fixes documented in `apps/greencal-website/astro.config.mjs`)
   — introducing a second framework for one app adds real risk and
   maintenance surface for no clear benefit at this scale.
2. **Using the service-role key in admin-console, filtering only in the
   repository layer (as GreenCal's intake path already does).**
   Rejected: an authenticated, multi-tenant, human-facing admin surface
   is exactly the scenario RLS exists for — using the anon key here
   makes tenant isolation a database-enforced guarantee, not just an
   application-code convention, for the path most likely to eventually
   need per-role permission nuance.
3. **Building all nine requested CRUD modules in this milestone,
   inventing minimal stand-in types/tables for Company/Task/Appointment/
   Note on the spot.** Rejected: the owner's own completion standard
   forbids presenting placeholder or mocked work as complete, and a
   rushed, same-day data model for four new entities would not receive
   the same design rigor `packages/core-models`' existing entities did.

**Trade-offs**: Deferring seven of nine requested modules means this
milestone does not fulfill the full original request in one pass —
mitigated by making the sequencing explicit (see Scope note) rather than
silently shipping less than asked. Using the anon key plus RLS for every
admin-console query adds a small amount of session-plumbing complexity
(middleware, cookie handling) compared to the simpler service-role
approach, in exchange for a materially stronger tenant-isolation
guarantee.

**Consequences**:

- `docs/crm/CRM_ARCHITECTURE.md` gains a Milestone 3 section.
- `ARCHITECTURE.md`'s `apps/admin-console`/`packages/ui-kit` rows are
  corrected to reflect real implementation.
- Future CRM milestones (Jobs, Estimates, then Company/Task/Appointment/
  Note once those gain real `packages/core-models` types and
  `packages/db` repositories) build UI directly on this same
  authentication/session/RLS-client pattern.

**Scope note**: This ADR and Milestone 3 authorize: admin-console's
Astro/Vercel/Supabase-Auth bootstrap, login/logout/password-reset,
session middleware, the dashboard, and full Lead (list/detail/status
transition) and Contact (list/detail, read-only) modules. It does
**not** authorize: Company, Estimate, Job, Task, Appointment, Note, or
Media persistence or UI (none exist yet - see Context), a live Vercel
deployment of admin-console (not yet provisioned - see Owner Actions),
or onboarding GreenCal Mobile Detailing/Navarro Builders as real tenants.

**Related**: [ADR-0009](#adr-0009-packagesdb-persistence-engine-and-crm-milestone-1-scope-leadcontact-persistence-for-the-existing-growth-system-domain-model),
[ADR-0010](#adr-0010-multi-tenant-crm-foundation-businessesmemberships-tenant-scoped-rls),
`docs/crm/CRM_ARCHITECTURE.md`, `.claude/rules/frontend.md`.

---

## ADR-0012: Estimate/Booking/Job persistence (CRM Cluster 4)

**Status**: Confirmed (persistence implemented this cluster; UI deferred)

**Context**: Continuing the CRM build-out past Milestone 3 (Lead/Contact),
`Job` was assumed to be the next-closest entity to ready since
`packages/core-models` already has its type and state machine
(`transitionJob`). Inspecting the type revealed `Job.bookingId` is
required (non-optional), and `Booking.estimateId` is likewise required —
so a schema-correct `Job` cannot exist without a `Booking`, which cannot
exist without an `Estimate`. Building `Job` persistence alone would have
meant either loosening those required fields (misrepresenting a domain
invariant `packages/core-models`' own tests already rely on) or leaving
foreign keys nullable in a way the type system doesn't permit. Both are
rejected; all three are added together.

**Decision**: New tables `estimates`, `bookings`, `jobs` — tenant-scoped
(`business_id`, per ADR-0010) exactly like `contacts`/`leads`, with the
same RLS pattern (`authenticated` role scoped via `memberships`,
service-role bypasses as usual). `bookings.job_id` and `jobs.booking_id`
form a circular reference, resolved the standard way: `jobs` table
created first referencing `bookings(id)` (NOT NULL), then a deferred
`ALTER TABLE bookings ADD CONSTRAINT ... FOREIGN KEY (job_id) REFERENCES
jobs (id)` (nullable) added after. `jobs.status` changes must route
through `packages/core-models`' existing `transitionJob()`, mirroring
`LeadRepository`'s pattern exactly — this package still authors no
business rules of its own. `Estimate`/`Booking` have no state machine in
core-models (simple entities), so their repositories are create/get/list
only, no transition method.

**Alternatives considered**: Loosening `Job.bookingId`/`Booking.estimateId`
to optional in the database only (keeping the stricter TypeScript type).
Rejected: a nullable-in-DB, required-in-type mismatch is exactly the kind
of silent inconsistency that causes confusing bugs later, and the actual
effort difference (three tables vs. one) is small.

**Trade-offs**: This cluster is persistence only — no admin-console UI
for Estimates/Bookings/Jobs yet, and no real "create an Estimate from a
Lead" workflow exists in any app. `packages/db`'s test surface grows by
three more repositories following an already-proven pattern, so this is
mechanical, not risky, work.

**Consequences**: `docs/crm/CRM_ARCHITECTURE.md` gains a Cluster 4
section. The next milestone (admin-console UI for at least Jobs) builds
directly on this.

**Related**: [ADR-0009](#adr-0009-packagesdb-persistence-engine-and-crm-milestone-1-scope-leadcontact-persistence-for-the-existing-growth-system-domain-model),
[ADR-0010](#adr-0010-multi-tenant-crm-foundation-businessesmemberships-tenant-scoped-rls).

---

## ADR-0013: Lead → Estimate → Booking → Job creation workflow (CRM Cluster 5)

**Status**: Confirmed (implemented). The "known limitation" below is
resolved as of [ADR-0018](#adr-0018-multi-role-memberships-owner-directed).

**Context**: Cluster 4 (ADR-0012) added persistence for `Estimate`/
`Booking`/`Job` but no way to actually create one. This cluster adds the
real creation path in `apps/admin-console`.

**Decision**: Creating a `Booking` from an `Estimate` immediately also
creates that `Booking`'s `Job` (at `draft`) and links them
(`bookings.job_id`), then best-effort attempts the `draft` → `scheduled`
transition using the real logged-in user's actual `MembershipRole`. A
rejected transition (wrong role) is surfaced honestly on the Lead detail
page - the `Job` still exists, just not yet scheduled - never hidden or
silently retried as a different actor.

**Alternatives considered**: Auto-approving the `scheduled` transition
regardless of the calling user's role (e.g., using a synthetic
`automation` actor). Rejected: `transitionJob()`'s authorization rules
exist specifically to require a human with the right role for this
step; bypassing them with a fake actor would defeat the purpose of
having role-based authorization at all.

**Known limitation, surfaced not fixed at the time**: `memberships`'
unique constraint is `(business_id, user_id)` - one role per user per
business. An `owner-admin`-only account (the only membership that
existed at the time) could not also act as `office-manager` for
day-to-day Job/Lead progression. Two real paths were identified (change
the existing row's role, accepting the trade-off of losing owner-only
actions; or a future multi-role schema change) - resolved via the
multi-role schema change, per the owner's explicit direction - see
[ADR-0018](#adr-0018-multi-role-memberships-owner-directed).

**Consequences**: `docs/crm/CRM_ARCHITECTURE.md` gains a Cluster 5
section documenting this and the limitation above.

**Related**: [ADR-0012](#adr-0012-estimatebookingjob-persistence-crm-cluster-4).

---

## ADR-0014: Company persistence and Contact→Company linking (CRM Cluster 6)

**Status**: Confirmed (implemented)

**Context**: `Company` had no `packages/core-models` type at all - unlike
`Job`/`Estimate`/`Booking`, which already existed before persistence was
added. This is the first entity in this CRM build-out that starts with a
real domain-modeling decision, not just persistence plumbing.

**Decision**: `Company` is a simple entity (`id`, `name`,
`primaryContactId?`, `createdAt`) with **no state machine** - core-models'
README documents "exactly five lifecycles" (Lead, Job, Invoice, Content,
Review Request) as a deliberate, closed set; a Company has no lifecycle
of its own, matching the existing treatment of `Contact`/`Customer`.
`Contact` gains an optional `companyId` field (additive, non-breaking -
existing `Contact` object literals remain valid since the field is
optional). Persistence (`companies` table, `contacts.company_id` column)
and `apps/admin-console` UI (Companies list/detail, "link to company" on
the Contact detail page) are added in the same cluster, since a Company
that can be created but never linked to a Contact would be a hollow
feature - and unlike `Job` (which had a real, structural required-FK
chain forcing persistence-then-later-UI), nothing here blocks doing both
at once.

**Alternatives considered**: Giving `Company` a lifecycle/state machine
(e.g., `prospect` → `active` → `inactive`). Rejected: not requested, and
would contradict the package's own documented "exactly five" scope
without a clear need - easy to add later if a real requirement appears.

**Consequences**: `docs/crm/CRM_ARCHITECTURE.md` gains a Cluster 6
section. `ContactRepository` gained a `companyId` list filter and a
`linkCompany()` method, following the same pattern as `LeadRepository`'s
existing filters.

**Related**: [ADR-0009](#adr-0009-packagesdb-persistence-engine-and-crm-milestone-1-scope-leadcontact-persistence-for-the-existing-growth-system-domain-model),
[ADR-0012](#adr-0012-estimatebookingjob-persistence-crm-cluster-4).

---

## ADR-0015: Note persistence as a polymorphic, entity-agnostic attachment (CRM Cluster 7)

**Status**: Confirmed (implemented)

**Context**: The owner's "Master Scope Consolidation" directive lists
Notes among the HubSpot-comparable CRM capabilities still missing. A
Note needs to attach to any of several different CRM entities (Lead,
Contact, Company, Job) - the alternative of a separate `lead_notes`,
`contact_notes`, `company_notes`, `job_notes` table per entity was
considered and rejected as needless duplication for a feature with
identical shape and behavior across all four.

**Decision**: `Note` is a new `packages/core-models` type (`id`,
`entityType`, `entityId`, `body`, `authorId?`, `createdAt`) - **no state
machine**, same treatment as `Company` (ADR-0014). `entityType` is a
closed union (`NotableEntityType = 'lead' | 'contact' | 'company' |
'job'`), not a free-form string - unlike `AuditLog.entityType` (which is
deliberately free-form since it describes an arbitrary future persisted
record), a `Note` is constructed directly by application code and
benefits from compile-time protection against a typo'd entity type. A
single `notes` table stores all four, with a `(entity_type, entity_id)`
composite index; Postgres cannot enforce a real foreign key across a
polymorphic reference, so a `check` constraint restricts `entity_type`
to the same four values, and the repository layer (not the database) is
responsible for only ever writing an `entity_id` that refers to a real,
tenant-scoped row. Notes are **append-only** - the migration adds
`select`/`insert` RLS policies only, no `update`/`delete`, matching the
existing `audit_log` precedent (a note, once written, is not silently
editable).

**Alternatives considered**: One table per entity type (`lead_notes`,
`contact_notes`, etc.) - rejected as duplicated schema/repository code
for no behavioral difference. A free-form `entityType: string` matching
`AuditLog`'s pattern - rejected in favor of the closed union for the
stronger compile-time guarantee, since `Note` (unlike `AuditLog`) is
meant to be constructed by hand throughout the codebase.

**Consequences**: `docs/crm/CRM_ARCHITECTURE.md` gains a Cluster 7
section. `apps/admin-console` gains a single reusable `NotesSection`
component embedded on the Lead, Contact, Company, and Job detail pages,
rather than four separate implementations. Extending Notes to a future
fifth entity type requires updating the `NotableEntityType` union, the
migration's `check` constraint, and the admin-console API route's
allow-list together - documented here so that three-way update isn't
missed.

**Related**: [ADR-0014](#adr-0014-company-persistence-and-contactcompany-linking-crm-cluster-6).

---

## ADR-0016: Task persistence as a boolean-complete entity with optional entity attachment (CRM Cluster 8)

**Status**: Confirmed (implemented)

**Context**: `Task` (a to-do item, e.g. "follow up with lead X by Friday")
is the last of the originally-identified missing CRM entities
(`Appointment` was evaluated during Cluster 7 and found to already be
covered by the existing `Booking` entity - see ADR-0015 - so it was not
built separately).

**Decision**: `Task` is a new `packages/core-models` type (`id`, `title`,
`description?`, `dueAt?`, `assignedTo?`, `entityType?`, `entityId?`,
`completed: boolean`, `completedAt?`, `createdAt`) - **no state
machine**, same treatment as `Company` (ADR-0014) and `Note`
(ADR-0015). A Task moves between exactly two states (open, completed)
with no authorization rules or precondition evidence governing that
move, so a full transition function with actor categories and typed
rejections would be ceremony without benefit - a plain boolean plus a
`completeTask()` repository method is the correct-sized solution.
`entityType`/`entityId` reuse `Note`'s `NotableEntityType` union rather
than introducing a parallel one, and are **optional together** (a Task
need not attach to any CRM entity - e.g. "call the parts supplier" has
nothing to attach to), unlike `Note` where the attachment is required.
The `tasks` table adds a `check` constraint enforcing that
`entity_type`/`entity_id` are both null or both set together, and a
second `check` constraint enforcing `completed_at` is set if and only if
`completed` is true - the two boolean-adjacent fields can never drift
out of sync at the database level, not just in application code.
`apps/admin-console` gains a standalone `/tasks` list (open/completed
toggle, unattached task creation) plus a reusable `TasksSection`
component embedded on the Lead, Contact, Company, and Job detail pages,
mirroring `NotesSection`'s (ADR-0015) one-component-not-four pattern.

**Alternatives considered**: A full state machine (`open` → `completed`
with actor-authorization rules, matching Lead/Job/Invoice/Content/Review
Request). Rejected: a Task's completion has no real authorization
requirement (anyone with a business membership can complete any task)
and no precondition evidence to validate, so the state-machine
machinery's actual value-add (authorized-actor enforcement, typed
rejection reasons, precondition evidence) would be simulated rather than
real - matches the same reasoning already applied to `Company`.

**Consequences**: `docs/crm/CRM_ARCHITECTURE.md` gains a Cluster 8
section. This closes out the originally-identified set of missing CRM
entities from the Milestone 3 "not done" list (`Company`, `Task`,
`Appointment`, `Note`) - `Appointment` resolved via reuse of `Booking`,
the other three now have persistence and UI.

**Related**: [ADR-0014](#adr-0014-company-persistence-and-contactcompany-linking-crm-cluster-6),
[ADR-0015](#adr-0015-note-persistence-as-a-polymorphic-entity-agnostic-attachment-crm-cluster-7).

---

## ADR-0017: Agent orchestrator as the named-agent authorization layer between routing and execution

**Status**: Confirmed (implemented)

**Context**: The owner's "FINAL EXECUTION DIRECTIVE" asks for "Hermes
powering Jervis, which coordinates Emma + Estimate/Scheduling/
Operations/Review/SEO/Media/Follow-up agents" (owner confirmed building
this now, in response to an earlier clarifying question). A repository
audit found substantial existing agent-infrastructure from an earlier
session (`packages/agent-sdk`, `packages/task-router`,
`packages/context-builder`, `packages/semantic-cache`,
`packages/policy-engine`, `packages/cost-controller`,
`packages/audit-logger`, `packages/provider-adapters`,
`packages/job-queue`) plus two real, tested placeholder apps:
`apps/jervis-api` (already named "Jervis" - an owner-facing control
plane for provider health/budget/kill-switches/audit queries) and
`apps/worker-service` (dequeues jobs and executes them through
`TaskRouter.routeTask()`). `apps/agent-orchestrator` was still the
literal placeholder from Phase 1 scaffolding - `ARCHITECTURE.md`
documents it as the "Agent orchestration engine," a role genuinely
distinct from both of the above but never implemented.

**Decision**: `apps/agent-orchestrator` becomes the layer between
routing and execution: it decides **which named agent is authorized to
handle which task type**, before anything reaches the job queue or a
provider. `src/agent-registry.ts` defines 8 named agents (Emma +
Estimate/Scheduling/Operations/Review/SEO/Media/Follow-up), each mapped
to a subset of `packages/agent-sdk`'s existing, closed `TaskType` union
(11 types, already covering the operational scope) - **no new task
types were added**, since the existing set already fits (e.g. Review
Agent drafts review-request outreach via `customer-response`, tying back
to core-models' `ReviewRequest`; Media Agent uses `photo-review`, tying
back to core-models' `PhotoAsset`). `coding`/`debugging` are deliberately
left unassigned - internal dev-automation task types, not part of this
GreenCal-facing roster. `AgentOrchestrator.assignTask()` rejects an
unauthorized pairing before it is ever enqueued (audit-logged as
`rejected`, matching the honest-rejection pattern already used
throughout `packages/core-models`' state machines); an authorized
assignment is enqueued via a new shared `RoutedTaskJob` type (moved from
a private interface duplicated inside `apps/worker-service` into
`packages/task-router`, so both apps consume one definition) onto the
same `agent-worker` queue `apps/worker-service` already drains -
`apps/agent-orchestrator` never executes a task itself, matching the
existing clean separation. `apps/worker-service` was fixed to thread the
job's real `agentId`/`businessId` into `routeTask()` instead of a
hardcoded `'agent-worker'` literal, so cost/audit attribution is now
correct per named agent, not generic.

The `AGENT_REGISTRY` is **runtime data**, not a type contract, so it
lives in `apps/agent-orchestrator` rather than `packages/agent-sdk`,
which is explicitly documented as "types only" (see
`packages/agent-sdk/README.md`) - adding a data structure there would
break that documented boundary.

**"Jervis" already existed as a name** (`apps/jervis-api`'s own
`src/index.ts` calls it "Jervis control API"), so this ADR does not
introduce a second, competing "Jervis" identity - `apps/jervis-api` is
Jervis's owner-facing control surface and `apps/agent-orchestrator` is
Jervis's orchestration engine, two facets of the same system, matching
ADR-0008's original app split (control vs. orchestration vs. execution).
"Hermes" and "Emma" (the customer-facing conversational agent) remain
names only at this stage - no voice/chat implementation exists yet, and
every placeholder provider adapter still returns `not-implemented` (see
`packages/provider-adapters/src/create-placeholder-adapter.ts`), so
dispatching any real task today honestly resolves to
`not-implemented`, not a fabricated success.

**Alternatives considered**: Building the orchestration logic inside
`apps/jervis-api` instead of a separate app - rejected, since that app
is documented and already implemented as the owner-facing control
surface specifically, and conflating "owner can see health/kill
switches" with "agents get dispatched" would blur an already-clean
boundary. Inventing new `TaskType` values per named agent (e.g. a
dedicated `scheduling` type) - rejected per the same "exactly N, closed
set" reasoning already applied to `packages/core-models`' state
machines; the existing 11 types cover every named agent's actual need.

**Consequences**: `apps/agent-orchestrator`, `apps/worker-service`, and
`packages/task-router`'s READMEs are updated. This does not implement
Emma's voice/chat capability, Hermes, or any real provider network call

- those remain separately gated per `.claude/rules/backend.md` ("Do not
  add a real provider network call, credential read, or production wiring
  ... without separate, explicit owner authorization").

**Related**: [ADR-0008](#adr-0008-cost-efficient-multi-model-cloud-infrastructure-direction-hostinger-vps--docker-compose-provider-neutral-ai-gateway).

---

## ADR-0018: Multi-role memberships (owner-directed)

**Status**: Confirmed (implemented)

**Context**: ADR-0013 documented, but deliberately did not fix, a real
limitation: `memberships`' `(business_id, user_id)` unique constraint
meant one Supabase Auth user could hold exactly one `MembershipRole` per
business. The only provisioned account (GreenCal Pressure Washing's
owner, `owner-admin`) could not also act as `office-manager`, which most
Lead/Job transitions require - resolving it was left as a real design
decision requiring owner input. The owner has now explicitly directed:
"Implement support for multiple roles per user (owner-admin and
office-manager) in a future-proof way without breaking the current
GreenCal owner account."

**Decision**: A new `membership_roles` child table
(`packages/db/migrations/007-multi-role-memberships.sql`) holds
`(membership_id, role)` rows, unique per pair, `on delete cascade`
from `memberships`. The existing `memberships` table and its
`(business_id, user_id)` unique constraint are **untouched** -
`memberships.role` (the legacy single-role column) is left in place,
read only as a fallback. A backfill statement copies every existing
membership's single role into `membership_roles`, and a second,
separately-idempotent statement grants the real GreenCal owner
(looked up by business slug + email, never a pasted UUID - the
established pattern in this project's migration history) an additional
`office-manager` role alongside their existing `owner-admin` role.

Three application-layer changes support this:

1. `packages/core-models` gains `resolveTransitionAcrossActorCategories()`
   (`src/transition-resolution.ts`) - a pure, generic helper that tries
   a transition attempt against several candidate `ActorCategory` values
   in order, returning the first success or the most informative
   rejection (preferring a rejection more specific than
   `unauthorized-actor` once any candidate got that far). It changes
   nothing about how any individual state machine authorizes a
   transition - each candidate is evaluated exactly as if it were the
   caller's only role.
2. `packages/db`'s `LeadRepository`/`JobRepository` each gain a new
   `transitionXStatusForRoles()` method (`transitionLeadStatus`/
   `transitionJobStatus`, the original single-actor methods, are
   **left completely unchanged** - a new capability is added alongside,
   not a modification of a tested, working path).
3. `apps/admin-console`'s `CurrentMembership.role: MembershipRole`
   becomes `CurrentMembership.roles: MembershipRole[]`.
   `getCurrentMembership()` reads `membership_roles` first and **falls
   back to the legacy `memberships.role` column** when the child table
   has no rows yet for that membership - so an admin-console instance
   pointed at a Supabase project where migration 007 has not yet been
   run (a real, current state - migrations 004-006 are still pending
   too) keeps working exactly as it did before this ADR, never silently
   resolving to zero roles. Every transition-attempting API route
   (`leads/[id]/transition`, `jobs/[id]/transition`,
   `estimates/[id]/bookings`) now calls the `*ForRoles` methods with
   `membership.roles` instead of a single role.

**Alternatives considered**: Changing `memberships`' unique constraint
to `(business_id, user_id, role)` and allowing multiple `memberships`
rows per user per business - rejected in favor of a normalized child
table, since a membership (business+user) is a single real-world
relationship with N roles, not N separate relationships; the child-table
design also means zero changes to the `memberships` table itself,
directly satisfying "without breaking the current GreenCal owner
account." Making `TransitionContext.actorCategory` accept an array -
rejected: that type is shared by all five state machines across
`packages/core-models`, most of which have no concept of a
multi-role caller (e.g. `automation`, `customer`); widening it would
ripple a CRM-specific concern into the whole domain model. Resolving the
multi-role question at the repository layer (retry loop inline in each
`*Status` method) instead of a shared core-models helper - rejected as
duplicated logic across `LeadRepository`/`JobRepository`/any future
repository needing the same behavior.

**Consequences**: `docs/crm/CRM_ARCHITECTURE.md`,
`packages/db/README.md`, and `docs/launch/OWNER_ACTIONS_REQUIRED.md`
are updated. Migration 007 has not yet been run against the real
`Greencal-production` Supabase project (owner action, queued behind
004-006).

**Related**: [ADR-0013](#adr-0013-lead--estimate--booking--job-creation-workflow-crm-cluster-5),
[ADR-0010](#adr-0010-multi-tenant-crm-foundation-businessesmemberships-tenant-scoped-rls).

---

## ADR-0019: GreenCal Mobile Detailing / Navarro Builders CRM tenant seeding (no fabricated business content)

**Status**: Confirmed (implemented)

**Context**: The owner directed: "Build the full multi-tenant
architecture now using the same framework as GreenCal Pressure Washing.
Leave business-specific content, pricing, branding, services, and
assets as placeholders that can be populated later. Do not fabricate
any business data." `BUSINESSES.md` lists exactly two approved facts
for these businesses: their names, "GreenCal Mobile Detailing" and
"Navarro Builders" - everything else (address, services, pricing,
branding, domain) is explicitly `TBD`, with no repository evidence.

**Decision**: "The same framework as GreenCal Pressure Washing" is
interpreted as the **multi-tenant CRM architecture** specifically
(ADR-0010: `businesses`/`memberships`/tenant-scoped RLS/`apps/admin-console`),
not a second/third public marketing website. A repository-wide audit
confirmed `apps/admin-console`'s CRM code has zero hardcoded
`greencal-pressure-washing` (or any single-business) assumptions
anywhere - every repository call, every RLS policy, is already
`business_id`-scoped and entirely generic. This means the entire
existing CRM (Leads, Jobs, Companies, Notes, Tasks, and everything
already built in Clusters 4-10) becomes usable by either business the
moment two things exist: (1) a `businesses` row (this ADR -
`packages/db/migrations/008-additional-business-tenants.sql`, inserting
only `name` - an approved fact - and `slug` - a derived technical
identifier, nothing else) and (2) a real owner/staff Supabase Auth user
linked via a `memberships` row (a genuine future owner action, not
performed here - no such user exists for either business, and
fabricating one would violate "do not fabricate any business data").

**A public marketing website for either business was deliberately NOT
built** in this cluster. Reasons: (1) `BUSINESSES.md` currently and
correctly states neither business has a dedicated repository module -
this ADR does not change that statement, since a `businesses` row is
data, not a module; (2) `.claude/rules/websites.md` explicitly warns
against designing a shared multi-business template prematurely,
mirroring root `CLAUDE.md`'s "don't design for hypothetical future
requirements"; (3) `apps/greencal-website`'s own `astro.config.mjs`
documents an extensive, hard-won Vercel/tslib packaging investigation -
standing up a second and third website is a materially larger,
separately-scoped deliverable (its own app, its own eventual
deployment, its own domain) than "leave content as a placeholder"
plausibly authorizes on its own; (4) `services`/`pricing`/`branding`,
which the owner explicitly said to leave as placeholders, are exactly
the kind of content a marketing website exists to present - a website
with literally nothing real to say is not obviously more useful than no
website, whereas the CRM is useful today, business-content-free, the
moment a membership exists.

**Alternatives considered**: Scaffolding empty `apps/greencal-mobile-detailing`/
`apps/navarro-builders` Astro apps mirroring `apps/greencal-website`'s
Phase 2A Checkpoint 1 technical-foundation-only precedent (real Astro
site, one unpublished/`noindex` placeholder page, no business content).
Not ruled out for the future, but not built here without the owner
explicitly confirming that reading of "the same framework" - flagged
back rather than guessed, per root `CLAUDE.md`'s standing instruction to
ask when ambiguity would materially affect architecture or scope, not
silently pick the larger interpretation.

**Consequences**: `ROADMAP.md` gains a Cluster 11 entry documenting
this scope decision explicitly, including what was deliberately not
built and why. `BUSINESSES.md` is unchanged, since none of its stated
facts became inaccurate.

**Related**: [ADR-0010](#adr-0010-multi-tenant-crm-foundation-businessesmemberships-tenant-scoped-rls),
[ADR-0004](#adr-0004-dedicated-appsgreencal-website-for-greencal-pressure-washing-designated-phase-2a).

---

## ADR-0020: PhotoAsset persistence via Supabase Storage (before/progress/after media)

**Status**: Confirmed (implemented)

**Context**: The owner's "AI COMPANY OS — UPDATED FULL EXECUTION
DIRECTIVE" names "upload before/progress/after media" as an explicit
step in the core GreenCal workflow to verify end-to-end.
`packages/core-models` already defined `PhotoAsset`/`PhotoPair` (with a
`'before' | 'after'` `kind` union and a full set of publication-
readiness fields - `metadataStripped`, `gpsDataRemoved`,
`privacyReviewPassed`, `humanPublicationApproved`,
`publicationConsentGranted`) but had zero persistence or UI anywhere in
the repository.

**Decision**: `PhotoAsset.kind` widens to `'before' | 'progress' |
'after'` (additive - `kind` was not referenced by
`evaluatePhotoPublicationEligibility()` or any other invariant, so this
is a pure union widen with no ripple effect). A private Supabase Storage
bucket (`job-photos`) stores original uploads, with tenant-scoped RLS
policies on `storage.objects` using the same
`business_id in (select business_id from memberships ...)` pattern as
every table policy, keyed by the leading path segment
(`{business_id}/{job_id}/{filename}`). A new `photo_assets` table
mirrors the full `PhotoAsset` shape; `PhotoAssetRepository.uploadPhoto()`
inserts every readiness field as `false` and `PhotoPublicationStatus`
as `not-published` - **no automated privacy-processing pipeline (EXIF
stripping, GPS removal, face/license-plate detection, human review)
exists anywhere in this repository**, and this repository never claims
one ran. `apps/admin-console`'s Job detail page gains a Media section
(kind-tagged upload form, thumbnail gallery via short-lived signed
URLs, since the bucket is private).

**Alternatives considered**: A public bucket with derivative-only
storage - rejected: `PhotoAsset.privateOriginalRef` is explicitly
modeled as distinct from `publicDerivativeRef` specifically because a
private original must never be treated as publishable (see
`photo-eligibility.ts`), so the bucket backing it must be private too.
Implementing real EXIF/GPS/face-detection processing now - rejected as
a large, separate feature the current directive did not ask this
cluster to build; honestly leaving every readiness field `false` is the
correct, non-fabricating behavior until that pipeline exists.

**Consequences**: `packages/db/README.md` and
`docs/crm/CRM_ARCHITECTURE.md` gain a section. `MinimalSupabaseClient`
widens from `Pick<SupabaseClient, 'from'>` to
`Pick<SupabaseClient, 'from' | 'storage'>` (additive - every other
repository still only touches `.from`).

**Related**: [ADR-0009](#adr-0009-packagesdb-persistence-engine-and-crm-milestone-1-scope-leadcontact-persistence-for-the-existing-growth-system-domain-model).

---

## ADR-0021: Estimate approval status (no state machine)

**Status**: Confirmed (implemented)

**Context**: The owner's directive names "approve estimate" as an
explicit step between "create estimate" and "convert estimate into
job" in the core GreenCal workflow, and separately requires "Accepted
estimates must use revision controls rather than silent editing."
`Estimate` (`packages/core-models`) had no status concept at all - any
existing estimate could immediately be booked into a Job regardless of
whether anyone had reviewed it.

**Decision**: `Estimate` gains `status: 'draft' | 'approved'` and
`approvedAt?: string` - **no state machine**, following the same
precedent already established for `Company`/`Note`/`Task` (a two-state
field with no authorization rules or precondition evidence to validate
doesn't need transition-function machinery). `EstimateRepository`
gains `approveEstimate()`, the only path from `draft` to `approved`,
which rejects (does not silently no-op) an already-approved estimate.
"Revision controls rather than silent editing" is satisfied by
omission: no update method exists for an Estimate's amount or summary
at any status today, so nothing can silently edit one, approved or
not - a future edit feature must create a new `Estimate` row
referencing the original rather than mutate one in place. The
`apps/admin-console` Lead detail page's "create booking + job" action
now requires an **approved** estimate (previously it used
`estimates[0]`, the most recent estimate regardless of any review) -
enforced server-side in the booking-creation API route, not just hidden
in the UI.

**Alternatives considered**: A full revision-chain system (new estimate
versions superseding old ones, mirroring `packages/core-models`'
consent-revocation `supersedesConsentId` pattern) - not built now,
since no edit feature exists yet to need it; building the chain ahead
of the feature it protects would be exactly the over-engineering the
owner's directive explicitly warned against ("Do not over-engineer...
Use the simplest reliable implementation").

**Consequences**: `packages/db/README.md` and
`docs/crm/CRM_ARCHITECTURE.md` gain a section.

**Related**: [ADR-0014](#adr-0014-company-persistence-and-contactcompany-linking-crm-cluster-6).

---

## ADR-0022: Audit log read access (admin-console viewer)

**Status**: Confirmed (implemented)

**Context**: `audit_log` (tenant-scoped, append-only, `select`-only RLS
for `authenticated`) has recorded every Lead/Job transition since
Milestone 1, but `AuditLogRepository` only ever exposed
`writeAuditRecord()` - no application code could read it back, so the
audit trail existed in the database but nowhere an owner could actually
see it, despite "Audit logs" being explicitly listed among the
admin-console modules the owner's directive names.

**Decision**: `AuditLogRepository` gains `listAuditRecords()` (business-
scoped, optional `entityType`/`entityId` filter, most-recent-first,
capped at a caller-supplied `limit`) - purely additive, the RLS policy
that makes this safe already existed (`audit_log_tenant_select`, added
in migration 002). A new `apps/admin-console` `/audit-log` page lists
records with an entity-type filter and links back to the Lead/Job each
record concerns.

**Alternatives considered**: None significant - this is a read-only
addition exposing data and access control that already existed;
implemented directly.

**Consequences**: `packages/db/README.md` gains a note.

**Related**: [ADR-0009](#adr-0009-packagesdb-persistence-engine-and-crm-milestone-1-scope-leadcontact-persistence-for-the-existing-growth-system-domain-model).

---

## ADR-0023: Archive/restore for Contacts, Companies, and Leads

**Status**: Confirmed (implemented)

**Context**: The owner's directive requires every admin-console module
to support "Archive... Restore where appropriate." No entity in this
repository had any archive concept - a mistaken or stale Contact/
Company/Lead could only ever be edited, never removed from the default
list view without deletion (which does not exist either, deliberately -
CRM records are never hard-deleted).

**Decision**: `archived_at` (nullable timestamp) is added to `contacts`,
`companies`, and `leads` - deliberately **not** added to `estimates`/
`bookings`/`jobs`, which already have workflow-driven terminal statuses
(`lost`/`canceled`/`completed`) serving the same "no longer active"
purpose; adding a second, parallel "inactive" concept to those would be
confusing, not clarifying. `archived_at` is treated as a pure list-
visibility/administrative concern, not a `packages/core-models` domain
concept - it lives entirely in `packages/db` via a new
`Archivable{Contact,Company,Lead}` interface (`Entity & { archivedAt?:
string }`) rather than a change to the domain type itself, so
`core-models` stays free of a concern its own state machines (Lead's in
particular) have no reason to know about. Archiving a Lead **never**
changes its pipeline `status` - the two are orthogonal; a `qualified`
Lead can be archived and later restored still `qualified`. Every
`listX()` method gains an `includeArchived` option, defaulting to
`false` (archived records are excluded from the default view, never
deleted or hidden from direct lookup by id). `apps/admin-console` gains
a "Show archived" checkbox on each list page and an Archive/Restore
button on each detail page.

**Alternatives considered**: Adding `archivedAt` to the `core-models`
domain types directly (`Contact`/`Company`/`Lead`) - rejected in favor
of the `packages/db`-layer intersection type, since whether a record is
hidden from a staff list view is not a fact about the entity's own
meaning the way `Lead.status` is; keeping it out of `core-models` also
sidesteps `Contact`'s existing inconsistency (it has no `createdAt` in
`core-models` either, unlike `Company`/`Lead`) rather than deepening it
further. Adding archive support to Estimates/Bookings/Jobs too -
rejected per the terminal-status reasoning above.

**Consequences**: `docs/crm/CRM_ARCHITECTURE.md` and
`packages/db/README.md` gain a section.

**Related**: [ADR-0014](#adr-0014-company-persistence-and-contactcompany-linking-crm-cluster-6).

---

## ADR-0024: Appointments view as a chronological Booking list (not a calendar-grid widget)

**Status**: Confirmed (implemented)

**Context**: The owner's directive names "Appointments" and "Calendar"
as separate admin-console modules. `Booking` (`packages/core-models`,
persisted since Cluster 4) already carries `scheduledAt`, and
`BookingRepository.listBookings()` already supported listing every
Booking for a business (the `leadId` filter is optional) - no schema or
repository change was needed, only a new page.

**Decision**: A new `apps/admin-console` `/appointments` page lists
every Booking for the business, grouped by calendar date, each row
showing time, customer name (resolved through the Booking's Lead →
Contact), and the linked Job's status if one exists. This is a
chronological list, **not a calendar-grid/month-view widget** - per the
directive's own "Use the simplest reliable implementation... Do not
over-engineer," a full interactive calendar (drag-to-reschedule,
month/week views, availability conflicts) is a materially larger UI
investment than the underlying data currently supports (there is no
appointment duration, no technician-assignment conflict check, no
availability-blocking rule anywhere in this repository yet) and was not
requested with enough specificity to justify building ahead of a real
need.

**Alternatives considered**: A full calendar-grid component (e.g. a
month view with draggable events) - rejected for now per the
over-engineering guidance above; the chronological list surfaces the
same underlying data and can be upgraded to a richer view later without
any data-model change, since it consumes `Booking` exactly as already
modeled.

**Consequences**: None beyond the new page - no migration, no
repository change.

**Related**: [ADR-0012](#adr-0012-estimatebookingjob-persistence-crm-cluster-4).

---

## ADR-0025: Customer Activity Timeline as a read-time composition, plus actor tracking

**Status**: Confirmed (implemented)

**Context**: The owner directed: "Every customer has a complete
chronological activity timeline. Every estimate, job, invoice, payment,
appointment, note, call, SMS, email, review request, review received,
before/after media upload, technician update, and status change is
automatically recorded. Timeline entries must be filterable by type,
employee, and date... Design everything to be reusable across GreenCal
Auto Detailing and Navarro Builders... Do not fabricate business data."
Two things were true before this cluster: (1) several event sources
already existed with real persistence (Estimates, Bookings, Jobs, Notes,
Tasks, Photos, Lead/Job status changes via `audit_log`), but nowhere
recorded _which staff member_ performed the action - `Task`/`PhotoAsset`/
`Estimate`/`Booking` had no actor field at all, which would have made
"filterable by... employee" impossible for those event types; (2) four
requested event categories - Invoice, Payment, Call/SMS/Email, and
Review request/received - have **no persistence anywhere in this
repository**. `packages/core-models` defines `Invoice`/`Payment`/
`CallRecord`/`FormSubmission`/`ReviewRequest` types, but no
`packages/db` repository, no admin-console UI, and no trigger point
exists for any of them.

**Decision, part 1 (actor tracking)**: `Task` gains `createdBy?`/
`completedBy?`; `PhotoAsset` gains `uploadedBy?` (and a newly-required
`uploadedAt`, matching the `createdAt` convention every other
core-models entity with a creation timestamp already follows -
`PhotoAsset` was previously the odd one out, like `Contact` still is);
`Estimate` gains `createdBy?`/`approvedBy?`; `Booking` gains
`createdBy?`. All additive/optional except `PhotoAsset.uploadedAt`
(fixed via the existing fixture, no other construction site existed).
`migrations/012-actor-tracking.sql` adds the matching nullable columns.
Every `apps/admin-console` API route that creates/completes/approves/
uploads one of these already has the calling user's id from the
session (`locals.user.id`) - each now passes it through.

**Decision, part 2 (timeline architecture)**: The Activity Timeline is
a **read-time composition** (`packages/db`'s new
`ActivityTimelineRepository.listTimelineForContact()`), not a
separate write-time event-sourcing table. It queries the existing
`LeadRepository`/`EstimateRepository`/`BookingRepository`/
`JobRepository`/`NoteRepository`/`TaskRepository`/`PhotoAssetRepository`/
`AuditLogRepository` for everything already scoped to a Contact
(directly, or transitively through that Contact's Leads → Estimates/
Bookings/Jobs), normalizes each into a common `TimelineEntry` shape
(`type`, `occurredAt`, `actorId`, `summary`, a link back to the source
entity), and merge-sorts chronologically. Filtering by type/employee/
date happens over the normalized, merged list. This was chosen over a
dedicated `activity_events` write-time table because every source of
truth already exists and is already correctly tenant-scoped and
tested - a parallel event-sourcing table would either duplicate that
data (a second place the same fact can drift out of sync) or require
every existing repository method to additionally write to it, a much
larger and riskier change than composing at read time. `TimelineEntryType`
is deliberately a superset of what's recorded today - it includes
`invoice-created`, `payment-received`, `call-logged`, `sms-sent`,
`email-sent`, `review-request-sent`, and `review-received` as real,
named literal values (satisfying "design everything to be reusable"
for when those features are built), but **no code path ever produces
one** - `listTimelineForContact()` honestly returns zero entries of
those types today, and the admin-console timeline UI documents this
directly rather than fabricating any. Every underlying repository is
already generic across businesses (no GreenCal-specific code anywhere
in the composition), so the timeline is automatically reusable for
GreenCal Auto Detailing and Navarro Builders the moment either has real
CRM data.

**Alternatives considered**: A dedicated `activity_events` table
populated by every write path (classic event-sourcing) - rejected per
the duplication/consistency-risk reasoning above; may be revisited if
read-time composition proves too slow at real data volumes (not
observable from this repository - no production data exists yet).
Fabricating placeholder Invoice/Payment/Call/SMS/Email/Review records
so every timeline entry type had at least one example - rejected
outright; explicitly prohibited by "do not fabricate business data" and
root `CLAUDE.md`'s "no production mock records."

**Consequences**: `docs/crm/CRM_ARCHITECTURE.md` and
`packages/db/README.md` gain a section. `apps/admin-console`'s Contact
detail page gains the timeline view with type/employee/date filters,
replacing the narrower ad-hoc "Leads" list that only showed Lead
status, not the full cross-entity history.

**Related**: [ADR-0009](#adr-0009-packagesdb-persistence-engine-and-crm-milestone-1-scope-leadcontact-persistence-for-the-existing-growth-system-domain-model),
[ADR-0023](#adr-0023-archiverestore-for-contacts-companies-and-leads).

---

## ADR-0026: Estimate line items and a reusable service-package catalog

**Status**: Confirmed (implemented)

**Context**: The owner's directive asks for a "Professional estimate
builder" with a "Service packages" catalog and a "Line item editor."
`Estimate` (`packages/core-models`) had only a single flat
`proposedAmount`/`summary` pair - no way to itemize a quote into
multiple priced lines.

**Decision**: Two new entities, additive to the existing `Estimate`
(which is untouched - `proposedAmount`/`summary` remain valid for any
estimate that never gets line items, and are shown as a fallback on the
new Estimate detail page when no line items exist yet). `ServicePackage`
is a reusable, tenant-defined catalog entry (`name`, `description?`,
`defaultUnitPrice`, `active` - no state machine, same treatment as
`Company`). `EstimateLineItem` is a priced line
(`description`/`quantity`/`unitPrice`/`lineTotal`, optionally linked to
a `ServicePackage`) - `lineTotal` is a **stored snapshot**
(`quantity * unitPrice`, computed once at write time), not a value
recomputed from the linked package's current price on every read, so a
later price change to a `ServicePackage` never retroactively alters an
already-created estimate line (matching how a real invoice/estimate
line freezes its price at the moment it was written).
`EstimateLineItemRepository` enforces the same "mutable only while
`draft`" rule ADR-0021 already established for `Estimate` itself -
`createLineItem()`/`deleteLineItem()` both reject once the parent
Estimate is `approved`, so an approved estimate's line items become
just as immutable as its `proposedAmount` already was. `apps/admin-console`
gains a dedicated Estimate detail page (`/estimates/[id]`) - the actual
"estimate builder" - with a line-item table, an add-line-item form
(optionally pre-filled from a `ServicePackage` picker), a computed
subtotal, and the existing Approve action moved here from the Lead
page. A new `/service-packages` page manages the catalog
(create/deactivate - packages are never deleted, only deactivated, so
existing line items that reference one always remain resolvable).

**Alternatives considered**: Making `EstimateLineItem.lineTotal` a
computed/derived value instead of a stored snapshot - rejected per the
price-drift reasoning above. Replacing `Estimate.proposedAmount`
outright with a required line-item total - rejected as a breaking
change to every existing estimate and every existing test/fixture; the
simple flat-amount path remains fully supported for estimates that
don't need itemization.

**Consequences**: `docs/crm/CRM_ARCHITECTURE.md` and
`packages/db/README.md` gain a section. Tax, discount, deposit, photo
attachment, PDF generation, and a customer-facing approval workflow are
explicitly out of scope for this specific commit and tracked as
separate, immediately-following clusters in `ROADMAP.md` - each is a
large enough concern (a customer-facing public route in particular) to
warrant its own commit and its own verification pass, per the owner's
"commit each logical feature separately" direction.

**Related**: [ADR-0021](#adr-0021-estimate-approval-status-no-state-machine).

---

## ADR-0027: Estimate tax, discount, and deposit as integer-only pricing fields

**Status**: Confirmed (implemented)

**Context**: Continuing the owner's "Professional estimate builder"
directive (see [ADR-0026](#adr-0026-estimate-line-items-and-a-reusable-service-package-catalog)),
the next required sub-features are Taxes, Discounts, and Deposits on an
`Estimate`. `Money` (`packages/core-models`) is deliberately
floating-point-free (integer minor units), so any tax/discount math has
to stay integer-only or it would violate that existing invariant.

**Decision**: `Estimate` gains three optional fields:
`taxRateBasisPoints?: number` (integer basis points, e.g. `825` =
8.25% - not a float percentage, to keep the rate itself
floating-point-free the same way `Money` is), `discountAmount?: Money`
(a fixed dollar amount, not a percentage - the simpler of the two
common discount models, and sufficient for the owner's stated
requirement), and `depositAmount?: Money` (tracked separately and
**never subtracted from `total`** - it represents an amount due now
against the total, not a reduction of the estimate's value). A new pure
function, `calculateEstimateTotals()`, computes
`{subtotal, discountAmount, afterDiscount, taxAmount, total, depositAmount}`
using only integer arithmetic: discount is subtracted first and floored
at zero (`Math.max(0, subtotal - discount)`, so a discount larger than
the subtotal never produces a negative total), then tax is computed on
the post-discount amount (`Math.round(afterDiscount * basisPoints / 10000)`),
matching standard subtotal-then-discount-then-tax invoicing order.
`EstimateRepository.setEstimatePricing()` enforces the same "mutable
only while `draft`" rule ADR-0021/ADR-0026 already established -
rejects once the parent `Estimate` is `approved`, so approved pricing
is just as immutable as an approved estimate's amount and line items.
The Estimate detail page (`apps/admin-console`) gains a pricing form
(tax rate %, discount $, deposit $) and a totals breakdown display,
both driven by the same `calculateEstimateTotals()` function used
server-side, so the UI can never compute a total that disagrees with
what's persisted.

**Alternatives considered**: A percentage-based discount (matching the
percentage-based tax rate) - rejected in favor of a fixed dollar amount
as the simpler, more common estimate-discount model for a small
service business, and because two independent percentage fields
(tax and discount) invite ambiguous stacking-order questions that a
fixed-dollar discount avoids. Subtracting `depositAmount` from `total`
to show a "balance due" figure - rejected for this commit; `total` is
kept as the full estimate value and `depositAmount` is shown
separately as "due now," since a "balance due" figure is really a
payment-tracking concern (out of scope until Invoices/Payments exist).

**Consequences**: `docs/crm/CRM_ARCHITECTURE.md` and
`packages/db/README.md` gain a section. Migration `014-estimate-pricing.sql`
adds five nullable columns to `estimates`. Photo attachment, PDF
generation, and the customer-facing approval workflow remain the
next, still-separate clusters per ADR-0026's consequences.

**Related**: [ADR-0021](#adr-0021-estimate-approval-status-no-state-machine),
[ADR-0026](#adr-0026-estimate-line-items-and-a-reusable-service-package-catalog).

---

## ADR-0028: Estimate photo attachments as a separate, minimal type from PhotoAsset

**Status**: Confirmed (implemented)

**Context**: Continuing the owner's "Professional estimate builder"
directive, the next required sub-feature is "Attach photos" to an
Estimate (e.g. a customer's photo of what needs cleaning, or a
reference photo taken during the on-site quote visit). `PhotoAsset`
(`packages/core-models`) already models photo upload, but only for a
`Job`, and it carries a full public-marketing publication workflow
(`metadataStripped`, `gpsDataRemoved`, `privacyReviewPassed`,
`faceReviewPassed`, `licensePlateReviewPassed`,
`humanPublicationApproved`, `publicationConsentGranted`,
`publicationStatus`) that exists specifically to gate a photo before it
can ever be shown publicly as before/after marketing content.

**Decision**: A new, deliberately minimal type,
`EstimateAttachment` (`id`, `estimateId`, `storageRef`, `fileName`,
`caption?`, `uploadedBy?`, `uploadedAt`) - not a widened `PhotoAsset`
with an optional `estimateId` alongside `jobId`. An estimate attachment
is always a private, internal-only reference image; it is never a
candidate for public before/after marketing use, so none of
`PhotoAsset`'s publication-readiness fields have any meaning for it,
and forcing them onto this type would mean either fabricating false
`false` values for a workflow that was never run, or making an entire
type's fields conditionally meaningless depending on which id is set -
both worse than a second, purpose-built type. `EstimateAttachmentRepository`
follows the same private-Storage-bucket-plus-signed-URL pattern already
established by `PhotoAssetRepository` (a new `estimate-attachments`
bucket, tenant-scoped object-path policies, 1-hour signed URLs), reused
for its proven shape rather than duplicated ad hoc. Attachments are not
gated by the Estimate's `draft`/`approved` status the way line items
and pricing are - a reference photo remains useful context after
approval too, and attaching one never changes the estimate's computed
total.

**Alternatives considered**: Widening `PhotoAsset` to make `jobId`
optional and add an optional `estimateId` - rejected per the reasoning
above. Reusing the existing `job-photos` Storage bucket for estimate
attachments too (since an Estimate does not yet have a Job at
quote-time in many cases) - rejected; a dedicated `estimate-attachments`
bucket keeps the tenant-scoped path convention
(`{business_id}/{estimate_id}/{filename}`) unambiguous and avoids
mixing two different retention/access-policy concerns in one bucket.

**Consequences**: `docs/crm/CRM_ARCHITECTURE.md` and
`packages/db/README.md` gain a section. Migration
`015-estimate-attachments.sql` adds one new table and one new private
Storage bucket. PDF generation and the customer-facing approval
workflow remain the next, still-separate clusters per ADR-0026's
consequences.

**Related**: [ADR-0020](#adr-0020-photoasset-persistence-via-supabase-storage-beforeprogressafter-media),
[ADR-0026](#adr-0026-estimate-line-items-and-a-reusable-service-package-catalog),
[ADR-0027](#adr-0027-estimate-tax-discount-and-deposit-as-integer-only-pricing-fields).

---

## ADR-0029: Estimate PDF generation as a browser-native print-friendly page

**Status**: Confirmed (implemented)

**Context**: Continuing the owner's "Professional estimate builder"
directive, the next required sub-feature is "PDF generation" for an
Estimate. This was already scoped in ADR-0026's consequences: a
browser-native print-friendly HTML page (no new heavy dependency, e.g.
a PDF-rendering library), since every modern browser's native "Print >
Save as PDF" already produces a real PDF from clean HTML/CSS.

**Decision**: A new route, `apps/admin-console`'s
`/estimates/[id]/print`, renders the same Estimate/line-items/totals
data as the existing detail page, but as a standalone HTML document
(not wrapped in `AdminLayout` - no sidebar nav, no app chrome) with
`@media print` CSS that hides the on-screen "Print / Save as PDF"
button and back-link. The real, actual business name
(`membership.businessName`, the calling user's real tenant) is shown
as the document header - no placeholder/fabricated company branding,
consistent with root `CLAUDE.md`'s "no mock data," since branding
(logo, letterhead) is Settings/Company-profile work not yet built
(tracked separately). The existing detail page links to this route.

**Alternatives considered**: A server-side PDF-rendering library
(e.g. Puppeteer/Playwright-driven HTML-to-PDF, or a PDF-construction
library) - rejected as an unnecessary new dependency and deployment
complexity (headless-browser or native-binary requirements on
Vercel's serverless runtime) for a need a browser already satisfies
natively; may be revisited if a future requirement needs a
programmatically-generated PDF (e.g. emailed as an attachment) rather
than one the user saves via the browser print dialog.

**Consequences**: `docs/crm/CRM_ARCHITECTURE.md` and
`packages/db/README.md` gain a note (no schema change - this route
reads existing Estimate/EstimateLineItem data, no new table). The
customer-facing approval workflow remains the next, still-separate
cluster per ADR-0026's consequences.

**Related**: [ADR-0026](#adr-0026-estimate-line-items-and-a-reusable-service-package-catalog),
[ADR-0027](#adr-0027-estimate-tax-discount-and-deposit-as-integer-only-pricing-fields).

---

## ADR-0030: Public customer estimate-approval link via a service-role key and a high-entropy token

**Status**: Confirmed (implemented)

**Context**: The last remaining "Estimate Line Items" sub-requirement
is a "customer approval workflow" - a way for the customer, who has no
admin-console account, to review and approve an Estimate. This is a
genuinely different kind of feature from everything else built in this
CRM so far: every other route in `apps/admin-console` requires an
authenticated, tenant-scoped session (see ADR-0011); this one must work
for an anonymous customer with only a link. That means introducing the
app's first public, unauthenticated, state-mutating route, which
required checking scope with the owner before building (see this
session's clarifying questions) rather than choosing unilaterally,
per root `CLAUDE.md`'s "ask when ambiguity would materially affect
architecture, security, data models." The owner confirmed: (1) a
one-click approval with a typed full name captured as a lightweight,
non-binding signature (not a legal e-signature service); (2) a 30-day
token expiry; (3) it is acceptable to add a Supabase service-role key
to `apps/admin-console` for this one route.

**Decision**: `Estimate` gains four fields:
`customerApprovalToken?: string` (a 256-bit/64-hex-char token from
Node's `crypto.randomBytes(32)`, generated only when staff explicitly
click "Generate customer approval link" - never created automatically
for every Estimate), `customerApprovalTokenExpiresAt?: string` (30
days from generation), `customerApproved?: boolean` (true only when
the approval came through this public link, distinguishing it from
staff-side `approvedBy`), and `customerSignatureName?: string` (the
typed name, trimmed, 1-200 characters). The public flow reuses the
existing `approved` status and `approvedAt` field (ADR-0021) rather
than inventing a parallel status - approving via the link has the
same effect as staff clicking Approve internally (line items and
pricing become immutable), just with different provenance. A new
route, `apps/admin-console`'s `/approve/[token]` (GET, public page)
and `/api/public/estimates/[token]/approve` (POST, public), are added
to `PUBLIC_PATH_PREFIXES` (`lib/auth/public-paths.ts`) so the
middleware never requires a session for them - authorization instead
comes entirely from possession of the token itself.

Both public routes construct their own service-role Supabase client
via `packages/db`'s already-existing `createDbClient()` (the same
trusted-server pattern `apps/greencal-website`'s public quote intake
already uses), reading a new, deliberately narrow
`getSupabaseServiceRoleEnv()` (`lib/supabase/env.ts`) - every other
route in this app continues to use `getSupabaseEnv()`'s anon-key,
RLS-enforced client unchanged. `EstimateRepository` gains three new
methods: `generateCustomerApprovalLink()` (staff-only, tenant-scoped,
rejects once already approved), `getEstimateByPublicToken()` (token-only,
no `businessId`, rejects an unknown or expired token), and
`approveEstimateByCustomerToken()` (token-only, rejects an expired
token, an already-approved estimate, or an empty/overlong signature
name). `EstimateLineItemRepository` gains a matching
`listLineItemsByPublicToken()` so the public page shows the real,
current line items (not the possibly-stale `proposedAmount`) - showing
a customer an inaccurate total before they approve would be a real
correctness problem, not just a cosmetic gap.

**Alternatives considered**: A Postgres RLS policy granting the `anon`
role read/update access keyed on a token passed as a custom claim -
rejected as meaningfully more complex to get right (session-variable
plumbing, harder to reason about and audit) than the already-proven
service-role-bypasses-RLS pattern this repository already uses
elsewhere, for no real security benefit - both approaches ultimately
trust "the caller supplied a valid token" as the sole authorization
check. No expiry / manual revoke only - rejected per the owner's
explicit 30-day-expiry choice. A third-party e-signature service (e.g.
DocuSign) - rejected as unnecessary infrastructure/cost for a
lightweight, non-binding acknowledgment, consistent with the owner's
"typed name" choice.

**Consequences**: `docs/crm/CRM_ARCHITECTURE.md` and
`packages/db/README.md` gain a section.
`packages/db/migrations/016-estimates-update-policy-fix.sql` also
fixes an unrelated, pre-existing gap discovered while building this
feature: `estimates` never had a tenant-scoped UPDATE RLS policy, even
though `approveEstimate()` (ADR-0021) and `setEstimatePricing()`
(ADR-0027) both already update it - real Postgres RLS would have
silently no-op'd both, a gap invisible to local tests since the fake
Supabase test double doesn't enforce RLS. `apps/admin-console/.env.example`
documents the new `SUPABASE_SERVICE_ROLE_KEY` variable; the owner must
add a real value in Vercel once this app is deployed (tracked in
`docs/launch/OWNER_ACTIONS_REQUIRED.md`). "Estimate Line Items" (all
nine sub-requirements from the owner's original directive) is now
fully complete.

**Related**: [ADR-0010](#adr-0010-multi-tenant-crm-foundation-businessesmemberships-tenant-scoped-rls),
ADR-0011 (admin-console architecture),
[ADR-0021](#adr-0021-estimate-approval-status-no-state-machine),
[ADR-0026](#adr-0026-estimate-line-items-and-a-reusable-service-package-catalog),
[ADR-0027](#adr-0027-estimate-tax-discount-and-deposit-as-integer-only-pricing-fields).

---

## ADR-0031: Settings — business profile, branding, service areas, and working hours as `packages/db`-only types

**Status**: Confirmed (implemented)

**Context**: The owner's second Phase 1 directive is "Settings":
Company profile, Business information, Branding, Logos, Service areas,
Working hours, Team permissions, AI preferences, Security settings.
`businesses` (ADR-0010) has only ever had `id`/`name`/`slug`/`created_at`

- no address, contact info, branding, service-area, or hours data
  exists anywhere in the schema yet. Three of the nine sub-items had
  real, unresolved ambiguity that the owner was asked to resolve before
  building (see this session's clarifying questions): Team permissions
  needs a `memberships` RLS-broadening decision (a real security-scope
  question, same class as ADR-0030's); AI preferences has no real
  target - no AI agent is wired into GreenCal's live workflow yet, so a
  settings toggle for one would be a fake control; Security settings'
  scope (password-only vs. also session management) needed picking.
  Owner's answers: broaden `memberships`/`membership_roles` RLS now with
  full role-editing capability; skip AI preferences entirely rather than
  build a control that does nothing; Security settings is change-password
  only (Supabase Auth's existing `updateUser()`, no new infrastructure).
  This ADR covers the four sub-items with no such ambiguity: Company
  profile/Business information, Branding/Logos, Service areas, and
  Working hours. Team permissions and Security settings are separate,
  immediately-following clusters (each has its own ADR/commit); AI
  preferences is intentionally not built.

**Decision**: Four new/extended pieces, all `packages/db`-only types
(not `packages/core-models`) - `businesses` has never been part of the
provider-neutral CRM domain model (it _is_ the tenant boundary itself),
always referenced by a plain `businessId: string`, never a branded id;
adding one now would be the first branded id for something that isn't
a domain entity, breaking that consistency for no benefit. This mirrors
`MembershipRole`, the one prior `packages/db`-only type.

1. **Business profile/information**: seven new nullable columns on
   `businesses` (address/city/state/postal_code/phone/email/website) -
   `packages/db/migrations/018-business-profile.sql`, which also adds
   the tenant-scoped UPDATE policy `businesses` was missing (it only
   ever had a SELECT policy).
2. **Branding/logo**: `logo_storage_ref`/`primary_color` columns, plus
   a new private `business-logos` Storage bucket
   (`migrations/019-business-branding.sql`), following the same
   private-bucket-plus-signed-URL pattern as `job-photos` and
   `estimate-attachments` - a logo is never made public through this
   bucket; it is only ever displayed via a short-lived signed URL from
   within `apps/admin-console`.
3. **Service areas**: a new `business_service_areas` table
   (`migrations/020-business-service-areas.sql`) - a simple named-area
   list (e.g. "Sacramento"). Deliberately **not** tied to the
   programmatic-SEO `CityId`/`CityService` types already in
   `packages/core-models` - those model public marketing pages for
   `apps/greencal-website`, a different concern from a business's own
   internal "where do we serve" declaration.
4. **Working hours**: a new `business_hours` table, one row per day of
   week (`migrations/021-business-hours.sql`), saved as a single
   upserted batch (`setBusinessHours()` takes all seven days at once,
   using Postgres `upsert(...).onConflict('business_id,day_of_week')`
   rather than a table-normalized JSON blob, keeping the schema
   consistent with every other table in this package).

**Alternatives considered**: A JSON/JSONB blob column on `businesses`
for hours (avoids a new table and batch-upsert complexity) - rejected;
every other piece of structured data in this schema uses real typed
columns, and a JSON blob would be the only exception with no strong
justification. Tying service areas to the existing growth-system
`CityId` types - rejected per the reasoning above; those are a
different, public-marketing-facing concern.

**Consequences**: `docs/crm/CRM_ARCHITECTURE.md` and
`packages/db/README.md` gain a section. `apps/admin-console` gains a
`/settings` hub linking to `/settings/profile`, `/settings/branding`,
`/settings/service-areas`, and `/settings/hours` (Team and Security
follow in their own clusters). Migrations 018-021 have not yet been
run against production (owner action).

**Related**: [ADR-0010](#adr-0010-multi-tenant-crm-foundation-businessesmemberships-tenant-scoped-rls),
[ADR-0020](#adr-0020-photoasset-persistence-via-supabase-storage-beforeprogressafter-media),
[ADR-0028](#adr-0028-estimate-photo-attachments-as-a-separate-minimal-type-from-photoasset).

---

## ADR-0032: Team roster/role management — broadened `memberships` RLS, owner-admin-gated role writes, denormalized email

**Status**: Confirmed (implemented)

**Context**: "Team permissions" (Settings) requires showing the full
team roster - every prior design in this project deliberately avoided
this. ADR-0025 (Activity Timeline) explicitly chose to show raw actor
IDs rather than resolved names specifically because broadening
`memberships`/`membership_roles` RLS beyond each user's own row was
flagged as "a real, separate security-scope decision, not made here."
This ADR is that decision, made only after the owner explicitly
confirmed it (see this session's clarifying questions): broaden the
RLS now, and support role editing (not just viewing).

**Decision**: Three parts.

1. **Visibility**: `memberships` and `membership_roles` each gain an
   _additional_ tenant-scoped SELECT policy alongside their existing
   own-row policy (`migrations/022-team-roster.sql`) - the original
   `_own_select` policies are **not** dropped. This matters mechanically:
   the new tenant-scoped policy's subquery
   (`business_id in (select business_id from memberships where user_id = auth.uid())`)
   itself depends on being able to see at least the caller's own
   `memberships` row, which only the original non-recursive
   `user_id = auth.uid()` policy guarantees. Postgres OR-combines
   multiple permissive policies for the same command, so keeping both
   is what makes the broadened visibility actually resolve without a
   circular dependency.
2. **Email display**: `memberships` gains a denormalized `user_email`
   column, backfilled once from `auth.users.email` directly in the
   migration script (only possible because the owner runs migrations
   with the SQL Editor's full privileges, never through the app's own
   RLS-constrained connection). This avoids ever needing
   `apps/admin-console` to query the protected `auth.users` schema at
   request time - no `SECURITY DEFINER` function, no `.rpc()` call, no
   new client capability beyond what this package already uses
   everywhere else (`.eq()`/`.in()`/`.select()`).
3. **Role editing, scoped to `owner-admin`**: `membership_roles` gains
   INSERT/DELETE RLS policies that only permit the change if the
   acting user already holds `owner-admin` for that same business -
   this is a real, deliberate privilege-escalation guard: without it,
   any team member could grant themselves (or anyone) `owner-admin`.
   `packages/db`'s new `TeamRosterRepository.grantRole()`/`revokeRole()`
   also check `actingUserRoles.includes('owner-admin')` at the
   application layer before attempting the write, purely for a clean
   error message - the RLS policy is the real enforcement.
   `revokeRole()` additionally refuses to remove a business's **last**
   remaining `owner-admin` - an irreversible lockout (nobody left who
   can grant or revoke anything) that this repository will not allow
   regardless of who requests it.

`TeamRosterRepository` (like `BusinessProfileRepository` and the other
Settings repositories from ADR-0031) is a `packages/db`-only type, not
`packages/core-models` - team membership is platform/tenant
infrastructure, not a CRM domain entity.

**Alternatives considered**: A `SECURITY DEFINER` Postgres function
querying `auth.users` live at request time - rejected in favor of a
one-time backfilled, denormalized column; simpler, avoids a new
client capability (`.rpc()`) this package has never needed before, and
avoids the harder-to-audit "runs with elevated privileges but
re-checks tenant membership internally" pattern when a simpler design
achieves the same result. Enforcing the last-owner-admin safeguard at
the database level (a constraint or trigger) - rejected as
meaningfully more complex than an application-layer check for a
guard whose only real cost of failure is a clear rejection, not data
corruption.

**Consequences**: `docs/crm/CRM_ARCHITECTURE.md` and
`packages/db/README.md` gain a section. `apps/admin-console` gains
`/settings/team` (roster view for everyone; role add/remove controls
shown only to an `owner-admin` viewer). Migration 022 has not yet been
run against production (owner action). The RLS/privilege-escalation
logic here is inherently untestable against real Postgres in this
environment (this package's unit tests run against a hand-rolled fake
client with no RLS enforcement, same limitation already noted for
ADR-0030's migration-016 fix) - correctness rests on the migration's
own reasoning and code review, not an automated test.

**Related**: [ADR-0018](#adr-0018-multi-role-memberships-owner-directed),
[ADR-0025](#adr-0025-customer-activity-timeline-as-a-read-time-composition-plus-actor-tracking),
ADR-0031 (Settings: business profile/branding/service areas/hours).

---

## ADR-0033: Security settings as change-password only, using Supabase Auth's existing API

**Status**: Confirmed (implemented)

**Context**: The last of the owner's nine "Settings" sub-items,
"Security settings," had real scope ambiguity (password only vs. also
session/device management vs. something larger like MFA). The owner
was asked and confirmed: change-password only, using Supabase Auth's
existing `updateUser()` - no new infrastructure (see this session's
clarifying questions). `apps/admin-console` already has an
unauthenticated "forgot password" email-recovery flow
(`/forgot-password`, `/reset-password`,
`src/pages/api/auth/reset-password.ts`) using the same
`supabase.auth.updateUser({ password })` call - this ADR adds the
missing in-app path for an already-logged-in user to change their
password directly, without needing an email round-trip.

**Decision**: `apps/admin-console` gains `/settings/security`
(current password, new password, confirm new password) and
`/api/settings/security/change-password.ts`. Before calling
`updateUser({ password: newPassword })`, the route re-verifies the
submitted current password via
`supabase.auth.signInWithPassword({ email, password: currentPassword })` -
Supabase Auth's `updateUser()` does not itself require proof of the
current password for an already-authenticated session, so this extra
call is what actually enforces "you must know your current password to
change it," using only Supabase Auth's existing API (no new
infrastructure, matching the owner's confirmed scope).

**Alternatives considered**: Session/device management (list active
sessions, "sign out everywhere") - rejected per the owner's confirmed
scope; Supabase Auth does support this, so it remains straightforward
to add later without any new infrastructure decision. MFA/2FA -
rejected as out of scope for this pass; a materially larger feature
(enrollment flow, recovery codes, verification step in the login flow)
than "Security settings" was scoped to cover here.

**Consequences**: `docs/crm/CRM_ARCHITECTURE.md` gains a section. No
`packages/db` or `packages/core-models` change - this cluster is
entirely `apps/admin-console`, using Supabase Auth's client SDK
directly. **This closes all nine of the owner's "Settings"
sub-requirements**: Company profile/Business information (ADR-0031),
Branding/Logos (ADR-0031), Service areas (ADR-0031), Working hours
(ADR-0031), Team permissions (ADR-0032), Security settings (this ADR)

- AI preferences was explicitly skipped, confirmed with the owner
  (ADR-0031's context), since no AI agent is wired into GreenCal's live
  workflow for a settings toggle to control.

**Related**: ADR-0031 (Settings: business profile/branding/service
areas/hours), [ADR-0032](#adr-0032-team-rosterrole-management--broadened-memberships-rls-owner-admin-gated-role-writes-denormalized-email).

---

## ADR-0034: Internal notifications and a notification center - real, in-app only; email/SMS/customer-facing sending explicitly deferred

**Status**: Confirmed (implemented)

**Context**: The owner's third Phase 1 directive is "Notifications":
Internal notifications, Customer notifications, Email events, SMS
events, Future Emma integration hooks, Notification center. Real email
sending needs a real provider credential (`apps/greencal-website`
already uses Resend for its own, separate quote-intake pipeline, but
`apps/admin-console` has none configured); real SMS sending needs a
real SMS provider credential (none exists anywhere in this repository);
"Customer notifications" in a small-business context with no
customer-facing account/portal system (`apps/web-console` remains an
unbuilt Phase 1 placeholder) is itself gated on that same email/SMS
sending capability; and Emma (referenced in ADR-0008) has no real
voice/chat implementation anywhere in this repository yet - "hooks"
for it can only honestly mean a forward-compatible extension point,
never a working integration. Per the owner's own standing instruction
("do not stop until every Phase 1 admin-console feature is complete
unless an external credential is required"), this ADR builds what is
real and buildable now - Internal notifications and a Notification
center - and explicitly defers the credential-gated pieces rather than
fabricating them.

**Decision**: A new `Notification` type
(`packages/core-models/src/types/notification.ts`) - no state machine
(same treatment as Task/Note/Company): a Notification moves between
exactly two states (unread, read). `NotificationChannel` (`'in-app' |
'email' | 'sms'`) and `NotificationEventType` (a closed union) are
both deliberately supersets of what any code path produces today -
only `channel: 'in-app'` and `eventType: 'estimate-customer-approved'`
are ever actually created; the rest exist for forward-compatible
filtering once a real provider exists, the same honest
not-yet-implemented pattern already established for `TimelineEntryType`
(ADR-0025). `notifications` (`migrations/023-notifications.sql`) is
**per-recipient, not a shared business inbox** - RLS scopes
select/update to `recipient_user_id = auth.uid()`, so a team member
never sees another member's notifications.

The one real trigger wired in this cluster: when a customer approves
an Estimate via the public link (ADR-0030), the approve route notifies
every team member of that business (`TeamRosterRepository.listTeamRoster()`

- one `Notification` per member) - a genuinely valuable, already-real
  event with no external credential required. `apps/admin-console` gains
  `/notifications` (list, unread filter, mark-read) and a nav link.

**Alternatives considered**: Wiring "new Lead created" as a second
trigger - considered but not built this cluster; that event originates
in `apps/greencal-website`'s separate, already-live-in-production
lead-intake pipeline (its own Supabase client, not
`@ai-company-os/db`), and modifying a proven, customer-facing
production path to also write `notifications` rows is a larger,
riskier change than this cluster's scope, better done deliberately
later. Building a real Resend/Twilio integration now - rejected; no
credential is configured for `apps/admin-console`, and CLAUDE.md
prohibits fabricating a working integration. Modeling "Customer
notifications" as an in-app notification shown on a future customer
portal - rejected as premature; no such portal exists (`apps/web-console`
is an unbuilt placeholder), and designing its notification model before
the portal itself exists would be speculative.

**Consequences**: `docs/crm/CRM_ARCHITECTURE.md` and
`packages/db/README.md` gain a section. Migration 023 has not yet been
run against production (owner action). **ACTION REQUIRED (external
credential), not resolved by this ADR**: real email sending (Email
events) needs a Resend - or equivalent - API key configured for
`apps/admin-console`; real SMS sending (SMS events) needs an SMS
provider (e.g. Twilio) account and API key, which does not exist
anywhere in this repository today; Customer notifications need one of
those two, or a real customer portal, neither of which exists; Emma
integration hooks need a real Emma implementation, which does not
exist (see ADR-0008's scope note). These four remain open, tracked in
`ROADMAP.md`, pending the owner supplying the relevant credential or
confirming the customer-portal scope.

**Related**: ADR-0008 (cost-efficient multi-model cloud infrastructure direction),
[ADR-0025](#adr-0025-customer-activity-timeline-as-a-read-time-composition-plus-actor-tracking),
[ADR-0030](#adr-0030-public-customer-estimate-approval-link-via-a-service-role-key-and-a-high-entropy-token).

---

## ADR-0035: Fix infinite RLS recursion on `memberships`/`membership_roles` via `SECURITY DEFINER` helper functions (corrects ADR-0032)

**Status**: Confirmed (implemented)

**Context**: A real production incident, diagnosed end-to-end against
the live deployment: every page that resolves the logged-in user's
business membership failed with Postgres error `42P17`, "infinite
recursion detected in policy for relation `memberships`" - surfaced
via a temporary diagnostic endpoint
(`apps/admin-console/src/pages/api/debug/membership.ts`) added
specifically to get ground truth independent of Vercel's log viewer,
after two earlier rounds of code-level logging and build-artifact
inspection had already ruled out every other explanation (stale
deployment, wrong runtime, routing bypass, missing code) with direct
evidence.

**Root cause**: `migrations/022-team-roster.sql`'s
`memberships_tenant_select` policy is defined **on** `memberships`,
with a `USING` clause whose own subquery **also queries**
`memberships`:

```sql
using (business_id in (select business_id from memberships where user_id = auth.uid()))
```

ADR-0032 reasoned that keeping the original, non-recursive
`memberships_own_select` policy (`user_id = auth.uid()`, no subquery)
alongside this one would give the inner subquery a "safe base case" to
resolve against, since Postgres OR-combines multiple permissive
policies for the same command. **That reasoning was wrong** and is
hereby corrected: Postgres does not selectively apply only the
non-recursive policy to an inner subquery - it applies the full
OR-combined policy set uniformly every time the table is referenced,
including inside that same policy's own subquery. Since one member of
that combined set is self-referential, every access path into
`memberships` under RLS - a direct query, or a nested subquery from a
completely different table's policy - re-triggers evaluation of the
same broken policy set again, without termination. Postgres detects
this specific cycle and raises `42P17` rather than actually hanging
forever. Because nearly every other tenant-scoped table's RLS policy
in this schema resolves the caller's `business_id` by querying
`memberships`, this one self-referential policy broke access to
almost the entire application, not just the team roster feature it
was written for.

A second, independent instance of the identical bug existed in the
same migration: `membership_roles_owner_admin_insert`/`_delete` are
policies **on** `membership_roles` whose subqueries `join membership_roles mr`

- self-referential the same way, on a different table.

**Decision**: `migrations/024-fix-membership-rls-recursion.sql` adds
two `SECURITY DEFINER` helper functions -
`get_my_business_ids()` (every `business_id` the caller holds a
membership in) and `is_owner_admin_for_business(business_id)` (whether
the caller holds `owner-admin` for that business) - and replaces the
four self-referential policies' subqueries with calls to them. A
`SECURITY DEFINER` function runs as its owner, not the querying role,
so its internal query against `memberships`/`membership_roles` never
re-invokes RLS and therefore never re-enters the policy currently
being evaluated - breaking the cycle at its source. `set search_path = public`
is applied to both functions - required hardening for any
`SECURITY DEFINER` function, since an unpinned search_path is a known
privilege-escalation vector (a malicious schema earlier in the
caller's search_path could shadow an unqualified function/operator
reference and run with the function owner's elevated privileges).
`execute` is revoked from `public` and granted only to `authenticated`,
preserving least-privilege. This preserves the exact authorization
model ADR-0032 intended (every team member sees the full roster for
their own business; only an existing `owner-admin` may grant or revoke
a role) - it changes only _how_ the check is computed so that it
terminates, not what it authorizes.

Only the four genuinely self-referential policies are touched. Every
other tenant-scoped policy in this schema (`contacts`, `leads`,
`estimates`, `businesses`, etc.) references `memberships` from a
_different_ table's policy, which is not itself recursive; those only
ever failed as a downstream symptom of `memberships` being
unqueryable, and resolve automatically once `memberships` does - no
other policy needed to change.

**Alternatives considered**: Dropping `memberships_tenant_select`/the
two `membership_roles_owner_admin_*` policies entirely, reverting to
each table's original own-row-only visibility - rejected; this would
"fix" the recursion by silently removing the Team Permissions feature
(ADR-0032) rather than repairing it, contradicting the owner's explicit
instruction not to work around the root cause. Disabling RLS on
`memberships`/`membership_roles` - rejected outright; would remove
tenant isolation entirely on tables holding real authorization data,
a far worse outcome than the recursion bug itself.

**Consequences**: `docs/crm/CRM_ARCHITECTURE.md` and
`packages/db/README.md` gain a note. This is the first custom Postgres
function in this schema (everything prior was tables/policies/indexes
only) - a real, if narrow, precedent for future RLS work that needs
this same "resolve the caller's own group membership without
recursion" pattern (e.g. if a future feature needs "is this user an
owner-admin for ANY business" or similar). Migration 024 has not yet
been run against production (owner action). The temporary diagnostic
route and the verbose `getCurrentMembership()` logging added while
chasing this incident should be removed in a follow-up cluster once
the fix is confirmed live - both are safe to leave temporarily
(diagnostic-only, no data exposure beyond the calling user's own row)
but were never meant to be permanent.

**Related**: [ADR-0032](#adr-0032-team-rosterrole-management--broadened-memberships-rls-owner-admin-gated-role-writes-denormalized-email).

---

## Proposed decisions (not yet made)

- Service-to-service communication pattern (REST/gRPC/queue) beyond the
  new task-router/job-queue placeholders (see ADR-0008) — **Proposed /
  TBD**.
