# Quote form - submission boundary

Stage 3 of the GreenCal revenue-launch sprint. Covers the `/contact-us`
quote-request form (`src/components/QuoteForm.astro`) and this directory's
shared, typed logic.

## Rendering mode and backend inventory

- Astro version: `^7.0.7`. `astro.config.mjs` sets `output: 'static'` and
  installs no server adapter (`@astrojs/node`, `@astrojs/vercel`, etc.).
  The entire site, including `/contact-us`, is prerendered at build time -
  there is no live server request handling anywhere in this app.
- No GreenCal-owned or approved server runtime, database, email relay, or
  CRM ingestion endpoint exists in this monorepo. Inventory taken before
  writing this module:
  - Astro server routes / API endpoints / Actions - **unavailable** (no
    adapter installed; `output: 'static'` cannot serve on-demand routes).
  - Serverless functions - **unavailable** (no hosting target configured;
    `.github/workflows/deploy.yml` is an explicit placeholder).
  - Supabase / any database client (Postgres, MongoDB, Prisma, Drizzle,
    Firebase) - **unavailable** (no reference anywhere in the repo).
  - `packages/db` - **unavailable** (placeholder `src/index.ts` only).
  - Email service adapter - **unavailable** (no dependency anywhere).
  - `packages/core-models` `Lead` / `LeadAttribution` / `FormSubmission`
    contracts - **available, but not used directly this stage**.
    `LeadAttribution.channel` is required and that package intentionally
    has no persistence layer (see its README's "deliberately excluded"
    list), so mapping this form's payload into that exact shape today
    would mean fabricating attribution/contact data this static site
    cannot honestly capture yet. `QuoteLeadRecord` (`types.ts`) instead
    keeps closely-matching field names so a future ingestion adapter can
    map `QuoteLeadRecord` -> `FormSubmission` + `Lead` + `LeadAttribution`
    without a redesign.
  - Reusable validation package - **unavailable**; validation lives here,
    local to this app.
  - Environment-variable convention - **available and approved**: flat
    `KEY=value` in `.env.example` / `config/env/.env.example`. Not used
    yet - see "Environment variables" below.
  - Secret-management pattern - **not applicable yet**; no live secret
    consumer exists in this app.
  - `apps/api-gateway`, `apps/core-api`, `apps/agent-orchestrator`,
    `apps/worker-service` - **unavailable**, placeholder `src/index.ts`
    only (see `.claude/rules/backend.md`).
  - Deployment adapter / hosting configuration - **unavailable** (no
    `netlify.toml`, `vercel.json`, or equivalent anywhere in the repo).

Conclusion: preserve the static build. No adapter, hosting provider, or
output-mode change was made this stage.

## Submission-boundary design

- `validation.ts` - the trusted validation boundary. Pure, synchronous,
  accepts `unknown` (defensive against malformed payloads), returns
  `{ valid: true, data }` or `{ valid: false, fieldErrors }`. Never throws.
- `adapter.ts` - defines `QuoteSubmissionAdapter` (`submit(input, context)
=> Promise<QuoteSubmissionResult>`) and exports `unavailableAdapter`,
  the production default. It always returns `pending_configuration` and
  never fabricates a `leadId` or timestamp, because no trusted delivery
  mechanism exists to back a `success` claim.
- `submit.ts` - `submitQuoteForm(raw, { pagePath, adapter? })` is the
  single typed entry point. Validates first; only validated data reaches
  an adapter. Defaults to `unavailableAdapter`; accepts an injected
  adapter (test-only in production code paths).
- `src/components/QuoteForm.astro` - the only caller in production code.
  Its client-side `<script>` builds the raw payload from `FormData` and
  calls `submitQuoteForm` with no adapter override, so production always
  resolves through `unavailableAdapter`.

## Response-state contract

```ts
type QuoteSubmissionResult =
  | { status: 'success'; leadId: string; submittedAt: string }
  | { status: 'validation_failed'; fieldErrors: Record<string, string>; message: string }
  | { status: 'pending_configuration'; message: string }
  | { status: 'delivery_failed'; message: string };
```

Today, production traffic can only ever reach `validation_failed` (bad
input) or `pending_configuration` (valid input, no live delivery). `success`
and `delivery_failed` are only reachable by injecting a test adapter into
`submitQuoteForm` (see `tests/quote-form-unit.spec.ts`) - never in the
shipped default path.

## Lead payload (`QuoteLeadRecord`)

Defined in `types.ts`: `leadId`, `createdAt`, `source`
(`'website_quote_form'`), `pagePath`, `fullName`, `phone`, `email`,
`service`, `serviceLocation`, `projectDescription`,
`preferredContactMethod?`, `preferredTiming?`, `propertyType?`,
`estimatedProjectSize?`, `consent`, `submissionStatus`. Only ever
constructed by an adapter that has actually accepted the lead (the
production `unavailableAdapter` never constructs one; only the test
adapter does, to prove the shape).

## Activation requirements (owner decisions still needed)

In order:

1. Approve a server adapter and hosting target for `apps/greencal-website`
   (or a separate lightweight delivery endpoint) so a request can reach a
   trusted server at all.
2. Approve a concrete delivery mechanism - e.g. a transactional email
   relay, or a GreenCal-owned database/CRM ingestion endpoint. Per the
   Stage 3 operating policy, this must be GreenCal-owned or
   GreenCal-approved, never a Footbridge system, and never connected
   without explicit owner approval.
3. Implement a real `QuoteSubmissionAdapter` behind the existing interface
   and swap it in for `unavailableAdapter` as the production default in
   `QuoteForm.astro`.
4. Update `.env.example` with the real, approved variable names once a
   provider is chosen (see below - none are added speculatively).

## Environment variables

None are defined yet. No server runtime in this app reads environment
variables today, so none are "actually required by the architecture" per
the Stage 3 instructions, and no vendor-specific variable names have been
guessed. Once an adapter and provider are approved, the expected shape is:

- A server-only delivery credential (e.g. an email-relay API key or
  database connection string) - **server-only, never exposed to the
  browser, never placed in a public `PUBLIC_`-prefixed Astro env var**.
- A neutral adapter-selection variable (e.g. which delivery mechanism is
  active) - server-only.

No speculative, vendor-specific variable names (e.g. a specific ESP's SDK
key name) are reserved here until the owner approves that specific
provider.

## Spam and abuse protections

Active today (enforced in `validation.ts`, run client-side since no server
exists):

- Hidden honeypot field, rejected at the trusted validation boundary.
- Maximum field lengths on every field.
- Service allowlist (rejects forged/arbitrary service values).
- Consent required.
- Defensive parsing of malformed/non-object payloads.

Require a live server to be meaningfully enforced (client-side checks
alone can be bypassed by a direct, non-browser request once a real
endpoint exists):

- Duplicate-submit prevention beyond the current UI-level guard (the
  `isSubmitting` flag and disabled submit button prevent accidental
  double-clicks in the browser, but nothing server-side yet rate-limits
  or de-duplicates requests).
- Request-size limits (no HTTP request is made today, so this is not yet
  applicable).
- Any IP-based or velocity-based abuse detection.

No reCAPTCHA, Cloudflare Turnstile, hCaptcha, or other third-party
service was added - none is approved.
