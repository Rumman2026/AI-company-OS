# GreenCal — Owner Verification Required

Everything on this list is **not published anywhere on the site**. Each
item requires an explicit owner decision, real data, or a real asset
before it can go live. This document exists so nothing here gets
silently forgotten or silently fabricated.

## Scope expansions requiring a new/amended ADR before any content can use them

These appeared in the refinement-phase brief but are outside the
current approved scope (`DECISIONS.md` ADR-0007, `BUSINESS_FACTS.md`).
None have been added to navigation, service cards, structured data, or
copy.

- **New residential service categories**: Window Cleaning, Gutter
  Cleaning, Solar Panel Cleaning (Driveway/Patio Cleaning are already
  covered under the existing, approved Concrete Cleaning service and
  don't need a new category).
- **New commercial "services"**: Gas Station Cleaning, Shopping Center
  Cleaning, Warehouse Cleaning, Restaurant Exterior Cleaning — these
  read as property _types_ the existing 7 approved commercial services
  already serve, not new service lines. Presented that way (property
  categories, not new nav/service items) unless the owner wants them
  as genuinely separate services.
- **"Water reclamation" / "hot-water cleaning" / "wastewater
  recovery"**: no evidence in this repository that GreenCal offers
  these. Not stated anywhere on the site.
- **San Bernardino County**: not an approved county at all (the
  `County` type only permits San Diego/Orange/Riverside).
- **Los Angeles County**: _permanently excluded_ per ADR-0007 — this
  is not a "not yet verified" item, it's an active exclusion enforced
  by `tests/scope-exclusions.spec.ts`. Would require overturning
  ADR-0007, not just adding data.
- **Unapproved cities** requested in the refinement brief that are not
  in `src/data/cities.ts`'s approved 80: **Riverside (the city
  itself), Menifee, Anaheim**, plus every San Bernardino/LA County city
  named (San Bernardino, Redlands, Fontana, Rancho Cucamonga, Ontario).

## Business identity / NAP

- **Business address**: the refinement brief's footer content includes
  "Moreno Valley, California" as a business location. This is a
  NAP-adjacent claim gated by the unresolved NAP inconsistency
  documented in `.claude/rules/websites.md` and reaffirmed by an
  explicit owner decision earlier this project (skip `LocalBusiness`
  schema, no address, until NAP is resolved). **Not published.**
- **Contact email typo**: the refinement brief's own footer content
  contained `greencaliforniacorporarion@gmail.com` — this is the exact
  known typo an existing regression test guards against. The correct
  address, `greencaliforniacorporation@gmail.com`, is what's used
  everywhere. Flagging here only so the source of that typo (wherever
  it's being copied from) gets corrected upstream too.
- **Business hours**: not published — no real hours confirmed.
- **Google Business Profile, Facebook, Instagram links**: no real,
  verified accounts exist in this repository. Rendered only as
  explicit, clearly-labeled "not yet connected" placeholders, never as
  live-looking links to nowhere.
- **Licensing, insurance, bonding, certifications, "years in
  business," award/ranking claims**: none exist; none published.

## Pages that don't exist yet

- **About page**: no owner-verified company bio/history exists. Not
  added to navigation this phase (would be a broken link otherwise).
- **Standalone Projects page**: no real project/portfolio content
  exists. The homepage's "Real Results" section covers this need for
  now; "Reviews" in the header links to the homepage's review section
  (`#reviews`), not a dead top-level link.
- **Decision needed**: build real About/Projects pages in a future
  phase, or keep them permanently out of navigation.

## Reviews

- No real, verified customer reviews (Google or otherwise) exist
  anywhere in this repository. The homepage's review section uses
  clearly-marked, code-documented development placeholders — no real
  customer names, star ratings, review text, or dates are fabricated.
  Review structured data (`schema.org/Review`) is **not** emitted
  anywhere, and won't be until real, verified reviews exist.
- **Google Business Profile review link**: placeholder only — no real
  profile URL was supplied.

## Photography

**Real Photo Integration Pass (2026-07-26)**: 3 real, owner-supplied
before/after photo pairs are now integrated (Roof Washing, House
Washing, Concrete/Driveway Cleaning) — used for the hero (concrete
"after"), the 3 residential service cards ("after" photos), and the
Real Results section (all 3 pairs, Roof Washing featured). Originals
are preserved untouched at
`apps/greencal-website/public/assets/greencal/homepage/`; generated
WebP derivatives (optimized, and privacy-blurred where needed) live at
`apps/greencal-website/public/assets/greencal/generated/homepage/`.

**Privacy note**: the original Concrete Cleaning and House Washing
source photos both had a legible house number visible (Concrete: "248"
on the garage wall; House Washing: "131" near the front door), in both
the before and after photo of each pair. Both numbers are blurred (soft,
feathered blur — not a hard redaction box) in the generated derivatives
used on the site; the original, unblurred source files are preserved
as-is per the file-handling rules, but are not referenced by any
component. The Roof Washing pair had no visible privacy issue.

Still zero real photos for any of the following. Every slot below
currently renders the honest `ImagePlaceholder`/`ResponsiveImage`
absence treatment, not a stock photo and never presented as commercial/
HOA proof:

- 4 secondary residential service photos (moot — those services aren't
  approved; see the scope-conflict section above)
- 7 commercial service photos + 5 property-type images (gas station,
  shopping center, storefront, warehouse, restaurant) — explicitly
  labeled "Commercial Project Media Coming Soon," never a residential
  photo repurposed as commercial proof
- 4 multi-family/HOA images — same "Commercial Project Media Coming
  Soon" placeholder
- Logo/favicon — `public/assets/greencal/logo/` was created but no
  logo file has been placed there; the temporary text wordmark remains
  in use in the header and footer

## Phase 2 — same requests repeated, same resolution

The Phase 2 visual-cleanup brief re-requested several of the exact items
above (Window/Gutter/Solar Cleaning as residential services; Hot-Water
Cleaning/Wastewater Recovery as commercial claims; San Bernardino County
and "selected Los Angeles County communities"). These remain excluded
for the same reasons documented above — no new information changes the
approved-scope facts. Two additional items appeared for the first time
in Phase 2 and are logged here:

- **"Oil and Grease Treatment" / "Commercial Surface Cleaners"** as
  commercial capability claims — no evidence exists in this repository
  that GreenCal offers a distinct oil/grease treatment service or uses
  specific "commercial surface cleaner" equipment. Not published.
- **"BASED IN MORENO VALLEY, SERVING SOUTHERN CALIFORNIA"** as a service-
  area section heading — "serving Southern California" contradicts
  `BUSINESS_FACTS.md`'s explicit instruction not to publish
  county-wide/Southern-California-wide claims (only San Diego, Orange,
  and Riverside Counties are approved). "Based in Moreno Valley" reads as
  a business address/headquarters claim, which is exactly the
  NAP-adjacent claim gated by the still-unresolved NAP decision
  (`.claude/rules/websites.md`). Neither phrase is published; Moreno
  Valley is instead visually emphasized as the first-listed, real,
  approved Riverside County city under the existing three-county
  heading.

## Decisions already made this session (recorded here for continuity)

- Skip `LocalBusiness`/`ProfessionalService` structured data until NAP
  is resolved (owner decision, prior phase) — still in effect.
- San Bernardino/LA County and any city outside the approved 80 will
  not appear anywhere on the public site without a new ADR.
