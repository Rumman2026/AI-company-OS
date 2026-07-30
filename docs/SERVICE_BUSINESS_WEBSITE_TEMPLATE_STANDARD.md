# Service-Business Website — Template Standard

Extracted from the GreenCal Pressure Washing public website (Master
Completion Workflow, 2026-07-29) as a reusable quality standard and
process template for future local-service business websites in this
repository (e.g. GreenCal Mobile Detailing, Navarro Builders). This
document captures **patterns and process**, not GreenCal's specific
content — see the "What must stay configurable per business" section
for the explicit boundary.

## Architecture

- **Static-first** (Astro `output: 'static'`, or an equivalent
  static-site generator). Add a server adapter only for the specific
  routes that genuinely need on-demand execution (e.g. a form-submission
  API endpoint) — every other route stays prerendered. Don't reach for
  SSR/CSR frameworks by default for a public, unauthenticated marketing
  site.
- **Layout-per-page-type**, not one monolithic layout: a base layout
  (site chrome — header/footer/nav) plus dedicated layouts for each
  distinct page shape (a single service page, a category index page, a
  location page). Keeps structurally-similar pages consistent without
  duplicating chrome markup.
- Keep a public marketing site's routing/business-logic **fully
  separate** from any authenticated customer or internal console the
  same business might also have — different concerns, different risk
  profile, don't share assumptions between them.

## Conversion structure

A homepage that works well follows this rough shape (adapt content, not
the underlying pattern):

1. Hero: one clear headline, a concise supporting line, a primary CTA
   (e.g. "Get a Free Estimate") and a secondary CTA (e.g. "Call now"),
   plus a real photo if one exists — never a stock photo standing in
   for a missing real one.
2. Customer segmentation (if the business serves more than one
   customer type — residential/commercial/etc.) — a small, fixed number
   of segments, not an unbounded grid.
3. Primary services, with real photography where it exists.
4. Secondary/adjacent services or segments (commercial, multi-unit,
   etc.), scaled down visually from the primary segment.
5. Proof (before/after photography, project galleries) — the single
   highest-trust section on the page; keep it simple (a slider or
   paired cards) and never let it show blank/broken content.
6. Trust/differentiation (why this business, process explanation,
   safety/quality practices).
7. Reviews — **only real, verified reviews**, or an honest, clearly-
   intentional "not yet connected" state. Never show fake-named
   placeholder review cards even if individually labeled as
   placeholders — it reads as unfinished more than the label protects
   against. Prefer one clean "coming soon" panel over any number of
   placeholder-shaped cards.
8. Service areas (if geographically scoped).
9. Closing CTA.
10. Footer: brand, navigation, contact, honest "not yet available" notes
    kept minimal and consolidated (one line, not a stack of them).

Repeat logical, low-pressure CTA opportunities throughout rather than
concentrating them all in one place — but don't let a single section
(e.g. the hero) carry 3+ competing calls to action without a clear
visual hierarchy between them.

## Reusable component patterns

- **A single seam between "real content exists" and "it doesn't."** One
  component (e.g. `ResponsiveImage`) renders a real, approved photo when
  one exists and an honest placeholder when it doesn't — switched by a
  typed, centrally-registered content record (e.g. a `MediaRecord` type
  with an `approvalStatus` field), never a raw conditional scattered
  across call sites. This is the single most valuable pattern to carry
  forward: it makes "is this real or a placeholder" a data question
  instead of a per-component judgment call, and makes an honest
  placeholder state a first-class, well-designed thing rather than an
  afterthought.
- **A single, prop-driven brand mark component** (e.g. `Wordmark` with a
  `variant` prop for light/dark contexts) rather than duplicating markup
  at every header/footer call site.
- **Shared card visual vocabulary, not necessarily a shared `Card`
  component.** Distinct card types (service cards, segment cards,
  review cards) can each be their own component while still following
  one consistent visual pattern (border/radius/shadow/hover treatment).
  Don't force a premature abstract `Card.astro` before a second
  genuinely-shared use case justifies it.
- **A scope-guard test** if the business has a negotiated, evolving set
  of approved services/locations/claims — encode the boundary as an
  automated test (e.g. "no excluded service term appears anywhere in
  the rendered output"), not just a comment or a doc.

## Design-token strategy

- One token file per app (colors, typography, spacing, containers,
  radii, shadows, motion durations) — semantic names, not raw values,
  referenced everywhere.
- Keep the breakpoint list as one documented, literal source of truth
  (CSS custom properties can't be read inside `@media` queries) and
  make every `@media` rule in the app match it — don't introduce
  one-off arbitrary widths.
- A component is allowed to deviate from the standard breakpoint list
  **only** when a real, measured capacity constraint requires it (e.g.
  a primary nav that needs more width than the general breakpoint
  provides) — and only after directly measuring the actual shortfall,
  not guessing.

## Responsive-breakpoint standards

Test and screenshot at minimum: a small phone width (~390px), a large
phone width (~430px), tablet (~768px), small desktop/large tablet
(~1024px), and two desktop widths (~1280px, ~1440px). Confirm at every
width: no horizontal overflow, no console/hydration errors, correct
nav disclosure pattern (inline vs. hamburger), no broken images or text
clipping.

## Image-handling rules

- Real photos only — never stock photography standing in for a
  business's own missing proof/service photos.
- Explicit `width`/`height` on every `<img>` (CLS prevention). **If**
  the image also needs a different display aspect ratio via CSS
  `aspect-ratio`, the CSS must also set `width: 100%; height: auto;`
  alongside it — otherwise the HTML attributes' definite height wins
  silently and `aspect-ratio` is ignored. This is a real, easy-to-repeat
  bug; encode it as a lint/review checklist item, not tribal knowledge.
- An image with a forced/fixed aspect ratio inside a flex or grid item
  needs `min-width: 0` on that item, or use an absolutely-positioned
  "fill" mode instead of an intrinsic ratio.
- A real photo that lazy-loads should fade in (or otherwise degrade
  gracefully) rather than risk showing a blank box if it's still
  downloading when scrolled into view — cheap to add, meaningfully
  better for trust-critical proof sections.
- Preserve original, owner-supplied source photos untouched on disk;
  generate optimized/derivative versions (WebP, trimmed, privacy-blurred
  if needed) separately and reference only the derivatives from
  components.

## Accessibility requirements

- 44px minimum tap target on every interactive element (buttons, form
  fields, nav links).
- A global, un-suppressed `:focus-visible` ring on every interactive
  element.
- `prefers-reduced-motion: reduce` handled globally (collapse animation/
  transition durations sitewide), with component-level motion
  additionally self-guarding for defense in depth.
- Exactly one `<h1>` per page; unique `<header>`/`<main>`/`<footer>`
  landmarks; a working skip-to-content link.
- Every `<img>` has meaningful `alt` text (empty `alt=""` only for
  genuinely decorative images marked `aria-hidden`).
- **Compute contrast ratios directly for every text/background color
  pairing actually used in the codebase — don't eyeball it.** A gradient
  background needs checking at both its lightest and darkest points, not
  just one. When a pairing is thin, sample the _actual rendered pixel
  color_ (via a screenshot crop) rather than assuming a worst-case
  theoretical value, but budget real safety margin (aim well above the
  legal minimum, not exactly at it) since gradients/viewports vary.

## Testing workflow

- Typecheck, lint, unit/integration tests, and a full production build
  are all required before considering work done — not just "the page
  looks right in a screenshot."
- Let the test framework's own configured server lifecycle (e.g.
  Playwright's `webServer` block) manage the dev server for test runs.
  **Don't leave a manually-started dev server running across multiple
  test sessions** — this repository directly observed that a
  long-running, crash-surviving dev server accumulates bad state and
  produces confusing, hard-to-diagnose test failures (duplicate DOM
  content) that a fresh server instance doesn't reproduce.
- If parallel test workers crash (a real risk on resource-constrained
  local machines), check for and clean up orphaned browser processes
  before concluding a failure is a real regression — rerun the affected
  spec(s) single-threaded to distinguish environmental flakiness from
  an actual bug, and only report a defect as real once single-threaded
  execution confirms it.
- Capture before/after screenshots at every required breakpoint for any
  visual change, and scroll through the full page before a full-page
  screenshot so lazy-loaded content is captured in its loaded state.

## Git and Preview process

- Small, logical, clearly-scoped commits (don't bundle unrelated
  changes) with messages that explain _why_, not just _what_.
- Verify engineering checks (typecheck/lint/test/build) pass _before_
  committing a milestone, and again after, if further changes were made.
- Preview deployments only, by default — never Production without
  separate, explicit authorization. After pushing, confirm the
  resulting Preview deployment actually reaches a `READY` state and
  responds correctly (don't just assume a push "will" deploy correctly
  — verify it did).
- Keep visual-verification screenshots and audit/implementation-report
  documents in the repository (`docs/artifacts/`, `docs/*.md`) as a
  durable record — future work benefits from a fresh baseline comparison
  more than from re-deriving what changed from git history alone.

## What must remain configurable per business

Everything below is intentionally **excluded** from this template and
must never be copied forward as a "default" for a new business site:

- Brand colors, typography choices, logo, and any other visual identity
- Photography (every photo must be that specific business's own, real,
  owner-approved work)
- Service list, service categories, and service descriptions
- Business name, contact information, service area, and any NAP data
- Pricing, guarantees, licensing/certification claims, and "years in
  business" or similar claims
- Reviews and testimonials (always that business's own real, verified
  content, never carried over or fabricated)
- Domain name, hosting/deployment configuration, and any environment-
  specific credentials

A future business site should start from this document's _patterns_ and
the underlying component architecture (the seam patterns, testing
workflow, accessibility baseline) — never from a copy of GreenCal's
actual content, tokens, or media.
