# Owner Actions Required

Status: the concise, actionable list — see individual docs for detail.
Ordered by urgency.

## 1. Vercel production deployment not triggering (urgent)

- **Screen**: `vercel.com` → team **Leads Initiative** → project
  **ai-company-os-greencal-website** → **Settings → Git**.
- **Action**: confirm **Production Branch** is `main`. Commit `937eab5`
  was pushed to `main` at the start of this check and, after an extended
  wait, production was still serving the prior build (`bc584c6`) with no
  new deployment queued or building.
- **Expected result**: if Production Branch is already `main`, use the
  dashboard's **Redeploy** action on the latest commit, or check
  **Settings → Git → Deploy Hooks** / the GitHub integration's
  installation status for a disconnected webhook. If Production Branch
  is set to something else, correct it — this alone should trigger the
  pending build automatically.
- Until this resolves, the premium redesign, the customer-confirmation
  email, and the favicon fix are all merged and pushed but **not yet
  live**.

## 2. Supabase migration (safe, not urgent, run whenever convenient)

- **Screen**: Supabase dashboard → the GreenCal project → SQL Editor.
- **Action**: run
  `apps/greencal-website/src/lib/quote-form/supabase-migration-002-lead-status.sql`
  once.
- **Expected result**: adds a `status` lifecycle column, `consent_at`,
  `is_test_lead`, and `customer_confirmation_status` tracking. Purely
  additive — the lead pipeline already works without this and will
  keep working identically before and after.

## 3. Z.ai account balance (only if real GLM classification is wanted)

- **Screen**: Z.ai account dashboard → billing/balance.
- **Action**: add a balance/resource package.
- **Expected result**: the GLM pilot's authentication is already
  confirmed working (see `docs/cloud/GLM_SANDBOX_PILOT.md`) — it failed
  only on `HTTP 429: Insufficient balance`. Not required for GreenCal's
  lead pipeline to work; only needed if you want real AI-assisted lead
  classification.

## 4. Hostinger VPS (only when ready for cloud automation)

- **Screen**: Hostinger account (purchase/login required — this session
  has no access at all).
- **Action**: provision per `docs/cloud/HOSTINGER_VPS_SETUP.md`.
- **Expected result**: unblocks n8n, the AI gateway, agent worker, and
  monitoring as always-on services. **Not required for GreenCal to
  receive real leads today** — the website and lead pipeline run
  entirely on Vercel + Supabase + Resend, independent of Hostinger.

## 5. Confirm `PUBLIC_GTM_CONTAINER_ID` in Vercel (optional, for analytics)

- **Screen**: Vercel → project → Settings → Environment Variables.
- **Action**: confirm this variable is set if you want conversion
  tracking active (phone clicks, estimate funnel events).
- **Expected result**: without it, the site works identically — analytics
  events simply no-op rather than firing, by design.

## 6. Confirm Supabase backup/PITR tier (optional, recommended)

- **Screen**: Supabase → project → Settings → Database → Backups.
- **Action**: confirm the current backup retention matches your
  comfort level for real customer lead data.
- **Expected result**: informational only — Supabase manages this
  independently of this repository.
