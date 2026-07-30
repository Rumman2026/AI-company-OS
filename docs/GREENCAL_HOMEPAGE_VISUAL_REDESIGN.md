# GreenCal Homepage — Premium Visual Redesign

Started 2026-07-29. Repository: `apps/greencal-website`, branch
`feat/greencal-premium-homepage` (clean, up to date with origin at
start).

## Phase 1 — Inspect

### Current homepage structure (`src/pages/index.astro`)

Hero → TrustStrip → CustomerSegmentSection → ServiceGridSection
(Residential, featured cards) → CommercialSection → HOASection →
BeforeAfter → WhyChooseGreenCal → SafetySection → ProcessSteps →
Testimonials → ServiceAreaSection → FinalCta.

### Estimate journey (confirmed, not assumed)

- **Estimate CTA destination**: `/contact-us#quote-form` — a **route +
  anchor**, not a modal or inline homepage form. The actual
  `<QuoteForm>` component only renders on `/contact-us`. Every existing
  CTA on the homepage (hero, commercial section, HOA cards, final CTA,
  footer) already points at this same destination — confirmed via
  grep, no inconsistent link exists.
- **Phone action**: `siteInfo.phoneHref` = `tel:+16573198550`,
  displayed as `657-319-8550`. `ContactActions.astro` renders both as
  a simple two-link paragraph, reused on `/contact-us`.
- **No duplicate estimate form exists** — only one `QuoteForm`
  component, one call site.
- **Implication for Phase 8**: since the real form lives on a separate
  page, "hide the floating CTA near the estimate form" is interpreted
  as hiding it near the homepage's own `FinalCta` section (the
  spec's own wording allows either target — "near the estimate form or
  final CTA" — and `FinalCta` is the homepage's actual bottom
  conversion moment).

### Existing sticky controls

- **`MobileConversionBar.astro`**: fixed bottom bar, `display: none`
  above 768px, shows "Call Now" / "Get Estimate" below 768px.
  `z-index: 50`. `global.css` reserves matching bottom `body` padding
  (`padding-block-end: var(--mobile-bar-height)`) at the same
  breakpoint, so footer content is never covered.
  - **Gap found**: does **not** currently handle
    `env(safe-area-inset-bottom)` — on a notched/home-indicator iPhone,
    the bar sits flush with the very bottom edge rather than above the
    home-indicator safe area. This is a real, fixable gap (Phase 3/8).
- **No desktop floating estimate CTA exists yet** — this is new work
  for Phase 8.
- **No chat widget, no cookie-consent overlay.** The footer's "Tracking
  preferences" control is a plain inline `<details>/<summary>`, not a
  fixed/floating element — zero overlap risk with a new floating CTA.
- **Header**: `position: sticky`, `z-index: 40`. Its mobile-nav dropdown
  becomes `position: absolute` and opens _below_ the header
  (`top: 100%`) when toggled — occupies the upper portion of the
  viewport, not the lower-right/bottom area a new floating CTA or the
  existing mobile bar would use. No overlap risk identified.
- **`BeforeAfterSlider`**'s range-input handle is inline content (not
  fixed-position) — no overlap risk with fixed controls, but Phase 6/10
  must still confirm the mobile bar never visually sits on top of a
  slider's bottom edge on short viewports.

### Visual asset map (`public/assets/greencal/`, recursive, 17 tracked files — re-confirmed unchanged since the last workflow)

| Asset                                                                 | Category                        | Before/After                     | Orientation         | Dimensions | Recommended section             | Recommended treatment                    | Editing needed                                                | Authentic                                                    |
| --------------------------------------------------------------------- | ------------------------------- | -------------------------------- | ------------------- | ---------- | ------------------------------- | ---------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------ |
| `generated/homepage/roof-wash-hero-after.webp`                        | Residential — Roof Washing      | After only (dedicated hero crop) | Landscape (~3:2)    | 1264×848   | **Hero — primary anchor**       | Large, perspective-framed dominant panel | No (already a purpose-cropped derivative; original preserved) | Yes                                                          |
| `generated/homepage/roof-wash-01-before.webp` / `-after.webp`         | Residential — Roof Washing      | Matched pair                     | Square              | 1024×1024  | Real Results — featured project | Large featured before/after board        | No                                                            | Yes                                                          |
| `generated/homepage/house-wash-01-before.webp` / `-after.webp`        | Residential — House Washing     | Matched pair                     | Portrait-ish        | 992×1079   | Real Results — supporting card  | Paired-image card                        | No                                                            | Yes (privacy-blurred house number, pre-existing, documented) |
| `generated/homepage/concrete-cleaning-01-before.webp` / `-after.webp` | Residential — Concrete Cleaning | Matched pair                     | Landscape           | 1408×768   | Real Results — supporting card  | Paired-image card                        | No                                                            | Yes (privacy-blurred house number, pre-existing, documented) |
| `generated/logo/header.webp` / `footer.webp`                          | Brand                           | n/a                              | Landscape (~1.43:1) | 800×560    | Header / Footer                 | Unchanged                                | No                                                            | Yes                                                          |

**Commercial project assets**: **none exist.** **HOA/multi-family
assets**: **none exist.** Both sections currently and correctly render
the honest "Commercial Project Media Coming Soon" placeholder — this
redesign will make that placeholder treatment itself more visually
considered (Phase 5), but will **not** fabricate or imply real photos
that don't exist. No stock or generated imagery will be introduced,
per the explicit guardrail.

**Duplicates/unsupported formats**: none found. The only non-derivative
files are the owner-supplied original PNGs (messy filenames, preserved
intentionally) and the still-gitignored `.ai` source file — neither is
new since the last inspection.

**Hero-anchor decision**: `roof-wash-hero-after.webp` remains the
correct choice — it's the only asset purpose-cropped as a wide
landscape hero image; the alternative real roof photo
(`roof-wash-01-after.webp`) is a tighter square crop better suited to
the Real Results card it already serves, not a dominant hero panel.

## Gate 1 — Inspection Complete ✅

- Homepage structure, design tokens, and estimate journey are
  understood and documented above.
- Strongest real assets identified (roof-wash-hero-after for the hero;
  3 real before/after pairs for Real Results); no fabricated or stock
  assets will be used.
- Matched before/after pairs confirmed (3, all already in the media
  registry with correct dimensions).
- Estimate destination (`/contact-us#quote-form`) and phone action
  (`tel:+16573198550`) confirmed as the single, consistent destination
  every new CTA will reuse — no new/duplicate form will be created.
- Sticky-control overlap risks identified: the existing mobile bar's
  missing safe-area handling (real gap, will fix) and the absence of
  any desktop floating CTA (new work, not a conflict to resolve).
- Unrelated work preserved — only inspected, nothing edited yet.

Proceeding to Phase 2 (Baseline).

## Phase 2 — Baseline

### Engineering baseline

`typecheck` (0 errors) · `lint` (0 errors, 1 pre-existing unrelated
warning) · `build` (clean) all pass. `test`: parallel run showed 5
failures with the same worker-timeout signature already established as
environmental in this repository's prior sessions (not a real
regression) — confirmed via a single-threaded re-run of every affected
spec file: **137/137 pass.** Full baseline is clean.

### Baseline screenshots

Captured at all 6 required widths
(`docs/artifacts/premium-redesign-baseline-2026-07-29/`) — zero
horizontal overflow, zero console/page errors at any width. Also
captured dedicated hero crops at 1440px and 390px for direct before/
after comparison in Phase 4.

### Documented visual weaknesses (this is the redesign's actual brief)

- **Hero**: real photo already in use, but flat — a plain rounded-corner
  rectangle with no perspective, layering, or directional shadow. No
  supporting proof card next to it.
- **Flat, repetitive section rhythm**: `WhyChooseGreenCal`,
  `SafetySection`, `ProcessSteps` are three consecutive "card grid on a
  solid background" sections in a row with almost no compositional
  variety between them (documented as a P3 observation in the prior
  Master Audit; this redesign directly addresses it).
- **Weak CTA emphasis beyond the hero**: `FinalCta` and `CommercialSection`
  both work, but nothing on the page currently uses elevation/depth to
  make a CTA panel feel like the premium, dominant moment the brief
  wants.
- **Service cards are flat, uniform rectangles** (`PremiumServiceCard`,
  `CommercialPropertyCard`, `HOAServiceCard`) — no dimensional framing,
  no overlap, no perspective.
- **Real Results section is functionally strong but visually flat**: the
  slider works well (confirmed in the prior Master Audit), but the
  cards themselves are plain rounded rectangles with a flat shadow —
  no layered/overlapping presentation.
- **Reviews section** (just redesigned in the prior pass into one clean
  honest panel) is correct but visually modest — no dimensional
  treatment, appropriate given it's mostly a "not yet connected" state,
  but worth a light elevation treatment consistent with the new system.
- **No persistent estimate access while scrolling on desktop.** A
  visitor scrolled past the hero on a desktop viewport has no CTA
  visible again until they reach whichever section they've scrolled to
  — they must scroll significantly or use the sticky header nav's
  "Request a Quote" button (present, but easy to miss, not a dedicated
  floating conversion element). This is the clearest, most concrete gap
  the brief asks to close.
- **Mobile bar exists and works** (confirmed in the prior Master Audit's
  QA pass) but lacks safe-area-bottom handling (Phase 1 finding).

### Vercel project/deployment configuration (inspected via MCP, not assumed)

- Project: `ai-company-os-greencal-website`
  (`prj_J1ubVL1ywyYxGdAA20NgI5IxVAcA`), team `leads-initiative`,
  framework auto-detected as `astro`.
- **Latest deployment**: `dpl_55okDFf8M5Hv4PBQkGHSUjmC4HkH`, `READY`,
  `target: null` (Preview) — confirms the project's git integration is
  live and healthy going into this redesign.
- **Production domains** (`www.greencalpressurewashing.com`,
  `greencalpressurewashing.com`, and the bare `.vercel.app`/`git-main`
  aliases) are attached at the project level but only resolve to true
  Production deployments (built from `main`) — pushing to this feature
  branch cannot and will not affect them.
- No deployment-protection setting was found blocking ordinary preview
  review (the prior workflow's Preview URL was reachable without
  authentication, confirmed via a direct unauthenticated `curl`).

## Gate 2 — Baseline Complete ✅

- Baseline screenshots exist at all 6 required widths, zero overflow,
  zero console errors.
- Engineering checks documented and clean.
- Current visual weaknesses recorded above — these are the concrete
  target list for Phases 3–8.
- Current estimate-access limitation (no persistent desktop CTA)
  documented.
- Vercel preview configuration understood and confirmed healthy.

Proceeding to Phase 3 (Design-System Upgrade).

## Phase 4 — Hero Redesign

**Implemented** (`src/components/homepage/Hero.astro`):

- The main hero image now sits inside a dimensional frame:
  `--shadow-elevation-3` (a real directional shadow, offset down-right)
  plus a subtle `--depth-tilt-primary` perspective rotation, applied
  only at `>= 900px` and removed entirely under
  `prefers-reduced-motion: reduce`.
- A new floating **proof card** overlaps the image's bottom-left corner
  (counter-tilted via `--depth-tilt-secondary`, `--shadow-elevation-2`),
  showing the real `roof-wash-01-before`/`-after` square pair — the same
  authentic photos the Real Results section uses, not a new asset — with
  small BEFORE/AFTER tags and a "Roof Washing - Concrete Tile" caption.
  Hidden below 900px by design (a shrunk version would violate the
  brief's "no tiny proof cards" rule), so mobile gets the plain,
  still-premium-via-shadow flat image instead.
- Headline gets a soft `text-shadow` for additional depth at no
  motion/layout cost.
- Structure, copy, and CTA hrefs are otherwise unchanged — the existing
  estimate/phone CTAs, trust-indicator list, and mobile-first stacking
  breakpoint (900px) are preserved exactly.

**Investigated and ruled out a false alarm**: an element-screenshot of
the full `.hero` section at 390×900 initially appeared to show the
mobile sticky bar overlapping the hero's "Get a Free Estimate" button.
Investigated directly with real viewport bounding-box checks (390×844,
a real phone height) rather than trusting the screenshot: on initial
load the button sits below the fold entirely (not visible, not
covered); after a natural `scrollIntoViewIfNeeded` (matching real
scroll behavior), the button lands at `y:390`, far clear of the bar's
fixed `y:784–844` footprint. **No real overlap exists** — the original
screenshot was an artifact of Playwright's element-screenshot method
stitching a section taller than the viewport, not a representative
single-frame capture. Confirmed via a corrected screenshot
(`mobile-cta-scrolled-into-view.png`).

Verified: `astro check` (0 errors), no horizontal overflow or console
errors at 390/768/1024/1440px, real photo undistorted and correctly
tilted/framed at desktop widths, mobile renders the simplified
(no-tilt, no-proof-card) version as intended.

## Gate 4 — Hero Approved Internally ✅

- Visibly stronger than baseline (compare
  `docs/artifacts/premium-redesign-baseline-2026-07-29/hero-1440.png`
  against the new dimensional version) — real directional shadow,
  perspective tilt, and a layered authentic proof card.
- Roof washing remains immediately, unambiguously the primary visual
  focus.
- CTAs remain exactly as prominent as before (unchanged markup/styling
  for the buttons themselves).
- Desktop feels intentionally dimensional; mobile feels intentionally
  simplified (not a compressed desktop layout).
- Real imagery remains authentic, undistorted, and unedited — the two
  proof-card thumbnails are the same unmodified derivatives already
  used elsewhere on the page.
- Sticky mobile bar does not interfere with hero CTAs — verified
  directly, not assumed, after catching and correctly diagnosing a
  screenshot-method false alarm.

Proceeding to Phase 5 (Customer Pathways and Service Presentation).

## Phase 5 — Customer Pathways and Service Presentation

**Implemented**:

- **Commercial section given real dark contrast**
  (`CommercialSection.astro`): background changed from `cream-50` to
  `forest-900`, matching `WhyChooseGreenCal`'s existing dark treatment —
  gives Commercial genuine visual distinction from the light Residential
  section above and light HOA section below, instead of three
  same-toned sections in a row. Text/heading colors adjusted for the
  new dark background. **Real bug caught and fixed while doing this**:
  the CTA row originally used `btn-primary` (solid forest-700) which
  would have nearly blended into the new forest-900 background — swapped
  to `btn-secondary` (white, pops against dark) for the primary action
  and `btn-inverse` (the design system's own dark-background variant)
  for the call action. No new button variant was introduced — this
  reuses the existing 3-variant system exactly as documented.
- **Hover/elevation treatment added or upgraded** across every pathway
  card (`CustomerSegmentCard`, `CommercialPropertyCard`, `HOAServiceCard`,
  `PremiumServiceCard`) to consistently use the new elevation tokens
  (`--shadow-elevation-1/2/3`, `--depth-lift-hover-sm`) instead of a mix
  of literal shadow values and hardcoded `translateY` offsets.
  `CustomerSegmentCard` — the homepage's primary "which pathway am I"
  decision point — previously had **no hover treatment at all**; this
  was the most consequential single fix in this phase.
- All `prefers-reduced-motion` guards added/confirmed alongside each new
  transition.

**Not changed**: card copy, structure, CTA destinations, and the
Commercial/HOA honest "Commercial Project Media Coming Soon" placeholder
treatment — no fabricated capability or photo was introduced; the
placeholder itself just now sits inside a more premium-feeling
container.

Verified: `astro check` (0 errors), screenshots at 1440px show clear
visual distinction between Residential (light) → Commercial (dark) →
HOA (light) instead of a repetitive light-on-light sequence; CTA
buttons read clearly against the new dark background.

## Gate 5 — Service Presentation Complete ✅

- Category pathways are visually distinct (light/dark/light rhythm,
  not three identical card grids).
- Imagery presentation is consistent with the new elevation system;
  no fabricated commercial/HOA photos were added (still asset-blocked,
  unchanged from the Master Completion Workflow's findings).
- Commercial and HOA sections remain easy to scan — no structural
  changes, only visual-weight and contrast changes.
- Conversion actions remain clear and functional (verified the
  button-variant swap didn't change any `href`).
- Persistent estimate access is not yet built (Phase 8) — nothing in
  this phase blocks it.

Proceeding to Phase 6 (Real Results and Before/After Redesign).

## Phase 6 — Real Results and Before/After Redesign

**Implemented** (`BeforeAfter.astro`, `BeforeAfterSlider.astro`):

- Added an "Authentic Project Proof" eyebrow above the "Real Results"
  heading (gold-700, matches the hero's typographic language) for a
  more premium, intentional section opener.
- The **featured roof-washing project** (the brief's explicit "primary
  visual focus" for this section) now carries `--shadow-elevation-3`
  at rest — the strongest directional shadow on the page outside the
  hero — so it reads as the section's biggest visual moment immediately,
  not only on hover.
- Supporting cards (House Washing, Concrete Cleaning) upgraded from
  `--shadow-md` to `--shadow-elevation-2`, plus a new hover/focus lift
  (`--depth-lift-hover-sm` + elevation bump) on all three cards.
- **Deliberately did not add perspective/tilt** to any of the three
  slider cards: this is a drag-driven interactive comparison control,
  and a rotated container risks making the horizontal drag gesture feel
  mismatched with the visual tilt — the directional elevation shadow
  alone already communicates "dimensional" without that usability risk.
  This is a direct application of the Priority Order (usability > visual
  transformation).
- No change to the underlying photos, labels, or slider mechanism — all
  3 real before/after pairs are unchanged and unedited.

Verified: `astro check` (0 errors); screenshots at 1440px and 390px
confirm the slider still functions correctly, BEFORE/AFTER labels
remain legible, and the featured project now visually dominates the
section as intended.

## Gate 6 — Proof Section Complete ✅

- Before/after proof is visually dominant (the featured roof-washing
  transformation, in particular, now carries real visual weight).
- Real project results remain easy to understand — no layout or
  interaction change to the comparison mechanism itself.
- Mobile comparison remains fully usable (unchanged interaction code).
- No fake or misleading imagery introduced — same 3 real, unedited pairs.
- No sticky control exists yet that could block the comparison handles
  or labels (Phase 8 will need to re-verify this once the desktop
  floating CTA exists).

Proceeding to Phase 7 (Reviews and Trust).

## Phase 7 — Reviews and Trust

**Context**: the prior Master Completion Workflow already redesigned
this section (2026-07-29, earlier the same day) from 3 placeholder-
labeled review cards down to one consolidated, honest "not yet
connected" panel — because **no real, verified customer reviews exist**.
The brief's suggested "one featured review card, two supporting cards"
structure assumes real review content to feature; fabricating that
structure around placeholder content would directly violate this
workflow's own guardrail ("do not invent reviews... customer names") and
Priority Order #1 (verified information over visual transformation).

**Implemented**: upgraded the existing honest panel's elevation from
`--shadow-sm` to `--shadow-elevation-2`, matching the dimensional weight
of every other "featured panel" element introduced this workflow. No
content, structure, or wording changed — it was already correct.

**Not implemented, deliberately**: featured/supporting review card
layout, star-rating treatment upgrades, reviewer-name hierarchy — all of
these require real review content to apply to. Tracked as a real,
owner-gated follow-up in `docs/GREENCAL_PUBLIC_WEBSITE_REMAINING_ASSETS.md`
already.

Verified: `astro check` (0 errors).

## Gate 7 — Trust Section Complete ✅

- Reviews section is presented as credibly and intentionally as its
  actual content allows — no unsupported claims, no fabricated names,
  counts, or ratings were introduced at any point.
- Typography/readability unchanged (already good).
- The section's honest state now carries dimensional weight consistent
  with the rest of the redesign, rather than looking like a lower-effort
  leftover.
- Persistent CTA placement (Phase 8) has not been built yet, so no
  competition with this section exists yet to check.

Proceeding to Phase 8 (Final CTA and Persistent Estimate Access).

## Phase 8 — Final CTA and Persistent Estimate Access

**Final CTA** (`FinalCta.astro`): added a real GreenCal photo
(`concrete-cleaning-01-after.webp`, already used elsewhere — no new
asset) layered behind the existing dark gradient at 95–97% overlay
opacity, so it reads as a subtle sense of real depth without changing
text contrast in any meaningfully measurable way. Heading gets the same
soft `text-shadow` treatment as the hero. No structural/copy/CTA change.

**Persistent desktop estimate CTA** — new component
`PersistentEstimateCta.astro`, mounted once in `index.astro` right
after `<Hero />` (homepage-only — its hide-logic target, `#final-cta`,
only exists on this page):

- Fixed bottom-right, call icon-link (`id="sticky-call-cta"`) + "Get a
  Free Estimate" button (`id="sticky-estimate-cta"`), both reusing the
  site's single existing destinations (`tel:+16573198550`,
  `/contact-us#quote-form`) — **no second form was created.**
- Shown via two `IntersectionObserver`s: appears once the visitor
  scrolls fully past `.hero`; hides again once `#final-cta` enters view.
  Verified directly (not assumed) via `inert` attribute checks at 3
  scroll positions: present (hidden) at the top, absent (visible) mid-
  page, present again at the final CTA.
- **Real accessibility bug caught and fixed during implementation**: the
  first version toggled only `aria-hidden` + `opacity`/`pointer-events`
  for the hidden state — this leaves the two links keyboard-focusable
  even while invisible (`aria-hidden` doesn't remove tab-order
  participation), which would have let a keyboard user tab into an
  unusable, invisible control. Fixed by toggling the `inert` attribute
  instead, which correctly removes hidden content from both the
  accessibility tree and the tab order in one step.
- Desktop-only via `min-width: 769px` — the exact complement of
  `MobileConversionBar`'s existing `max-width: 768px` — so the two
  controls never render at the same viewport width and cannot visually
  collide by construction, not by luck.
- `transform`/`opacity`-only entrance/exit transition,
  `--shadow-elevation-4`, reuses the existing `.btn-primary` visual
  language (not a new/unfamiliar style), `prefers-reduced-motion`
  removes the transition entirely.
- Verified via Playwright: correct hrefs, keyboard-focusable while
  visible (`toBeFocused()`), visually does not overlap the Real Results
  slider or its labels at the scroll position checked.

**Mobile sticky bar**: safe-area fix already completed in Phase 3
(no additional Phase 8 work needed — it already has both required
actions).

Verified: `astro check` (0 errors).

## Gate 8 — Final CTA and Persistent Access Complete ✅

- Final CTA carries real conversion energy plus a tasteful photo-backed
  depth treatment — not a plain white form block.
- Actions are immediately clear (unchanged CTA copy/hrefs).
- Visitors can access the estimate flow from any meaningful scroll
  position on desktop (new floating CTA) and on mobile (existing bar).
- Desktop and mobile treatments are both responsive and mutually
  exclusive by breakpoint.
- Sticky controls do not obscure important content at the scroll
  positions checked so far (full 6-width/route sweep is Phase 10).
- Estimate and phone destinations verified correct.
- Keyboard interaction verified; touch/mobile-bar full QA is Phase 10.
- No duplicate estimate workflow exists.
- Design remains restrained — one subtle background photo, one
  transform/opacity transition, no pulsing, no loud motion.

Proceeding to Phase 9 (Motion, Accessibility, and Performance).

## Phase 9 — Motion, Accessibility, and Performance

Verified directly via Playwright (not assumed):

- **Reduced motion**: with `prefers-reduced-motion: reduce` emulated,
  `.hero-media`'s computed `transform` is `none` (the tilt is fully
  removed, not just slowed), and `#persistent-estimate-cta`'s computed
  transition duration collapses to ~0 (the global `global.css` rule
  correctly reaches the new component).
- **No horizontal overflow, no console/page errors, zero images missing
  `alt`** at 390/1024/1440px after scrolling through the full page
  (exercises every new element: hero proof card, dark Commercial
  section, Real Results elevation changes, persistent CTA, photo-backed
  final CTA).
- **Final CTA contrast**: the new background photo sits behind a
  95–97%-opaque gradient overlay (confirmed via computed style, not
  assumed) — at that opacity the rendered color is effectively
  identical to the pre-redesign pure-gradient version, which was already
  directly contrast-tested in the prior Master Completion Workflow
  (white text at 8.46–10.92:1 against forest-700/900).
- **Keyboard/focus**: verified in Phase 8 (persistent CTA reachable and
  focusable only while visible, via `inert`).
- **Performance**: zero new dependencies; the only new JavaScript is one
  small vanilla `IntersectionObserver` script (no framework, no
  polling, no scroll-event listener) — this is lighter-weight than a
  scroll-listener-based approach would have been.

## Gate 9 — Accessibility and Performance Passed ✅

- Motion degrades cleanly under `prefers-reduced-motion`.
- No accessibility regression found — the one real gap identified
  during implementation (persistent CTA's keyboard-focusability while
  hidden) was fixed in Phase 8, not just noted.
- No material layout shift; no overflow at any width checked.
- Fixed CTAs do not obstruct content at the positions checked (full
  cross-route sweep is Phase 10).
- Mobile safe-area handling verified in Phase 3.

Proceeding to Phase 10 (Full Playwright QA).

## Phase 10 — Full Playwright QA

Full sweep at all 6 required widths (390/430/768/1024/1280/1440),
capturing final full-page screenshots to
`docs/artifacts/premium-redesign-final-2026-07-29/` for direct
comparison against the Phase 2 baseline set.

**Results**: zero horizontal overflow, zero console/page errors at any
of the 6 widths. `desktopCtaDisplay`/`mobileBarDisplay` confirmed
mutually exclusive at every width (`none`/`flex` flip exactly at the
769px boundary, matching the two components' complementary media
queries) — the two controls cannot coexist by construction.

**A real, confirmed bug was found and fixed during this phase** (not
merely documented — this is exactly the kind of regression this gate
exists to catch): the persistent desktop CTA's original
`IntersectionObserver`-based hide-logic reappeared once a visitor
scrolled **past** `#final-cta` into the footer. Root cause: an
`IntersectionObserver` only fires callbacks on threshold _crossings_ —
a fast or instant scroll (`scrollIntoViewIfNeeded`, or a real user
flicking the page quickly) can move `#final-cta` from "below the
viewport" to "above the viewport" between two observer callbacks
without the browser ever registering the intermediate "intersecting"
state, so the hide-condition's flag silently never updated. Confirmed
directly via computed style (`opacity: 0.92`, `inert: false` while the
footer was fully in view) before fixing. **Fix**: replaced both
`IntersectionObserver`s with a single `requestAnimationFrame`-throttled
`scroll`/`resize` listener that recomputes each element's
`getBoundingClientRect()` fresh on every call — this cannot miss a
jump, since it doesn't depend on catching a transition event, only on
reading the current, actual position. Re-verified after the fix:
`inert: true, opacity: "0", pointerEvents: "none"` at the footer;
`opacity: ~0.98` (visible) mid-page; zero geometric overlap with the
Real Results slider handle when both are genuinely on-screen
simultaneously (confirmed via bounding-box intersection math, not
assumption).

**Additional checks performed**: mobile hamburger menu dropdown
(112–611px) does not overlap the mobile action bar (784–844px) at
390×844.

Verified: `astro check` (0 errors) after the fix.

## Gate 10 — QA Passed ✅

- All 6 layouts verified with real screenshots, directly comparable to
  the Phase 2 baseline set.
- Visual improvement is clearly visible: dimensional hero, a genuine
  light/dark/light section rhythm (Residential → Commercial → HOA)
  replacing three same-toned sections, elevated proof section, and a
  photo-backed final CTA.
- No broken interactions remain — the one real interaction bug found
  (persistent CTA reappearing at the footer) was fixed and re-verified,
  not just noted.
- No overflow or console errors at any width.
- Mobile design remains intentional (unchanged bar, safe-area-aware).
- Persistent estimate controls verified working correctly at all
  required widths, including the corrected footer behavior.
- Sticky controls do not obscure the footer, the mobile menu, or the
  Real Results slider.

Proceeding to Phase 11 (Engineering Verification).

## Phase 11 — Engineering Verification

- `typecheck`: 0 errors, 0 warnings (102 files).
- `lint`: 0 errors, 1 pre-existing unrelated warning.
- `build`: clean, static + Vercel function packaging both complete.
- `test`: parallel run showed 6 failures, this time with a new error
  signature (`net::ERR_INSUFFICIENT_RESOURCES`) rather than the earlier
  worker-crash/timeout pattern — confirmed no leftover zombie Chromium
  processes this time (checked directly via `tasklist`), so this was
  transient resource pressure during the parallel run itself. Re-ran the
  3 affected spec files single-threaded: **98/98 pass.** Combined with
  the untouched 249 that passed in the parallel run, this is 255/255
  confirmed passing overall — no real regression, no safeguard weakened
  to force a pass.

## Gate 11 — Engineering Passed ✅

- All required commands succeed.
- No material runtime issue remains.
- Implementation matches this document.
- The persistent-CTA logic (rewritten in Phase 10 to fix the footer-
  overlap bug) produces zero console/hydration errors, confirmed
  directly across all 6 widths in Phase 10's sweep.

Proceeding to Phase 12 (Public Preview Recovery and Verification).
