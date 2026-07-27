# GreenCal Visual and Conversion Refinement Plan

Status: working plan for the current refinement phase, on branch
`feat/greencal-premium-homepage`. Written before broad code changes, per
this phase's instructions. Supersedes nothing in `DECISIONS.md`/
`BUSINESS_FACTS.md` — those remain authoritative; this plan operates
inside them.

## 1. Current implementation summary

- App: `apps/greencal-website` (Astro 7, static output + one on-demand
  API route). No Next.js anywhere in this repo — "Next.js Image" does
  not apply. Astro's built-in `astro:assets` `<Image>` component is
  available (ships with Astro core) but **unused today**, and no image
  optimization pipeline of any kind exists, because **zero real photos
  exist in the repository** (confirmed: no files under `public/` except
  `robots.txt`; zero `<img>` elements anywhere in rendered output as of
  the last full-site crawl).
- Homepage (`src/pages/index.astro`) was redesigned last phase: premium
  header/footer (shared, sitewide), Hero, TrustStrip, three
  `ServiceGridSection` instances (residential/commercial/multi-family),
  BeforeAfter (empty-state placeholder), WhyChooseGreenCal, ProcessSteps
  (3 steps), Testimonials (honest absence state), ServiceAreaSection (3
  county buttons only), FinalCta.
- Design tokens (`src/styles/tokens.css`): forest green / cream /
  charcoal / gold palette, display-serif + system-sans typography,
  spacing scale to `--space-8`, `--container-wide`, radii, shadows,
  motion durations. Already reasonably close to what this phase asks
  for — needs extension, not replacement.
- Shared components: `Header.astro`, `Footer.astro`, `Wordmark.astro`,
  `ImagePlaceholder.astro`, `ContactActions.astro`, `ClosingCta.astro`
  (unused by homepage now), `HowItWorks.astro` (used by category
  pages, not homepage), `ServiceCard.astro` (used by category pages,
  not homepage), `ServiceStructuredData.astro`.
- Homepage-only components (`src/components/homepage/`): `Hero`,
  `TrustStrip`, `PremiumServiceCard`, `ServiceGridSection`,
  `BeforeAfter`, `WhyChooseGreenCal`, `ProcessSteps`, `Testimonials`,
  `ServiceAreaSection`, `FinalCta`.
- Data: `src/data/services.ts` (3 residential / 7 commercial / 2
  multi-family-hoa — the **only** approved services, ADR-0007),
  `src/data/cities.ts` (80 approved cities, San Diego/Orange/Riverside
  Counties only — `County` type has exactly these 3 values), `src/data/
navigation.ts`, `src/data/site.ts`.
- Tests: 255 Playwright tests, all passing as of the last run, covering
  scope-exclusion, SEO, tracking, quote-delivery, accessibility, and
  the tslib/Vercel packaging regression.

## 2. Hard scope constraints this plan operates inside

These are pre-existing, owner-approved decisions (ADR-0007,
`BUSINESS_FACTS.md`, `.claude/rules/websites.md`) that this refinement
phase's prompt did not and cannot override on its own:

- **Approved residential services**: Roof Cleaning, House Washing,
  Concrete Cleaning only. "Window Cleaning," "Gutter Cleaning,"
  "Solar Panel Cleaning," "Driveway Cleaning," "Patio Cleaning" as
  _distinct_ nav/service items are **not approved** — driveways/patios
  are already covered under Concrete Cleaning's existing scope, and the
  other three are new categories requiring a separate ADR-0007
  amendment before they can appear anywhere (nav, cards, structured
  data). They will **not** be added as new nav entries or service
  pages this phase.
- **Approved commercial services**: Building Washing, Storefront
  Cleaning, Commercial Concrete Cleaning, Dumpster Pad Cleaning,
  Drive-Thru Cleaning, Gum & Stain Removal, Recurring Exterior
  Cleaning. "Gas Station Cleaning," "Shopping Center Cleaning,"
  "Warehouse Cleaning," "Restaurant Exterior Cleaning" are **not**
  separate approved services — gas stations/shopping
  centers/warehouses/restaurants are property _types_ the existing
  approved services already serve, and will be presented that way
  (as served property categories, not as new service pages/nav items).
- **"Water reclamation" and "hot-water cleaning" claims**: no evidence
  exists in this repository that GreenCal offers these. Per the prior
  session's explicit decision (kept here), these remain **excluded**
  from the Trust Strip/capabilities content unless the owner confirms
  them — added to the owner-verification doc instead.
- **Approved counties**: San Diego, Orange, Riverside only (the
  `County` TypeScript type enforces exactly these 3). **San Bernardino
  County and Los Angeles County are not approved** — LA County is
  _permanently_ excluded per ADR-0007 (enforced by
  `tests/scope-exclusions.spec.ts`, which hard-fails on any LA County
  mention anywhere on the site). Neither will be added.
- **Approved cities, verified against `src/data/cities.ts`**: of the
  cities this phase's prompt lists, **"Riverside" (the city itself),
  "Menifee," and "Anaheim" are not in the approved 80-city list** and
  will not be published. Moreno Valley, Corona, Perris, Murrieta,
  Temecula (Riverside County) and Irvine, Santa Ana, Tustin, Costa
  Mesa, Huntington Beach (Orange County) **are** approved and will be
  used for the curated service-area display.
- **No public street address / no `LocalBusiness` structured data**
  until the owner resolves the NAP inconsistency
  (`.claude/rules/websites.md`, reaffirmed by owner decision last
  phase). "Moreno Valley, California" as a business location in the
  footer is a NAP-adjacent claim this plan will **not** publish —
  added to the owner-verification doc instead.
- **Contact email**: this phase's prompt's own footer content contains
  `greencaliforniacorporarion@gmail.com` — that is the exact known
  typo an existing regression test (`smoke.spec.ts`, "Corrected email
  regression guard") guards against. The correct, only-ever-used
  address is `greencaliforniacorporation@gmail.com`. This plan uses the
  correct address; the typo will not be reintroduced.
- **No `About`, standalone `Projects`, or standalone `Reviews` pages
  exist**, and creating them isn't one of this phase's listed
  implementation steps (only homepage sections plus the shared
  header/footer are). Adding header nav links to non-existent routes
  would create real broken links (`smoke.spec.ts`'s "every internal
  link points to an implemented route" test, and this phase's own "no
  broken links" acceptance criterion). This plan points "Reviews" at
  the homepage's `#reviews` section instead of a dead link, and
  **omits `About` and `Projects` as nav items** this phase — flagged
  as an owner decision (build real pages, or drop from nav
  permanently).
- **No fabricated reviews, stats, licenses, certifications, guarantees,
  years-in-business, or job counts** — per this phase's own content-
  safety section, consistent with `.claude/rules/websites.md`.

## 3. Components to keep as-is

`Wordmark`, `ImagePlaceholder` (extended, not replaced — see below),
`ContactActions`, `ServiceStructuredData`, `HowItWorks`/`ServiceCard`
(used by category pages, out of scope this phase), all layouts, all
data files' existing records (extended, not restructured).

## 4. Components to modify (not replace)

- `Header.astro` — add a slim utility bar; restyle main nav with
  larger type, sticky behavior, and stronger CTA prominence; keep the
  existing data-driven `.nav-dropdown` pattern (already tested,
  already accessible) rather than rebuilding dropdown mechanics from
  scratch.
- `Footer.astro` — expand to four columns; correct contact info;
  business-hours/social links as explicit placeholders, not real
  claims.
- `tokens.css` / `global.css` — extend the existing token set (already
  close to this phase's ask) rather than starting over.
- `Hero.astro`, `TrustStrip.astro`, `ServiceGridSection.astro`,
  `PremiumServiceCard.astro`, `BeforeAfter.astro`,
  `WhyChooseGreenCal.astro`, `ProcessSteps.astro`, `Testimonials.astro`,
  `ServiceAreaSection.astro`, `FinalCta.astro` — all get substantial
  content/layout upgrades per the phase spec, reusing their existing
  file identity (so the already-updated regression tests for these
  selectors keep working).
- `ImagePlaceholder.astro` — extend with an optional `aspectRatio`
  passthrough and a `kind="hero"` treatment for the larger hero
  media slot, rather than building a separate hero-only placeholder
  component.

## 5. New components required

`UtilityBar`, `CustomerSegmentCard`, `CommercialPropertyCard` (reuses
`PremiumServiceCard`'s visual language for property-type framing),
`CommercialCapabilityItem`, `HOAServiceCard`, `BeforeAfterSlider`
(interactive, keyboard-operable drag/click comparison — reduced-motion
respected), `FeaturedProjectCard`, `ReviewCard`, `ReviewSummary`,
`SafetySection`, `ServiceAreaGroup`, `MobileConversionBar` (sticky
bottom bar), `ResponsiveImage` (thin wrapper standardizing aspect
ratio + lazy loading + alt text, backed by `ImagePlaceholder` until
real photos exist), typed `media.ts` data model.

Not building this phase: `MainHeader`/`DesktopNavigation`/
`MobileNavigation` as _separate_ components — `Header.astro`'s
existing single-component structure already passes every nav
accessibility test; splitting it into 3 files is a refactor with no
functional benefit and real regression risk, so it stays one component
with clearer internal sections. `VideoPreview` — no video asset or
requirement exists yet; stubbed as a documented gap, not built blind.

## 6. Design risks

- **Content volume vs. "no cramped cards"**: commercial has 7 real
  services plus a capability row plus property-type framing — must be
  organized in tiers (property-type cards first, real service list
  second) or it will re-create the "too many small cards" problem this
  phase is trying to fix.
- **Placeholder fatigue**: with zero real photos and zero real reviews,
  nearly every visual slot is a placeholder. Mitigated by giving
  placeholders real information density (icon + label + one-line
  "what goes here") rather than blank boxes, per this phase's own
  before/after and review-section complaints.
- **`BeforeAfterSlider` accessibility**: a drag-to-compare interaction
  needs a genuinely keyboard-operable fallback (arrow keys / a visible
  toggle), not just a mouse-drag handle, or it fails this phase's own
  "no interaction that requires a mouse" requirement.
- **Sticky mobile bar vs. sticky header vs. footer**: three
  simultaneously sticky/fixed elements (header, mobile bar, and any
  future cookie/tracking panel) risk covering content or each other on
  short viewports — needs explicit z-index and safe-area handling,
  verified at the smallest tested width (375px).

## 7. Implementation order

Exactly the order given in the phase brief (tokens → header/nav → hero
→ trust → segmentation → residential → commercial → HOA → results →
why-GreenCal → safety → process → reviews → service areas → final CTA
→ footer → mobile bar → accessibility → performance → docs →
screenshots → verification), executed as a sequence of logical commits.

## 8. Routes affected

Only `/` (homepage) plus the shared `Header`/`Footer` components (and
therefore every route's chrome, as already disclosed last phase). No
new routes are created. No existing route's own content changes.

## 9. Media requirements (see also `docs/GREENCAL_OWNER_VERIFICATION_REQUIRED.md`)

Hero image; 3 primary + 4 secondary residential photos; 7 commercial
service photos + a property-type image per category (gas station,
shopping center, storefront, warehouse, restaurant); 4 HOA/multi-family
images; at least 3 before/after pairs (Roof Washing, Residential
Concrete, Commercial Flatwork); no real photos exist for any of these
today — all render as the extended `ImagePlaceholder`/`ResponsiveImage`
honest-absence treatment.

## 10. Owner-input requirements

See `docs/GREENCAL_OWNER_VERIFICATION_REQUIRED.md` for the complete,
itemized list (unapproved cities/counties, unverified equipment/method
claims, business address, About/Projects page decision, real photos,
real reviews).
