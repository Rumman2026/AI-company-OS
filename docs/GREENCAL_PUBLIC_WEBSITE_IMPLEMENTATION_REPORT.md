# GreenCal Public Website — Implementation Report

Master Completion Workflow, Phase 5 detail, 2026-07-29. Full record of
every code change made and why. See
`docs/GREENCAL_PUBLIC_WEBSITE_MASTER_AUDIT.md` for the audit findings
these implement, and `docs/GREENCAL_PUBLIC_WEBSITE_RESPONSIVE_QA.md` for
verification.

## 1. Reviews section consolidation (P1)

**Files**: `src/components/homepage/Testimonials.astro`,
`src/components/homepage/ReviewSummary.astro`

**Before**: `ReviewSummary` (an honest "not yet connected" panel) plus 3
`ReviewCard`s, each visibly labeled "Development placeholder - not a
real review" with a fake name/city/text.

**After**: `Testimonials.astro` renders only `ReviewSummary` — no
placeholder cards. `ReviewSummary.astro` was redesigned as one
intentional, card-styled panel (icon, centered layout, matches the
site's card visual vocabulary) rather than a plain disclaimer block.

**Why**: the 3 fake-named cards were honestly labeled but still read as
"3 five-star reviews" at a glance — undermining the premium/trustworthy
goal even though nothing was fabricated. No review content was
invented; the wording is materially the same, just presented once
instead of alongside 3 placeholder cards.

**Kept, not deleted**: `ReviewCard.astro` — it already supports a real
(non-placeholder) mode with a `verifiedLink` prop, ready for when real
reviews exist.

## 2. Footer contact-column consolidation (P2)

**File**: `src/components/Footer.astro`

**Before**: 3 separate `<li class="site-footer-note">` lines ("Business
hours: not yet published", "Google Business Profile: not yet
connected", "Facebook / Instagram: not yet connected").

**After**: 1 line — "Hours, Google Business Profile, and social links:
not yet published."

**Why**: three stacked "not yet connected" notes in the one column meant
to build contact confidence read as "this business isn't fully set up"
more than the facts warranted. Same honest content, less visual weight.

## 3. `ResponsiveImage` fade-in (P2)

**File**: `src/components/ResponsiveImage.astro`

**Change**: every real (non-placeholder) `<img>` now gets a
`responsive-image-fade` class (`opacity: 0` → `opacity: 1` via
`onload`/`onerror`, CSS transition `var(--motion-duration-slow)`).

**Why**: Phase 2 baseline testing caught the Real Results before/after
photos rendering as a blank box in a full-page screenshot taken before
they finished loading (confirmed via `naturalWidth`/`complete` checks,
not assumed). A slow connection could show the same blank box to a real
user. The fade-in means a still-loading image degrades to a soft
transition instead of a blank gap or a hard pop-in.
`prefers-reduced-motion` is already handled globally, so no separate
guard was needed.

## 4. Hero tertiary-CTA de-emphasis (P2)

**File**: `src/components/homepage/Hero.astro`

**Change**: `.hero-secondary-link a` (the "Request a Commercial
Assessment" text link) changed from solid white/600-weight to
`rgba(255,255,255,0.8)`/`font-size-sm`, matching the trust-indicators'
visual weight below it.

**Why**: at full white, this link read as a near-equal 3rd CTA
competing with the two buttons above it. The hierarchy is now
unambiguous: primary button > secondary button > this tertiary link >
trust indicators.

## 5. Hero eyebrow contrast fix (accessibility, found in Phase 7)

**File**: `src/components/homepage/Hero.astro`

**Change**: `.hero-eyebrow`'s color changed from `var(--color-gold-500)`
(`#b08d57`) to a scoped `#d4ad74`.

**Why**: computed WCAG contrast directly (not assumed) for every
gold-500 text usage in the codebase. This one was thin: 4.58:1 against
the actual sampled rendered background pixel (just over AA's 4.5:1
floor) and 3.25:1 against the gradient's lighter (forest-700) edge
(fails outright). `#d4ad74` passes AA (4.5:1+) against both gradient
stops with real margin. `--color-gold-500` itself is untouched — every
other use of it was individually computed and already passes
comfortably.

## 6. `og:image`/`twitter:image` added (SEO, Phase 6)

**File**: `src/layouts/BaseLayout.astro`

**Change**: added `og:image`, `og:image:width/height/alt`,
`twitter:image`, and upgraded `twitter:card` from `summary` to
`summary_large_image`. Points at the existing, already-approved
`roof-wash-hero-after.webp` photo (the same one the homepage hero
uses) — not a new or fabricated asset.

**Why**: these tags were previously, correctly omitted because no
approved brand image existed at the time that decision was made. The
Logo Integration and Real Photo Integration passes since then supplied
real, approved assets — the omission had become stale, not still-correct.

## Not implemented (asset-blocked)

**Commercial/HOA real photography** (audit finding P2 #4): zero real
commercial/HOA project photos exist. `CommercialPropertyCard`,
`HOAServiceCard`, and `CustomerSegmentCard`'s `statusLabel` correctly
render the honest "Commercial Project Media Coming Soon" placeholder
throughout. Cannot be fixed without owner-supplied photos — see
`docs/GREENCAL_PUBLIC_WEBSITE_REMAINING_ASSETS.md`.

## Verification

- `astro check`: 0 errors after every individual change.
- Full test suite: 255/255 passing (see the Master Audit's Phase 5/9
  notes on ruling out parallel-worker flakiness).
- Visual verification via Playwright screenshots at all 6 required
  widths plus targeted crops of each changed section — see
  `docs/artifacts/master-completion-baseline-2026-07-29/` and
  `docs/artifacts/master-completion-final-qa-2026-07-29/`.
