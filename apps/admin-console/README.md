# Admin Console

The internal, authenticated, multi-tenant admin UI for AI Company OS's
CRM. See [DECISIONS.md](../../DECISIONS.md) ADR-0011 for the full
architecture rationale and `docs/crm/CRM_ARCHITECTURE.md` for the
honest, current done-vs-deferred status across all CRM milestones.

## What exists today (Milestone 3)

- Login, logout, and a full password-reset flow via Supabase Auth
  (`src/pages/login.astro`, `forgot-password.astro`, `reset-password.astro`,
  their API routes, and `src/middleware.ts`'s session guard).
- A tenant-aware dashboard (`src/pages/index.astro`) showing the
  logged-in user's business and lead-status counts.
- **Leads**: list (`src/pages/leads/index.astro`, filterable by status),
  detail with status-transition controls
  (`src/pages/leads/[id].astro` + `src/pages/api/leads/[id]/transition.ts`) -
  every transition routes through `packages/core-models`'
  `transitionLead()` state machine via `packages/db`'s `LeadRepository`.
- **Contacts**: list (searchable) and detail (read-only, including the
  contact's associated leads).
- `packages/ui-kit`'s first real components (Button, Badge, Table,
  EmptyState, ErrorBanner, LoadingSpinner, FormField).

## What is explicitly deferred

Companies, Estimates, Jobs, Tasks, Appointments, Notes, and Media have
**no UI here** - none of them have a persistence layer yet (`Job` and
`Estimate` exist as `packages/core-models` types with no repository;
`Company`, `Task`, `Appointment`, `Note` have no type or repository at
all). See ADR-0011's scope note.

## Architecture

- **Astro, `output: 'server'`** (every page is authenticated/dynamic,
  unlike `apps/greencal-website`'s mostly-static site), `@astrojs/vercel`,
  `@astrojs/react` for interactive islands.
- **Session**: `@supabase/ssr`'s cookie-based server client, refreshed by
  `src/middleware.ts` on every request.
- **Data access uses the Supabase anon key + the user's session, not the
  service-role key** - every query is subject to ADR-0010's tenant-scoped
  RLS at the database level, not just application-code filtering. See
  `src/lib/supabase/server-client.ts`.
- **`businessId` is never client-supplied** - every page/route resolves
  it from the real `memberships` row for the authenticated user
  (`src/lib/auth/membership.ts`), never from a query parameter or form
  field.
- **No public signup** - the owner's first account is created via the
  Supabase dashboard (Authentication → Users), then linked to a business
  via a `memberships` row (SQL, run once - see "Owner setup" below).

## Environment variables

See `.env.example`. Both `SUPABASE_URL` and `SUPABASE_ANON_KEY` are
required; if either is missing, every route returns HTTP 503 rather than
silently misbehaving (see `src/middleware.ts`).

## Owner setup (required before first login)

1. Create your user account: Supabase dashboard → Authentication → Users
   → Add user (with a password, or send a magic link).
2. Link that user to GreenCal's business with the `owner-admin` role:

   ```sql
   insert into memberships (business_id, user_id, role)
   values (
     (select id from businesses where slug = 'greencal-pressure-washing'),
     '<the new user''s id from Authentication -> Users>',
     'owner-admin'
   );
   ```

3. Configure `SUPABASE_URL`/`SUPABASE_ANON_KEY` in Vercel for this app
   (a separate Vercel project from `apps/greencal-website` - not yet
   provisioned, see the launch report for this milestone).

## Known, not-yet-verified risk

`apps/greencal-website/astro.config.mjs` documents an extensive,
hard-won fix for a Vercel-build-only "Cannot find module 'tslib'"
failure when `@supabase/supabase-js` is bundled into a Vercel serverless
function - a failure that was never reproducible locally, only on
Vercel's own Linux build machine. This app also bundles
`@supabase/supabase-js` (via `@supabase/ssr`) into every page's render,
so the same class of failure is a real, live risk here, not yet
confirmed one way or the other against a real deployment (none exists
for this app). `astro.config.mjs` applies the same `noExternal`/
`external` settings preemptively; if the failure recurs, the fuller
`vendor/tslib` fix documented there is the next step.

## Scripts

- `pnpm run dev` - `astro dev` (port 4322)
- `pnpm run build` - `astro build`
- `pnpm run typecheck` - `astro check`
- `pnpm run lint` - ESLint (including `.astro` files)
- `pnpm run test` - Playwright test runner, pure-logic unit tests only
  this milestone (no real Supabase Auth credentials exist in this
  environment to drive a real browser session against)
