# GreenCal Production QA

Status: durable record of this sprint's QA pass. See prior QA docs
(`docs/GREENCAL_FINAL_RESPONSIVE_QA.md`,
`docs/GREENCAL_HOMEPAGE_RESPONSIVE_QA.md`) for the premium redesign's
own already-completed, more detailed responsive QA from earlier
sessions — this document covers this sprint's incremental verification.

## Automated checks (this sprint, on the final committed state)

| Check                            | Result                                                                                                                                                                                 |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `astro check` (typecheck)        | 0 errors, 0 warnings, 0 hints (103 files)                                                                                                                                              |
| `eslint` (lint)                  | 0 errors (1 pre-existing `no-console` warning, intentional — sanitized diagnostic logging)                                                                                             |
| `astro build` (production build) | Succeeds, all pages + `sitemap.xml` generated                                                                                                                                          |
| Full Playwright suite            | 263/263 passing (two transient failures observed once under concurrent CPU load from a simultaneous git operation — both confirmed passing in isolated re-runs; not a real regression) |

## Responsive viewports covered by the existing suite

390px, 430px, 768px, 1024px, 1280px, 1440px — horizontal-overflow guards
at narrow/mobile/desktop widths, header/nav/mobile-menu structure,
sticky CTA and mobile action bar, footer, keyboard focus visibility,
skip-link behavior, console-error guards, and a full internal-link crawl
(every link on the homepage resolves, no 404s) are all covered by the
existing `tests/smoke.spec.ts` and related spec files, re-verified
passing as part of this sprint's full suite run.

## New coverage added this sprint

- `buildCustomerConfirmationEmail` — HTML-escaping, no-price/no-guarantee
  guard, lead-id/service-reference presence (3 tests).
- `createSupabaseResendAdapter` orchestration — customer confirmation
  sent exactly once per fresh store, recorded correctly on
  success/failure, attempted even when the owner notification fails,
  never sent twice for an idempotent replay, test-lead labeling
  best-effort call (6 tests).

## Real production verification (external, this sprint)

- `https://www.greencalpressurewashing.com/` → HTTP 200, HTTPS, HSTS
  present, correct `www` canonicalization (non-www 308-redirects).
- `apps/greencal-website/scripts/health-check.mjs` run directly against
  live production: 10/11 checked pages returned 200 (the one failure —
  `/favicon-32x32.png` 404 — is the pre-fix state, expected until the
  new deployment goes live; see `docs/launch/OWNER_ACTIONS_REQUIRED.md`).
  Both mobile (390px) and desktop (1440px) viewports confirmed: `tel:`
  link present, estimate CTA present, quote form present, zero console
  errors, zero failed network requests.

## Accessibility essentials (pre-existing, re-verified via the suite)

Semantic landmarks (header/main/footer), a working skip-navigation link,
visible keyboard-focus states, exactly one primary heading per page,
correct heading nesting (fixed in an earlier session: `ServiceCard`
`<h2>`→`<h3>`) — all covered by `tests/smoke.spec.ts` and passing.

## Known non-blocking issues

- Favicon is legible at 48px+ but soft at the literal 16-32px browser-tab
  size (mechanical resize of a detailed logo, not a new icon design —
  see `apps/greencal-website/public/README-favicon.md`).
- No IP/velocity-based rate limiting on the quote form (honeypot +
  idempotency are the current, documented spam defenses).
- `PUBLIC_GTM_CONTAINER_ID` configuration in Vercel could not be
  confirmed from this repository (see `docs/launch/GREENCAL_ANALYTICS.md`).
