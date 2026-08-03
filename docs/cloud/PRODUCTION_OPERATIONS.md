# Production Operations

Status: durable operations reference for what is actually live today.

## What's actually running in production right now

| Component                                           | Where                                                                            | Status                                                         |
| --------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Public website                                      | Vercel (`ai-company-os-greencal-website`, team `leads-initiative`)               | Live — see `docs/launch/GREENCAL_PRODUCTION_LAUNCH.md`         |
| Lead storage                                        | Supabase (`quote_leads` table)                                                   | Live since 2026-07-26                                          |
| Owner notification                                  | Resend                                                                           | Live since 2026-07-26                                          |
| Customer confirmation                               | Resend                                                                           | New this sprint — live once this sprint's deployment completes |
| Website health check                                | GitHub Actions (`.github/workflows/greencal-health-check.yml`), every 30 minutes | Live as of this sprint's commit                                |
| GLM pilot                                           | Not connected (kill-switched)                                                    | Prepared, not active                                           |
| Hostinger VPS (n8n, AI gateway, worker, monitoring) | Not provisioned                                                                  | Blocked on owner action                                        |

## Operational contacts / recipients

- Lead notifications: `greencaliforniacorporation@gmail.com` (per
  `NOTIFICATION_RECIPIENT_EMAIL`, ADR-0006).
- GitHub issues from the health-check workflow: this repository's
  Issues tab, labeled `website-health`, `automated`.

## Routine operational tasks

- **Reviewing a `notification_status: 'failed'` or
  `customer_confirmation_status: 'failed'` lead**: manual review via the
  Supabase table editor — no automated retry exists (documented,
  intentional v1 tradeoff).
- **Updating a lead's `status`** (once migration 002 is run): manual,
  via the Supabase table editor. No admin UI exists yet.
- **Checking the health-check workflow**: GitHub repo → Actions tab →
  "GreenCal Website and Lead Health Agent". A failed run uploads its
  JSON report as a build artifact and opens a GitHub issue.
- **Disabling any AI provider**: `packages/cost-controller`'s
  `engageKillSwitch()` — currently a code-level mechanism, not yet
  exposed via a running `apps/jervis-api` (not deployed).

## Cost controls currently in effect

- GLM pilot: $1.00/day, $15.00/month, $0.02 max single-task cost (see
  `docs/cloud/COST_CONTROL_POLICY.md`). Currently kill-switched (off).
- No other provider is connected, so no other real spend is possible
  today.

## Secrets in production

Configured directly in Vercel's Environment Variables (Preview +
Production scope), never in this repository:
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`,
`RESEND_FROM_ADDRESS`, `NOTIFICATION_RECIPIENT_EMAIL`. This session
never read, displayed, or logged any of their values.
