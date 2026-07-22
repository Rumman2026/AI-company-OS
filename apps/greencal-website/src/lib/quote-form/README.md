# Quote form - submission boundary and live delivery

Stage 3 built the `/contact-us` quote-request form
(`src/components/QuoteForm.astro`) and its typed, provider-neutral
submission boundary. **Stage 4A connects that boundary to a real,
GreenCal-owned backend** (Vercel + Supabase + Resend, per DECISIONS.md
ADR-0006) so the form can move beyond `pending_configuration` once the
owner configures real credentials. The Stage 3 form, validation, lead
contract, typed response states, and adapter interface are all reused
unchanged - Stage 4A only adds a new adapter implementation and the
server route that uses it.

## Runtime model (Stage 4A)

|                    | Before                      | After                                                                   |
| ------------------ | --------------------------- | ----------------------------------------------------------------------- |
| Astro `output`     | `'static'`                  | `'static'` (unchanged)                                                  |
| Adapter            | none                        | `@astrojs/vercel`                                                       |
| Prerendered routes | all 6 pages + `sitemap.xml` | unchanged - all 6 pages + `sitemap.xml`                                 |
| On-demand routes   | none                        | `src/pages/api/quote-submit.ts` only (`export const prerender = false`) |

`output` stays `'static'` deliberately - see ADR-0006. Only the new
quote-submission endpoint opts out of prerendering; every other page is
unaffected. This is the least invasive architecture that satisfies the
requirement (a trusted server runtime for exactly one endpoint).

**Known adapter limitation, verified directly during implementation:**
`@astrojs/vercel` does not support the `astro preview` command at all
("The @astrojs/vercel adapter does not support the preview command").
Local and CI testing therefore uses `astro dev` instead (see
`playwright.config.ts`) - this is the standard, documented local-testing
path for Astro projects using an on-demand adapter route. Astro 7 also
auto-detects AI-agent environments and silently daemonizes `astro dev` in
a way that breaks Playwright's process lifecycle management unless
`ASTRO_DEV_BACKGROUND=1` is set (also set in `playwright.config.ts`).
Full production-runtime verification (the actual Vercel serverless
function) requires a real Vercel deployment - out of scope for this
stage; see "Stage 4B / final launch prerequisites" below.

## Submission-boundary design (Stage 3, unchanged)

- `validation.ts` - the trusted validation boundary. Pure, synchronous,
  accepts `unknown` (defensive against malformed payloads), returns
  `{ valid: true, data }` or `{ valid: false, fieldErrors }`. Never throws.
- `adapter.ts` - defines `QuoteSubmissionAdapter` (`submit(input, context)
=> Promise<QuoteSubmissionResult>`) and exports `unavailableAdapter`,
  the fallback used whenever required backend configuration is absent. It
  always returns `pending_configuration` and never fabricates a `leadId`
  or timestamp.
- `submit.ts` - `submitQuoteForm(raw, { pagePath, adapter? })` is the
  single typed entry point. Validates first; only validated data reaches
  an adapter.

## Server route and client wiring (Stage 4A, new)

- `src/pages/api/quote-submit.ts` - the trusted server endpoint. Parses
  the JSON body, selects a real adapter if `getServerConfig()` returns a
  complete configuration, otherwise falls back to `unavailableAdapter`,
  then calls the existing `submitQuoteForm()` unchanged. Always responds
  HTTP 200 with the typed `QuoteSubmissionResult` JSON body - the `status`
  field is the source of truth, not the transport status code.
- `src/components/QuoteForm.astro` - now `fetch()`es
  `/api/quote-submit` instead of calling `submitQuoteForm` directly (which
  would only ever be able to reach the client-inert `unavailableAdapter`
  from the browser). All existing accessible-validation-experience UI
  logic (error summary, inline errors, status region, duplicate-submit
  lock, tracking calls) is unchanged - only the data-fetching mechanism
  changed. A network-level failure (request never reaching the server, or
  an unparseable response) is mapped to `delivery_failed` client-side -
  never fabricated success.

## Approved backend stack (DECISIONS.md ADR-0006)

- **Vercel** - hosting and the serverless runtime for
  `src/pages/api/quote-submit.ts`.
- **Supabase** - durable lead storage (`quote_leads` table).
- **Resend** - notification email to `greencaliforniacorporation@gmail.com`.

No other hosting, database, or email provider is authorized (see
ADR-0006's scope note).

- `server-config-validation.ts` - pure format-validation helpers, kept
  free of `import.meta.env` so they are directly unit-testable (see
  "Why the split" below).
- `server-config.ts` - `getServerConfig()`, reads and validates all five
  required server-only environment variables together. Returns `null` -
  triggering the `unavailableAdapter` fallback - unless every one is
  present and well-formed. Never guesses, never partially activates.
- `idempotency.ts` - `computeIdempotencyKey()`, a deterministic SHA-256
  fingerprint of a submission's content (no timestamp), used as the
  Supabase unique-constraint key for deduplication.
- `lead-store.ts` - the `LeadStore` interface (narrow: `insertLead`,
  `markNotificationStatus`) and `createSupabaseLeadStore()`, the real
  Supabase implementation. Only the orchestration layer depends on the
  narrow interface, not the Supabase SDK directly.
- `notification-sender.ts` - the `NotificationSender` interface and
  `createResendNotificationSender()`, the real Resend implementation.
  Exports `escapeHtml()` and `buildLeadNotificationEmail()` as pure,
  independently-testable functions - every customer-supplied field is
  HTML-escaped before interpolation.
- `supabase-resend-adapter.ts` - `createSupabaseResendAdapter(store,
notifier)`, the pure orchestration logic implementing the approved
  delivery/success policy below. Depends only on the narrow
  `LeadStore`/`NotificationSender` interfaces - fully unit-testable with
  fakes, no real SDK or network involved.
- `supabase-schema.sql` - the exact SQL to run once against a
  GreenCal-owned Supabase project (this repository has no migration
  tooling - `packages/db` is a placeholder).

**Why the `server-config.ts` / `server-config-validation.ts` split, and
why `track.ts`/`production.ts` in the Stage 4 tracking module follow the
same pattern:** `server-config.ts` reads `import.meta.env`, which the
Playwright test runner's CommonJS transform cannot even parse (a verified
failure). Pure validation logic lives in a separate file with no
`import.meta` reference so it stays directly unit-testable.

## Response-state contract (unchanged)

```ts
type QuoteSubmissionResult =
  | { status: 'success'; leadId: string; submittedAt: string }
  | { status: 'validation_failed'; fieldErrors: Record<string, string>; message: string }
  | { status: 'pending_configuration'; message: string }
  | { status: 'delivery_failed'; message: string };
```

Production behavior today (no real credentials configured in this
session): `getServerConfig()` returns `null`, so `/api/quote-submit`
always falls back to `unavailableAdapter` - production can only reach
`validation_failed` or `pending_configuration`, verified directly against
the running dev server. `success` and the Supabase/Resend-specific
`delivery_failed` paths are reachable only once real environment
variables are configured, and are exercised in tests only via injected
fake `LeadStore`/`NotificationSender` implementations - never a real
network call.

## Approved delivery and success policy

1. Trusted server-side validation must pass (`validateQuoteInput` inside
   `submitQuoteForm`), including the honeypot check.
2. Supabase storage is attempted. **Storage failure -> `delivery_failed`;
   Resend is never called; nothing is reported as delivered.**
3. An idempotent replay (the exact same content already stored, detected
   via the unique `idempotency_key` constraint) -> `success` with the
   existing lead's id; **no second notification is sent.**
4. A fresh, successful store -> the Resend notification is attempted.
5. Notification succeeds -> `success`; `notification_status` recorded as
   `sent`.
6. **Notification fails -> the lead remains stored (never deleted, never
   lost)**, `notification_status` is recorded as `failed`, and the result
   is `delivery_failed` with a message deliberately distinct from the
   total-storage-failure message - it acknowledges the request was
   received without claiming full delivery, and directs the customer to
   call or email rather than inviting a resubmission (which would just
   collide with the same idempotency key). **This is the documented
   partial-failure tradeoff**: the typed contract has no fifth
   "partially delivered" state, so `delivery_failed` is the closest
   honest fit, distinguished only by message text. Operational follow-up
   for a `notification_status: 'failed'` row is a manual review step (not
   automated in this stage) - see "Remaining owner setup actions" below.

Never fabricated: `success` is returned only from the two paths above
(idempotent replay of an already-successful lead, or a fresh
store-and-notify that both succeeded).

## Idempotency and duplicate protection

- **Key generation**: SHA-256 of the normalized submission's content
  (name, phone, email, service, location, description, and the four
  optional fields) - excludes any timestamp, so identical resubmissions
  always produce the same key (`idempotency.ts`).
- **Deduplication mechanism**: a Postgres `unique` constraint on
  `quote_leads.idempotency_key` (`supabase-schema.sql`). No time-window
  expiry is applied - an identical resubmission is treated as the same
  lead indefinitely, not just within a short window. This is a
  deliberate, simple v1 tradeoff, documented here rather than
  implemented as a TTL/expiry mechanism.
- **Behavior on safe retry** (e.g. a client-side network timeout that
  actually reached the server): the retried request produces the same
  idempotency key, the insert hits the unique constraint, the existing
  row is looked up, and `success` is returned with the original lead id -
  no duplicate Supabase row, no duplicate Resend email (Resend is not
  re-invoked for a duplicate/idempotent-replay insert).
- **Resend-level idempotency**: `createResendNotificationSender()` also
  passes Resend's own `idempotencyKey` (keyed by lead id) on every send,
  as a second layer of protection against a duplicate email if the same
  fresh insert's notification step were somehow invoked twice.
- Client-side duplicate-submit locking (the `isSubmitting` flag and
  disabled submit button in `QuoteForm.astro`) is preserved unchanged.

## Supabase setup (owner action required)

1. Create (or use an existing) GreenCal-owned Supabase project.
2. Run `supabase-schema.sql` once against that project (SQL editor or
   `psql`) - creates `quote_leads`, its indexes, the unique
   `idempotency_key` constraint, and enables Row Level Security with
   **no permissive policies** (the service-role key bypasses RLS by
   design; do not add an anon-role policy).
3. Retrieve the project URL and the **service-role** key (not the anon/
   public key) from Supabase's project settings.
4. Configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel's
   server-only environment variables (never `PUBLIC_`-prefixed).
5. Decide a data-retention policy for `quote_leads` - not implemented in
   this stage; no automatic deletion/archival exists yet.

## Resend setup (owner action required)

1. Create (or use an existing) GreenCal-owned Resend account.
2. Verify a sending domain (or an approved single sender identity) in
   Resend - required before `RESEND_FROM_ADDRESS` will actually deliver.
3. Create an API key and configure `RESEND_API_KEY` in Vercel's
   server-only environment variables.
4. Set `RESEND_FROM_ADDRESS` to the verified sender (e.g.
   `"GreenCal Pressure Washing <noreply@greencalpressurewashing.com>"`).
5. `NOTIFICATION_RECIPIENT_EMAIL` is pre-set to the approved
   `greencaliforniacorporation@gmail.com` in `.env.example` - confirm
   this is still correct before activation.
6. Confirm the Resend account is out of any sandbox/test-recipient
   restriction mode before relying on it for real customer leads.

## Environment variables

| Variable                       | Scope       | Required                 | Purpose                                                      |
| ------------------------------ | ----------- | ------------------------ | ------------------------------------------------------------ |
| `PUBLIC_GTM_CONTAINER_ID`      | Public      | No (Stage 4 tracking)    | GTM container id                                             |
| `SUPABASE_URL`                 | Server-only | Yes, with the other four | GreenCal Supabase project URL                                |
| `SUPABASE_SERVICE_ROLE_KEY`    | Server-only | Yes, with the other four | Privileged Supabase access for the trusted server route only |
| `RESEND_API_KEY`               | Server-only | Yes, with the other four | Resend API authentication                                    |
| `RESEND_FROM_ADDRESS`          | Server-only | Yes, with the other four | Verified Resend sender identity                              |
| `NOTIFICATION_RECIPIENT_EMAIL` | Server-only | Yes, with the other four | Approved lead-notification recipient                         |

All five Stage 4A variables are required **together** - `getServerConfig()`
returns `null` (triggering the honest `pending_configuration` fallback)
unless every one is present and well-formed. Configure real values only
in Vercel's project settings (and, for local testing, an untracked
`.env` file) - `.env.example` contains placeholder names only. No
speculative, vendor-specific variable was added for any provider not
approved in ADR-0006.

## Secrets handling

- No real credential value exists anywhere in this repository - only
  placeholder names in `.env.example`.
- `SUPABASE_SERVICE_ROLE_KEY` and `RESEND_API_KEY` are read only inside
  `server-config.ts`, which is only ever imported from
  `src/pages/api/quote-submit.ts` (a server-only route) - never from any
  client-side script or component.
- Neither key is `PUBLIC_`-prefixed, so Astro never inlines them into the
  client bundle - verified directly against the built output (see the
  Stage 4A validation report).
- Error responses returned to the client never include raw provider
  errors, stack traces, or configuration details - see
  `supabase-resend-adapter.ts` and `src/pages/api/quote-submit.ts`.

## Spam and abuse protections

Active now, enforced server-side (authoritative, since validation moved
into the trusted `/api/quote-submit` route in Stage 4A):

- Hidden honeypot field, rejected at the trusted validation boundary.
- Maximum field lengths on every field.
- Service allowlist (rejects forged/arbitrary service values).
- Consent required.
- Defensive parsing of malformed/non-object payloads.
- Server-side duplicate protection via the idempotency key and unique
  constraint (see above).

Still require further work, not implemented this stage:

- Request-size limits beyond whatever the Vercel platform enforces by
  default - no custom streaming/size-check layer was added.
- Any IP-based or velocity-based abuse/rate-limiting detection.

No reCAPTCHA, Cloudflare Turnstile, hCaptcha, or other third-party
service was added - none is approved.

## Remaining owner setup actions

1. Provision/confirm the GreenCal-owned Supabase project and run
   `supabase-schema.sql`.
2. Provision/confirm the GreenCal-owned Resend account and verify a
   sender domain/identity.
3. Configure all five Stage 4A environment variables in a real Vercel
   project (Stage 4B/5 - deployment itself is out of scope here).
4. Decide the operational review process for a lead whose
   `notification_status` is `failed` (the lead is safely stored but the
   email didn't go out - see "Approved delivery and success policy" #6).
5. Decide a data-retention policy for `quote_leads`.

## Real end-to-end test procedure (Stage 4B, not performed this session)

1. Configure all five environment variables with real values in a
   Vercel preview deployment.
2. Submit one controlled test lead through the real `/contact-us` form.
3. Confirm the row appears in Supabase's `quote_leads` table with the
   expected fields and `lead_storage_status: 'stored'`.
4. Confirm the notification email arrives at
   `greencaliforniacorporation@gmail.com` and `notification_status` is
   `sent`.
5. Confirm the UI displayed the honest `success` state.
6. Resubmit the exact same test data and confirm no duplicate Supabase
   row and no duplicate email were created (idempotent replay).
7. Only after all of the above are verified should `quote_form_success`
   be relied upon for any Google Ads/GA4 conversion reporting (Stage 4B
   tracking activation).
