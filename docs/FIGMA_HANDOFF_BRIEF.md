# GreenCal Figma Handoff Brief

This document tells a designer exactly what to model in Figma, using the
current `apps/greencal-website` homepage (branch
`feat/greencal-premium-homepage`) as the functional reference. It is not
itself a design file — it is the bridge between the working frontend and
the eventual Figma design system. See also
`docs/GREENCAL_DESIGN_TOKEN_SPEC.md` for the token-level detail and
`docs/GREENCAL_OWNER_VERIFICATION_REQUIRED.md` for every claim/asset that
is intentionally absent pending owner input.

1. **Section order (homepage, top to bottom)**: Utility Bar → Header/Nav
   → Hero → Trust Indicator Strip → Customer Segment ("Who We Serve") →
   Residential Services → Commercial Services → Multi-Family & HOA →
   Real Results (before/after) → Why Choose GreenCal → Cleaning Methods
   Matter (safety/education) → Our Process → Customer Reviews → Service
   Areas → Final CTA → Footer → Mobile Sticky Conversion Bar (mobile
   only, overlays nothing — see §20).

2. **Frame requirements per breakpoint**: build full-page frames at
   1440px, 1280px, 1024px, 768px, 430px, 390px, and 375px — these are
   the exact widths this phase verified for horizontal-overflow and
   layout correctness. 1024px is the nav-breakpoint boundary (§4) and
   deserves its own frame even though visually close to 1280px.

3. **Utility Bar**: single-row strip above the header. Desktop: "Serving
   Southern California — Residential, Commercial & HOA Exterior
   Cleaning" message (left) + Call/Request Estimate links (right).
   Below 640px, the message text is dropped and only the two action
   links remain — model both states.

4. **Header/nav states — desktop (≥1024px)**: wordmark, inline nav
   (Home, Residential▾, Commercial▾, Multi-Family & HOA▾, Reviews,
   Service Areas, Contact), phone number, "Request a Quote" button, all
   in one row. Sticky on scroll (add a subtle elevation/shadow state for
   "scrolled" vs. "top of page").

5. **Header/nav states — mobile (<1024px), closed**: wordmark + a
   hamburger "Menu" toggle button only. Nav links, phone, and CTA are
   not visible until opened.

6. **Header/nav states — mobile, open**: toggle opens a dropdown panel
   directly below the header containing the full nav list (stacked
   vertically), phone number, and CTA button. Cap the panel's height
   with internal scrolling so it never exceeds the viewport on short
   phones (verified against `--header-height` + `--utility-bar-height`).

7. **Nav dropdown (Residential/Commercial/Multi-Family & HOA)**: each
   reveals an "All {Category} Services" link plus its individual service
   links. Model both closed and open states for at least one dropdown.

8. **Hero variants**: one primary variant (eyebrow + serif H1 + subhead
   - Call Now / Get Estimate actions + a media panel on desktop, stacked
     below the copy on mobile). The media panel currently renders the
     honest placeholder treatment (§18) — Figma should show both the
     placeholder state and a "with real photo" state so the owner can
     compare.

9. **Trust Indicator Strip**: five compact items in a single row on
   desktop, wrapping to a grid on mobile. Only claims already supported
   by existing approved copy are shown — no equipment/water-reclamation
   claims (see owner-verification doc).

10. **Customer Segment cards ("Who We Serve")**: three cards
    (Residential / Commercial / Multi-Family & HOA), each with a
    labeled media placeholder, a short capability list, and a
    "Learn More" + category-specific CTA. **Phase 2 fix**: these must be
    modeled as a fixed 3-column grid at ≥1024px (2 columns at
    640–1023px, 1 column below that) — the original `auto-fit` CSS
    approach produced a 2-then-1 wrap (Multi-Family & HOA alone below
    the other two) at common desktop widths; a fixed-column grid removes
    that ambiguity. All three keep equal visual weight/height.

11. **Residential Services**: three **featured/primary** service cards
    (Roof Cleaning, House Washing, Concrete Cleaning) — Phase 2 enlarges
    these specifically: a 3:2 media ratio (vs. the 4:3 used elsewhere),
    larger heading (28px) and body copy (20px), and **two** CTAs per
    card ("Learn More" + "Request Estimate"), above a single "View All
    Residential Services" link. No secondary/window/gutter/solar cards
    exist — those are unapproved services (see owner-verification doc),
    not a design omission.

12. **Commercial Services — property-type layer**: cards framed around
    served property _categories_ (gas stations, shopping centers,
    storefronts, warehouses, restaurants, recurring maintenance), not as
    separate services — a deliberate tiering decision to avoid a second
    full card grid of the same 7 services. **Phase 2**: capped at a
    fixed 3-column grid at ≥1024px (fewer, larger blocks instead of
    `auto-fit`'s up-to-5-6-per-row on very wide screens) — model as the
    primary visual layer. Apartment/HOA property types are deliberately
    **not** duplicated here — they stay exclusively in the Multi-Family
    & HOA section (§14) to avoid presenting the same customer segment
    under two different sections.

13. **Commercial Services — capability list layer**: the actual 7
    approved commercial services rendered as a compact text-pill list
    beneath the property-type cards, plus a "Request a Commercial Site
    Assessment" and "Call" action pair.

14. **Multi-Family & HOA section**: four cards — the 2 approved
    services (Apartment/Condo Cleaning, HOA Pressure Washing) plus 2
    supporting cards (recurring community maintenance framing,
    HOA-board-coordinated common areas). **Phase 2 redesign**: at
    ≥640px each card uses a **horizontal, image-led layout** (a ~42%-
    width media column beside the text body) instead of the stacked
    card pattern used in Residential/Commercial — deliberate layout
    variety, so this section reads as a distinct, major business
    division rather than a smaller add-on grid. Fixed at a maximum of
    2 columns (not 4) so each card is large. Service-example bullets
    expanded to cover sidewalks, breezeways, pool decks (concrete
    surface only), building exteriors, dumpster areas, entrances,
    clubhouses, and common areas.

15. **Real Results (before/after)**: **Phase 2 recomposition** — one
    large **featured** project (full grid width, 16:9 frame, larger
    caption type, a "View Similar Projects" link to the matching real
    service page) plus **two smaller supporting** project cards in a
    fixed two-column row below it. The featured project is the Concrete
    Tile Roof Cleaning / Irvine example ("Concrete Tile Roof Cleaning,
    Irvine, California — organic buildup removed using a
    surface-appropriate low-pressure cleaning process."); the two
    supporting cards are Residential Concrete Cleaning and Commercial
    Flatwork Cleaning. All three currently render the placeholder-photo
    treatment. No "project detail" page exists or was created — the
    featured project's CTA links to the real `/services/roof-cleaning`
    page, not a fabricated case-study page.

16. **Real Results — dragged states**: model the slider handle at
    ~25%/75% positions to show the reveal interaction, plus a
    keyboard-focus state on the handle (native range input focus ring —
    do not design a custom control that loses this).

17. **Why Choose GreenCal**: dark (forest-900) full-bleed section, four
    primary benefit blocks in a grid, plus a secondary capability list
    below a hairline divider. "Commercial-Grade Equipment" is
    intentionally absent — no evidence for that claim exists yet (owner-
    verification doc).

18. **Media/placeholder states**: every image slot in this phase has
    zero real photos behind it. Design the honest placeholder treatment
    itself (icon + label, on both light and dark backgrounds) as a
    first-class Figma component — not a temporary gray box — since it
    will remain visible in Preview until real photography exists. Also
    design the "real photo" replacement state for each slot type (hero,
    card thumbnail, before/after pair) so swapping in real assets later
    doesn't require new layout work.

19. **Review states**: (a) the summary block (aggregate rating/count —
    currently an honest "reviews coming soon" state, not a fabricated
    number, plus a disabled "View All Reviews" button and a "Google
    Business Profile: not yet connected" note — both rendered
    **visibly disabled**, never as dead/live-looking links), (b) an
    individual review card — **Phase 2** adds a visible Google-source
    badge (small "G" mark + "Google (placeholder)" text), a star row,
    larger review body text (20px), and city/service/date meta, clearly
    and visibly marked as a development placeholder (not styled to look
    like a real review), (c) the eventual real-review state once
    verified reviews exist. All three must be visually distinguishable
    from each other in the Figma file.

20. **Mobile Sticky Conversion Bar**: fixed to the viewport bottom below
    768px only, containing Call Now / Get Estimate, each with a minimum
    44×44px tap target. Must never visually overlap the footer or the
    quote form's submit button — the page reserves bottom padding equal
    to the bar's height specifically to prevent this; verify this in the
    footer frame (§21) at 375–430px.

21. **Footer structure**: four columns — Company, Residential Services,
    Commercial & HOA, Contact — plus a bottom row with copyright and the
    existing tracking-preferences control. No street address is shown
    (NAP unresolved, see owner-verification doc); phone/email use the
    single source-of-truth values from `src/data/site.ts`. **Phase 2**:
    the footer's base text size increased from 15px to 16px (it was
    inheriting a smaller sitewide default), the wordmark/logo renders at
    a larger `size="large"` variant here specifically, column/line
    spacing increased, and the Company column gained direct "Real
    Results" and "Get a Free Estimate" links so the estimate CTA and
    project-proof content are easy to find from the footer, not just the
    header.

22. **Service Area section**: three county groups (San Diego, Orange,
    Riverside), each showing five curated, individually-approved cities
    as plain text (not links — per ADR-0007, individual city pages stay
    noindex/draft), plus a link to the full service-area list page. No
    San Bernardino or Los Angeles County content appears anywhere.
    **Phase 2**: heading changed to "Proudly Serving Moreno Valley &
    Beyond" and the intro line leads with "Serving Moreno Valley and
    approved communities across San Diego, Orange, and Riverside
    Counties" — stronger local positioning for the real, approved
    Moreno Valley city, which is also visually emphasized (bold,
    forest-green) wherever it's listed. This is **not** the "BASED IN
    MORENO VALLEY, SERVING SOUTHERN CALIFORNIA" heading some drafts of
    this brief requested — "serving Southern California" contradicts
    `BUSINESS_FACTS.md`'s explicit three-county-only claim, and "based
    in" reads as an unresolved business-address/HQ claim. See
    `docs/GREENCAL_OWNER_VERIFICATION_REQUIRED.md`.

23. **Final CTA**: full-width dark band, headline + subhead + three
    actions (Request Residential Estimate / Request Commercial
    Assessment / Call). Same visual family as Why Choose GreenCal's dark
    section for section-rhythm consistency.

24. **Typography hierarchy**: serif display face for H1/H2 only; system
    sans for everything else, including all card headings (H3) and body
    copy. Minimum 16px body text everywhere — no exceptions. **Phase 2**
    raised the small-text floor further (13px→14px, 14px→15px) and added
    a dedicated 17px nav-link size (separate from 16px body copy) — see
    `docs/GREENCAL_DESIGN_TOKEN_SPEC.md` §2 for exact scale values and
    the hero/section-heading fluid-clamp ranges.

25. **Spacing system**: an 8px-based scale from 4px to 96px; `space-7`
    (**88px as of Phase 2**, was 72px) is the primary vertical rhythm
    between homepage sections — keep this consistent across every
    section frame rather than eyeballing gaps per section. Several
    cards' internal padding also moved up one step on this scale this
    phase (24px → 32px) for better breathing room.

26. **Color-token mapping**: see `docs/GREENCAL_DESIGN_TOKEN_SPEC.md` §1
    for the full table (forest green / warm ivory-cream / charcoal /
    muted gold-bronze / white). Explicitly excluded: neon/lime green,
    bright SaaS blue, harsh pure black, decorative gradients beyond the
    single dark hero overlay.

27. **Button / form / focus / loading / empty states**: primary button
    (solid forest-700, white text), secondary button (outline), both at
    a 44px minimum height/tap target. Every interactive element needs an
    explicit focus-visible state (3px forest-700 outline, 2px offset —
    never removed). Form fields need default/focused/error/disabled
    states (see the existing quote form for the already-implemented
    accessible-validation pattern — reuse its visual language rather
    than inventing a new one). "Loading" state: the quote form's submit
    button already has a duplicate-submission guard — model its
    disabled/in-flight appearance. "Empty" state: every placeholder
    treatment in §18 and the review states in §19 are this site's empty
    states — design them deliberately, not as an afterthought.

28. **Owner-verification and accessibility/responsive notes**: cross-
    reference every card, claim, and location named in this brief
    against `docs/GREENCAL_OWNER_VERIFICATION_REQUIRED.md` before adding
    it to the Figma file as if it were approved content — several items
    requested in earlier drafts of this brief (extra service categories,
    "water reclamation" claims, San Bernardino/LA County, a business
    street address, an incorrect contact email) are **not** on the live
    site and must not be reintroduced via the Figma file. Accessibility
    notes to preserve in every frame: one `<h1>` per page, a visible
    skip-link, semantic landmarks (header/main/footer), no interactive
    element smaller than 44×44px on touch, and no interaction (e.g. the
    before/after slider) that requires a mouse.

## Phase 2 visual-cleanup pass (2026-07-26) — summary of changes

The items above have each been updated in place with their Phase 2
change (search "Phase 2" for every touch point). In addition to those:

- **Real, confirmed bug fixed this phase**: the mobile hamburger menu
  had no bug this time, but the Customer Segment grid (§10) and the HOA
  card's horizontal media layout (§14) both had real CSS bugs found via
  direct computed-style inspection (not just visual review) and fixed —
  a fixed-column grid replacing an ambiguous `auto-fit`, and a
  `fill`-mode image replacing a fixed-`aspect-ratio` image that was
  fighting a flex `min-width: auto` default and blowing the media
  column out to nearly double the card's own width. Both are documented
  as reusable lessons in `ImagePlaceholder`/`HOAServiceCard`'s own code
  comments — a fixed-`aspect-ratio` image cannot be resized via an
  external stylesheet override (inline styles always win); use `fill`
  mode instead whenever a photo slot needs to be sized by its container
  rather than by its own ratio.
- **Media placeholders became a real, reusable design element**
  (§18), not just an icon — every placeholder now shows a visible
  category label and "Photo Coming Soon" status text, which is the
  direct fix for this phase's "hero image area still looks like a
  placeholder" and general "image readiness" complaints.
- Every typography/spacing token change is documented in
  `docs/GREENCAL_DESIGN_TOKEN_SPEC.md` §2–3 and §8.
