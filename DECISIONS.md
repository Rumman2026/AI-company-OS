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

## Proposed decisions (not yet made)

- Database engine and ORM for `packages/db` — **Proposed / TBD**.
- Service-to-service communication pattern (REST/gRPC/queue) — **Proposed
  / TBD**.
- Deployment target (Kubernetes via `infra/k8s`, alternative) — **Proposed
  / TBD**, planning docs only exist today.
