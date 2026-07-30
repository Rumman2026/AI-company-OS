# GreenCal Homepage — Final Premium Polish

Final polish pass on the Premium Visual Redesign, 2026-07-30. This is a
continuation, not a rebuild: `docs/GREENCAL_DIMENSIONAL_DESIGN_SYSTEM.md`
and `docs/GREENCAL_PUBLIC_WEBSITE_DESIGN_SYSTEM.md` still apply unchanged.
This document records what was audited, what was genuinely worth changing,
and — just as importantly — what was deliberately left alone because it
was already strong.

## Starting point

The homepage arriving into this pass (commit `2d8ff91`) was already a
mature, several-phases-deep redesign: real GreenCal photography throughout,
a working drag/keyboard before-and-after slider, a 3-slide hero photo
carousel, a scroll-aware desktop floating estimate CTA, a mobile Call
Now/Get Estimate bar, honest (non-fabricated) trust and reviews content,
and zero placeholder/fake imagery anywhere. Confirmed directly by reading
every homepage component and the last dozen commits before changing
anything.

## Audit method

1. Read every homepage component (`src/components/homepage/*.astro`) and
   the shared `Header`, `Wordmark`, `MobileConversionBar`.
2. Ran the site locally and captured screenshots at 390/430/768/1024/
   1280/1440px.
3. Cross-referenced the design system doc's token definitions against
   actual component usage via `grep`, to find gaps between documented
   intent and shipped code.
4. Consulted the `ui-ux-pro-max` design-intelligence skill for hero
   depth/perspective conventions, logo-legibility norms, and multi-CTA
   hierarchy guidance.
5. Verified every candidate finding against the real rendered page
   (cropped screenshots, computed-style checks) before treating it as
   real — no finding below is asserted without direct evidence.

## Findings

### P0 — broken or misleading

None found.

### P1 — conversion or usability issue

None found. Every CTA, the desktop sticky estimate control, and the
mobile action bar were already present, correctly wired, and verified
working (see `GREENCAL_FINAL_CONVERSION_QA.md`).

### P2 — meaningful polish opportunities (implemented)

**1. Restored the hero's cinematic tilt (dimensional-design regression).**
`src/styles/tokens.css` defines `--depth-tilt-primary` specifically for
"hero image frame or a primary conversion panel." Git history shows it
_was_ applied to the hero image in the pre-slider version of `Hero.astro`
(commit `5f218dc`) — but when the static image + floating proof card was
replaced by the current 3-slide `HeroSlider.astro` (commit `2d8ff91`), the
tilt treatment was dropped as a side effect of the rewrite. The commit
message describes the proof-card removal deliberately but never mentions
removing the tilt — this reads as an unintentional regression, not a
documented design decision, so restoring it (scoped to the frame only,
not resurrecting the removed proof card) is a faithful continuation of
the existing design system rather than a new idea.

Applied to `.hero-slider-track` in `HeroSlider.astro`, replicating the
original pattern exactly:

- `transform: var(--depth-tilt-primary)` at `min-width: 900px` only.
- A `min-width: 900px and (prefers-reduced-motion: reduce)` override that
  removes the transform entirely (not just the transition) for users who
  have asked for less motion.
- Mobile/tablet (≤900px) renders the flat, untransformed frame — matching
  the design system's required "mobile depth simplification" rule.

Verified via computed-style checks: `matrix3d(...)` (non-identity) at
1440px with no reduced-motion preference; `none` with
`prefers-reduced-motion: reduce` emulated.

**2. Header logo legibility on mobile/tablet.**
The real GreenCal logo (an illustrated mascot mark with fine drip/spark
linework and a small tagline) was rendered at 44px tall from 320px up to
1279px viewport width. A cropped screenshot of the actual rendered
element at that size showed the tagline as an illegible smudge and the
mascot detail lost. This is a real, measured legibility problem, not a
guess.

Fix: raised the default (sub-1280px) display height in `Wordmark.astro`
from 44px to 56px — a sizing-only change to the existing, real logo file;
no pixel of the logo asset itself was touched, redrawn, or recreated,
consistent with the hard guardrail against fabricating or altering the
logo. The ≥1280px desktop size (52px) was left unchanged, because that
breakpoint is the site's documented, previously-hard-won navigation
row-capacity fix (`Header.astro`'s own comments record ~163px of
measured shortfall history at that width) — growing the logo there would
risk reopening that exact bug for no legibility benefit, since the full
inline nav only appears at ≥1280px. Verified visually at 390/768/1024px:
the mark and tagline are now clearly legible, and the header row does not
wrap or overflow at any breakpoint.

### P3 — optional, not implemented

None identified as worth the change — every other candidate observation
(e.g. the final CTA's two same-styled "Residential"/"Commercial" buttons)
was traced to a deliberate, already-documented design choice (segment-
specific parallel CTAs, not a hierarchy bug) and left alone.

## What was deliberately preserved, unchanged

- The hero's headline, subhead, CTA copy, and trust indicators.
- The 3-slide hero photo carousel itself (rotation timing, pause-on-hover/
  focus, dot controls, reduced-motion behavior) — only the frame's static
  tilt was added back.
- The before-and-after slider's explicit no-tilt decision (documented in
  `BeforeAfterSlider.astro`: a rotated container would visually fight the
  slider's own horizontal drag gesture) — respected, not revisited.
- All business content, service descriptions, trust claims, and the
  honest "not yet connected" Google reviews panel — no claim was added,
  removed, or reworded.
- The real logo file itself — resized via CSS only, never edited.

## Logo asset status

Single authentic source, unchanged this pass:
`public/assets/greencal/generated/logo/header.webp` (dark-tagline variant)
and `footer.webp` (light-tagline variant), both derived from the owner-
supplied artwork per the original Logo Integration Pass
(`Wordmark.astro`'s own header comment). No icon-only/square crop exists,
so — consistent with the prior team's documented decision — the favicon
was left unchanged rather than fabricating a new square mark from the
rectangular wordmark.

## Files changed

- `src/components/homepage/HeroSlider.astro` — restored `--depth-tilt-primary`
  on the slide frame, desktop-only, with a `prefers-reduced-motion`
  removal.
- `src/components/Wordmark.astro` — raised sub-1280px logo display height
  44px → 56px.

## Pre-existing item noticed, not touched (outside this task's scope)

A raw source-art file at
`public/assets/greencal/logo/GreenCal Pressure washing logo/greencal-logo2 .png.png`
was already deleted in the working tree before this session started (not
referenced anywhere in code — the site renders the generated `.webp`
derivatives only). Per the hard guardrail against deleting/overwriting
original media, this was left exactly as found — not staged, not
restored, not committed. Flagged to the owner in the completion report
for an explicit decision.
