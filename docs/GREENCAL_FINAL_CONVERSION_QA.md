# GreenCal Homepage — Final Conversion QA

Final polish pass, 2026-07-30. Reviews the homepage as a lead-conversion
story and verifies every conversion touchpoint still functions correctly
after this pass's two changes (hero tilt restoration, header logo
sizing) — neither change touched any CTA markup, link, or destination.

## The conversion story, section by section

1. **Service understanding** — Hero headline ("Restore Your Property
   Without Risking Damage") + subhead names all four service lines
   (roof, house, concrete, commercial) in the first screen.
2. **Visual proof** — Hero photo slider (3 real project photos) directly
   beside the headline; a dedicated "Real Results" before-and-after
   section with a large featured drag-slider (roof washing) plus two
   supporting projects, all real GreenCal photos.
3. **Service options** — "Who We Serve" segments into Residential /
   Commercial / Multi-Family & HOA, each with its own examples and its
   own CTA label (Request Estimate / Request Assessment / Request
   Proposal — intentionally different verbs per audience, not a
   hierarchy bug).
4. **Trust** — Trust strip (5 honest, non-fabricated claims), "Why
   Choose GreenCal" section, honest reviews panel (no fake ratings/
   counts — explicitly states Google review integration isn't connected
   yet rather than fabricating one).
5. **Property-type relevance** — Dedicated Commercial and HOA/Multi-
   Family sections with property-type-specific examples (gas stations,
   shopping centers, apartment communities, HOA common areas).
6. **Call or estimate action** — Present at every major scroll stop: hero,
   persistent desktop CTA, mobile action bar, commercial section, HOA
   section, and the closing final CTA.

## CTA verification

| CTA                                                                  | Destination                                        | Status              |
| -------------------------------------------------------------------- | -------------------------------------------------- | ------------------- |
| Hero "Get a Free Estimate"                                           | `/contact-us#quote-form`                           | ✅                  |
| Hero "Call {phone}"                                                  | `tel:+16573198550`                                 | ✅                  |
| Hero "Request a Commercial Assessment"                               | `/contact-us#quote-form`                           | ✅                  |
| Hero slider per-slide "Get a Free Estimate" (×3)                     | `/contact-us#quote-form`                           | ✅                  |
| Desktop sticky CTA — estimate (`#sticky-estimate-cta`)               | `/contact-us#quote-form`                           | ✅                  |
| Desktop sticky CTA — call (`#sticky-call-cta`)                       | `tel:+16573198550`                                 | ✅                  |
| Mobile action bar — Call Now / Get Estimate (`#mobile-estimate-bar`) | phone / estimate                                   | ✅ visible at 390px |
| Customer-segment cards (Residential/Commercial/HOA)                  | `/residential`, `/commercial`, `/multi-family-hoa` | ✅                  |
| Commercial section CTA                                               | `/contact-us#quote-form`, `tel:`                   | ✅                  |
| Before-and-after featured "View Similar Projects"                    | `/services/roof-cleaning`                          | ✅                  |
| Final CTA — Residential / Commercial / Call / Email                  | `/contact-us#quote-form` (×2), `tel:`, `mailto:`   | ✅                  |

All phone links resolve to the single verified number
(`tel:+16573198550`) and all estimate links resolve to the single real
quote-form destination (`/contact-us#quote-form`) — no duplicate or
inconsistent estimate form exists anywhere on the page, confirmed by
`tests/smoke.spec.ts`'s telephone-link and internal-link-validity checks
(all passing — see `GREENCAL_FINAL_PREVIEW_VERIFICATION.md` for the full
test run).

## Desktop sticky CTA (`#sticky-estimate-cta` / `#sticky-call-cta`)

Verified via direct scroll-state simulation:

- **Pre-scroll (within the hero)**: container carries `inert` — hidden,
  not in the tab order, not clickable.
- **Scrolled past the hero, before the final CTA**: `inert` removed,
  `.is-visible` applied — visible and interactive.
- **Scrolled to/past the final CTA section**: `inert` re-applied —
  disappears so it never overlaps the page's own closing CTA.

This is a scroll-geometry check on every scroll/resize event (not
IntersectionObserver), which the component's own code comments document
as a deliberate fix for a prior bug where a fast scroll could skip past
the final CTA between observer callback firings — re-confirmed still
correct in this pass.

## Mobile action bar (`#mobile-estimate-bar`)

Visible at 390px with both required actions (Call Now, Get Estimate),
using the same verified phone number and estimate destination as every
other CTA on the page. Respects safe-area bottom padding per the
dimensional design system (unchanged this pass).

## No duplicate estimate forms

Confirmed: every "estimate" CTA on the homepage points at the same
`/contact-us#quote-form` destination. No second/competing form was
created.

## Impact of this pass's changes on conversion

Neither change altered any CTA, link, destination, or form:

- The hero tilt restoration is a purely visual `transform` on the
  slider's image frame — no markup, link, or interactive behavior
  changed.
- The logo-height change affects only the header brand mark's display
  size — its link (`href="/"`) and label are unchanged.

Both were re-verified against the full conversion checklist above with
no regressions.
