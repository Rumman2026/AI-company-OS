# GreenCal Homepage — Final Preview Verification

Final polish pass, 2026-07-30.

## Deployment

- **Project**: `ai-company-os-greencal-website` (`prj_J1ubVL1ywyYxGdAA20NgI5IxVAcA`),
  team `leads-initiative`. This project is GitHub-integrated (production
  domains `greencalpressurewashing.com` / `www.greencalpressurewashing.com`
  build only from `main`); every deployment on `feat/greencal-premium-homepage`
  — including this one — has always built as a Preview via a normal push
  to that branch, matching the pattern of all 15+ prior deployments on
  this branch.
- **Deployment**: `dpl_3MQXJi4NeuA7PSk2Dk6sedASNcQK`, built from commit
  `f066104` on `feat/greencal-premium-homepage` (pushed to
  `origin/feat/greencal-premium-homepage`, not `main`).
- **`target: null`** — confirmed Preview, not Production.
- **`readyState: READY`**.

## Verified URL

`https://ai-company-os-greencal-website-b59bs57hl-leads-initiative.vercel.app`

## Verification checklist (all against the live deployed URL)

1. **HTTP 200**: confirmed via `curl` (`HTTP_STATUS=200`) and via
   Playwright's `response?.status()`.
2. **Homepage rendering**: confirmed — hero heading text matches exactly
   ("Restore Your Property Without Risking Damage"), hero photo slider
   loads and is visible, real photos render.
3. **Mobile rendering**: confirmed at 390×844 — screenshot captured, no
   errors, hero visual stacked above copy as designed.
4. **Desktop rendering**: confirmed at 1440×900 — full hero + nav
   screenshot captured, header logo legible, nav row intact.
5. **Cinematic tilt effect works publicly**: confirmed — computed
   `transform` on `.hero-slider-track` is a non-identity `matrix3d(...)`
   at 1440px, and `none` on a fresh page load at 390px (mobile
   simplification correctly applied on the live deployment, not just
   locally).
6. **No deployment-protection block**: confirmed — loaded directly via
   both an unauthenticated `curl` and Playwright with no login/
   authentication wall.
7. **No `DEPLOYMENT_NOT_FOUND`**: confirmed — real page content
   rendered, not a Vercel error page.
8. **URL remains accessible after verification completed**: confirmed
   via a second, separate `curl` check performed after the full
   Playwright verification pass (`RECHECK_HTTP_STATUS=200`).
9. **Desktop floating estimate CTA works publicly**: confirmed —
   `#persistent-estimate-cta` carries `inert` at the top of the page;
   scrolling past the hero makes it interactive (`inert` removed) with
   correct hrefs (`#sticky-estimate-cta` → `/contact-us#quote-form`,
   `#sticky-call-cta` → `tel:+16573198550`).
10. **Mobile Call Now / Free Estimate bar works publicly**: confirmed —
    `#mobile-estimate-bar` is visible at 390px on the live deployment.
11. **Console/page errors**: zero, except the pre-existing, benign
    `/favicon.ico` 404 (no `<link rel="icon">` declared, no square
    icon-only logo asset exists — unchanged, previously-documented
    behavior, confirmed via a full response-status sweep that otherwise
    found zero 4xx/5xx responses on the page).

## One benign, expected observation

A small floating icon appears in the corner of the deployed page that is
**not** part of this site's code — it's Vercel's own preview-deployment
toolbar, injected by the Vercel platform on preview URLs. Confirmed by
its absence from local dev server screenshots and presence only on the
deployed preview — expected platform behavior, not a defect (same
observation recorded in the prior preview-verification pass).

## Engineering checks (local, before deployment)

- `pnpm run typecheck` (`astro check`): **0 errors, 0 warnings, 0 hints**
  across 103 files.
- `pnpm run lint`: **0 errors**, 1 pre-existing warning in an unrelated
  file (`src/lib/quote-form/lead-store.ts`, a `no-console` warning not
  touched by this pass).
- `pnpm run build`: succeeded, full static + serverless function output
  generated with no errors.
- `pnpm test` (Playwright suite, `tests/*.spec.ts`): **255/255 passed**
  at `--workers=1`. Initial runs at the default/higher worker count
  showed a shifting, non-overlapping set of failures (different tests
  failed on each run) — every failing test, re-run individually or as
  its full file at `--workers=1`, passed. This is resource contention
  on this local machine (multiple concurrent Chromium contexts against
  a single dev server, worsened by an already-open Playwright MCP
  browser session), not a defect: none of the failing tests touch
  anything this pass changed (`Wordmark.astro`, `HeroSlider.astro`), and
  the one deterministic-looking failure (a `vendor/tslib` integrity
  hash check) also passed cleanly in isolation and has zero `git diff`
  against `vendor/` from this session.

## Gate — Public Preview Verified ✅

All checklist items above are satisfied with direct evidence from the
live, deployed URL — not local-only testing, and not assumed from the
deployment's `READY` status alone.
