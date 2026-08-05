# Owner Actions Required

Status: the concise, actionable list — see individual docs for detail.
Ordered by urgency.

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

## 0b. ACTION REQUIRED — Invoice/Payment migration (027, safe, not urgent)

- **Status**: `packages/db/migrations/027-invoice-payment-persistence.sql`
  has been written and locally tested (124/124 `packages/db` tests
  passing) but **not yet run** against `Greencal-production` - this
  environment has no Supabase CLI or credential access, so every
  migration in this project is applied by you, manually, in the
  Supabase SQL Editor.
- **What it adds**: two new tables, `invoices` and `payments`, both
  tenant-scoped with row-level security enabled. Additive only - no
  existing table, column, or policy is changed.
- **Action**: open Supabase → SQL Editor → paste the full contents of
  `packages/db/migrations/027-invoice-payment-persistence.sql` → run.
- **Result once run**: `apps/admin-console`'s new `/invoices` list page,
  invoice detail page (status transitions, payment recording), and the
  new "Invoices" section on each Job's detail page will read/write real
  data instead of failing against a missing table. See DECISIONS.md
  ADR-0037 and `docs/crm/CRM_ARCHITECTURE.md` Cluster 27.

## 0c. ACTION REQUIRED — Review-Request migration (028, safe, not urgent)

- **Status**: `packages/db/migrations/028-review-request-persistence.sql`
  has been written and locally tested (133/133 `packages/db` tests
  passing) but **not yet run** against `Greencal-production` - same
  manual-application requirement as every migration in this project.
- **What it adds**: two new tables, `review_requests` and
  `review_records`, both tenant-scoped with row-level security
  enabled. Additive only - no existing table, column, or policy is
  changed.
- **Action**: open Supabase → SQL Editor → paste the full contents of
  `packages/db/migrations/028-review-request-persistence.sql` → run.
- **Result once run**: the new "Reviews" section on each Job's detail
  page (request a review, opt a customer out, log a received review)
  will read/write real data instead of failing against a missing
  table. See DECISIONS.md ADR-0038 and `docs/crm/CRM_ARCHITECTURE.md`
  Cluster 28.

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

## 3c. ACTION REQUIRED — configure `apps/admin-console`'s 3 production environment variables (blocks deployment)

- **Why you, not me**: I have no Supabase access of any kind (confirmed
  no MCP tool, no credential) and the Vercel MCP tools available to me
  have no capability to read or set environment variables on any
  project (confirmed by inspecting every available Vercel tool - only
  deployment, logs, analytics, and protection-settings tools exist).
  Even if I had the values, there is no tool that lets me enter them.
  This is a hard capability gap, not a preference - these three must be
  entered by you, directly in the Vercel dashboard.
- **Screen**: Vercel → team **Leads Initiative** → the `apps/admin-console`
  project → Settings → Environment Variables. **This project does not
  exist yet** - see item 3d below for why creating it also needs your
  action, and do that first so this screen exists. Apply each variable
  to **Production, Preview, and Development** (or at minimum
  Production) so the app works in every environment you might check.
- **The exact 3 variables needed** (confirmed - `apps/admin-console`'s
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
- **Action**: copy each of the three values from Supabase (per above)
  directly into Vercel's Environment Variables screen. Do not paste
  these values into chat with me or into any file that gets committed -
  `apps/admin-console/.env.example` documents the variable _names_ and
  format only, with placeholder/empty values, exactly as it already
  does today.
- **Expected result**: without all three, `apps/admin-console` returns
  an honest 503 "Admin console is not configured" response rather than
  erroring or exposing anything (see `src/middleware.ts`) - safe, but
  not usable. Without just `SUPABASE_SERVICE_ROLE_KEY` specifically,
  every other route works normally and only the public approval page
  shows "this approval link isn't available right now" instead of
  erroring.
- **Once you've added all three**, tell me and I'll deploy (or
  redeploy, if I already created the project) so the new values take
  effect.

## 3d. ACTION REQUIRED — create the `apps/admin-console` Vercel project (needs your account action, not just a credential)

- **Why you, not me**: `apps/admin-console` is a pnpm-workspace app that
  depends on three internal packages in this same monorepo
  (`@ai-company-os/core-models`, `@ai-company-os/db`,
  `@ai-company-os/ui-kit`, referenced via `workspace:*`). The only
  Vercel tool I have (`deploy_to_vercel`) uploads a flat file tree with
  no monorepo/workspace awareness - it cannot correctly resolve
  `workspace:*` dependencies the way a real pnpm install can. Using it
  here risks a broken or subtly wrong build for a real production
  system. The correct, standard way to deploy a monorepo app on Vercel
  - and the same way `apps/greencal-website` is already deployed - is a
    **Git-connected project** with its Root Directory set to
    `apps/admin-console`; Vercel then runs the real `pnpm install`/build
    against the actual repo, resolving workspace packages correctly.
    Connecting a new Vercel project to your GitHub repository requires an
    OAuth/GitHub-permission action only you can grant - no MCP tool
    exists for it.
- **Screen**: Vercel → team **Leads Initiative** → **Add New… → Project**
  → **Import Git Repository** → select this repository (the same one
  `ai-company-os-greencal-website` was imported from).
- **Action**:
  1. When prompted for **Root Directory**, set it to `apps/admin-console`
     (not the repo root - this is what tells Vercel which app in the
     monorepo to build).
  2. Framework should auto-detect as **Astro**.
  3. Add the three environment variables from item 3c above during
     this same import flow (Vercel lets you set them before the first
     deploy) - saves a redeploy step.
  4. Click **Deploy**.
- **Expected result**: a new Vercel project (e.g.
  `ai-company-os-admin-console`) building from `apps/admin-console`,
  live at a `*.vercel.app` URL. No custom domain is configured for it
  yet - that's a separate, later action if you want one (e.g.
  `admin.greencalpressurewashing.com`), not required for it to work.
- **Once this exists**, tell me the project name/URL and I can verify
  the deployment, check build/runtime logs, and confirm it's serving
  correctly using the Vercel tools I do have (`get_deployment`,
  `get_runtime_logs`, `get_runtime_errors`) - all read-only checks I
  can run myself from there.

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
