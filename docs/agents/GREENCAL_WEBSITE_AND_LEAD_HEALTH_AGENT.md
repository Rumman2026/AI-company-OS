# GreenCal Website and Lead Health Agent

Status: design only — **no code in this stage performs a real check
against the live `www.greencalpressurewashing.com` site, opens a real
GitHub issue, or runs anywhere on a schedule.** See
[DECISIONS.md](../../DECISIONS.md) ADR-0008. This is the first
always-on business agent envisioned for the Hostinger VPS stack (n8n
scheduler → `apps/ai-gateway` → `apps/worker-service`), designed here
and not yet built as a running system.

## Purpose

Continuously verify that `apps/greencal-website`'s production deployment
(live on Vercel per ADR-0006) is reachable, its important pages and lead
paths work, and its rendering is sound on mobile and desktop — then
surface and, within tightly bounded limits, help fix problems, without
ever bypassing owner review.

## Capabilities

- Verify public website availability (HTTP status, response time) for
  the homepage, the 3 residential + 7 commercial + 2 multi-family/HOA
  service pages, and the `/service-areas` index (see BUSINESS_FACTS.md /
  ADR-0007 for the approved scope — this agent must never expand beyond
  it).
- Test the Call and Free Estimate CTAs (the `/contact-us` quote form's
  reachability, not submitting real test leads into production Supabase
  without separate explicit authorization).
- Inspect mobile and desktop rendering (viewport variants).
- Capture browser console/network errors during the above checks.
- Detect unhandled lead inquiries once connected to the live lead data
  path (future work — no such connection exists yet; the quote-form
  production path is documented in
  `apps/greencal-website/src/lib/quote-form/README.md`).
- Classify detected website issues (routed to Z.AI/GLM by default per
  `packages/task-router`'s `website-monitoring` policy; escalate to
  Claude for high-impact findings — e.g., the quote form itself being
  down).
- Create a GitHub issue describing the problem.
- Prepare an isolated repair branch (never directly on `main`).
- Run tests (lint/typecheck/build/test for the affected workspace).
- Open a pull request.
- Send a concise owner report (issue found, evidence, PR link, and
  recommended action).

## Constraints (hard limits, enforced structurally, not just by policy)

This agent must **not**:

- Merge its own work — `packages/policy-engine`'s `checkAuthority()`
  blocks `merge-pull-request` for any non-owner actor.
- Deploy production — no deploy step exists in this agent's design;
  deployment stays a separate, explicitly owner-authorized action.
- Change pricing — this agent has no write path to any pricing content;
  its repair branches are scoped to technical fixes (broken links,
  rendering bugs, CTA failures), not business-fact/content changes,
  which remain gated by ADR-0007's scope-change procedure.
- Modify customer data without authorization — it only reads
  availability/rendering signals; it has no write path to Supabase lead
  data in this design.
- Access credentials — it runs behind `apps/ai-gateway`/
  `apps/worker-service` using the same placeholder (no real credential)
  adapters as every other task in this stage.
- Disable protections — it cannot touch CI, branch protection, or test
  configuration; those remain outside its write scope entirely.

## Workflow

1. **Trigger**: a recurring n8n schedule (future Hostinger VPS work —
   not configured yet) enqueues a `website-monitoring` job via
   `packages/job-queue`.
2. **Check**: `apps/worker-service` (agent-worker role) dequeues the
   job and performs the availability/CTA/rendering checks described
   above. (Not implemented in this stage — see "What is not built yet.")
3. **Classify**: results are routed through `packages/task-router` (task
   type `website-monitoring`) to Z.AI/GLM by default; Claude only if
   escalation conditions fire (see
   `docs/cloud/AI_ROUTING_AND_TOKEN_POLICY.md`).
4. **Report a problem**: if an issue is found, the agent opens a GitHub
   issue with the evidence (status codes, console errors, screenshots).
5. **Repair**: for a well-scoped technical fix, the agent creates an
   isolated branch, makes the change, and runs the affected workspace's
   lint/typecheck/build/test.
6. **Pull request**: opened against the fix branch — never merged by
   the agent.
7. **Owner report**: a concise summary (problem, evidence, PR link,
   recommended action) — not an autonomous decision.

## Budget and audit

Scoped under `packages/cost-controller` as `agent: 'greencal-website-health-agent'`
with its own daily/monthly limit (see
`docs/cloud/COST_CONTROL_POLICY.md`'s suggested defaults) and business
scope `business: 'greencal-pressure-washing'`. Every check/classification
is recorded via `packages/audit-logger`.

## What is not built yet

No code in this repository performs a real HTTP request to
`www.greencalpressurewashing.com`, opens a real GitHub issue, runs on
any schedule, or has ever executed. This document is the design; wiring
an actual scheduled check (e.g., a Playwright-based check script reusing
`apps/greencal-website`'s existing Playwright/Chromium setup) is
recommended future work, requiring its own explicit owner authorization
before it runs against the live production site.
