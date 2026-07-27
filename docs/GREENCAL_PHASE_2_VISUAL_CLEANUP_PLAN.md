# GreenCal Phase 2 — Visual Cleanup & Media-Readiness Plan

Status: working plan for the current phase, on branch
`feat/greencal-premium-homepage`. This is a refinement pass on top of the
already-approved base (the "Premium Homepage" / "Visual and Conversion
Refinement" phases) — not an architecture rewrite. Written before broad
code changes, per this phase's instructions. Supersedes nothing in
`DECISIONS.md`/`BUSINESS_FACTS.md`; those remain authoritative.

## 1. Current implementation summary

The homepage (`src/pages/index.astro`) already has every section this
phase asks to improve: Hero, TrustStrip, CustomerSegmentSection,
Residential (`ServiceGridSection`/`PremiumServiceCard`), CommercialSection,
HOASection, BeforeAfter (before/after slider), WhyChooseGreenCal,
SafetySection, ProcessSteps, Testimonials (reviews), ServiceAreaSection,
FinalCta, plus a shared Header (utility bar + sticky nav + mobile
hamburger menu) and Footer (four columns). All 255 Playwright tests pass,
`lint`/`typecheck`/`build` are clean, and a Preview deployment exists at
the URL given in this phase's prompt. This phase is a **visual-density,
typography, spacing, and media-readiness cleanup pass** on that existing
structure — not a rebuild.

## 2. Scope conflicts this plan resolves the same way Phase 1 did

Several items in this phase's brief repeat requests Phase 1 already
evaluated and excluded, for the same owner-approved-scope reasons
(`DECISIONS.md` ADR-0007, `BUSINESS_FACTS.md`). This plan does not
reopen those decisions; it documents the conflict and proceeds with the
safe alternative already established:

- **"Serving Southern California" / county list including San Bernardino
  and "selected Los Angeles County communities"**: `BUSINESS_FACTS.md`
  explicitly states _"Los Angeles County is not an approved service
  area... Do not publish 'serving all of Southern California'... use:
  'Serving approved communities across San Diego, Orange, and Riverside
  Counties.'"_ San Bernardino County was never approved either. This
  phase's Service Area heading direction ("BASED IN MORENO VALLEY,
  SERVING SOUTHERN CALIFORNIA") and county list are **not implemented as
  written**. Moreno Valley (a real, approved Riverside County city) is
  made visually prominent within the existing three-county structure
  instead — see §10 below and `docs/GREENCAL_OWNER_VERIFICATION_REQUIRED.md`.
- **"BASED IN Moreno Valley"**: this is a stronger claim than a served
  city — it reads as a business-location/HQ claim, which is exactly the
  NAP-adjacent claim `.claude/rules/websites.md` and the prior phase's
  owner decision keep unpublished until the NAP inconsistency is
  resolved. Not used; a "serving," not "based in," framing is used
  instead.
- **Residential secondary services (Window Cleaning, Gutter Cleaning,
  Solar Panel Cleaning, standalone Driveway & Patio Cleaning)**: the
  approved residential scope is exactly Roof Cleaning, House Washing,
  and Concrete Cleaning (`src/data/services.ts`, `BUSINESS_FACTS.md`).
  Driveway/patio cleaning is already covered under the real Concrete
  Cleaning service; Window/Gutter/Solar are not approved categories and
  would require a new ADR before appearing anywhere. No secondary
  service cards are added this phase — residential stays exactly 3
  services, enlarged and improved, not expanded.
- **Commercial capability strip items "Hot-Water Cleaning" and
  "Wastewater Recovery"**: no evidence exists that GreenCal offers
  these (flagged in Phase 1's owner-verification doc); still excluded.
  "Oil and Grease Treatment" and "Commercial Surface Cleaners" are new
  requests in this phase's brief with the same problem — no evidence in
  this repository — so they're excluded too. The capability strip keeps
  only items with real precedent in already-approved copy: Gum & Stain
  Treatment (a real approved service), Photo Documentation and
  Multi-Location Capability (already-existing approved claims elsewhere
  on the site), Recurring Maintenance/Off-Hours Scheduling (service
  policy, not an equipment/technique claim).

None of the above are hard-blocked by an automated test (the
scope-exclusion test's literal term list doesn't cover every one of
these), so this is a content-integrity judgment call consistent with
`.claude/rules/websites.md`'s verified-content requirement and Phase 1's
own precedent, not a fresh guess.

## 3. Real, confirmed visual bug found in this review

`CustomerSegmentSection.astro`'s grid uses `grid-template-columns:
repeat(auto-fit, minmax(18rem, 1fr))`. At the container's actual
available width, this produces a 2-then-1 wrap (Residential + Commercial
on one row, Multi-Family & HOA alone below) rather than three equal
columns — matching this phase's complaint #4 exactly. Fixed by using an
explicit `repeat(3, 1fr)` at a fixed desktop breakpoint instead of
`auto-fit`, which removes the ambiguous wrap.

## 4. Implementation approach per section

- **Typography/spacing**: token-level changes in `tokens.css`
  (`--font-size-xs`/`--font-size-sm` nudged up, new `--font-size-nav`,
  `--space-7` section rhythm increased) plus targeted component CSS
  fixes where a specific element was reading smaller than its content
  role warrants (footer text, card descriptions, review text, utility
  bar). No new ad hoc pixel values outside the existing scale.
- **Customer segments**: fix the grid (§3), add service-example bullets
  already exist — verify equal card height via `align-items: stretch`
  (grid default) and consistent internal structure (already present).
- **Hero**: `ImagePlaceholder`/`ResponsiveImage` gain an optional,
  visible `categoryLabel` caption (not just an invisible `aria-label`)
  so the placeholder reads as an intentional "photo coming soon" panel
  instead of an empty icon box; Hero's media panel switches from an
  arbitrary `min-height` fill to a real `aspect-ratio` container.
- **Residential**: `PremiumServiceCard` gains a `size="featured"`
  variant (larger image ratio, larger heading, a second CTA) used only
  by `ServiceGridSection`'s existing Residential usage — its only
  consumer, so this is a safe, scoped change, not a new component.
- **Commercial**: fewer/larger property-type blocks (drop to a 3-column
  max grid instead of `auto-fit` at small minmax), capability strip
  visually consolidated into fewer, larger blocks.
- **HOA**: larger card media ratio and heading size, already has the
  "Request a Community Cleaning Proposal" CTA and service examples from
  Phase 1 — increasing visual weight is primarily a sizing/spacing pass,
  not new content.
- **Real Results**: `BeforeAfterSlider` gains a `featured` variant
  (larger, spans more of the grid, adds a "View Similar Projects" link
  to the matching real service page — not a new "project" route, since
  no project-detail pages exist and creating one is out of scope this
  phase and would be a placeholder page, not a real case study).
- **Reviews**: `ReviewCard` gains a visible Google-source badge (icon +
  text, still inside the existing placeholder treatment) and larger
  review text; `ReviewSummary` gains an honestly-disabled "View All
  Reviews" affordance and a Google Business Profile placeholder note
  (both explicitly non-functional until real data exists — no dead
  links).
- **Service areas**: heading updated to a safe local-positioning
  statement (§2), Moreno Valley visually emphasized (listed first,
  slightly distinguished styling) within the existing three approved
  counties — no new counties or cities.
- **Footer**: override the global `footer { font-size: sm }` rule for
  `.site-footer` specifically, enlarge the wordmark via a new `size`
  prop, increase column/line spacing.
- **Mobile**: re-verify the sticky bar/hamburger menu/footer-overlap
  behavior already fixed and tested in Phase 1 still holds after the
  typography/spacing changes (no new mobile-specific rebuild expected).

## 5. Components changed (variants added, not duplicated)

`ImagePlaceholder`, `ResponsiveImage` (new `categoryLabel` prop),
`Hero`, `CustomerSegmentSection` (grid fix), `PremiumServiceCard` (new
`size` variant), `CommercialSection`/`CommercialPropertyCard`, `HOASection`/
`HOAServiceCard`, `BeforeAfter`/`BeforeAfterSlider` (new `featured`
variant), `ReviewCard`/`ReviewSummary`, `ServiceAreaSection`/
`ServiceAreaGroup`, `Footer`, `Wordmark` (new `size` variant),
`UtilityBar`, `Header` (nav font size), `tokens.css`, `global.css`. No
new components; no new routes; no backend/CRM/auth/database changes.

## 6. Owner input still required

Unchanged from Phase 1's list in
`docs/GREENCAL_OWNER_VERIFICATION_REQUIRED.md`, plus this phase's own
repeated requests for unapproved content are logged there rather than
implemented: Window/Gutter/Solar residential services, Hot-Water/
Wastewater/Oil-Grease/Commercial-Surface-Cleaner claims, San Bernardino/
LA County and "Southern California" county-wide claims, a Moreno Valley
business-address/HQ claim, and all real photography/video/reviews.
