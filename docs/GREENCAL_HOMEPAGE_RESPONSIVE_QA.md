# GreenCal Homepage — Premium Redesign Responsive QA

Phase 10 of the Premium Visual Redesign workflow, 2026-07-29. Full
detail behind `docs/GREENCAL_HOMEPAGE_VISUAL_REDESIGN.md`'s Phase 10
summary.

## Method

Playwright, real Astro dev server managed by `playwright.config.ts`'s
own `webServer` (not a manually-started process). Baseline screenshots:
`docs/artifacts/premium-redesign-baseline-2026-07-29/`. Final
screenshots: `docs/artifacts/premium-redesign-final-2026-07-29/`.
In-progress section-level screenshots (per-phase evidence):
`docs/artifacts/premium-redesign-progress-2026-07-29/`.

## 6-width sweep

| Width  | Overflow | Console/page errors | Desktop CTA `display` | Mobile bar `display` |
| ------ | -------- | ------------------- | --------------------- | -------------------- |
| 390px  | None     | None                | `none`                | `flex`               |
| 430px  | None     | None                | `none`                | `flex`               |
| 768px  | None     | None                | `none`                | `flex`               |
| 1024px | None     | None                | `flex`                | `none`               |
| 1280px | None     | None                | `flex`                | `none`               |
| 1440px | None     | None                | `flex`                | `none`               |

The desktop floating CTA and mobile action bar are mutually exclusive
at every required width, confirmed via computed `display`, not
assumed from the CSS source alone.

## Persistent estimate controls

- **Desktop floating CTA**: appears once the hero is fully scrolled out
  of view; hides once `#final-cta`'s top edge reaches the viewport
  (and stays hidden for the remainder of the page, including the
  footer). **A real bug was found and fixed here** — see the Visual
  Redesign doc's Phase 10 section for the full root-cause writeup
  (an `IntersectionObserver`-based approach could miss a fast/instant
  scroll past the target; replaced with a `requestAnimationFrame`-
  throttled `scroll`/`resize` listener that recomputes live geometry on
  every call). Re-verified after the fix: `inert`/`opacity`/
  `pointerEvents` all correctly reflect "hidden" at the footer and
  "visible" mid-page.
- **Mobile action bar**: unchanged behavior (Call Now / Get Estimate),
  confirmed not to overlap the mobile hamburger-menu dropdown
  (dropdown: y 112–611px; bar: y 784–844px at 390×844).
- **No overlap with the Real Results comparison slider**: confirmed via
  bounding-box intersection math (not visual assumption) at 1024px and
  1440px, with the slider handle genuinely on-screen at the same time
  as the floating CTA.
- **Destinations verified**: `#sticky-estimate-cta` → `/contact-us#quote-form`,
  `#sticky-call-cta` → `tel:+16573198550` — the site's single existing
  estimate/phone destinations, no new form or route created.
- **Keyboard**: the widget is reachable and focusable only while
  actually visible (`inert` correctly removes it from the tab order
  and accessibility tree while hidden) — verified via `toBeFocused()`
  while mid-page, and via `inert` attribute presence while hidden.

## Comparison against baseline

- Hero: flat rounded panel → dimensional tilted frame + layered proof
  card (desktop); simplified flat frame preserved on mobile as intended.
- Commercial section: light `cream-50` → dark `forest-900`, breaking up
  the previous light/light/light section rhythm.
- Pathway cards (`CustomerSegmentCard`, `CommercialPropertyCard`,
  `HOAServiceCard`, `PremiumServiceCard`): consistent elevation/hover
  system applied across all four, where before only some had hover
  treatment and none used a shared token system.
- Real Results: featured project now carries the page's second-
  strongest shadow (elevation-3) at rest.
- Final CTA: flat gradient → photo-backed gradient overlay (subtle,
  contrast-preserving).
- No regression found in any section not targeted by this redesign
  (Reviews, Service Areas, Process Steps, Safety Section, WhyChoose,
  Footer, Header nav) — confirmed via the full 6-width screenshot sweep
  showing no unexpected layout changes outside the sections actually
  edited.

## Gate 10 — QA Passed ✅

See `docs/GREENCAL_HOMEPAGE_VISUAL_REDESIGN.md`'s Phase 10 section for
the full pass criteria and evidence.
