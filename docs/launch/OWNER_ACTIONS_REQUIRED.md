# Owner Actions Required

Status: the concise, actionable list — see individual docs for detail.
Ordered by urgency.

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

## 3b. Run pending internal-CRM migrations 004-023 (safe, not urgent, run whenever convenient)

- **Screen**: Supabase dashboard → the GreenCal project (`Greencal-production`)
  → SQL Editor. **Different migration chain from item 3 above** - these
  are the internal admin-console CRM (`apps/admin-console`), not the
  public quote-form pipeline.
- **Status so far**: `packages/db/migrations/001-crm-foundation.sql`,
  `002-multi-tenant-foundation.sql`, and
  `003-job-pipeline-foundation.sql` are already confirmed run
  (owner-confirmed during this session). Seven more have been added
  since and are **not yet run**:
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
- **Action**: open each file **in order** (004 through 023) and run its
  full contents once in the SQL Editor. Each is additive-only (new
  tables, one additive column, or - for 007/008 - new rows only) and
  safe to run against the live production database - no existing table
  or row is altered. Each file's own header comment repeats this.
- **Expected result**: `companies`, `notes`, and `tasks` tables exist
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

## 3c. Add `SUPABASE_SERVICE_ROLE_KEY` to `apps/admin-console`'s deployment (only once that app is deployed)

- **Screen**: Vercel → the `apps/admin-console` project (once it
  exists) → Settings → Environment Variables.
- **Why**: the new public customer estimate-approval link
  (`/approve/[token]`, see item 3b's migration 017 and DECISIONS.md
  ADR-0030) needs the Supabase **service-role** key to look up an
  Estimate by its token without a staff login. Every other route in
  this app continues to use only the anon key - this is the one
  narrow exception.
- **Action**: add `SUPABASE_SERVICE_ROLE_KEY` (Supabase dashboard →
  Settings → API → `service_role`) alongside the existing
  `SUPABASE_URL`/`SUPABASE_ANON_KEY` variables, matching
  `apps/admin-console/.env.example`'s documented format. Treat it as a
  real secret - if it is ever exposed, rotate it immediately in the
  Supabase dashboard.
- **Expected result**: without it, the public approval page shows an
  honest "this approval link isn't available right now" message rather
  than erroring - not required for anything else in `apps/admin-console`
  to work.

## 3d. Decide on real email/SMS notification sending (only if wanted - not required for anything built so far)

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
