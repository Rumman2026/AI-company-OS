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
- `apps/greencal-website/scripts/health-check.mjs` re-run directly
  against live production after deployment completed: 11/11 pages
  returned 200. Both mobile (390px) and desktop (1440px) viewports
  confirmed: `tel:` link present, estimate CTA present, quote form
  present, zero console errors, zero failed network requests.

## Final production acceptance test (end to end, this sprint)

- **First attempt**: a labeled test lead (`__testLead: true`) submitted
  via curl to `/api/quote-submit` returned `delivery_failed`. Root cause
  (via `mcp__vercel__get_runtime_errors`/`get_runtime_logs`): the
  Supabase project had auto-paused; the fetch to it failed at the
  network level (`TypeError: fetch failed`, `httpStatus: 0`). This is
  not a code regression — `insertLead`'s core logic was untouched this
  sprint, and the failure is a real, current infrastructure state, not
  a mocked or hypothetical one.
- Owner resumed the Supabase project. Retries over the next ~2 minutes
  showed the expected cold-start sequence: `httpStatus: 521` (Cloudflare
  origin still starting) → `PGRST205`/"table not found in schema cache"
  (PostgREST warming up) → clean success with no error logged.
- **Real successful test lead**: `leadId fa8a9559-df4a-438c-b6bd-f9ddd27653cb`,
  stored `2026-08-03T17:22:34.698Z`, `HTTP 200`, `{"status":"success"}`.
- **Browser-driven verification** (Playwright, real production page,
  not curl): filled and submitted the public `/contact-us` form with
  the same content (deliberately, to exercise the idempotency path
  safely — confirmed same `leadId` returned, `duplicate` semantics, no
  second row, no second owner/customer email). Confirmed: correct
  customer-facing success message ("Thank you - your request was
  received. We will contact you soon."), zero console errors, zero
  Vercel runtime errors for the request.
- **Analytics**: `window.dataLayer` was empty and no GTM-related network
  calls occurred during the browser submission — consistent with the
  already-documented, pre-existing gap (`PUBLIC_GTM_CONTAINER_ID` not
  confirmed configured in Vercel), not a new defect. `trackEvent()`
  correctly no-oped rather than erroring.
- **New operational finding**: Supabase auto-pause is a real, silent,
  revenue-critical risk (a paused project makes every real customer
  lead fail the same way, with no visible error to the owner). Recorded
  as owner-action item 1 in `docs/launch/OWNER_ACTIONS_REQUIRED.md`.
- **No secrets observed**: all diagnosis used Vercel's runtime
  error/log tools (sanitized by `lead-store.ts`'s own redaction) and
  presence-only environment checks — no credential value was ever
  read, printed, or logged during this investigation.

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
