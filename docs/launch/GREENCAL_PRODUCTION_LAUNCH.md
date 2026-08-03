# GreenCal Production Launch

Status: durable record of the production-launch sprint. See
[DECISIONS.md](../../DECISIONS.md) for the ADRs this builds on
(ADR-0004–0007 for the website; ADR-0008 for cloud infrastructure).

## What "launch" means here

GreenCal Pressure Washing's public website and lead-capture pipeline
were **already live in production before this sprint** (verified
2026-07-26 — see `apps/greencal-website/src/lib/quote-form/README.md`'s
"Production verification record"). This sprint's job was to: (1) ship
the already-QA'd premium homepage redesign to production, (2) close two
real launch-blocking gaps (no customer confirmation email, no favicon),
(3) complete the bounded GLM pilot, (4) prepare (not provision) cloud
infrastructure, and (5) stand up a real, always-on website health check.

## Production facts

| Fact               | Value                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| Production domain  | `https://www.greencalpressurewashing.com` (canonical; `greencalpressurewashing.com` redirects 308) |
| Hosting            | Vercel, team `leads-initiative`, project `ai-company-os-greencal-website`                          |
| Production branch  | `main` (GitHub repo `Rumman2026/AI-company-OS`)                                                    |
| Data               | Supabase (`quote_leads` table), owner-owned project                                                |
| Notification email | Resend, verified sender `greencalpressurewashing.com`                                              |

## This sprint's changes

1. **Premium homepage redesign** — merged from `feat/greencal-premium-homepage`
   to `main` (commit `937eab5`), fast-forward, no conflicts. Already
   through a documented 12-phase workflow with preview-deployment
   verification in prior sessions (see
   `docs/GREENCAL_HOMEPAGE_VISUAL_REDESIGN.md`).
2. **Customer confirmation email** — closes a real gap (owner was
   notified of new leads; the customer only saw an on-page message, not
   an email). See `docs/launch/GREENCAL_LEAD_FLOW.md`.
3. **Favicon** — closes a real, previously-documented gap (no favicon
   existed at all; production returned 404). See
   `apps/greencal-website/public/README-favicon.md` for the legibility
   tradeoff at the smallest size.
4. **Lead status schema** (additive migration, owner-run) — adds a
   lifecycle `status` column plus `consent_at`/`is_test_lead`/
   `customer_confirmation_status` tracking. See
   `apps/greencal-website/src/lib/quote-form/supabase-migration-002-lead-status.sql`.
5. **GreenCal Website and Lead Health Agent** — a real, running
   report-only check (`apps/greencal-website/scripts/health-check.mjs`),
   scheduled via GitHub Actions every 30 minutes
   (`.github/workflows/greencal-health-check.yml`) — runs on GitHub's
   infrastructure, independent of the (not yet provisioned) Hostinger
   VPS. See `docs/agents/GREENCAL_HEALTH_AGENT_LIVE_REPORT.md`.
6. **GLM sandbox pilot** — completed in a prior stage this session: real
   endpoint/auth confirmed, one real bounded call made (auth succeeded;
   Z.ai account had no balance), kill switch engaged and verified. See
   `docs/cloud/GLM_SANDBOX_PILOT.md`.

## What did not ship this sprint

- **Hostinger VPS**: not provisioned. No credentials, no MCP connector,
  no SSH access exists in this environment. See
  `docs/launch/OWNER_ACTIONS_REQUIRED.md`.
- **n8n, AI gateway, worker service, monitoring as running cloud
  services**: prepared as Docker Compose templates in a prior stage
  (`infra/docker/docker-compose.cloud.yml`) but not deployed anywhere -
  blocked on the VPS above.
- **Real GLM classification results**: the pilot's authentication and
  transport are proven against the real API; no real classification
  output exists yet because the Z.ai account needs a balance recharge.

## Launch classification

See the session's final completion report for the exact classification
(FULLY LIVE / WEBSITE AND LEAD SYSTEM LIVE, CLOUD AUTOMATION PARTIALLY
BLOCKED / TECHNICALLY READY, OWNER ACTION REQUIRED / NOT READY) and its
justification.
