# GreenCal Homepage — Dimensional Design System

Premium Visual Redesign, Phase 3, 2026-07-29. Additive extension of
`docs/GREENCAL_PUBLIC_WEBSITE_DESIGN_SYSTEM.md` — every rule in that
document still applies unchanged; this document adds the dimensional
(layered/perspective/elevation) rules for the homepage redesign only.
All new tokens live in `src/styles/tokens.css`.

## Elevation scale

Use the **lowest** level that achieves the goal — most content stays at
Level 0/1. Do not apply heavy shadows everywhere.

| Level | Token                                                       | Use                                                                                                                                                        |
| ----- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | (none)                                                      | Flat content — body text, plain sections                                                                                                                   |
| 1     | `--shadow-elevation-1` (= `--shadow-sm`)                    | Light card lift — ordinary cards at rest, unchanged from the existing design system                                                                        |
| 2     | `--shadow-elevation-2` (= `--shadow-md`, previously unused) | Featured service tile or proof panel — one clearly "important" card per section, not every card                                                            |
| 3     | `--shadow-elevation-3`                                      | Hero image frame or a primary conversion panel — a real directional shadow (offset down-right, not a generic blur), used once or twice per page            |
| 4     | `--shadow-elevation-4`                                      | Persistent/floating conversion controls only (the new desktop floating CTA, the mobile action bar) — a crisp shadow that reads as "above" the page content |

## Perspective / depth rules

- `--depth-tilt-primary` / `--depth-tilt-secondary`: subtle
  `perspective()` + `rotateY`/`rotateX` transforms (4–6° range) for
  framed image panels that should read as tilted/layered rather than
  flat. Always paired with:
  - a `prefers-reduced-motion` fallback that removes the tilt entirely
    (static framing still looks intentional without it — never make the
    tilt load-bearing for legibility or layout).
  - a **mobile depth simplification**: below 768px, remove or
    significantly reduce tilt/overlap — perspective reads as premium on
    a large canvas and as visual noise on a narrow one. Mobile keeps the
    elevation/shadow language but drops the 3D tilt itself.
- `--depth-lift-hover` / `--depth-lift-hover-sm`: the existing hover-lift
  pattern (`translateY`), reused at two magnitudes for larger vs.
  smaller elevated elements. Desktop-only in practice (`:hover` has no
  meaningful mobile equivalent) — `:focus-visible` gets the same lift so
  keyboard users get equivalent feedback.
- Never stack more than two dimensional layers (e.g. a tilted frame plus
  one overlapping proof card) in a single composition — more than that
  reads as cluttered, not premium.

## z-index scale

Every fixed/sticky-positioned element must reference one of these
tokens, never a literal number:

| Token              | Value | Element                               |
| ------------------ | ----- | ------------------------------------- |
| `--z-header`       | 40    | `.site-header` (sticky)               |
| `--z-floating-cta` | 45    | The new desktop floating estimate CTA |
| `--z-mobile-bar`   | 50    | `MobileConversionBar` (mobile only)   |

The floating desktop CTA and the mobile bar never render at the same
viewport width (the floating CTA is desktop-only via a `min-width`
media query mirroring the header's existing breakpoint conventions;
the mobile bar is already `max-width: 768px`-gated) — their relative
`z-index` ordering is documented for completeness, not because they can
visually collide.

## Safe-area and fixed-bottom rules

- `--safe-area-bottom` = `env(safe-area-inset-bottom, 0px)`.
- Any fixed-bottom element must add this to its own bottom
  padding/height **and** to the page's reserved bottom `body` padding
  (see `global.css`) — both sides of that pairing must move together or
  content ends up hidden behind the bar on notched devices.

## Persistent-CTA styling

- Desktop floating CTA: `--shadow-elevation-4`, `--radius-full` pill
  shape or `--radius-lg` panel (implementation detail, decided in
  Phase 8), `.btn-primary` color language (forest-700/white) for
  visual consistency with every other primary CTA on the site — a
  floating CTA in an unfamiliar color would read as a foreign
  "widget," not a GreenCal element.
- Mobile bar: unchanged visual language (white bar, forest-700 primary
  action) — already established and tested; this redesign only adds
  the safe-area fix, not a new visual style.
- Both use `transform`/`opacity` only for entrance/exit — no layout-
  triggering animation, no continuous motion, no pulsing.

## Motion durations (unchanged from the base design system, reused here)

`--motion-duration-fast` (100ms) for press feedback,
`--motion-duration-base` (200ms) for hover transitions,
`--motion-duration-slow` (400ms) for entrance/reveal transitions and the
existing image fade-in — all already inside the spec's required
200–500ms window for meaningful transitions. `prefers-reduced-motion:
reduce` already collapses all of these globally (`global.css`); any new
dimensional transform must also be included in that collapse (verified
per-component in Phase 9, not assumed).

## Stable identifiers (for future analytics — not connected to anything yet)

- `sticky-estimate-cta` — the desktop floating "Get a Free Estimate"
  action.
- `sticky-call-cta` — the desktop floating "Call" action (paired with
  the estimate action in the same floating control, per the Priority
  Order's emphasis on phone-CTA prominence).
- `mobile-estimate-bar` — the existing mobile action bar's container
  (already holds both Call Now and Get Estimate — this id was added to
  its root element, no new bar was created).

No event tracking, analytics SDK, or fake instrumentation is attached to
these ids — they exist only as stable hooks for future, separately-
authorized work.

## Gate 3 — Design System Ready ✅

- Elevation levels 0–4 defined with an explicit "use the lowest level
  that works" rule.
- Perspective/tilt rules defined, including the required mobile
  simplification and reduced-motion fallback.
- z-index scale defined and wired into the two existing fixed-position
  elements (`Header`, `MobileConversionBar`) — both now reference the
  token instead of a literal number.
- Safe-area rule defined and applied to `MobileConversionBar` (closing
  the Phase 1 gap) and the matching `body` padding reservation.
- Persistent-CTA styling direction and motion rules defined.
- Stable identifiers reserved, unconnected to any tracking.
- Verified via `astro check` (0 errors) — pure token/CSS additions, no
  markup or logic changed yet.

Proceeding to Phase 4 (Hero Redesign).
