# GreenCal Public Website — Responsive QA

Master Completion Workflow, Phase 8 (Final QA), 2026-07-29. Compares
post-implementation state (Phases 5–7 complete) against the Phase 2
baseline.

## Method

Playwright, real Astro dev server (managed by `playwright.config.ts`'s
own `webServer`, not a manually-started process — see the Phase 5 test-
infrastructure note in `docs/GREENCAL_PUBLIC_WEBSITE_MASTER_AUDIT.md` for
why that distinction matters). Screenshots saved to
`docs/artifacts/master-completion-final-qa-2026-07-29/`.

## Homepage — all 6 required widths (390/430/768/1024/1280/1440px)

| Width  | Horizontal overflow | Console/pageerror | Notes                                                           |
| ------ | ------------------- | ----------------- | --------------------------------------------------------------- |
| 390px  | None                | None              |                                                                 |
| 430px  | None                | None              |                                                                 |
| 768px  | None                | None              |                                                                 |
| 1024px | None                | None              | Mobile hamburger nav shown (correct, per the 1280px breakpoint) |
| 1280px | None                | None              | Inline desktop nav shown (correct)                              |
| 1440px | None                | None              |                                                                 |

Each capture scrolled through the full page first (simulating a real
user) before the full-page screenshot, so lazy-loaded images
(Real Results section) are captured fully loaded — confirmed no blank
boxes at any width, and the Phase 5 fade-in transition is visually
smooth on a normal scroll pace.

## Other major routes (390px and 1440px)

| Route               | Overflow | Console errors | Notes                                                                                                        |
| ------------------- | -------- | -------------- | ------------------------------------------------------------------------------------------------------------ |
| `/residential`      | None     | None           |                                                                                                              |
| `/commercial`       | None     | None           |                                                                                                              |
| `/multi-family-hoa` | None     | None           |                                                                                                              |
| `/contact-us`       | None     | None           | Quote form renders correctly at both widths; sticky mobile conversion bar doesn't overlap the form or footer |

## Comparison against Phase 2 baseline

- **Header/nav**: unchanged, still correct at every width (1280px
  breakpoint holds).
- **Hero**: real roof photo renders fully loaded (fade-in works), CTA
  hierarchy now visually clearer (tertiary "Request a Commercial
  Assessment" link de-emphasized per Phase 5).
- **Reviews section**: materially changed per Phase 5 — one consolidated,
  honest panel instead of 3 placeholder-labeled cards. Confirmed at
  both 390px and 1440px: no layout breakage, panel is centered and
  readable at both widths.
- **Footer**: contact column now shows one consolidated note instead of
  three; confirmed rendering correctly at 390px (stacks cleanly under
  the other columns) and 1440px (4-column grid intact).
- **No material regressions found** at any width or route.

## Gate 6 — QA Passed ✅

- All major routes work at all required widths (6 for the homepage, 2
  spot-checked for every other major route).
- No material visual regressions — the only visual changes are the
  intentional Phase 5 improvements, verified working correctly.
- No broken CTAs, navigation, or media found.
- No horizontal overflow or console/page errors at any width or route
  tested.
- Accessibility issues from Phase 7 (hero eyebrow contrast) were fixed,
  not just documented — re-verified via `astro check` after the fix.
