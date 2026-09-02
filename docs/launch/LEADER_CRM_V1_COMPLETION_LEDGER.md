# Leader CRM v1 — completion ledger

Durable state for resuming without chat memory. Update it in place; do not
start a second ledger.

Last updated: 2026-09-02, after the audit writer (044) and the first real
browser audit of the deployed console.

## Canonical locations

| What                      | Where                                                                          |
| ------------------------- | ------------------------------------------------------------------------------ |
| Leader source (canonical) | `/opt/jervis/project-sources/leader-crm`, branch `jervis/leader-v1`            |
| Leader remote             | `github.com/Rumman2026/AI-company-OS` — **push still blocked, see B4**         |
| Jervis-AI-OS source       | `/opt/jervis/project-sources/jervis-ai-os`, branch `jervis/leader-migrator-v1` |
| Jervis-AI-OS remote       | `git@github.com:Rumman2026/Jervis-AI-OS.git` — pushed, remote == local         |
| Migration executor        | `leader-migrator.service`, artifact `/opt/jervis/leader-migrator/app`          |
| Business Telegram         | `business-telegram.service` — LIVE, frozen, do not develop further             |
| Supabase                  | Greencal-production, ref `orokuivcetynnzfpebzu`                                |

## VPS Leader toolchain (installed 2026-09-02)

| Component  | Version       | Source                                      |
| ---------- | ------------- | ------------------------------------------- |
| Node.js    | 22.23.2       | NodeSource `setup_22.x`, Ubuntu 24.04 amd64 |
| pnpm       | 11.12.0       | Corepack, pinned by root `packageManager`   |
| Playwright | 1.61.1        | repo-pinned; `install-deps` run as root     |
| Chromium   | 149.0.7827.55 | `/home/jervis/.cache/ms-playwright`         |

`/home/jervis` is root-owned (system account, uid 999), so `.cache`, `.config`
and `.local/share/pnpm` were created explicitly as `jervis:jervis`. Do not chown
`/home/jervis/.ssh` — its keys are deliberately `jervis:systemd-journal`.

Run as: `sudo -u jervis env HOME=/home/jervis CI=true ASTRO_TELEMETRY_DISABLED=1 pnpm ...`
`CI=true` is required (pnpm will not purge a stale `node_modules` with no TTY);
`ASTRO_TELEMETRY_DISABLED=1` is required (telemetry mkdir fails in a root-owned home).

## Production migration state

| Migration                            | State                                                                |
| ------------------------------------ | -------------------------------------------------------------------- |
| 001–040                              | live                                                                 |
| 041 e2e-fixture-rpc                  | **LIVE** (2026-09-01)                                                |
| 042 restore-crm-authenticated-grants | **LIVE** (2026-09-02), verified                                      |
| 043 restore-remaining-crm-grants     | **PREPARED, NOT APPLIED** — fresh approval bound to the current head |
| 044 crm-audit-writer                 | **PREPARED, NOT APPLIED** — needs its own approval                   |
| 023 notifications                    | **NEVER APPLIED** — table absent from production                     |

Lifetime Supabase Management API requests: 3 (1 edge-blocked, 1 `SELECT 1`, 1 = 042).

**An approval is bound to a commit and the executor requires `commit == branch
head`.** Any commit after an approval invalidates it. Create approvals last.

## Known defects

| #   | Defect                                                                                                                                                                                                                                                        | Severity | State                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------- |
| D1  | 9 tables 42501 for `authenticated`. **Confirmed in the browser:** `/companies` and `/service-packages` render a permission error to a signed-in user                                                                                                          | **P1**   | Fixed by 043; **awaiting approval**                                                      |
| D2  | `audit_log` had no INSERT path for the console at all; six call sites discarded the failure                                                                                                                                                                   | **P1**   | **Fixed** by 044 + `createUserScopedAuditLogRepository`; **migration awaiting approval** |
| D3  | `notifications` absent from production (023 never applied)                                                                                                                                                                                                    | P2       | Not started                                                                              |
| D4  | Tenant-isolation E2E never executed                                                                                                                                                                                                                           | P1       | **RESOLVED** — 2/2, twice, non-destructive                                               |
| D5  | `service_role` has **no privilege on `audit_log`** (42501 on SELECT). Affects no live path today — the only service-role caller is the website intake, and `createLead` writes no audit record — but `jervis_audit` and any future server-side writer need it | P2       | **Not fixed.** Needs its own grant migration and its own owner decision                  |
| D6  | Lead creation writes no audit record at all (only transitions do)                                                                                                                                                                                             | P3       | Open, product question                                                                   |

**Not a defect:** the Activity Timeline is contact-scoped by design — it
aggregates a customer's history across leads, estimates, jobs and invoices, and
is rendered on `/contacts/[id]`. Its absence on `/leads/[id]` is the product
boundary, not a bug.

## Browser audit, 2026-09-02 (read-only, signed in as the Tenant B fixture user)

20 pages walked. 18 clean, 2 with visible permission errors (`/companies`,
`/service-packages`). Login, leads, contacts, jobs, invoices, appointments,
tasks, audit-log, notifications and all seven settings pages render without
error. **Caveat: "renders without error" is not "works"** — several 043 tables
fail silently and render empty rather than erroring, so those pages will only be
truly verified after 043 is applied.

## Blockers requiring the owner

| #   | Blocker                                                                                                                                             | Why it needs you                                                                                             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| B2  | Only `deepseek` is released, and it was released for the **Jervis-Quant** objective, not Leader. All seven others engaged                           | Releasing providers is an owner action                                                                       |
| B3  | $1.00/day ceiling. **Not a bottleneck so far** — see below                                                                                          | Only decide if you want autonomous multi-agent cycles                                                        |
| B4  | The deploy key generated for the VPS is **not registered on GitHub** — offered correctly, rejected outright. 7 Leader commits exist only on the VPS | Add key `SHA256:X1DEQkrFANWjw9hmLg/Dh4Tu/GPHaKm8Tw4C//ES9Yo` to `Rumman2026/AI-company-OS` with write access |

## Cost, measured (not projected)

Provider spend for all of this session's Leader engineering: **$0.00.** Today's
`cost_records` total is $0.002784 across 3 calls, all predating this work.

**$1/day is not a practical bottleneck for engineering done through direct tool
execution.** It only binds if Leader development is routed through Hermes/Jervis
multi-agent cycles, which cost a measured $0.054 (single pass) to $0.46
(iterative) each — 18 or 2 per day respectively.

## Completion standard — status

| Criterion                                       | Status                                                 |
| ----------------------------------------------- | ------------------------------------------------------ |
| Canonical E2E tests passing                     | ✅ on the VPS, twice                                   |
| Tenant isolation passing                        | ✅ 2/2, non-destructive                                |
| Production permission model verified            | ⚠️ 042 verified; 043 pending; D5 open                  |
| audit_log defect resolved                       | ⚠️ code fixed and proven; migration pending            |
| Primary CRM workflows exercised                 | ⚠️ 20 pages walked read-only; no write flows exercised |
| No known P0/P1 defects                          | ❌ D1, D2 pending approval                             |
| No silently swallowed critical writes           | ✅ all six call sites now surface failure              |
| Staging/browser verification complete           | ⚠️ read-only pass done                                 |
| Test suite green                                | ✅ db 199, admin-console 53, website 268, Jervis 6735  |
| Security/governance checks green                | ✅ all forgery/cross-tenant attacks refused            |
| Production changes applied or awaiting approval | ⚠️ 043 and 044 both awaiting                           |

**Leader CRM v1 is NOT complete.**

## Next actions, in order

1. Owner: register the deploy key (B4) — 7 commits are single-homed until then
2. Owner: approve 043, then 044 (each needs a fresh approval bound to the head at that moment)
3. Re-run the browser audit after 043 to verify the silently-empty pages
4. Decide D5 (`service_role` on `audit_log`) and D6 (auditing lead creation)
5. Exercise write flows in the browser, not just reads
