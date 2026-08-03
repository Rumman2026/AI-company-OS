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
