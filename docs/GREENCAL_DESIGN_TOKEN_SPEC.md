# GreenCal Design Token Specification

Source of truth: `apps/greencal-website/src/styles/tokens.css`. This
document explains each token's intended use and its equivalent in the
eventual Figma design system, so a designer can rebuild the same palette
and scale without guessing at intent. Local to this app only
(`packages/ui-kit` is untouched) — see `.claude/rules/websites.md` and
`DECISIONS.md` ADR-0004.

## 1. Color

| Token                                   | Value                    | Intended use                                                                                                   | Figma equivalent              |
| --------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `--color-forest-900`                    | `#142a20`                | Darkest brand green — header wordmark text, "Why Choose GreenCal" section background, dark hero overlay        | `Forest/900`                  |
| `--color-forest-700`                    | `#1f4a34`                | Primary interactive green — links, primary button background, hover states                                     | `Forest/700`                  |
| `--color-forest-500`                    | `#2e6b4a`                | Mid-tone green — used sparingly for secondary accents                                                          | `Forest/500`                  |
| `--color-cream-50`                      | `#fbf8f1`                | Lightest warm-ivory section background (alternating section rhythm)                                            | `Cream/50`                    |
| `--color-cream-100`                     | `#f3ecdd`                | Slightly deeper ivory — card backgrounds, hairline borders                                                     | `Cream/100`                   |
| `--color-charcoal-900`                  | `#232220`                | Primary body text color                                                                                        | `Charcoal/900`                |
| `--color-charcoal-600`                  | `#5b5750`                | Secondary/muted text (subheads, captions, intro paragraphs)                                                    | `Charcoal/600`                |
| `--color-gold-500`                      | `#b08d57`                | Muted gold-bronze accent — eyebrow labels, icon accents, dark-section headings                                 | `Gold/500`                    |
| `--color-gold-700`                      | `#7a5c33`                | Darker gold — visited-link color, hover state for gold accents                                                 | `Gold/700`                    |
| `--color-white`                         | `#ffffff`                | Card backgrounds, header background, button text on dark backgrounds                                           | `White`                       |
| `--color-bg`                            | `#ffffff` (= white)      | Page background for routes not yet opted into the cream palette (only the homepage currently overrides this)   | n/a — semantic alias          |
| `--color-text`                          | = `--color-charcoal-900` | Semantic default text color                                                                                    | n/a — semantic alias          |
| `--color-accent`                        | = `--color-forest-700`   | Semantic default accent                                                                                        | n/a — semantic alias          |
| `--color-link` / `--color-link-visited` | forest-700 / gold-700    | Body-copy link colors                                                                                          | n/a — semantic alias          |
| `--color-danger`                        | `#b91c1c`                | Form validation error text/border                                                                              | `Danger/700`                  |
| `--color-success` / `--color-warning`   | `#2e6b4a` / `#9a6a1f`    | Reserved for future status UI (not yet consumed anywhere) — kept so no component invents an ad hoc value later | `Success/700` / `Warning/700` |
| `--color-neutral-100/300/600/900`       | grays                    | Legacy neutral scale, still used by non-homepage routes' forms/borders — do not remove                         | `Neutral/*`                   |

**Explicitly avoided** (per the brief's direction, not represented by any
token): neon/lime green, bright SaaS blue, harsh pure black, gradients
beyond the single dark hero-overlay treatment.

## 2. Typography

**Phase 2 visual-cleanup change (2026-07-26)**: `--font-size-xs` and
`--font-size-sm` were both nudged up one step, and a new
`--font-size-nav` token was added — too much of the site's body-adjacent
copy (card descriptions, footer links, review meta, utility bar,
capability labels) read as genuinely small text at the old values, per
this phase's "typography too small" complaint. `--font-size-base` is
unchanged (16px stays the explicit body-text floor). Several
description/review-text roles also moved up to `--font-size-base`/`-lg`
directly where even the bumped small-text values still read as
secondary rather than primary content (residential/HOA card
descriptions, review body text).

| Token                         | Value                                                                              | Intended use                                                                             | Figma equivalent                                                                                                                               |
| ----------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `--font-family-base`          | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`                         | Body copy, nav, forms, buttons — no external font request, avoids font-swap layout shift | Map to a licensed humanist sans (e.g. system UI stack or a close licensed equivalent) for the Figma file; keep the system stack in code        |
| `--font-family-display`       | `Georgia, "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", serif` | Headings (H1/H2), display moments — the "elegant serif" requirement                      | Map to a licensed display serif in Figma; system serif fallback stays in code                                                                  |
| `--font-size-xs`              | `0.875rem` (14px, was 13px)                                                        | Fine print, legal/disclaimer text                                                        | `Text/XS`                                                                                                                                      |
| `--font-size-sm`              | `0.9375rem` (15px, was 14px)                                                       | Captions, secondary metadata, footer notes, utility bar                                  | `Text/SM`                                                                                                                                      |
| `--font-size-base`            | `1rem` (16px)                                                                      | Body copy floor — nothing on the site should render smaller than this for body text      | `Text/Base`                                                                                                                                    |
| `--font-size-nav`             | `1.0625rem` (17px, new)                                                            | Header nav links only — wayfinding, not body copy                                        | `Text/Nav`                                                                                                                                     |
| `--font-size-lg`              | `1.25rem` (20px)                                                                   | Section intros, card body copy, review text, featured-card copy                          | `Text/LG`                                                                                                                                      |
| `--font-size-xl`              | `1.75rem` (28px)                                                                   | Card headings, sub-section headings                                                      | `Text/XL`                                                                                                                                      |
| `--font-size-2xl`             | `2.5rem` (40px)                                                                    | Fixed large heading (non-fluid contexts)                                                 | `Text/2XL`                                                                                                                                     |
| `--font-size-3xl`             | `3rem` (48px)                                                                      | Largest fixed heading                                                                    | `Text/3XL`                                                                                                                                     |
| `--font-size-hero`            | `clamp(2.5rem, 6vw + 1rem, 4.25rem)`                                               | Hero H1 — fluid between mobile (40px) and desktop (68px)                                 | Figma: create two fixed text styles, `Hero/Mobile` (40px) and `Hero/Desktop` (68px), and note the fluid interpolation in the frame description |
| `--font-size-section-heading` | `clamp(1.875rem, 3vw + 1rem, 2.75rem)`                                             | Every section H2                                                                         | Figma: `Heading/Mobile` (30px) and `Heading/Desktop` (44px)                                                                                    |

## 3. Spacing

**Phase 2 change**: `--space-7` (the section `padding-block` used by
every homepage section) increased from 72px to 88px — the "increase
section padding" / page-rhythm request. Every section uses this one
token, so this is a single, consistent change rather than per-section
one-offs. Several components' card-level padding/gaps also moved up one
step on this same scale (e.g. `--space-4` → `--space-5`) this phase —
see `FIGMA_HANDOFF_BRIEF.md` for the per-component list.

| Token       | Value                     | Intended use                                                                         |
| ----------- | ------------------------- | ------------------------------------------------------------------------------------ |
| `--space-1` | `0.25rem` (4px)           | Icon-to-label gaps                                                                   |
| `--space-2` | `0.5rem` (8px)            | Tight internal padding                                                               |
| `--space-3` | `1rem` (16px)             | Standard internal padding, small gaps                                                |
| `--space-4` | `1.5rem` (24px)           | Card padding, medium gaps                                                            |
| `--space-5` | `2rem` (32px)             | Section-internal rhythm; now also many cards' internal padding                       |
| `--space-6` | `3rem` (48px)             | Large internal section spacing; now also several grids' card-to-card gap             |
| `--space-7` | `5.5rem` (88px, was 72px) | Section `padding-block` — the primary vertical rhythm unit between homepage sections |
| `--space-8` | `6rem` (96px)             | Largest spacing — hero vertical padding                                              |

Figma equivalent: an 8px base spacing scale (4/8/16/24/32/48/88/96),
documented as auto-layout gap/padding presets per section type.

## 4. Component sizing

| Token                  | Value            | Intended use                                                                                                         |
| ---------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| `--button-height`      | `2.75rem` (44px) | Minimum tap target height for every button — matches the mobile accessibility requirement                            |
| `--field-height`       | `2.75rem` (44px) | Form field minimum height, same tap-target rationale                                                                 |
| `--header-height`      | `4.5rem` (72px)  | Sticky header's `min-height`                                                                                         |
| `--utility-bar-height` | `2.25rem` (36px) | Utility bar height (used by the mobile menu's `max-height` calc)                                                     |
| `--mobile-bar-height`  | `3.75rem` (60px) | Sticky bottom mobile conversion bar height, and the `body` bottom padding reserved so it never covers footer content |

## 5. Radii, shadows, motion

| Token                                       | Value                   | Intended use                                                                                                          |
| ------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `--radius-sm` / `-md` / `-lg` / `-full`     | 4px / 8px / 12px / pill | Card corners, buttons, pill badges                                                                                    |
| `--shadow-sm`                               | subtle 1px              | Sticky header hairline elevation                                                                                      |
| `--shadow-md`                               | soft mid                | Cards, mobile nav dropdown panel                                                                                      |
| `--shadow-lg`                               | pronounced              | Reserved for modal-like elevated surfaces (not yet used)                                                              |
| `--focus-ring-color` / `--focus-ring-width` | forest-700 / 3px        | Every interactive element's `:focus-visible` outline — never removed, only restyled                                   |
| `--motion-duration-fast/base/slow`          | 100/200/400ms           | Reserved for future transitions; respects `prefers-reduced-motion` wherever motion is added (see `BeforeAfterSlider`) |

## 6. Breakpoints (documented, not CSS custom properties)

Media queries cannot reference custom properties, so these are recorded
here as the canonical list — every `@media` rule in this app must use one
of these literal values rather than an arbitrary new width:

| Name        | Width  | Notes                                                                                                                                     |
| ----------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `mobile-sm` | 375px  | Smallest explicitly tested width                                                                                                          |
| `mobile`    | 480px  |                                                                                                                                           |
| `tablet-sm` | 640px  | Utility bar message text hides below this                                                                                                 |
| `tablet`    | 768px  | Mobile sticky conversion bar shows below this                                                                                             |
| `tablet-lg` | 1024px | **Header nav breakpoint** — the mobile hamburger disclosure is active below this width; at/above it, the full inline nav renders (see §7) |
| `desktop`   | 1280px | Playwright's default test viewport width                                                                                                  |

Additional required verification widths from the refinement brief —
1440px and 1024px — are covered: 1440px behaves identically to any
desktop width above 1024px (no additional breakpoint exists above
1024px), and 1024px is the exact nav breakpoint boundary, verified
explicitly.

## 7. Responsive behavior notes for Figma frames

- **Header/nav**: below 1024px, the primary nav (links + phone + CTA
  button) collapses behind a hamburger `Menu` toggle button that opens a
  dropdown panel positioned below the header (absolutely positioned,
  `max-height` capped with internal scroll so it never exceeds the
  viewport). At/above 1024px, the toggle is hidden and the nav renders
  fully inline. Figma should model this as two explicit frame variants:
  `Header/Desktop (≥1024px)` and `Header/Mobile — Closed` and
  `Header/Mobile — Open`.
- **Mobile sticky conversion bar**: fixed to the viewport bottom only
  below 768px; reserves `--mobile-bar-height` of bottom padding on
  `<body>` so it never overlaps footer content or the quote form's own
  submit button.
- **Before/After slider**: a native `<input type="range">` drives a
  `clip-path` reveal — keyboard-operable by design (arrow keys move the
  slider), not a drag-only interaction. Figma should show three states:
  default (50/50), dragged-toward-before, dragged-toward-after.

## 8. Phase 2 component variants (new)

- **Media placeholder with a visible caption**: `ImagePlaceholder`/
  `ResponsiveImage` gained an optional `categoryLabel` prop that renders
  a visible "{Category} / Photo Coming Soon" caption on the placeholder
  panel itself, not just an invisible `aria-label`. Used everywhere a
  photo slot exists (hero, property cards, HOA cards, segment cards) so
  every placeholder reads as an intentional, labeled media slot rather
  than a generic empty icon.
- **`PremiumServiceCard` `size="featured"`**: used only by Residential's
  3 primary services — larger media ratio (3/2 vs 4/3), larger heading/
  body type, and a second "Request Estimate" CTA alongside "Learn More".
- **`HOAServiceCard` horizontal layout** (≥640px): image-led, 42% media
  column beside the text body, instead of the stacked-card pattern used
  elsewhere — deliberate layout variety for a section this phase asked
  to feel like "a major GreenCal business division." Uses the
  `ResponsiveImage`/`ImagePlaceholder` `fill` mode (not a fixed `ratio`)
  so the media column's size is governed entirely by its flex-basis,
  not by an intrinsic aspect ratio competing with it.
- **`BeforeAfterSlider` `featured`**: one project per Real Results
  section renders at `grid-column: 1 / -1` (full row width), a 16:9
  frame instead of 4:3, larger caption type, and a "View Similar
  Projects" link to the matching real service page. The other two
  projects render as smaller supporting cards in a two-column row below
  it — the "one large featured project + two supporting cards"
  composition.
