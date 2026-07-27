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
    (Residential / Commercial / Multi-Family & HOA), each with an icon
    placeholder, a short capability list, and a "Learn More" +
    category-specific CTA. Equal visual weight across all three.

11. **Residential Services**: three primary service cards (Roof
    Cleaning, House Washing, Concrete Cleaning) at full card size, above
    a single "View All Residential Services" link. No secondary/
    window/gutter/solar cards exist — those are unapproved services
    (see owner-verification doc), not a design omission.

12. **Commercial Services — property-type layer**: cards framed around
    served property _categories_ (gas stations, shopping centers,
    storefronts, warehouses, restaurants, offices, other commercial),
    not as separate services — this is a deliberate tiering decision to
    avoid a second full card grid of the same 7 services (see design
    risk in the refinement plan). Model as the primary visual layer.

13. **Commercial Services — capability list layer**: the actual 7
    approved commercial services rendered as a compact text-pill list
    beneath the property-type cards, plus a "Request a Commercial Site
    Assessment" and "Call" action pair.

14. **Multi-Family & HOA section**: four cards — the 2 approved
    services (Apartment/Condo Cleaning, HOA Pressure Washing) plus 2
    supporting cards (e.g. recurring community maintenance framing) —
    reusing the same card visual language as Residential/Commercial for
    consistency.

15. **Real Results (before/after) — default state**: a 50/50 split
    slider for each of 3 project categories (Roof Washing, Residential
    Concrete, Commercial Flatwork), each with a one-line caption (e.g.
    "Concrete Tile Roof Cleaning, Irvine, California — organic buildup
    removed using a surface-appropriate low-pressure cleaning
    process."). All three currently render the placeholder-photo
    treatment.

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
    number), (b) an individual review card, clearly and visibly marked
    as a development placeholder (not styled to look like a real
    review), (c) the eventual real-review state once verified reviews
    exist. All three must be visually distinguishable from each other in
    the Figma file.

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
    single source-of-truth values from `src/data/site.ts`.

22. **Service Area section**: three county groups (San Diego, Orange,
    Riverside), each showing five curated, individually-approved cities
    as plain text (not links — per ADR-0007, individual city pages stay
    noindex/draft), plus a link to the full service-area list page. No
    San Bernardino or Los Angeles County content appears anywhere.

23. **Final CTA**: full-width dark band, headline + subhead + three
    actions (Request Residential Estimate / Request Commercial
    Assessment / Call). Same visual family as Why Choose GreenCal's dark
    section for section-rhythm consistency.

24. **Typography hierarchy**: serif display face for H1/H2 only; system
    sans for everything else, including all card headings (H3) and body
    copy. Minimum 16px body text everywhere — no exceptions. See
    `docs/GREENCAL_DESIGN_TOKEN_SPEC.md` §2 for exact scale values and
    the hero/section-heading fluid-clamp ranges.

25. **Spacing system**: an 8px-based scale from 4px to 96px; `space-7`
    (72px) is the primary vertical rhythm between homepage sections —
    keep this consistent across every section frame rather than
    eyeballing gaps per section.

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
