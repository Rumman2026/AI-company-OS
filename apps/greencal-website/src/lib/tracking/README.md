# Tracking - provider-neutral event layer

Stage 4 of the GreenCal revenue-launch sprint. Covers the site-wide
analytics/tracking abstraction (`src/lib/tracking/`), its wiring into
`BaseLayout.astro` and `QuoteForm.astro`, and the footer tracking
preferences control (`src/components/Footer.astro`).

## Tracking inventory (before this stage)

A fresh scan of `apps/greencal-website` for `gtag`, `GTM-`, `googletagmanager`,
`google-analytics`, `UA-`, `dataLayer`, `fbq`, Meta Pixel, Footbridge
references, and call-tracking/cookie-banner code found **zero matches** in
production code - the only hits were the existing Stage 2 regression test
asserting their absence, and one prose mention of "never a Footbridge
system" in the Stage 3 quote-form README. No Google Analytics property, GA4
measurement ID, Universal Analytics ID, GTM ID, Google Ads conversion ID/
label, analytics script, pixel, consent-management code, cookie banner, or
privacy page existed anywhere in this app before this stage. No tracking-
related environment variable existed. Classification: **no findings to
report as GreenCal-owned, Footbridge-controlled, or unknown - a clean
baseline.**

## Selected architecture: GTM, currently inactive

No GreenCal-owned GTM container ID, GA4 measurement ID, or Google Ads
conversion ID/label was supplied for this stage. Per the Stage 4 operating
policy, none was invented, guessed, or copied from Footbridge.

The architecture is built around **Google Tag Manager** (the preferred
option when approved) rather than direct GA4/Ads integration, because a
single GTM container avoids scattering multiple hard-coded provider IDs
across page components and lets the owner configure/adjust GA4 and Ads tags
later without further code changes:

```
Website components
  -> trackEvent() (provider-neutral, src/lib/tracking/track.ts)
  -> window.dataLayer push
  -> GreenCal-owned GTM container (once approved)
  -> GreenCal-owned GA4 / Google Ads tags (configured inside GTM, not in this repo)
```

**Current activation status: fully inactive.** No container ID is
configured (`PUBLIC_GTM_CONTAINER_ID` is unset in `.env.example` and there
is no `.env` file in this repo), so:

- `getTrackingConfig()` always returns `{ gtmContainerId: null }`.
- `trackEvent()` and `initializeGtmIfApproved()` no-op immediately, before
  touching `dataLayer` or the DOM.
- No script from `googletagmanager.com` (or any other third party) is
  loaded anywhere in the built output.

This was verified directly against the production build (see the Stage 4
validation report) - zero tracking scripts, zero `dataLayer` entries, in
the shipped HTML/JS.

## Configuration

Centralized in `config.ts`. The only identifier this app currently reads:

| Variable                  | Scope                                                | Required today?                     | Format        |
| ------------------------- | ---------------------------------------------------- | ----------------------------------- | ------------- |
| `PUBLIC_GTM_CONTAINER_ID` | Public (client-exposed via Astro's `PUBLIC_` prefix) | No - reserved for future activation | `GTM-XXXXXXX` |

Malformed or absent values resolve to `null`, never a guess. No GA4
measurement ID or Google Ads conversion ID/label variable is defined yet -
none were approved, so none were added speculatively (per Stage 4 section
3). If direct GA4/Ads integration is approved instead of GTM in a future
stage, the corresponding variables should be added to `.env.example` at
that time, not before.

## Provider-neutral tracking module

- `types.ts` - the stable `TrackedEventName` union and non-PII
  `TrackEventParams` shape.
- `gtm-id.ts` - `isValidGtmContainerId()`, the pure format-validation
  helper, kept separate from `config.ts` so it is directly unit-testable.
- `config.ts` - `getTrackingConfig()`, reads and validates
  `PUBLIC_GTM_CONTAINER_ID` via `import.meta.env`.
- `consent.ts` - narrowly-scoped `localStorage` consent state
  (`greencal-tracking-consent`), defaults to `{ analyticsGranted: false }`,
  fails safe (never assumes consent) if storage is blocked or unreadable.
- `gtm.ts` - `initializeGtmIfApproved()`, the only place that would ever
  inject the GTM script tag. No-ops unless a valid container ID is
  configured **and** consent is granted. Idempotent via a DOM check
  (`script[data-greencal-gtm]`), so it can be called from multiple places
  without loading the script twice.
- `track.ts` - the pure, testable `trackEvent(input, context)` core.
  Deliberately imports nothing from `config.ts`/`consent.ts`/`gtm.ts` (see
  below); safe no-op when the passed-in config/consent aren't active.
- `production.ts` - `trackEvent(input)`, the **real entry point every
  component calls** (`bind.ts`, `QuoteForm.astro`). Resolves the real
  config/consent, triggers `initializeGtmIfApproved()` when appropriate,
  and forwards to `track.ts`'s pure core.
- `quote-form-events.ts` - `mapSubmissionResultToEvent()`, the **mandatory
  conversion safeguard** (see "Conversion rules" below).
- `bind.ts` - `bindEngagementTracking()`, wires `phone_click`,
  `email_click`, and `quote_cta_click` to every matching link site-wide,
  guarded per-element (`data-tracking-bound`) so repeated calls never
  double-bind a listener.

**Why the `track.ts`/`production.ts` split:** `config.ts` reads
`import.meta.env`, which the Playwright test runner's CommonJS transform
cannot parse at all (a real, verified failure, not a hypothetical one) -
any file that statically imports it fails to load under Node-level unit
tests. `track.ts` is kept free of that dependency (and of `gtm.ts`, which
also imports `config.ts`) so `tests/tracking-unit.spec.ts` can exercise the
real gating/event-shape/conversion logic directly in Node with injected
config/consent/sink values. `production.ts` carries the real-environment
wiring and is verified instead via real browser tests
(`tests/tracking.spec.ts`) against the actual built site.

## Event taxonomy

| Event                              | Fired from                      | Notes                                                                                                                                                                           |
| ---------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `phone_click`                      | any `a[href^="tel:"]`           | `contactMethod: 'phone'`, `placement` derived from ancestor context                                                                                                             |
| `email_click`                      | any `a[href^="mailto:"]`        | `contactMethod: 'email'`                                                                                                                                                        |
| `quote_cta_click`                  | any `a[href*="#quote-form"]`    | e.g. the "Or request a quote online" links                                                                                                                                      |
| `quote_form_view`                  | `QuoteForm.astro` init          | once per page load                                                                                                                                                              |
| `quote_form_start`                 | first `focusin` inside the form | once per page load (native `{ once: true }` listener)                                                                                                                           |
| `quote_form_validation_failed`     | `submitQuoteForm()` result      | `errorCount`, no field names or values                                                                                                                                          |
| `quote_form_pending_configuration` | `submitQuoteForm()` result      | **diagnostic only - see conversion rules**                                                                                                                                      |
| `quote_form_delivery_failed`       | `submitQuoteForm()` result      | diagnostic only                                                                                                                                                                 |
| `quote_form_success`               | `submitQuoteForm()` result      | **only when `status === 'success'`**                                                                                                                                            |
| `page_view`                        | reserved                        | not wired to a manual call site - if GTM is activated, GTM's built-in page-view trigger should be used instead of a duplicate manual `page_view` push, to avoid double-counting |

Event names are stable; do not rename them without updating this table and
any owner-side GA4/Ads event mapping.

## Conversion rules (mandatory)

`quote-form-events.ts`'s `mapSubmissionResultToEvent()` is the **only**
function that decides which event a quote-submission result produces, and
it is a straight `switch` over the four-state `QuoteSubmissionResult`
union:

- `status: 'success'` -> `quote_form_success` **only here**.
- `status: 'validation_failed'` -> `quote_form_validation_failed`.
- `status: 'pending_configuration'` -> `quote_form_pending_configuration`.
- `status: 'delivery_failed'` -> `quote_form_delivery_failed`.

The current production adapter (`../quote-form/adapter.ts`'s
`unavailableAdapter`) always resolves to `pending_configuration`, so **in
production today this function can only ever emit
`quote_form_pending_configuration` - it is structurally impossible for
production code to emit `quote_form_success`** until a real delivery
adapter is activated (Stage 5). This is verified directly in
`tests/tracking-unit.spec.ts` and `tests/quote-form.spec.ts`.

`quote_form_pending_configuration` must be treated by the owner as an
**internal diagnostic event only** - it must never be marked as a GA4 key
event or mapped to any Google Ads conversion action. `phone_click` and
`email_click` may be configured as engagement or secondary conversions in
GreenCal's own accounts, but this code never assumes or auto-classifies
either as a completed lead.

## GA4 mapping (once a GreenCal-owned property exists)

| Event                                                                                            | GA4 treatment                                                                                            |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `phone_click`, `email_click`, `quote_cta_click`                                                  | ordinary engagement events; optionally mark as secondary conversions in GA4's UI                         |
| `quote_form_view`, `quote_form_start`                                                            | ordinary engagement events, not conversions                                                              |
| `quote_form_validation_failed`, `quote_form_pending_configuration`, `quote_form_delivery_failed` | diagnostic events - **not** key events                                                                   |
| `quote_form_success`                                                                             | the only quote-form event eligible to be marked a GA4 key event, and only once live delivery is verified |

## Google Ads mapping (once approved)

- Primary conversion candidate: **backend-confirmed `quote_form_success`
  only** - must not be wired to fire until live lead delivery is verified
  (Stage 5).
- Possible secondary conversions: `phone_click`, `email_click`.
- `quote_form_view`, `quote_form_start`, `quote_form_validation_failed`,
  `quote_form_pending_configuration`, `quote_form_delivery_failed` must
  never be counted as a primary conversion.
- No Google Ads conversion action, label, or forwarding number was created
  or referenced. No dynamic number insertion or third-party call tracking
  was added - the existing GreenCal phone number remains as static,
  visible content throughout.

## Consent architecture

- Default state is **not granted** (`analyticsGranted: false`) - no
  preselected optional consent, no dark pattern.
- `trackEvent()` and `initializeGtmIfApproved()` both check consent before
  doing anything; declining leaves every core site function (navigation,
  phone/email links, quote form) fully working, since none of them depend
  on tracking being active.
- A minimal, non-blocking preference control lives in the footer
  (`<details>`/`<summary>`, native and keyboard-accessible with no custom
  JS required to expand/collapse) - a single "Allow optional analytics
  tracking" checkbox, unchecked by default, with honest status text ("No
  optional tracking is currently active on this site" while no container
  ID is configured). This is not a blocking banner/popup and does not
  interrupt any page.
- Changing the preference is possible at any time by reopening the same
  footer control - no separate flow is required.
- No compliance claim (GDPR, CCPA, CPRA, or otherwise) is made anywhere in
  this code or copy. This is a technical, inactive-by-default foundation,
  not a legal position. **Before any real GTM container is activated, the
  owner should confirm whether the current consent model satisfies their
  applicable legal requirements** - that review has not happened and is
  out of scope for this stage.

## Search Console

Inspected `BaseLayout.astro` and `apps/greencal-website` for any existing
Search Console verification (HTML meta tag, uploaded verification file, or
GA/GTM-based verification): **none exists**. Per the Stage 4 instructions,
the owner already has Search Console access, and no code change was made
here - domain-property verification (via DNS, outside this repo) is the
presumed existing method and requires no action in this codebase. If the
owner's actual verification method is instead an HTML meta tag or file that
needs to be re-added for this specific origin, that requires the owner to
supply the real token; none was invented here.

## PII exclusions

No event anywhere in this module ever includes: full name, phone number,
email address, service address/location, project description, any other
form field content, or an IP address collected by application code. Field
values are represented only as counts (`errorCount`) or fixed enum-like
strings (`submissionState`, `contactMethod`, `placement`) - never as raw
user input.

## Activation checklist for Stage 5

1. Owner supplies a GreenCal-owned GTM container ID (and, if relevant, a
   confirmed GA4 measurement ID and Google Ads conversion ID/label,
   configured inside that GTM container - not hard-coded here).
2. Set `PUBLIC_GTM_CONTAINER_ID` in a real (untracked) `.env` file.
3. Re-verify in a real browser that: the container loads only after a
   visitor explicitly grants consent via the footer control; `dataLayer`
   receives exactly the events in the taxonomy above; no duplicate script
   load occurs.
4. Confirm inside GTM/GA4/Ads (not in this repo) that `quote_form_success`
   is the only event mapped to the primary lead conversion, and that
   `quote_form_pending_configuration` is excluded from key events/
   conversions.
5. Only after Stage 5 activates real quote-form delivery (so
   `quote_form_success` becomes reachable in production) should the
   primary Google Ads conversion actually be relied upon for reporting.
