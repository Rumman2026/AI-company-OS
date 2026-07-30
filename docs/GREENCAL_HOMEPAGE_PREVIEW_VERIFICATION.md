# GreenCal Homepage — Premium Redesign Preview Verification

Phase 12 of the Premium Visual Redesign workflow, 2026-07-29.

## Deployment

- **Project**: `ai-company-os-greencal-website` (`prj_J1ubVL1ywyYxGdAA20NgI5IxVAcA`),
  team `leads-initiative`.
- **Deployment**: `dpl_E6jPPfPLNnfMW8AF2Mm5n6Yba1Ld`, built from commit
  `f2b63bc` on `feat/greencal-premium-homepage`.
- **`target: null`** — confirmed Preview, not Production.
- **`readyState: READY`**.

## Verified URL

`https://ai-company-os-greencal-website-17168r9qq-leads-initiative.vercel.app`

## Verification checklist (all performed against the live deployed URL, not the local dev server)

1. **HTTP 200**: confirmed via direct `curl` (`HTTP_STATUS=200`) and via
   Playwright's `response?.status()` on both the desktop and mobile
   passes.
2. **Homepage rendering**: confirmed — hero heading text matches exactly
   ("Restore Your Property Without Risking Damage"), dimensional hero
   frame + proof card render correctly, real photo loads.
3. **Mobile rendering**: confirmed at 390×844 — full-page screenshot
   captured, no errors.
4. **Desktop rendering**: confirmed at 1440×900 — full hero + nav
   screenshot captured.
5. **No deployment-protection block**: confirmed — the page loaded
   directly via both an unauthenticated `curl` and Playwright with no
   login/authentication wall.
6. **No `DEPLOYMENT_NOT_FOUND`**: confirmed — real page content
   rendered, not a Vercel error page.
7. **URL remains accessible after the deployment command completed**:
   confirmed via a second, separate `curl` check performed after the
   Playwright verification pass completed (`RECHECK_HTTP_STATUS=200`).
8. **Desktop floating estimate CTA works publicly**: confirmed —
   `#persistent-estimate-cta` carries the `inert` attribute at the top
   of the page (hidden, matching local behavior); scrolling to the Real
   Results section makes it interactive with the correct hrefs
   (`#sticky-estimate-cta` → `/contact-us#quote-form`,
   `#sticky-call-cta` → `tel:+16573198550`).
9. **Mobile Call Now / Free Estimate bar works publicly**: confirmed —
   `#mobile-estimate-bar` is visible at 390px on the live deployment.
10. **Re-opened after initial verification**: confirmed — a second,
    independent `curl` request after the full Playwright pass completed
    still returned `200`.
11. **Console/page errors**: zero, on both the desktop and mobile
    passes against the live deployment.

## One benign, expected observation

A small floating icon appears in the corner of the deployed page that
is **not** part of this site's code — it's Vercel's own preview-
deployment toolbar, injected by the Vercel platform on preview URLs
(not by anything in this repository). Confirmed by its absence from the
local dev server screenshots and presence only on the deployed preview
— expected platform behavior, not a defect.

## Gate 12 — Public Preview Verified ✅

All 11 checklist items above are satisfied with direct evidence from
the live, deployed URL — not local-only testing, and not assumed from
the deployment's `READY` status alone.
