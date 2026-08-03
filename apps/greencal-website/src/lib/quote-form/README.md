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

### Required Vercel environment scope

Every Stage 4A variable must be set for **both Preview and Production**
(this repository has no branch-specific override) so that a controlled
preview deployment can exercise the same configuration production will
use. None are needed in Development scope unless someone chooses to run
`vercel dev` locally instead of `astro dev`.

| Variable                       | Development | Preview  | Production | Redeploy required after change? |
| ------------------------------ | ----------- | -------- | ---------- | ------------------------------- |
| `PUBLIC_GTM_CONTAINER_ID`      | Optional    | Optional | Optional   | Yes                             |
| `SUPABASE_URL`                 | Not needed  | Required | Required   | Yes                             |
| `SUPABASE_SERVICE_ROLE_KEY`    | Not needed  | Required | Required   | Yes                             |
| `RESEND_API_KEY`               | Not needed  | Required | Required   | Yes                             |
| `RESEND_FROM_ADDRESS`          | Not needed  | Required | Required   | Yes                             |
| `NOTIFICATION_RECIPIENT_EMAIL` | Not needed  | Required | Required   | Yes                             |

Vercel bakes environment variables into a deployment at build/runtime
start - saving a new value in Project Settings does **not** change any
deployment that is already running. A deployment created before the
variable was added or changed will keep using the old value (or keep
falling back to `pending_configuration` if the variable was previously
absent) until either a fresh deployment is triggered (e.g. a new push to
the branch) or an existing deployment is explicitly redeployed from the
Vercel dashboard.

## Vercel project configuration (Git linkage and production branch)

This repository contains no `vercel.json` and no committed `.vercel/`
project-link metadata (`.vercel/` is gitignored - see `.gitignore` and
`.prettierignore`). Vercel's GitHub integration does not require any
in-repo file - the repository-to-project link, the production branch,
the root directory, and the build/output commands are all configured
entirely in the Vercel dashboard. **None of that configuration can be
confirmed from this repository alone.** The owner must confirm the
following in Vercel before a controlled preview test is attempted:

**Vercel dashboard -> [project] -> Settings -> Git:**

1. **Connected Git repository** - must be this GitHub repository
   (whichever org/repo `feat/greencal-revenue-launch` is pushed to).
2. **Production branch** - expected to be `main` (this repository's
   default branch per root `CLAUDE.md`), not `feat/greencal-revenue-launch`.
   Confirm this explicitly; do not assume. A controlled preview test must
   never run against a deployment built from the Production Branch
   setting.
3. **Root directory** - must be `apps/greencal-website` (this is a pnpm
   monorepo; a root directory of `.` would build the wrong app or fail).
4. **Build command / Output directory / Install command** - Astro with
   `@astrojs/vercel` normally auto-detects these
   (`pnpm install` / `astro build` / framework-managed output via
   `.vercel/output`); confirm no manual override contradicts that,
   especially any override left over from before the adapter was added.
5. **Ignored Build Step** - confirm nothing here would skip building this
   app on pushes to `feat/greencal-revenue-launch`.
6. **Automatic deployments / Preview Deployments** - confirm Preview
   Deployments are enabled for this branch (or for all non-production
   branches), so pushing to `feat/greencal-revenue-launch` actually
   produces a preview URL.

**Vercel dashboard -> [project] -> Settings -> Environment Variables:**

1. Confirm each of the five Stage 4A variables (table above) exists with
   **Preview** scope checked (and Production, separately, for eventual
   launch) - not Development-only.
2. Confirm no branch-specific override for `feat/greencal-revenue-launch`
   silently contradicts the shared Preview values.
3. After adding/changing any variable, trigger a new deployment (push, or
   the dashboard's "Redeploy" action on the latest preview) and confirm
   the **new** deployment - not a cached older one - is what gets tested.

This repository's own CI (`.github/workflows/ci.yml`) only runs lint,
typecheck, build, and Playwright tests on push/PR to `main`/`develop` - it
does not deploy anywhere. `.github/workflows/deploy.yml` is an explicit,
unimplemented placeholder (`workflow_dispatch` only, echoes a placeholder
line). Neither workflow provides evidence of, or performs, any Vercel
deployment - deployment is entirely the Vercel GitHub integration's
responsibility, configured in the dashboard.

## Controlled preview verification procedure (Stage 4B activation)

Once the Vercel Git/environment-variable configuration above is
owner-confirmed and a fresh preview deployment exists for
`feat/greencal-revenue-launch` with all five variables set:

1. Open the preview URL Vercel generated for this branch (found on the
   Vercel dashboard's Deployments list, not guessed or constructed).
2. Submit exactly one test lead through `/contact-us` using clearly
   fake, non-production data, e.g. full name
   `GREENCAL PREVIEW TEST — DO NOT CONTACT`, a non-working phone number,
   and a test email address the owner controls.
3. Record only non-sensitive evidence: the preview URL, submission
   timestamp, HTTP status, the `status` field from the JSON response, and
   (if visible in Resend's dashboard) the provider request id - never the
   full email body or any real customer data.
4. Confirm in Supabase that exactly one `quote_leads` row was created
   with `lead_storage_status: 'stored'` and `notification_status: 'sent'`.
5. Confirm exactly one notification email arrived at
   `greencaliforniacorporation@gmail.com`.
6. Resubmit the identical test data once and confirm no second Supabase
   row and no second email were created (idempotent replay - see
   "Idempotency and duplicate protection" above).
7. Only after all of the above are independently confirmed should this
   stage's delivery be described as verified - a successful HTTP response
   alone is not sufficient evidence.

This procedure was **not** performed as part of any automated stage in
this repository - it requires real, owner-provisioned Supabase/Resend
credentials and a real Vercel preview deployment, none of which exist in
this local development environment.

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

## Customer confirmation email (added alongside the production launch sprint)

In addition to the owner notification above, a fresh (non-duplicate)
successful store also triggers a customer-facing confirmation email via
the same Resend account (`notification-sender.ts`'s
`sendCustomerConfirmation()` / `buildCustomerConfirmationEmail()`) - a
short, factual message confirming the request was received, with no
price, availability promise, or guarantee (unit-tested directly for
this). Its outcome (`sent`/`failed`) is recorded via
`LeadStore.markCustomerConfirmationStatus()` but **never changes the
returned `QuoteSubmissionResult`** - the lead is already safely stored
and the owner-notification path already governs `success` vs
`delivery_failed`; a failed customer confirmation is a best-effort
courtesy gap, not a lost lead. No new environment variable is required -
it reuses `RESEND_API_KEY`/`RESEND_FROM_ADDRESS`.

## Test-lead labeling

`src/pages/api/quote-submit.ts` accepts an internal-only top-level
`__testLead: true` field (alongside the existing `pagePath` field) -
never sent by the public `QuoteForm.astro` UI, never documented for
customer use. When present, `LeadStore.markTestLead()` is called
best-effort after a successful insert. Use this only for a deliberately
labeled, owner-approved verification submission (see "Production
verification record" below for the established convention of also using
a clearly fake name/description).

## Lead status lifecycle and schema migration

`supabase-migration-002-lead-status.sql` (run once, after
`supabase-schema.sql`, in the Supabase SQL editor) adds: a `status`
lifecycle column (`new` / `contacted` / `estimate_scheduled` /
`estimate_sent` / `won` / `lost` / `spam` / `archived`, defaulting to
`new`), a `consent_at` timestamp, the `is_test_lead` flag column used
above, and the `customer_confirmation_status`/`_provider_id`/`_error_code`
columns used above. **This migration is purely additive and safe to run
at any time** - the application's insert path does not depend on any of
these columns existing (Postgres applies the defaults automatically),
and every new best-effort update call
(`markCustomerConfirmationStatus`/`markTestLead`) already tolerates the
columns not existing yet via the same try/catch pattern as the
pre-existing `markNotificationStatus`. No admin UI exists yet to update
`status` after the fact - use the Supabase table editor directly, or
build a future admin tool.

## CRM intake linking (DECISIONS.md ADR-0009)

`crm-intake-adapter.ts` best-effort creates a `Contact`+`Lead` record in
the new `packages/db`-backed CRM tables (`contacts`, `leads`,
`audit_log` - see `docs/crm/CRM_ARCHITECTURE.md`) for every fresh, real
submission, and links it back via `quote_leads.lead_id`
(`supabase-migration-003-crm-link.sql`, run once after
`packages/db/migrations/001-crm-foundation.sql`). Every Lead status
change after creation routes through `packages/core-models`'
`transitionLead()` state machine, never a raw column write. This is
entirely additive: a missing table, a linking failure, or the
`CrmIntake` parameter being omitted all leave lead storage, owner
notification, and customer confirmation completely unaffected - see the
`supabase-resend-adapter.ts` tests covering this.

## Remaining owner setup actions

1. ~~Provision/confirm the GreenCal-owned Supabase project and run
   `supabase-schema.sql`.~~ Done - project provisioned, schema executed,
   and independently verified (table, RLS enabled, zero permissive
   policies, expected columns/indexes/constraints all confirmed via a
   read-only query against `information_schema`/`pg_catalog`).
2. ~~Provision/confirm the GreenCal-owned Resend account and verify a
   sender domain/identity.~~ Done - `greencalpressurewashing.com` verified
   in Resend; a production, sending-only API key has been issued.
3. ~~Configure all five Stage 4A environment variables in a real Vercel
   project.~~ Done - all five configured in both Preview and Production
   scope; `main` is now Vercel's Production Branch (merged from
   `feat/greencal-revenue-launch`). A first live test caught
   `SUPABASE_SERVICE_ROLE_KEY` initially holding the `anon`/public key
   instead of the `service_role`/secret key (RLS - enabled with zero
   permissive policies - correctly rejected the insert); corrected in
   Vercel for both Preview and Production.
4. Decide the operational review process for a lead whose
   `notification_status` is `failed` (the lead is safely stored but the
   email didn't go out - see "Approved delivery and success policy" #6).
5. Decide a data-retention policy for `quote_leads`.
6. Run `packages/db/migrations/001-crm-foundation.sql` then
   `supabase-migration-003-crm-link.sql` (both additive, safe at any
   time) to activate CRM intake linking - see "CRM intake linking"
   above and `docs/crm/CRM_ARCHITECTURE.md`.

## Production verification record (2026-07-26)

A single controlled test lead was submitted directly to the live
`https://www.greencalpressurewashing.com/api/quote-submit` endpoint
(fake, clearly-marked data: full name "Production Test", phone
555-555-5555, city `moreno-valley`, service `roof-cleaning`, a
project description starting "PRODUCTION TEST SUBMISSION - DO NOT
CONTACT"). This row is a deliberate verification record, not customer
data - **do not delete it** without a separate decision; it is the only
evidence this pipeline has ever been proven end-to-end in production.

- **Result**: `{"status":"success","leadId":"9023f8eb-3106-475d-b1ae-ccdc02c82ee8","submittedAt":"2026-07-26T23:26:20.82+00:00"}`.
  Per the coded success policy above, this status is only reachable
  after a fresh store-and-notify both actually succeeded - so both the
  Supabase insert and the Resend notification are confirmed by this
  response, not assumed.
- **Vercel runtime logs**: zero errors at the time of this request.
- Three real misconfigurations were found and fixed by this test
  campaign before it succeeded, each confirmed via the sanitized
  diagnostic logging in `lead-store.ts`: (1) `SUPABASE_URL` initially
  failed to resolve at the network level (`TypeError: fetch failed`) -
  corrected; (2) the live `quote_leads` table was missing its `city`
  column relative to `supabase-schema.sql` (`PGRST204`) - added via
  `alter table ... add column if not exists city text;` plus a
  PostgREST schema-cache reload; (3) the `service_role` role had no
  table-level grants on `quote_leads` (`42501`) - fixed via `grant
select, insert, update on public.quote_leads to service_role;`.
- **Not yet independently verified**: an actual duplicate-submission
  (idempotent-replay) test against the live table - only unit-tested
  with fakes so far (see `tests/quote-delivery-unit.spec.ts`). No
  second live submission has been made since it would require another
  explicit approval; treat idempotency as unit-verified but not yet
  live-confirmed in production.
