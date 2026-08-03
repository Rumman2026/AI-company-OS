# GreenCal Rollback Procedure

Status: durable record — verified rollback candidates identified via
Vercel's own deployment history, not hypothetical.

## Website (Vercel)

Every production deployment is individually addressable and Vercel
retains prior ones. To roll back:

1. Vercel Dashboard → `leads-initiative` team → `ai-company-os-greencal-website`
   project → **Deployments**.
2. Find the last known-good production deployment (before commit
   `937eab5`, the prior production deployment was `dpl_FUvizbVhDC2qJbmSn5Nf6VPU5ZYP`,
   built from `main` commit `bc584c6` — confirmed `isRollbackCandidate: true`
   via the Vercel API as of this sprint).
3. Use Vercel's **"Promote to Production"** / **Instant Rollback** action
   on that deployment. This does not require a Git revert — Vercel
   re-serves the exact prior build immediately.
4. Alternatively, a Git-level rollback: `git revert` the merge commit on
   `main` (never `git reset --hard` a shared branch) and push — this
   triggers a fresh build of the reverted state. Slower than Vercel's
   instant rollback but leaves a clean, auditable history.

## Lead pipeline (Supabase/Resend)

The customer-confirmation-email and lead-status changes in this sprint
are purely additive - **rolling back the website deployment
automatically removes the new code paths** (customer confirmation email
sending, `__testLead` handling) with no separate action needed. The
additive Supabase migration (`supabase-migration-002-lead-status.sql`),
if already run, is harmless to leave in place even after a website
rollback — the old code simply doesn't reference the new columns.

## GLM pilot

Already disabled: the pilot's kill switch was engaged and verified
disabled immediately after its one real call this session (see
`docs/cloud/GLM_SANDBOX_PILOT.md`). No further rollback action needed —
it is off by default.

## Cloud infrastructure (Hostinger)

Not provisioned — nothing to roll back.

## Health-check GitHub Action

To disable: either delete/rename
`.github/workflows/greencal-health-check.yml`, or disable the workflow
from the GitHub repository's **Actions** tab (no code change required).
It only reads and opens issues — disabling it has zero effect on the
live site.

## Emergency shutdown

- **Website**: Vercel Dashboard → project → **Settings** → pause/disable
  deployments, or point DNS elsewhere (owner-controlled, not performed
  here).
- **AI providers**: every provider adapter's kill switch
  (`packages/cost-controller`) is owner-controlled via the (not yet
  deployed) `apps/jervis-api` control plane, or directly via
  `InMemoryCostController.engageKillSwitch()` in a maintenance script.
  GLM's pilot kill switch is already engaged from this session.
- **Health-check workflow**: disable via the GitHub Actions tab (above).
