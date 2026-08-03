# GreenCal Website and Lead Health Agent — Live Report

Status: **real, executed evidence** — this is not a design document. See
`docs/agents/GREENCAL_WEBSITE_AND_LEAD_HEALTH_AGENT.md` for the original
design and its "not built yet" caveats, most of which this report
resolves.

## What changed this sprint

`apps/greencal-website/scripts/health-check.mjs` is a real, runnable
implementation: HTTP-status checks across representative pages, plus a
headless-browser check at mobile (390px) and desktop (1440px) viewports
for the phone link, estimate CTA, quote form presence, and console/
network errors. It is now scheduled to run **every 30 minutes via GitHub
Actions** (`.github/workflows/greencal-health-check.yml`) — this runs on
GitHub's own infrastructure, so it keeps running even while the owner's
computer (and the not-yet-provisioned Hostinger VPS) are both off,
satisfying the "always-on" requirement for this one component
independent of the Hostinger blocker.

**Mode**: strictly report-only, as designed. It never submits a real
lead, never merges, deploys, changes content, or touches credentials.
On a detected issue it opens a GitHub issue (using the workflow's own
default `GITHUB_TOKEN`, not a new secret) — nothing more.

## Live run performed this session

Executed directly against `https://www.greencalpressurewashing.com`
(the real production domain) during this sprint:

```json
{
  "agent": "greencal-website-and-lead-health-agent",
  "mode": "report-only",
  "baseUrl": "https://www.greencalpressurewashing.com",
  "overallStatus": "issues_found",
  "summary": {
    "pagesChecked": 11,
    "pagesFailing": 1,
    "viewportsChecked": 2,
    "viewportsWithIssues": 0
  }
}
```

**Result**: 10 of 11 checked pages returned HTTP 200 (homepage, 3
service pages, a commercial page, an HOA page, `/service-areas`,
`/contact-us`, `robots.txt`, `sitemap.xml`). The one failure —
`/favicon-32x32.png` returning 404 — is the **known, pre-fix state**:
this sprint's favicon fix (part of commit `937eab5`) had not yet reached
production at the time of this run (see
`docs/launch/OWNER_ACTIONS_REQUIRED.md` for the pending Vercel
production-deployment issue). Both mobile and desktop viewport checks
passed cleanly: `tel:` link found, estimate CTA found, quote form found,
zero console errors, zero failed network requests.

This is exactly the kind of real, actionable finding this agent is
designed to surface — it correctly detected a genuine (already-known)
gap rather than reporting a fabricated "all healthy" result.

## Re-run recommended

Once the pending production deployment (see
`docs/launch/OWNER_ACTIONS_REQUIRED.md`) completes, re-run
`node scripts/health-check.mjs` (from `apps/greencal-website/`) or wait
for the next scheduled GitHub Actions run to confirm `overallStatus:
"healthy"` with the favicon fix live.

## Forbidden actions — verified not present in this implementation

This script contains no code path for: production merge, production
deployment, customer contact, price changes, credential access, or
production data modification. It is read-only against public pages plus
its own report-file write.
