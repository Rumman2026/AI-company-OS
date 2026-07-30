# GreenCal Homepage — Final Responsive QA

Final polish pass, 2026-07-30. Tested against the local dev server
(`astro dev`, port 4321) after the two changes recorded in
`GREENCAL_FINAL_PREMIUM_POLISH.md` (hero tilt restoration, header logo
sizing).

## Breakpoints tested

390px, 430px, 768px, 1024px, 1280px, 1440px — full-page and/or targeted
viewport screenshots captured at every width; the required set from the
task brief.

## Automated sweep (all 6 breakpoints, one pass)

Ran a single Playwright script across all six widths, checking for
horizontal overflow (`document.documentElement.scrollWidth -
clientWidth`) and console errors on each:

| Width  | Horizontal overflow | Console errors |
| ------ | ------------------- | -------------- |
| 390px  | 0px                 | 0              |
| 430px  | 0px                 | 0              |
| 768px  | 0px                 | 0              |
| 1024px | 0px                 | 0              |
| 1280px | 0px                 | 0              |
| 1440px | 0px                 | 0              |

Zero horizontal overflow and zero console errors (excluding the
pre-existing, benign `/favicon.ico` 404 — no `<link rel="icon">` is
declared and no square icon-only logo asset exists to use for one; this
is an unchanged, previously-documented state, not a regression) at every
required width.

## Visual verification per breakpoint

- **390px / 430px**: Hero visual stacks above the copy column (order:
  -1, unchanged). Header logo now legible at 56px (previously 44px) —
  confirmed via direct screenshot comparison. Hero image frame renders
  flat (no tilt) per the mobile depth-simplification rule. Mobile Call
  Now / Get Estimate bar (`#mobile-estimate-bar`) visible and pinned at
  the bottom without covering content. Hamburger menu opens correctly
  (`aria-expanded` toggles `true`/`false`, `#mobile-nav-content` gets
  `.is-open`).
- **768px**: Same mobile-simplified (flat, no-tilt) hero frame — still
  below the 900px tilt threshold, as designed. Before-and-after grid
  begins its 2-column layout. No overflow.
- **1024px**: Hero image frame now shows the restored subtle 3D tilt
  (confirmed visually — the frame's right edge recedes slightly,
  consistent with `--depth-tilt-primary`'s `rotateY(-6deg)`). Header
  still uses the hamburger pattern (below the 1280px inline-nav
  breakpoint) with the larger, now-legible 56px logo. No overflow, no
  wrapping.
- **1280px**: The site's documented "hard-won" breakpoint — full inline
  nav (7 items + phone + CTA button) on one row. Verified it still fits
  on one row with the restored tilt in place (the tilt only affects the
  hero visual column, not the header). Logo reverts to its existing 52px
  desktop size here, unchanged, to protect this exact row-capacity fix.
- **1440px**: Full desktop hero layout, tilt visible, all copy/CTAs
  render as expected, no regressions from the base redesign.

## Interaction checks

- **Sticky desktop estimate CTA** (`#persistent-estimate-cta`): `inert`
  before scrolling past the hero; becomes visible and interactive
  (`inert` removed, `.is-visible` class present) once scrolled past the
  hero; returns to `inert`/hidden once the final CTA section scrolls
  into view. Verified programmatically via `getBoundingClientRect()`
  checks at each scroll state — matches the component's documented
  behavior exactly.
- **Sticky CTA hrefs**: `#sticky-estimate-cta` → `/contact-us#quote-form`,
  `#sticky-call-cta` → `tel:+16573198550` — both correct.
- **Mobile action bar** (`#mobile-estimate-bar`): visible at 390px,
  contains both Call Now and Get Estimate actions.
- **Keyboard tab order**: skip link → utility bar (call, request
  estimate) → header brand link → nav dropdown summaries, each with a
  visible focus outline (`outline-style: solid`, ~2.67px) — confirmed by
  walking the first 6 Tab stops and inspecting computed style at each.
- **Reduced motion**: with `prefers-reduced-motion: reduce` emulated,
  `.hero-slider-track`'s computed `transform` is `none` (tilt fully
  removed, not just the transition) — confirmed via computed-style
  check, both before and after this pass's change.
- **Images**: 14 `<img>` elements on the homepage, all with descriptive,
  non-generic `alt` text (0 missing); hero's first slide is
  `loading="eager"`, every other homepage image is `loading="lazy"` —
  unchanged, already-correct behavior.

## Result

No horizontal overflow, no console errors, no layout breakage, no
keyboard-accessibility regression, and no reduced-motion regression at
any of the six required breakpoints, before or after this pass's two
changes.
