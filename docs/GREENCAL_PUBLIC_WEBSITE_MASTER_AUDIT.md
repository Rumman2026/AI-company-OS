# GreenCal Public Website — Master Audit

Master Completion Workflow, started 2026-07-29. Repository:
`apps/greencal-website`. This document is the running record of Phases
1–3 (Inspect, Baseline, Audit). Phases 4–10 have their own dedicated
documents (see `docs/INDEX.md`-style cross-references at the bottom).

## Phase 1 — Inspect

### Git state

- **Working branch**: `feat/greencal-premium-homepage` (confirmed correct
  branch for this workflow — see note below).
- **Untracked files** (pre-existing, not created by this workflow):
  `.claude/launch.json`, `.mcp.json`. Plus `docs/CLAUDE_SKILLS_AND_CONNECTORS_SETUP.md`
  from a prior, unrelated task.
- **Branch discrepancy resolved**: a sibling branch, `feat/greencal-revenue-launch`,
  also exists and appeared as "current" in an earlier session context.
  Compared directly: both branches share a common ancestor
  (`db3485e`) that already includes every tslib-vendoring fix
  (`stage-tslib.mjs`, `vendor/tslib/`, the POSIX path-bug fix, the
  crash-safe rename fix). `feat/greencal-revenue-launch` adds exactly
  one commit beyond that point (`892e8c9`, a Supabase diagnostic-logging
  change — out of this workflow's explicit scope). `feat/greencal-premium-homepage`
  adds 33 commits beyond that point: the entire premium-redesign history
  (design tokens, header/hero rebuild, customer segmentation, before/after
  proof, reviews, service areas, real photo integration, logo integration).
  **`feat/greencal-premium-homepage` is the correct, more current branch**
  for this workflow and is what all work below targets.

### Routes (`src/pages/`)

- `/` (homepage, `index.astro`)
- `/residential` (index)
- `/services/roof-cleaning`, `/services/house-washing`, `/services/concrete-cleaning`
- `/commercial` (index) + 7 service pages: building-washing, concrete-cleaning,
  drive-thru-cleaning, dumpster-pad-cleaning, gum-stain-removal,
  recurring-exterior-cleaning, storefront-cleaning
- `/multi-family-hoa` (index) + apartment-condo-cleaning, hoa-pressure-washing
- `/service-areas` (index) + `orange-county`, `riverside-county`,
  `san-diego-county`, `[city].astro` (dynamic per-city page)
- `/contact-us`
- `/404`
- 3 legacy redirects configured in `astro.config.mjs` (`/roof`,
  `/restoration/house-washing`, `/residential-services`)

### Layouts

`BaseLayout.astro` (site chrome: Header/Footer/UtilityBar/MobileConversionBar),
`ServicePageLayout.astro`, `CategoryIndexLayout.astro`, `CountyPageLayout.astro`
— a clean layout-per-page-type pattern already in place.

### Homepage sections (`src/components/homepage/`)

Hero, TrustStrip, CustomerSegmentSection (+ CustomerSegmentCard),
ServiceGridSection (+ PremiumServiceCard), BeforeAfter (+ BeforeAfterSlider),
CommercialSection (+ CommercialCapabilityItem, CommercialPropertyCard),
HOASection (+ HOAServiceCard), Testimonials (+ ReviewCard, ReviewSummary),
ServiceAreaSection (+ ServiceAreaGroup), ProcessSteps, SafetySection,
WhyChooseGreenCal, FinalCta.

### Shared components (`src/components/`)

Header, Footer, Wordmark, UtilityBar, MobileConversionBar, ContactActions,
ClosingCta, HowItWorks, QuoteForm, ServiceCard, ServiceStructuredData,
ResponsiveImage, ImagePlaceholder.

### Design tokens (`src/styles/tokens.css`, `global.css`)

Forest-green/cream/charcoal/gold premium palette (ADR-0004), fluid
hero/section-heading font sizes via `clamp()`, documented breakpoint list
(375/480/640/768/1024/**1280**px — the 1280px nav breakpoint was moved
from 1024px during the Logo Integration Pass after measuring a real
~163px nav-capacity shortfall), spacing scale (`--space-1`…`--space-8`),
two container widths (`--container-max-width: 960px` global default,
`--container-wide: 1200px` used by homepage sections and the header).

### Dependencies (`package.json`)

- `astro@^7.0.7`, `@astrojs/vercel@^11.0.3` (adapter used only for the one
  non-prerendered `/api/quote-submit` route; every other route is static)
- `@supabase/supabase-js@^2.110.8`, `resend@^6.18.0` — **out of scope for
  this workflow** per the explicit task boundaries (no CRM/Supabase/backend
  work), noted only for completeness.
- `tslib@^2.8.1` — direct dependency, plus a fully vendored, hash-verified
  copy at `vendor/tslib/` staged into `node_modules/tslib` by a `prebuild`
  script (`scripts/stage-tslib.mjs`), the end state of an extensively
  documented 8-attempt investigation into a real Vercel packaging bug
  (see `astro.config.mjs`'s inline comments). **Not yet confirmed working
  against a real Vercel deployment** — no build/runtime log access exists
  in this repository. This is pre-existing infrastructure, not something
  this workflow needs to touch, but it's a live risk worth knowing about
  before any Phase 10 preview deploy.
- `@playwright/test@^1.61.1`, `@astrojs/check@^0.9.9`, `eslint-plugin-astro@^1.7.0` (dev)

### Commands confirmed (from `package.json`)

```
pnpm --filter @ai-company-os/greencal-website run typecheck   # astro check
pnpm --filter @ai-company-os/greencal-website run lint        # eslint . --ext .ts,.astro
pnpm --filter @ai-company-os/greencal-website run test        # playwright test
pnpm --filter @ai-company-os/greencal-website run build       # node scripts/stage-tslib.mjs && astro build
pnpm --filter @ai-company-os/greencal-website run dev         # astro dev, port 4321
```

### Tests (`tests/`, 10 spec files)

`smoke.spec.ts`, `content.spec.ts`, `scope-exclusions.spec.ts` (guards the
approved-scope boundaries — counties, cities, excluded services),
`quote-form.spec.ts` + `quote-form-unit.spec.ts`, `quote-delivery.spec.ts`

- `quote-delivery-unit.spec.ts`, `tracking.spec.ts` + `tracking-unit.spec.ts`,
  `vercel-function-smoke.spec.ts`.

### Prior visual-verification artifacts already in `docs/artifacts/`

Five prior passes already have baseline screenshots on disk:
`visual-refinement-2026-07-24/`, `phase-2-visual-cleanup-2026-07-26/`,
`photo-integration-2026-07-26/`, `hero-correction-2026-07-27/`,
`logo-integration-2026-07-29/`. These are useful prior-state references
but are **not** a substitute for this workflow's own fresh baseline
(Phase 2), since several have been superseded by later changes.

### Asset inventory (`public/assets/greencal/`, git-tracked files only)

**Logo** — real, in use:

- `logo/GreenCal Pressure washing logo/greencal-logo.png.png` — full
  illustrated mark + "GreenCal Pressure Washing" tagline, **black** text,
  2000×1200 original / ~1005×703 trimmed content, genuinely
  transparent background. Used as the source for the header.
- `logo/GreenCal Pressure washing logo/greencal-logo2 .png.png` — same
  mark, **white** tagline text, for the dark footer.
- Both trimmed + re-encoded as `generated/logo/header.webp` and
  `footer.webp` (800×560, WebP q92), wired into `Wordmark.astro` via its
  `variant` prop. **No redraw** — pixel-identical content to the supplied
  artwork.
- **No icon-only asset exists.** Favicon is unchanged (still the Astro
  default) — correctly left alone per the prior Logo Integration Pass's
  documented decision. Still needs a dedicated square icon-only export
  from the owner before it can change. Tracked in
  `docs/GREENCAL_OWNER_VERIFICATION_REQUIRED.md`.
- **`GreenCal Source File (Ai).ai`** exists on local disk (owner-supplied
  original) but is correctly `.gitignore`d and untracked — not a usable
  web asset, never referenced by any component.

**Homepage before/after photography** — 3 real pairs, all in use:

- Roof washing: `homepage/roof-wash/roof-wash-hero-Before 2400x1600.jpg.png`
  / `...-After 2400x1600.jpg (2).png` → generated
  `roof-wash-01-before/after.webp` (1024×1024 square pair, used in the
  Real Results section) **and** a separate `roof-wash-hero-after.webp`
  (1264×848 landscape derivative of the same after-photo, used as the
  hero image — added in the Hero Correction pass specifically so the
  hero gets a properly-cropped landscape composition instead of reusing
  the square Real Results derivative).
- House washing: `homepage/house-wash/Before house wash.png` /
  `House wash After.png` → `house-wash-01-before/after.webp` (992×1079,
  blurred to redact a visible house-number "131" near the front door in
  both frames).
- Concrete cleaning: `homepage/concrete-cleaning/Driveway before power wash.png`
  / `Drive way After wash.png` → `concrete-cleaning-01-before/after.webp`
  (1408×768, blurred to redact a visible house-number "248" on the
  garage wall in both frames).
- Original filenames are messy (spaces, inconsistent casing, a stray
  `(2)`) but this is **owner-supplied source material preserved
  intentionally**, not an accidental duplicate — only the clean
  `generated/*.webp` derivatives are actually referenced by any
  component. Flagged here for completeness, not treated as a defect.

**Missing photography** (confirmed still absent, tracked in
`docs/GREENCAL_OWNER_VERIFICATION_REQUIRED.md`, unchanged by this
inspection): all 7 commercial service photos + 5 commercial property-type
images, all 4 multi-family/HOA images. These sections currently render
the honest `ImagePlaceholder` "Coming Soon" treatment — correct behavior,
not a placeholder-as-real-photo problem.

### Reusable architecture/patterns identified for the template standard

- **`ResponsiveImage`/`ImagePlaceholder` seam**: every image slot in the
  homepage is one of these two components, switched on whether a real
  `MediaRecord` exists — never a raw `<img>` and never a stock photo
  standing in for missing real proof. This is the single most reusable
  pattern for any future service-business site.
- **`Wordmark` `variant` prop** (`default`/`inverse`): one component, one
  set of call sites in Header/Footer, swapped only by CSS-selected asset
  — reusable for any business with light-header/dark-footer branding.
  Only the two file paths in `LOGO_SRC` and the copy in `alt` are
  business-specific.
- **`MediaRecord` type + `getMediaById` helper** (`src/types/content.ts`,
  `src/data/media.ts`): a small, typed, central registry of real media
  with dimensions/alt/category metadata — makes "is this a real photo or
  a placeholder" a data question, not a per-component judgment call.
- **Design-token file** (`tokens.css`) with a documented, literal
  breakpoint list (CSS custom properties can't be read inside
  `@media`, so the list is a comment, not enforced by tooling — worth
  carrying forward as convention, flagged as a real limitation for the
  template standard to call out explicitly).
- **Layout-per-page-type** (`ServicePageLayout`, `CategoryIndexLayout`,
  `CountyPageLayout`) rather than one monolithic layout — keeps
  service/category/location pages structurally consistent without
  duplicating chrome.
- **`scope-exclusions.spec.ts`**: a regression test that encodes business
  _boundaries_ (approved counties/cities/services) directly as an
  automated check — a strong pattern for any future business site with
  a similarly negotiated, evolving scope.
- **`prebuild` + vendored-dependency pattern** (`scripts/stage-tslib.mjs`,
  `vendor/tslib/`): a hard-won, well-documented workaround for a
  platform-specific packaging bug — worth carrying forward as a
  documented _technique_ (vendor + integrity-hash-verify + prebuild
  stage) for the template standard, but the specific tslib bug itself is
  Astro/Vercel/pnpm-version-specific and should not be copied blindly
  into a future site without re-verifying it's still needed.

## Gate 1 — Inspection Complete ✅

- Repository structure understood (routes, layouts, components, tokens,
  dependencies).
- Asset inventory complete (17 tracked files under `public/assets/greencal/`,
  every file accounted for; logo in use; 3 real photo pairs in use;
  favicon and commercial/HOA photography confirmed still missing, already
  tracked in the owner-verification doc).
- Git state documented, including the branch-discrepancy investigation
  and resolution above.
- Required commands identified (typecheck/lint/test/build, listed above).
- Reusable patterns identified (listed above) — feeds Phase 4 (design
  system) and the final template-standard document.

Proceeding to Phase 2 (Baseline).

## Phase 2 — Baseline

### Commands run

| Command                                                       | Result                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @ai-company-os/greencal-website run typecheck` | **Pass** — 0 errors, 0 warnings, 0 hints (101 files)                                                                                                                                                                                                                                                             |
| `pnpm --filter @ai-company-os/greencal-website run lint`      | **Pass** — 0 errors, 1 pre-existing warning (`no-console` in `src/lib/quote-form/lead-store.ts:67`, backend logging code, out of this workflow's scope)                                                                                                                                                          |
| `pnpm --filter @ai-company-os/greencal-website run build`     | **Pass** — static build + Vercel function packaging both completed; 80 city pages + all service/commercial/HOA pages generated                                                                                                                                                                                   |
| `pnpm --filter @ai-company-os/greencal-website run test`      | **255/255 pass.** First parallel run showed 4 failures (1 worker crash, 3 cascading timeouts against a Windows/parallel-worker resource issue); re-ran the same 4 spec files with `--workers=1` and all passed cleanly — confirmed environmental flakiness, not a real regression. No code changed between runs. |

### Playwright baseline screenshots

Captured homepage full-page screenshots at all 6 required widths (390,
430, 768, 1024, 1280, 1440px) — saved to
`docs/artifacts/master-completion-baseline-2026-07-29/`. Method: local
`astro dev` server + a temporary Playwright spec (written, run, then
deleted — not committed).

- **Horizontal overflow**: none at any of the 6 widths (checked via
  `scrollWidth > clientWidth`).
- **Console/hydration errors**: none at any of the 6 widths.
- **Header/nav**: confirmed the 1280px breakpoint from the prior Logo
  Integration Pass holds correctly — inline nav at 1280/1440px, mobile
  "≡ Menu" hamburger correctly shown at 1024px and below.
- **Real Results (before/after) section**: initially appeared as a blank
  white box in the full-page screenshots at both 1440px and 390px.
  Investigated directly (not assumed): a targeted `naturalWidth`/`complete`
  check showed several before/after images genuinely not yet loaded at
  screenshot time. Re-tested by scrolling through the page first (as a
  real user would) — every image then reported `complete: true` with
  correct natural dimensions, and a cropped screenshot of the section
  confirmed it renders correctly (real roof/house/driveway photography,
  working slider handles, correct BEFORE/AFTER badges). **Conclusion:
  this was a lazy-loading/screenshot-timing artifact, not a real defect**
  — flagged for Phase 3 consideration only as "should trust-critical
  proof photography load eagerly instead of lazily," not as a bug.
- No broken images, text clipping, or obviously broken layout observed
  in any of the 6 full-page screenshots on visual review.

## Gate 2 — Baseline Complete ✅

- All baseline commands succeed (typecheck/lint/build clean; tests
  255/255 once environmental flakiness was ruled out and re-verified).
- Screenshots exist at all 6 required widths.
- No current defects found that block proceeding — the one investigated
  anomaly (Real Results lazy-load timing) was confirmed not a real bug
  and is carried into Phase 3 only as a minor, non-blocking observation.

Proceeding to Phase 3 (Audit).

## Phase 3 — Audit

Grounded in direct code inspection of every homepage section component,
the header/footer, the quote form, and the 6-width baseline screenshots
— not assumption. Overall finding: this is an already mature, carefully
engineered site (extensive inline provenance comments, honest
placeholder handling everywhere real assets are missing, strong
accessibility scaffolding in the quote form, working tests guarding
scope boundaries). The audit below is genuinely short on P0/P1 findings
because there isn't much broken — most opportunity is P2/P3 polish.

### P0 — Broken or misleading

**None found.** No broken functionality, no misleading business claims,
no fabricated content anywhere in the homepage or its components.

### P1 — Conversion-critical

1. **Reviews section shows visibly-labeled placeholder cards on the live
   page.** `Testimonials.astro`/`ReviewCard.astro` are doing the _honest_
   thing correctly — each of the 3 cards is tagged "Development
   placeholder - not a real review" and `ReviewSummary.astro` explicitly
   states Google review integration isn't connected, with a disabled
   (not dead) "View All Reviews" button. But showing three fake-named,
   fake-quoted cards under a "Customer Reviews" heading — even truthfully
   labeled — reads as an unfinished section to a real visitor and works
   against the "premium and trustworthy" goal. The label text is small
   and easy to miss at a glance; the dominant visual impression is still
   "3 five-star reviews." **Not a truthfulness problem, a presentation
   problem** — addressed in Phase 5 by replacing the 3 placeholder cards
   with one consolidated, clearly-intentional "building our review base"
   panel, without inventing any review content.

### P2 — Major quality improvement

2. **Footer contact column stacks three "not yet connected" notes** in a
   row (business hours, Google Business Profile, Facebook/Instagram).
   Correct and honest, but visually reads as "this business isn't fully
   set up yet" in the one column meant to build contact confidence.
   Recommend de-emphasizing into a single, smaller secondary line rather
   than three equally-weighted bullets — still fully honest, better
   hierarchy.
3. **Real Results (before/after) images lazy-load with no reserved-space
   or fade-in treatment**, confirmed in Phase 2 to cause a blank-flash if
   a screenshot/fast-scroll catches them mid-load. A real user scrolling
   normally likely won't notice, but this is the site's single strongest
   trust-proof section — worth a lightweight CSS fade-in so a slow
   connection never shows a blank box where proof photography should be.
4. **Commercial and Multi-Family/HOA segments have zero real photography**
   — correctly using the honest "Commercial Project Media Coming Soon"
   placeholder throughout (`CommercialPropertyCard`, `HOAServiceCard`,
   `CustomerSegmentCard`'s `statusLabel`), never a residential photo
   repurposed as commercial proof. This is a real conversion gap for two
   of three customer segments, but it's **asset-blocked** — cannot be
   fixed without owner-supplied commercial/HOA photos. Tracked in
   `docs/GREENCAL_PUBLIC_WEBSITE_REMAINING_ASSETS.md`, not implementable
   this pass.
5. **Hero carries three calls to action** (primary "Get a Free Estimate"
   button, secondary "Call" button, plus a text link "Request a
   Commercial Assessment") in a small space above the fold. Functionally
   fine and all three are legitimate, distinct intents (residential
   estimate / call / commercial), but worth a lighter-weight treatment
   for the third one so the primary action stays visually dominant.

### P3 — Optional refinement

6. Hero's trust-indicator list (`Residential & Commercial`, `Multi-Family
& HOA`, `Property-Conscious Methods`) is plain bulleted text — a small
   icon set would read as more premium. Cosmetic only.
7. `QuoteForm.astro` is a long, fully-expanded single-column form with 7
   required + 5 optional fields all visible at once. It's already
   genuinely excellent on correctness/accessibility (per-field error
   regions, `aria-invalid`, focus-managed error summary, duplicate-submit
   lock, honest status states, honeypot) — the only opportunity is
   perceived friction: progressively disclosing the optional fields
   (timing/property type/project size) could reduce the "this is a lot
   of form" first impression. Optional, not a defect.
8. `WhyChooseGreenCal`, `ProcessSteps`, and `SafetySection` all use the
   same "card grid on a solid background" rhythm back-to-back. Visually
   consistent (good) but somewhat repetitive in sequence — minor
   sequencing/visual-variety opportunity only, not required.

## Gate 3 — Audit Complete ✅

- P0 (none), P1 (1), P2 (4), P3 (3) findings documented above.
- Implementation priorities are clear: Phase 5 implements #1 (reviews
  presentation) and #2 (footer de-emphasis) as concrete code changes;
  #3 (fade-in) as a small CSS addition; #4 remains asset-blocked and is
  recorded in the Remaining Assets doc rather than implemented; #5 is a
  minor visual-weight adjustment. P3 items are optional and left
  undone this pass per the "don't rebuild stable sections without a
  documented P0/P1/P2 reason" rule.

Proceeding to Phase 4 (Design System).

## Phase 5 — Implement (summary; full detail in

`docs/GREENCAL_PUBLIC_WEBSITE_IMPLEMENTATION_REPORT.md`)

Implemented: reviews-section consolidation (P1 #1), footer contact-column
consolidation (P2 #2), `ResponsiveImage` fade-in (P2 #3), hero
tertiary-CTA de-emphasis (P2 #5). Not implemented: commercial/HOA real
photography (P2 #4) — asset-blocked, see
`docs/GREENCAL_PUBLIC_WEBSITE_REMAINING_ASSETS.md`. All changes verified
with `astro check` (0 errors) and visually confirmed via Playwright
screenshots.

### Test-infrastructure finding (important for future sessions)

While re-running the full suite after Phase 5's changes, two rounds of
parallel test runs showed real-looking failures (worker crashes, and —
more seriously — a `page.locator('h1')` resolving to **5** elements on
routes that should have exactly 1). Investigated directly rather than
dismissed:

1. A direct `curl` against the live dev server showed exactly 1 `<h1>`
   — the server was rendering correctly. Confirmed the content itself
   was never wrong.
2. `tasklist` revealed **15 zombie `chrome-headless-shell.exe`
   processes** left over from earlier crashed test workers, still
   running and consuming resources. Killed them.
3. The 5-`<h1>` failure persisted even after that. Root cause found:
   this session's own manually-started `astro dev` background server
   (started outside Playwright's own `webServer` lifecycle, hours
   earlier, and already survived multiple worker crashes) had
   accumulated bad state and was being reused by Playwright's
   `reuseExistingServer: true` config instead of a fresh instance.
   Killing that process and letting Playwright's own `webServer` start
   and manage a clean instance resolved it completely — the full suite
   then ran to 253/255 passing, with the last 2 failures confirmed as
   ordinary parallel-worker timing flakiness (16/16 pass single-threaded).

**Takeaway for future work on this repo**: don't leave a manually-started
`astro dev` server running across multiple test runs in the same
session — let `pnpm run test` / `playwright test` manage its own
server lifecycle via `playwright.config.ts`'s `webServer` block, which
sets the correct env vars (`PLAYWRIGHT_TEST`, `ASTRO_DEV_BACKGROUND`)
and gets a clean process per run.

## Phase 6 — Content and SEO Foundation

Reviewed `BaseLayout.astro`'s `<head>`, `ServiceStructuredData.astro`,
sitemap generation, and page copy across the homepage and a
representative service page. Foundation was already solid (canonical
URLs, `noindex`/sitemap correctness, and `Service` structured data are
all directly verified by `tests/content.spec.ts` and `tests/scope-
exclusions.spec.ts` — 40+ passing assertions, not just visual review).

**Implemented**: added `og:image`/`twitter:image` (plus
`og:image:width/height/alt`, and upgraded `twitter:card` from `summary`
to `summary_large_image`) to `BaseLayout.astro`. These were previously,
correctly omitted because no approved brand image existed at the time
that decision was made — the Logo Integration and Real Photo Integration
passes since then supplied real, approved assets, so the omission was
stale rather than still-correct. Uses the same real `roof-wash-hero-after`
photo the homepage hero already uses — not a new or fabricated asset,
and not a per-page image (no other page yet has its own distinct
approved photo).

**Reviewed, no changes made** (already correct):

- Page titles/descriptions across the homepage and service pages are
  specific, accurate, and free of generic AI-marketing language or
  unsupported superlatives ("Residential, commercial, and multi-family
  exterior cleaning serving approved communities across San Diego,
  Orange, and Riverside Counties" — factual, not "best-in-class"/"#1"
  puffery).
- Heading order: every route has exactly one `<h1>`, verified by
  existing tests across all 12 service pages, 3 category-index pages,
  and `service-areas` pages.
- No thin or duplicated location pages: confirmed in Phase 1 that the
  80-city `service-areas/[city]` pages share one real, substantive
  `CountyPageLayout` template with genuine per-city data (not
  auto-generated filler text), and draft/unapproved cities are
  correctly `noindex`ed and excluded from the sitemap.
- `Service` (not `LocalBusiness`) structured data on every service page,
  deliberately excluding an `address` field — consistent with the
  still-unresolved NAP decision.

**Not changed, noted as optional (P3)**: the homepage `<title>` is
plain `"GreenCal Pressure Washing"` with no descriptive suffix (e.g.
service/location keywords). No test asserts this exact string, so it
could be safely expanded — left as-is this pass since it's a genuine
optional improvement, not a defect, and title changes are easy to
revisit later without any other dependency.

Verified via `astro check` (0 errors) after the `og:image` change.

## Phase 7 — Accessibility and Performance

**Contrast audit** (computed WCAG contrast ratios directly for every
token color pair actually used as text/UI-component color in the
codebase — not spot-checked visually):

- Found one real, verifiable gap: `.hero-eyebrow` (gold-500 text on the
  hero's dark diagonal gradient). Sampling the _actual rendered pixel
  color_ behind the text (via a cropped screenshot, not a guess) gave
  4.58:1 — technically over AA's 4.5:1 floor, but only barely, and the
  gradient's far (lighter, forest-700) edge computes to 3.25:1, which
  fails outright. **Fixed**: scoped the eyebrow's color to a lightened
  gold (`#d4ad74`, up from the shared `--color-gold-500`) that passes
  AA (4.5:1+) against both gradient stops with real margin. The shared
  token itself is untouched — every other use of `--color-gold-500`
  (footer headings, WhyChoose headings, badges) was individually
  computed and already passes AA comfortably (4.9–8+:1).
- Every other checked pairing (body text, buttons, links, footer text at
  its various opacities) passes AA with comfortable margin — see the
  computed values in this session's work; not reproduced in full here
  to keep this document focused.

**Automated checks** (Playwright, this session):

- Zero `<img>` elements sitewide missing an `alt` attribute.
- Exactly one `<header>`, one `<main>`, one `<footer>` landmark.
- Keyboard-only interaction confirmed on the mobile nav: `Tab` reaches
  the hamburger toggle, `Enter` opens it, `aria-expanded` updates
  correctly — without a mouse.

**Already-verified by existing tests/code** (not re-tested, cited from
Phase 1/3 findings): 44px minimum tap targets sitewide (buttons, form
fields, nav links), global `:focus-visible` ring on every interactive
element, `prefers-reduced-motion` handled globally, semantic heading
order (one `<h1>` per route, verified across every route by
`tests/content.spec.ts`), working skip-to-content link, no client-side
JS framework shipped (static-first Astro — minimal JS weight by
architecture, not an afterthought).

**Performance**: no new client-side dependencies added this workflow.
Real photos already ship as WebP with explicit `width`/`height` (CLS
prevention) and `loading="lazy"`/`fetchpriority` used appropriately
(hero eager + high priority; everything else lazy). The Phase 5 fade-in
transition is CSS-only (no JS framework, no added bytes beyond a few
lines of CSS + 2 inline event-handler attributes).

## Phase 10 — Git and Preview

- **Commits** (both on `feat/greencal-premium-homepage`, pushed to
  `origin`):
  - `0a6ddc5` — `feat(greencal): consolidate reviews/footer, add image
fade-in, fix hero contrast, add og:image` (the 6 changed source
    files)
  - `1b158b5` — `docs(greencal): record Master Completion Workflow
audit, design system, and QA` (this doc, the design-system doc, the
    responsive-QA doc, and both screenshot sets)
- **Preview deployment**: `dpl_BqvPENECw4v2dkpYMRYW1gRZF3gP`,
  `target: null` (Preview, confirmed — not Production), `state: READY`,
  built from commit `1b158b5`. Verified directly with `curl` — `200`
  response, correct `<title>`.
  **URL**: `https://ai-company-os-greencal-website-b6fj4eyfv-leads-initiative.vercel.app`
- Nothing outside `apps/greencal-website` (plus the 3 root-level
  `docs/GREENCAL_*` files, consistent with this repo's existing
  convention) was touched. No production deployment occurred.

## Gate 7 — Engineering Passed ✅ / Phase 10 Complete ✅

- `typecheck`/`lint`/`build` all pass (see Phase 9 note below).
- `test`: 255/255 passing, confirmed via single-threaded re-run after
  ruling out parallel-worker flakiness (see the Phase 5 test-
  infrastructure note above).
- Commits created with clear messages; Preview deployment live and
  verified; no Production deployment.
