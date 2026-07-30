# GreenCal Public Website — Remaining Assets

Master Completion Workflow, Phase 10, 2026-07-29. What's still needed
from the owner before further visual/content completion is possible.
This is a workflow-scoped summary — the authoritative, continuously
maintained list (with full history) is
`docs/GREENCAL_OWNER_VERIFICATION_REQUIRED.md`; this document doesn't
replace it.

## Photography

- **Commercial project photos**: zero real photos exist for any of the
  7 approved commercial services (building washing, storefront
  cleaning, concrete cleaning, dumpster pad cleaning, drive-thru
  cleaning, gum/stain removal, recurring exterior cleaning) or the 5
  commercial property types shown on the homepage (gas stations,
  shopping centers, storefronts, warehouses, restaurants). Currently
  renders the honest "Commercial Project Media Coming Soon" placeholder
  everywhere.
- **Multi-family/HOA project photos**: zero real photos exist for
  apartment/condo or HOA common-area work. Same honest placeholder
  treatment.
- **Impact**: two of the site's three customer segments (Commercial,
  Multi-Family & HOA) currently show zero real proof photography, while
  Residential has 3 real before/after pairs in active use. This is the
  single largest remaining visual-completeness gap, and it's asset-
  blocked, not implementation-blocked — the components, placeholder
  handling, and layout are all already built and tested; they just need
  real photos to render.

## Favicon

- Both supplied logo files (`greencal-logo.png.png`,
  `greencal-logo2 .png.png`) are the full illustrated mark with tagline
  text — neither is icon-only or simple enough to read at 16–32px.
- **Needed**: a dedicated square, icon-only export (just the character
  mark, no tagline text) before the favicon can be updated from Astro's
  default.

## Business identity / NAP

- Business address, hours, licensing/insurance/bonding, and "years in
  business" claims: none exist, none published — gated on an explicit
  owner decision to resolve the NAP (name/address/phone) inconsistency
  noted in `.claude/rules/websites.md`.
- Google Business Profile, Facebook, Instagram: no real, verified
  accounts exist. Shown as explicit "not yet published" notes (Phase 5
  consolidated this from 3 lines to 1 in the footer — same facts, less
  visual weight).

## Reviews

- No real, verified customer reviews exist. Phase 5 replaced the 3
  placeholder review cards with one consolidated, honest panel (see
  `docs/GREENCAL_PUBLIC_WEBSITE_IMPLEMENTATION_REPORT.md` item 1) —
  this is a presentation improvement, not a substitute for real reviews.
  **Needed**: a connected, verified Google Business Profile with real
  reviews before this section can show real content.

## Pages that don't exist yet

- **About page**: no owner-verified company bio/history. Not in
  navigation (would otherwise be a broken link).
- **Standalone Projects/portfolio page**: no real project photo library
  large enough to justify one yet — the homepage's Real Results section
  covers this need for now.

## Scope-gated content (requires a new/amended ADR, not just assets)

Unchanged since the last owner-verification pass — see
`docs/GREENCAL_OWNER_VERIFICATION_REQUIRED.md` for full detail: new
residential service categories (window/gutter/solar cleaning), San
Bernardino County, unapproved cities, and any Los Angeles County
reference remain excluded per ADR-0007 and are enforced by
`tests/scope-exclusions.spec.ts`.
