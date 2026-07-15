# Core Models Package

Provider-neutral domain contracts for the GreenCal Lead-to-Job-to-Content
growth system. See the Growth System Plan and its first-slice implementation
prompt (both from the GreenCal Phase 2A planning conversation) for the full
architecture; this README covers only what is actually implemented here.

## What this package contains

- Branded, opaque identifiers for every domain entity (`ids.ts`), plus a
  structurally separate `PublishedProjectSlug` type for the only identifier
  ever meant to appear in a public URL.
- A floating-point-free `Money` type (`money.ts`).
- Shared actor/context/result contracts (`transition.ts`) used by all five
  state machines.
- Typed contracts for all ~28 entities in the growth-system model
  (`types/`).
- Full transition behavior - allowed edges, actor authorization,
  precondition evidence, typed rejection results - for exactly five
  lifecycles: Lead, Job, Invoice, Content, and Review Request
  (`state-machines/`).
- Consent-revocation effect evaluation (`consent-effects.ts`) - returns a
  typed list of required effects for a future adapter to execute; never
  mutates a database, website, CMS, photo store, or review platform
  directly.
- Photo-publication eligibility evaluation (`photo-eligibility.ts`) - no
  storage, upload, image conversion, or actual EXIF/GPS removal is
  implemented; this only refuses to consider a photo publishable unless the
  caller-supplied record already asserts those steps happened.
- Deterministic fixtures and a full `node:test` suite (`fixtures/`,
  `tests/`), plus dedicated compile-time type tests
  (`src/type-tests/`, checked by `tsc --noEmit`, never executed as a
  runtime test and never exported).

## Structural guarantees (enforced by the type/transition graph, not by comment)

- The Content state machine has no edge from any pre-review state to
  `published`. Every path to `published` requires first passing through a
  human-only `content-reviewer` `approved` transition. `ai-drafting-service`
  is an authorized actor for exactly one edge in the entire table:
  `eligible-for-draft -> draft-generated`.
- Every branded ID type is structurally distinct at compile time (e.g.
  `LeadId` is not assignable to `JobId`) - see `src/type-tests/`.
- `PublishedProjectSlug` and `PublishedProjectId` are never interchangeable.
- Consent revocation for a publication-related purpose always returns at
  least one required effect - it can never be a silent no-op.
- A private photo original is never modeled as a publicly addressable
  asset; publishability requires an explicit public derivative reference
  plus recorded metadata-stripping, privacy-review, and human-approval
  flags.

## What is deliberately excluded from this slice

Database persistence, API routes, UI, Astro pages, an admin dashboard, a
technician interface, authentication, authorization infrastructure, CRM/
scheduling/invoicing/payment/photo-storage/email/SMS/call-tracking/
analytics/AI-model integrations, actual EXIF or GPS removal, content
publication, city or service pages, and any other externally observable
side effect. No dependency was added to support any of the above - see
`package.json`, unchanged except for a new `test` script.

## Known, deliberate deferrals

- "Owner/Admin may correct a terminal Lead" has no defined target state in
  the approved plan and is not implemented - no reopen/reset/correction
  mechanism exists for Lead.
- The Growth System Plan's "AI or human editor" phrasing for the Content
  `changes-requested -> under-review` resubmission edge was narrowed to
  human actors only (`content-reviewer`, `marketing-editor`), in favor of
  the stricter, more explicit "AI-accessible workflow may reach no further
  than Draft Generated" guarantee from the approved implementation
  instructions.
- A future payment-ledger model may eventually separate invoice lifecycle
  status from payment/delinquency status - the current Invoice state
  machine intentionally was not redesigned to anticipate that.

## Scripts

- `pnpm run lint` - ESLint
- `pnpm run typecheck` - `tsc --noEmit` (includes the compile-time type
  tests under `src/type-tests/`)
- `pnpm run test` - `tsx --test "tests/**/*.test.ts"` (Node's built-in test
  runner; no test-framework dependency was added)
- `pnpm run format` - Prettier
