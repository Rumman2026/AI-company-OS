# GreenCal Analytics

Status: durable record of the analytics/conversion-tracking
implementation. See `apps/greencal-website/src/lib/tracking/`.

## Mechanism

A consent-gated GTM `dataLayer` push (`track.ts`'s `trackEvent()`) —
no-ops entirely unless both a GTM container id is configured
(`PUBLIC_GTM_CONTAINER_ID`) and analytics consent has been granted. Pure
core logic is unit-tested with fakes; production wiring
(`production.ts`) resolves the real config/consent and is not itself
unit-testable (reads `import.meta.env`), consistent with the same
documented split used in `server-config.ts`.

## Event taxonomy

| Event                              | Trigger                                                       | Corresponds to DoD concept      |
| ---------------------------------- | ------------------------------------------------------------- | ------------------------------- |
| `phone_click`                      | any `tel:` link clicked, anywhere on the site                 | phone conversion tracking       |
| `email_click`                      | any `mailto:` link clicked                                    | —                               |
| `quote_cta_click`                  | any link to `#quote-form` clicked                             | estimate-start (CTA engagement) |
| `quote_form_view`                  | the quote form section is viewed                              | estimate-start (form reached)   |
| `quote_form_start`                 | the customer begins filling the form                          | estimate-start                  |
| `quote_form_success`               | `QuoteSubmissionResult.status === 'success'` only             | estimate-success                |
| `quote_form_validation_failed`     | client-side-caught or server-rejected invalid input           | estimate-error (validation)     |
| `quote_form_pending_configuration` | backend not configured (should not occur in production today) | estimate-error (configuration)  |
| `quote_form_delivery_failed`       | storage or notification failure                               | estimate-error (delivery)       |

`mapSubmissionResultToEvent()` (`quote-form-events.ts`) is the single,
unit-tested place that decides this mapping — `quote_form_success` is
emitted if and only if the trusted adapter actually confirmed delivery;
every other status maps to its own diagnostic event, never to success.

## What is confirmed vs. what requires owner action

- **Confirmed**: every event listed above exists, is wired into the
  real components (`QuoteForm.astro`, `bind.ts`), and is exercised by
  the test suite (`tests/tracking-unit.spec.ts`).
- **Owner action required**: `PUBLIC_GTM_CONTAINER_ID` must be set in
  Vercel for events to actually leave the browser (this repository has
  no visibility into whether it's currently configured — Vercel env var
  values are never read by this session). Until it is, `trackEvent()`
  correctly no-ops rather than silently failing or fabricating data.
- Also requires a real GTM container + consent-management configuration
  (cookie banner wiring) to actually grant `analyticsGranted` — outside
  this repository's scope; see `src/lib/tracking/README.md` if present,
  or `production.ts`/`consent.ts` for the exact consent-gating contract.
