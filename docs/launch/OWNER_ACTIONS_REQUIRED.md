# Owner Actions Required

Status: the concise, actionable list — see individual docs for detail.
Ordered by urgency.

## 0f. ACTION REQUIRED — orphan-booking investigation, then migration 036 (BLOCKER-002)

- **Status**: BLOCKER-001 (booking creation `42501`) is resolved -
  migrations 033-035 all confirmed run. A related issue surfaced
  during that incident: one orphan `Booking` row (no linked `Job`)
  exists from a failed attempt, and nothing yet prevents a second
  Booking being created for the same Estimate. See
  `docs/launch/CRM_V1_RELEASE_READINESS.md` BLOCKER-002 for the full
  investigation query and cleanup options.
- **Action**: run the two read-only investigation queries in that
  document first. Only if they confirm no two `bookings` rows share an
  `estimate_id`, run `packages/db/migrations/036-bookings-one-per-estimate.sql`.
  If a real duplicate is found, resolve it per BLOCKER-002's cleanup
  options _before_ running migration 036 - the migration will fail
  outright (correctly) if a duplicate still exists.
- **Result once run**: a database-level guarantee that an Estimate can
  never have more than one Booking, on top of the admin-console UI
  already hiding the "Create booking + job" form once one exists.

## 0. RESOLVED — admin-console login incident (migrations 024-026)

- **Status**: fully resolved and owner-verified. After migration 022,
  admin-console login broke with "Your account has no business
  membership yet" for every user. Three migrations, all confirmed run
  against `Greencal-production`, were needed:
  - `packages/db/migrations/024-fix-membership-rls-recursion.sql` -
    fixed a real Postgres RLS bug (`42P17`, infinite recursion) in two
    of migration 022's policies. See DECISIONS.md ADR-0035.
  - `packages/db/migrations/025-restore-memberships-select-grant.sql` -
    fixed a second, unrelated issue: `42501`, "permission denied for
    table memberships" - a missing base table-level `SELECT` grant for
    `authenticated` (a different privilege layer from RLS, evaluated
    before RLS policies ever run). See DECISIONS.md ADR-0036.
  - `packages/db/migrations/026-restore-membership-roles-select-grant.sql` -
    the identical `42501` issue recurred one table further into the
    same query, for `membership_roles`. Same fix, same reasoning.
- **Verified**: `/api/debug/membership` returned real membership data
  (business `GreenCal Pressure Washing`, roles
  `owner-admin`/`office-manager`) with no error, and the dashboard
  loads normally. The temporary diagnostic route
  (`apps/admin-console/src/pages/api/debug/membership.ts`) and the
  investigative logging added while chasing this have been removed;
  only the permanent error-path logging improvement in
  `getCurrentMembership()` remains. No action needed - kept for
  reference only.

## 0e. RESOLVED — migrations 027-030, including a V1.0 smoke-test incident (`leads` grant)

- **Status**: all four confirmed run against `Greencal-production`
  during the V1.0 production smoke test:
  - `027-invoice-payment-persistence.sql`, `028-review-request-persistence.sql`,
    `029-estimate-rejection.sql` - ran cleanly, each independently
    verified via read-only queries (tables, RLS, policies, columns,
    constraints all confirmed matching).
  - `030-restore-leads-select-update-grant.sql` - a real incident found
    mid-smoke-test: the Leads page failed with Postgres `42501`,
    "permission denied for table leads." Diagnosed as the same
    base-grant privilege-layer issue as the earlier `memberships`/
    `businesses`/`membership_roles` incident (ADR-0035/ADR-0036) - RLS
    and all policies were confirmed correct; `leads` simply never had
    an explicit `GRANT` in any migration. Fixed with the same
    minimal, evidence-based pattern: `grant select, update on
public.leads to authenticated;`. See DECISIONS.md ADR-0040.
- **Watch for**: `contacts` is the next most likely table to show the
  identical symptom (also missing an explicit grant in every
  migration, also read by the Lead detail page). If `permission denied
for table contacts` appears, the fix is the same narrow pattern -
  flag it and it will be resolved the same way, on that evidence.
- **Action**: none - already done.

## 1. Prevent Supabase auto-pause from silently killing lead capture (urgent)

- **Screen**: Supabase dashboard → the GreenCal project (`Greencal-production`)
  → **Settings → Billing** (or **General**, where the plan/pause policy is shown).
- **What happened**: during this session's final acceptance test, the
  production lead form returned `delivery_failed` for every submission
  — the Supabase project had auto-paused (the standard free/low-tier
  behavior after a period of inactivity). You resumed it manually and
  the pipeline recovered on its own within about 2 minutes (confirmed:
  the failure mode moved from a connection-level error, to a
  "table not found" schema-cache miss, to a clean successful insert —
  the normal cold-start sequence after a resume). A real test lead
  (`fa8a9559-df4a-438c-b6bd-f9ddd27653cb`) then completed successfully
  end to end.
- **Why this matters**: while paused, a real customer's estimate
  request is **silently lost** — they only see "we couldn't send your
  request, please call or email us directly," with no error surfaced
  anywhere the owner would see it unless someone happens to check
  Vercel's runtime logs.
- **Action**: upgrade the Supabase project to a tier that does not
  auto-pause (or confirm one already prevents it), so this cannot
  recur unattended.
- **Expected result**: lead capture stops depending on someone noticing
  and manually resuming a paused database.

## 2. Vercel production deployment (resolved — no action needed)

- Commit `937eab5` (and `34b7692`) are live in production as of this
  session; this item is kept only as a record. If a future push to
  `main` doesn't appear live within a few minutes, check `vercel.com` →
  team **Leads Initiative** → project **ai-company-os-greencal-website**
  → **Settings → Git** → **Production Branch** is `main`.

## 3. Supabase migration (safe, not urgent, run whenever convenient)

- **Screen**: Supabase dashboard → the GreenCal project → SQL Editor.
- **Action**: run
  `apps/greencal-website/src/lib/quote-form/supabase-migration-002-lead-status.sql`
  once.
- **Expected result**: adds a `status` lifecycle column, `consent_at`,
  `is_test_lead`, and `customer_confirmation_status` tracking. Purely
  additive — the lead pipeline already works without this and will
  keep working identically before and after.

## 3b. Internal-CRM migrations 004-023 (RESOLVED — all confirmed run)

- **Status**: `packages/db/migrations/001` through `023` have all been
  run against the live `Greencal-production` Supabase project
  (owner-confirmed). This includes the retry of `022-team-roster.sql`
  after `004`-`013` were run to create the `membership_roles` table it
  depends on. No further action needed here. Full schema/RLS is now
  live. Kept below for reference only.
- **Screen**: Supabase dashboard → the GreenCal project (`Greencal-production`)
  → SQL Editor. **Different migration chain from item 3 above** - these
  are the internal admin-console CRM (`apps/admin-console`), not the
  public quote-form pipeline.
- **Reference - what was run**:
  - `packages/db/migrations/004-company-foundation.sql` (Company
    persistence)
  - `packages/db/migrations/005-note-foundation.sql` (Note persistence)
  - `packages/db/migrations/006-task-foundation.sql` (Task persistence)
  - `packages/db/migrations/007-multi-role-memberships.sql` (lets your
    account hold `office-manager` alongside `owner-admin` - see below)
  - `packages/db/migrations/008-additional-business-tenants.sql`
    (registers GreenCal Mobile Detailing and Navarro Builders as CRM
    tenants - name/slug only, no other business data)
  - `packages/db/migrations/009-photo-foundation.sql` (before/progress/
    after job photo storage - creates a private Storage bucket)
  - `packages/db/migrations/010-estimate-approval.sql` (adds an
    approval step to Estimates)
  - `packages/db/migrations/011-archive-support.sql` (adds
    archive/restore for Contacts, Companies, and Leads)
  - `packages/db/migrations/012-actor-tracking.sql` (records which
    staff member created/completed/approved/uploaded a Task, Photo,
    Estimate, or Booking - needed for the Activity Timeline's
    "filter by employee")
  - `packages/db/migrations/013-estimate-line-items.sql` (adds a
    service-package catalog and itemized estimate line items)
  - `packages/db/migrations/014-estimate-pricing.sql` (adds tax rate,
    discount amount, and deposit amount columns to Estimates)
  - `packages/db/migrations/015-estimate-attachments.sql` (adds a
    private Storage bucket and table for photos attached to an
    Estimate)
  - `packages/db/migrations/016-estimates-update-policy-fix.sql` (fixes
    a real gap: `estimates` was missing an update permission that
    Estimate-approval and pricing changes have depended on since they
    were added - **this one matters more than the others**, since
    without it those two features silently fail against real
    production data)
  - `packages/db/migrations/017-estimate-customer-approval.sql` (adds
    the token/expiry columns behind the public customer
    estimate-approval link)
  - `packages/db/migrations/018-business-profile.sql` (adds
    address/phone/email/website fields to your business profile, plus
    a permission fix so profile edits actually save)
  - `packages/db/migrations/019-business-branding.sql` (adds a logo
    upload and brand color)
  - `packages/db/migrations/020-business-service-areas.sql` (adds a
    list of cities/regions you serve)
  - `packages/db/migrations/021-business-hours.sql` (adds working
    hours, one row per day of week)
  - `packages/db/migrations/022-team-roster.sql` (lets your team see
    each other's roles and, for an owner-admin, grant or revoke a
    role)
  - `packages/db/migrations/023-notifications.sql` (adds an in-app
    notification center - staff are notified when a customer approves
    an Estimate)
- **Action**: none - already done. (Historical note: each file was
  additive-only - new tables, one additive column, or - for 007/008 -
  new rows only.)
- **Result (confirmed)**: `companies`, `notes`, and `tasks` tables exist
  with tenant-scoped RLS, and `apps/admin-console`'s Companies/Notes/
  Tasks UI (already built and locally tested) can read/write real data
  once 004-006 are applied. Running 007 additionally grants your
  existing GreenCal owner account an `office-manager` role alongside
  `owner-admin`, so most Lead/Job status changes in `apps/admin-console`
  that currently show an honest "not authorized" rejection will start
  succeeding. Running 008 makes GreenCal Mobile Detailing and Navarro
  Builders exist as real CRM tenants (schema only - no staff account is
  linked to either yet; that is a separate future action once you're
  ready to onboard them). Running 009 lets Job detail pages accept
  before/progress/after photo uploads. Running 010 lets Estimates be
  approved before being booked into a Job. Running 011 lets you archive
  (and restore) old Contacts, Companies, and Leads from the default
  list views without deleting them. Running 012 lets the Activity
  Timeline show which staff member performed each action. Running 013
  lets you itemize estimates into priced lines (optionally from a
  reusable service-package catalog) instead of a single flat amount.
  Running 014 lets you set a tax rate, a fixed-dollar discount, and a
  deposit amount on a draft Estimate. Running 015 lets you attach
  reference photos to an Estimate. Running 016 fixes Estimate approval
  and pricing updates actually taking effect against real data (see the
  callout above). Running 017 lets staff generate a public link a
  customer can use to review and approve an Estimate without an
  account. Running 018 lets you fill in and save your business's
  address/phone/email/website under Settings. Running 019 lets you
  upload a logo and set a brand color. Running 020 lets you list the
  cities/regions you serve. Running 021 lets you set weekly working
  hours. Running 022 lets your team see each other's roles and lets an
  owner-admin change them. Running 023 turns on the notification
  center - staff get notified in-app when a customer approves an
  Estimate. The admin-console itself is not yet deployed
  to a live Vercel project (see the "not done" note in
  `docs/crm/CRM_ARCHITECTURE.md`), so this has no live-user-facing
  effect until that deployment also happens.

## 3c. RESOLVED — `apps/admin-console`'s 3 production environment variables are configured

- **Status**: confirmed resolved. `apps/admin-console` is live and has
  successfully read/written real Supabase data in production (booking +
  job creation, invoice + payment creation and persistence, tenant
  login and dashboard identity) - which is only possible if all three
  variables below are correctly set in Vercel. Kept below for reference
  only - useful if these ever need rotating, or if a second business's
  admin-console instance needs the same setup.
- **Screen**: Vercel → team **Leads Initiative** → the `apps/admin-console`
  project → Settings → Environment Variables.
- **The exact 3 variables used** (confirmed - `apps/admin-console`'s
  code reads exactly these three and nothing else):
  1. `SUPABASE_URL` - the same project URL already used by
     `apps/greencal-website` (format `https://<project-ref>.supabase.co`).
     Find it: Supabase dashboard → `Greencal-production` project →
     Settings → API → **Project URL**.
  2. `SUPABASE_ANON_KEY` - the anon/public key for that same project.
     Find it: same screen → **Project API keys** → `anon` `public`.
  3. `SUPABASE_SERVICE_ROLE_KEY` - the service-role/secret key for that
     same project. Find it: same screen → **Project API keys** →
     `service_role` `secret`. **Treat this one as a real secret** - it
     bypasses Row Level Security entirely. Used by exactly one narrow
     route in this app (`/approve/[token]`, the public customer
     estimate-approval link - see DECISIONS.md ADR-0030) - every other
     route uses only the anon key. If it is ever exposed, rotate it
     immediately in the Supabase dashboard.
- **Action**: none - already done.

## 3d. RESOLVED — the `apps/admin-console` Vercel project exists and is deployed

- **Status**: confirmed resolved. `apps/admin-console` is deployed live
  on Vercel as a Git-connected project (Root Directory
  `apps/admin-console`), correctly resolving its internal
  `workspace:*` dependencies (`@ai-company-os/core-models`,
  `@ai-company-os/db`, `@ai-company-os/ui-kit`) - the same pattern
  already used for `apps/greencal-website`. Login, dashboard, role
  resolution, and this session's booking/job/invoice/payment production
  verification all ran against this live deployment.
- **Action**: none - already done. Kept below for reference only, in
  case a second business's admin-console instance is ever deployed the
  same way.
- **Why a Git-connected project was necessary** (historical rationale,
  still correct for any future instance): the only Vercel tool
  available in this repository (`deploy_to_vercel`) uploads a flat file
  tree with no monorepo/workspace awareness - it cannot correctly
  resolve `workspace:*` dependencies the way a real `pnpm install` can.
  A Git-connected project (Root Directory set to the app's path) runs
  the real build against the actual repo instead, resolving workspace
  packages correctly.

## 3e. Decide on real email/SMS notification sending (only if wanted - not required for anything built so far)

- **Screen**: none yet - this is a decision, not a configuration step.
- **Why**: "Notifications" (Settings/Phase 1) asked for Email events,
  SMS events, and Customer notifications alongside the internal
  notification center that's already built (see DECISIONS.md
  ADR-0034). None of those three can be built for real without a
  credential that doesn't exist in this repository today:
  - **Email events** need a Resend (or equivalent) API key configured
    specifically for `apps/admin-console` - the existing
    `RESEND_API_KEY` only exists for `apps/greencal-website`'s
    separate public quote-intake pipeline.
  - **SMS events** need an SMS provider account (e.g. Twilio) - no
    such credential or account exists anywhere in this project.
  - **Customer notifications** need one of the above (email/SMS) or a
    real customer-facing portal (`apps/web-console` remains an unbuilt
    Phase 1 placeholder) - neither exists yet.
  - **Emma integration hooks**: Emma (see DECISIONS.md ADR-0008) has
    no real voice/chat implementation anywhere in this repository -
    there is nothing real to hook into yet.
- **Action**: when you're ready, supply the relevant credential (a
  Resend API key for `apps/admin-console`, and/or an SMS provider
  account) and confirm which specific events should actually send a
  real email/SMS (e.g. "notify the customer by email when their
  Estimate is approved"). Until then, nothing here is blocking any
  other feature - internal, in-app notifications already work today.
- **Expected result**: staff-facing internal notifications work right
  now, with no action needed. Customer-facing email/SMS notifications
  remain unbuilt until a credential is supplied.

## 4. Z.ai account balance (only if real GLM classification is wanted)

- **Screen**: Z.ai account dashboard → billing/balance.
- **Action**: add a balance/resource package.
- **Expected result**: the GLM pilot's authentication is already
  confirmed working (see `docs/cloud/GLM_SANDBOX_PILOT.md`) — it failed
  only on `HTTP 429: Insufficient balance`. Not required for GreenCal's
  lead pipeline to work; only needed if you want real AI-assisted lead
  classification.

## 5. Hostinger VPS (only when ready for cloud automation)

- **Screen**: Hostinger account (purchase/login required — this session
  has no access at all).
- **Action**: provision per `docs/cloud/HOSTINGER_VPS_SETUP.md`.
- **Expected result**: unblocks n8n, the AI gateway, agent worker, and
  monitoring as always-on services. **Not required for GreenCal to
  receive real leads today** — the website and lead pipeline run
  entirely on Vercel + Supabase + Resend, independent of Hostinger.

## 6. Confirm `PUBLIC_GTM_CONTAINER_ID` in Vercel (optional, for analytics)

- **Screen**: Vercel → project → Settings → Environment Variables.
- **Action**: confirm this variable is set if you want conversion
  tracking active (phone clicks, estimate funnel events).
- **Expected result**: without it, the site works identically — analytics
  events simply no-op rather than firing, by design.

## 7. Confirm Supabase backup/PITR tier (optional, recommended)

- **Screen**: Supabase → project → Settings → Database → Backups.
- **Action**: confirm the current backup retention matches your
  comfort level for real customer lead data.
- **Expected result**: informational only — Supabase manages this
  independently of this repository.
