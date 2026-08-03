# GreenCal Lead Flow

Status: durable record of the production lead-capture pipeline. See
`apps/greencal-website/src/lib/quote-form/README.md` for full
implementation detail — this document is the launch-sprint summary.

## Pipeline

```
Public estimate form (/contact-us)
  -> POST /api/quote-submit (Vercel serverless function, the only on-demand route)
  -> server-side validation (validateQuoteInput - honeypot, allowlists, limits, consent)
  -> Supabase insert (quote_leads table, idempotency-key unique constraint)
  -> Resend: owner notification email
  -> Resend: customer confirmation email (new this sprint)
  -> typed QuoteSubmissionResult back to the browser
```

## Required lead fields — mapped to the actual schema

| Requested field          | Actual column(s)                                      |
| ------------------------ | ----------------------------------------------------- |
| Lead ID                  | `lead_id` (UUID, primary key)                         |
| Name                     | `full_name`                                           |
| Phone                    | `phone` (normalized to E.164)                         |
| Email                    | `email`                                               |
| Property address         | `service_location`                                    |
| City                     | `city` (canonical slug from `src/data/cities.ts`)     |
| Property type            | `property_type` (optional)                            |
| Requested service        | `service`                                             |
| Message                  | `project_description`                                 |
| Preferred contact method | `preferred_contact_method` (optional)                 |
| Source page              | `page_path`                                           |
| Lead source              | `source` (constant `website_quote_form`)              |
| Consent timestamp        | `consent_at` (new this sprint, migration 002)         |
| Created timestamp        | `created_at`                                          |
| Status                   | `status` (new this sprint, migration 002 — see below) |

## Spam and duplicate protection

- **Honeypot**: hidden field, rejected at the trusted server boundary
  before any other validation.
- **Allowlists**: service and city values must match the site's own
  approved lists — a forged/arbitrary value is rejected.
- **Consent required**: no insert without an explicit consent checkbox.
- **Idempotency**: a SHA-256 fingerprint of the submission's content
  (excluding timestamp) is enforced as a Postgres unique constraint — an
  identical resubmission (network retry, accidental double-click) is
  detected and returns the original lead's id, never a duplicate row or
  a duplicate email.
- **Not implemented** (documented, non-blocking): IP/velocity-based rate
  limiting. Acceptable for launch given the two protections above; add
  if abuse is observed.

## Delivery and success policy (never fabricated)

1. Supabase storage fails → `delivery_failed`; Resend is never called;
   nothing is silently lost (the customer sees an honest error and is
   directed to call/email directly).
2. Idempotent replay → `success` with the original lead id; no second
   owner email, no second customer confirmation.
3. Fresh store → owner notification attempted. Success → `success`.
   Failure → lead remains stored (never deleted), `delivery_failed`
   returned with a message distinct from total failure, steering the
   customer to a redundant contact channel.
4. Fresh store (regardless of owner-notification outcome) → customer
   confirmation attempted (new this sprint). Its outcome never changes
   the returned result — the lead is already safely stored either way.

## Lead status lifecycle (new this sprint)

`new → contacted → estimate_scheduled → estimate_sent → won / lost / spam / archived`

Defaults to `new` on insert. No admin UI updates this yet — use the
Supabase table editor directly. Requires
`supabase-migration-002-lead-status.sql` to be run once (owner action,
safe/additive, does not block the pipeline either way).

## Test-lead identification

An internal-only `__testLead: true` JSON field (never sent by the public
form) triggers best-effort labeling via a new `is_test_lead` column.
Combined with the existing convention of a clearly fake name/description
(e.g. "PRODUCTION TEST SUBMISSION — DO NOT CONTACT"), this lets test
leads be filtered out of real reporting once the migration is applied.

## Environment variables (unchanged this sprint)

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`,
`RESEND_FROM_ADDRESS`, `NOTIFICATION_RECIPIENT_EMAIL` — all five
required together in both Preview and Production Vercel scopes. No new
variable was added for the customer-confirmation email (reuses the same
Resend credential).
