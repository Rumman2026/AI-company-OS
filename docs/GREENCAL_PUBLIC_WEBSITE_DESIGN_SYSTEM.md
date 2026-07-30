# GreenCal Public Website — Design System

Master Completion Workflow, Phase 4. This documents the design system
**as it already exists** (`src/styles/tokens.css`, `src/styles/global.css`)
across prior redesign passes (ADR-0004) — the system was already strong
and consistent; this pass formalizes it into one reference rather than
inventing something new, per the explicit "preserve strong existing
patterns" instruction.

## Colors

Defined in `tokens.css`. Forest-green/cream/charcoal/gold premium
palette:

| Token                  | Value     | Use                                                     |
| ---------------------- | --------- | ------------------------------------------------------- |
| `--color-forest-900`   | `#142a20` | Darkest brand green — hero/footer/WhyChoose backgrounds |
| `--color-forest-700`   | `#1f4a34` | Primary brand green — buttons, links, accents           |
| `--color-forest-500`   | `#2e6b4a` | Mid green (reserved, lightly used)                      |
| `--color-cream-50`     | `#fbf8f1` | Lightest section background                             |
| `--color-cream-100`    | `#f3ecdd` | Card/border backgrounds                                 |
| `--color-charcoal-900` | `#232220` | Primary text                                            |
| `--color-charcoal-600` | `#5b5750` | Secondary/body text                                     |
| `--color-gold-500`     | `#b08d57` | Accent — eyebrows, badges, icon-number rings            |
| `--color-gold-700`     | `#7a5c33` | Visited links, darker gold accent                       |
| `--color-danger`       | `#b91c1c` | Form errors only                                        |

Semantic aliases (`--color-bg`, `--color-text`, `--color-accent`,
`--color-link`, `--color-link-visited`) map onto the above so components
never hardcode raw hex values.

## Typography

- **Display font** (`--font-family-display`): Georgia/Iowan Old
  Style/Palatino serif stack — section headings (`.section-heading`) and
  the hero H1 only. No webfont request (keeps every page's load fast,
  avoids a font-swap layout shift).
- **Body font** (`--font-family-base`): system-ui stack — everything else.
- Fixed sizes `--font-size-xs` (14px) through `--font-size-3xl` (48px),
  plus two fluid `clamp()` sizes for the hero H1 and section headings so
  they scale smoothly between mobile and desktop instead of jumping at a
  breakpoint.
- `--font-size-nav` (17px) exists specifically because interactive
  wayfinding (nav links, utility-bar actions) reads too small at body
  size — don't reuse `--font-size-base` for nav-type links.

## Containers

Two container widths, used deliberately for different purposes — not
interchangeable:

- `--container-max-width` (960px) — the sitewide default (`header`,
  `footer`, `main` in `global.css`). Used by plain content pages.
- `--container-wide` (1200px, `.container-wide` utility class) — used by
  every homepage section and by the header (`.site-header` overrides the
  960px default specifically because the primary nav needs the extra
  room — see the Header nav breakpoint note below).
- `.full-bleed` utility — lets a section's background span the full
  viewport while its content stays constrained inside a narrower
  ancestor (standard breakout pattern, used by the hero).

## Section spacing

`--space-1` (4px) through `--space-8` (96px) form the spacing scale.
`--space-7` (88px) is the standard section vertical rhythm
(`padding-block` on every homepage `<section>`) — a single token
controls page rhythm; don't hardcode section padding per-component.

## Buttons

`.btn` base class (44px min-height tap target, `--space-3`/`--space-5`
padding, 700 weight, no default border color) plus modifiers:

- `.btn-primary` — solid forest-700, white text. The one true primary
  action per view.
- `.btn-secondary` — white background, forest-700 border/text. Secondary
  actions on light backgrounds.
- `.btn-inverse` — transparent, white border/text. **Only** for dark
  backgrounds (hero, footer, forest-900 CTA banners) — a
  forest-on-forest `.btn-secondary` would disappear there.
- `.btn-lg` — larger padding + `--font-size-lg`, for hero/section CTAs.

Rule: never introduce a fourth button visual style without a documented
reason — these three cover every current use case (primary conversion
action, secondary/alternate action, dark-background action).

## Cards

No single `.card` base class exists — each card type
(`PremiumServiceCard`, `CommercialPropertyCard`, `HOAServiceCard`,
`CustomerSegmentCard`, `ReviewCard`) is its own component with a shared
_visual_ vocabulary rather than a shared CSS class:

- White background, `1px solid var(--color-cream-100)` border,
  `var(--radius-lg)`, `var(--shadow-sm)` at rest → `var(--shadow-lg)` +
  `translateY(-2px)` on hover/focus-within.
- Image-led cards (`PremiumServiceCard`) scale their image 1.04x on
  hover, gated behind `prefers-reduced-motion`.
- This is a deliberate convention, not an oversight — keep new card
  components visually consistent with this pattern rather than
  introducing a shared abstract `Card.astro` prematurely (no second use
  case has yet justified extracting one).

## Forms

`global.css`'s `.form-field`/`.form-fieldset`/`.field-error`/`.field-help`
classes are the single, shared form vocabulary (used by `QuoteForm.astro`,
the only form on the site today, but written generically):

- Every input/select/textarea: 44px min-height, full-width, 1px
  `--color-neutral-300` border, `--radius-sm`.
- `[aria-invalid="true"]` gets a red border automatically — client JS
  only toggles the attribute, never touches style directly.
- `.field-error`/`.quote-form-status` use `:empty { display: none }` so
  empty error/status regions never reserve visible space.
- Honeypot fields use the visually-hidden-but-focusable clip-rect
  pattern (`.quote-form-honeypot`), not `display: none` (which would
  break screen-reader-hidden-but-still-submittable expectations for a
  spam trap).

## Borders & shadows

- Radii: `--radius-sm` (4px) inputs/badges → `--radius-lg` (12px)
  cards/hero media → `--radius-full` pills/badges/buttons-as-pills.
- Shadows: `--shadow-sm` resting card elevation → `--shadow-md` (unused
  by cards, reserved for modals/overlays not yet built) → `--shadow-lg`
  hover elevation and the sticky mobile conversion bar.

## Image treatment

The single most important reusable pattern on this site:

- **`ResponsiveImage.astro` / `ImagePlaceholder.astro` seam.** Every
  image slot renders one or the other, switched on whether a real,
  `approvalStatus: 'approved'` `MediaRecord` exists for that slot
  (`getMediaById`) — never a raw `<img>`, never a stock photo standing
  in for a missing real photo.
  - Real photo present → `ResponsiveImage` renders the real `<img>` with
    explicit `width`/`height` (from the `MediaRecord`, CLS prevention),
    `sizes`, optional `fetchpriority`/`loading="eager"` for
    above-the-fold hero use, and an optional `fill` mode (`position:
absolute`, no intrinsic ratio) for flex/grid contexts where a fixed
    aspect ratio would otherwise blow out its container.
  - No real photo → `ImagePlaceholder` renders an honest, visibly-labeled
    "coming soon" treatment with a category icon and label — never
    blank, never a broken-image icon.
- **Aspect-ratio rule** (a real bug fixed twice this engagement, worth
  encoding as a hard rule): whenever an `<img>` carries explicit HTML
  `width`/`height` attributes (required for CLS prevention) alongside a
  CSS `aspect-ratio`, the CSS **must** also set `width: 100%; height:
auto;` alongside it. Without that pairing, the browser treats the HTML
  attribute's height as a definite value and silently ignores
  `aspect-ratio` — this produced a real broken layout twice before the
  rule was established.
- **Flex/grid sizing rule**: an image with any intrinsic/forced aspect
  ratio inside a flex or grid item needs `min-width: 0` on that item
  (flexbox's `min-width: auto` default lets fixed-ratio content blow out
  past its flex-basis) — or switch the image to `fill` mode entirely if
  the container's own dimensions should govern.

## Responsive behavior

Documented (not CSS-custom-property-enforced — media queries cannot
reference custom properties) breakpoint list, kept as a comment in
`tokens.css` and followed literally by every `@media` rule in the app:

`375px` (mobile-sm) · `480px` (mobile) · `640px` (tablet-sm) ·
`768px` (tablet) · `1024px` (tablet-lg) · `1280px` (desktop)

**Header nav is the one component that breaks from the general pattern**
and switches to its mobile hamburger below **1280px** instead of 1024px
— a deliberate, measured exception (confirmed via
`getBoundingClientRect()` that the 7-item nav + phone + CTA genuinely
needs ~1200px, with a real ~163px shortfall at exactly 1024px). Any
future nav-item addition should re-measure before assuming 1280px still
has headroom.

## Focus states

`:focus-visible { outline: var(--focus-ring-width) solid
var(--focus-ring-color); outline-offset: 2px; }` is global — every
interactive element gets this ring automatically; no component should
suppress or replace it with a custom focus treatment. `.skip-link`
provides a real, tested keyboard skip-to-content path.

## Motion

- Standard durations: `--motion-duration-fast` (100ms, button
  `:active` press) · `--motion-duration-base` (200ms, hover
  transitions) · `--motion-duration-slow` (400ms, image hover-zoom).
- **`prefers-reduced-motion: reduce` is handled globally** in
  `global.css` (collapses all animation/transition durations to near-zero
  and disables smooth scroll) — component-level motion (e.g.
  `PremiumServiceCard`'s image zoom) additionally guards itself
  explicitly for defense in depth. Any new animated component should do
  the same rather than relying on the global rule alone.
- Motion is restrained sitewide by design: hover elevation + a single
  image zoom are the only animated effects on the entire homepage. No
  scroll-triggered reveals, parallax, or auto-playing carousels exist —
  keep it that way per the Design Direction's "restrained motion"
  requirement.

## Gate 4 — Design System Ready ✅

- Major visual rules documented above (colors, typography, containers,
  spacing, buttons, cards, forms, borders/shadows, image treatment,
  responsive behavior, focus states, motion).
- No unnecessary one-off styles were found to reduce — the existing
  system was already disciplined (verified by reading every homepage
  component's `<style>` block in Phase 3); this document formalizes it
  rather than changing it.
- New work (Phase 5) follows these tokens/patterns exactly — no new
  colors, spacing values, button variants, or card patterns are
  introduced.
