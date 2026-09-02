# Leader CRM v1 — completion ledger

Durable state for resuming without chat memory. Update it in place; do not
start a second ledger.

Last updated: 2026-09-02, after migrations 043 and 044 were applied to
production and verified end to end.

## Canonical locations

| What                      | Where                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Leader source (canonical) | `/opt/jervis/project-sources/leader-crm`, branch `jervis/leader-v1`                                          |
| Leader remote             | `github.com/Rumman2026/AI-company-OS` — deploy key `SHA256:X1DEQkr…` registered; **pushed, remote == local** |
| Jervis-AI-OS source       | `/opt/jervis/project-sources/jervis-ai-os`, branch `jervis/leader-migrator-v1`                               |
| Jervis-AI-OS remote       | `git@github.com:Rumman2026/Jervis-AI-OS.git` — pushed, remote == local                                       |
| Migration executor        | `leader-migrator.service`, artifact `/opt/jervis/leader-migrator/app`                                        |
| Business Telegram         | `business-telegram.service` — LIVE, frozen, do not develop further                                           |
| Supabase                  | Greencal-production, ref `orokuivcetynnzfpebzu`                                                              |

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

| Migration                            | State                                                          |
| ------------------------------------ | -------------------------------------------------------------- |
| 001–040                              | live                                                           |
| 041 e2e-fixture-rpc                  | **LIVE** (2026-09-01)                                          |
| 042 restore-crm-authenticated-grants | **LIVE** (2026-09-02), verified                                |
| 043 restore-remaining-crm-grants     | **LIVE** (2026-09-02 19:18:50), verified behaviourally         |
| 044 crm-audit-writer                 | **LIVE** (2026-09-02 20:19:59), 19/19 acceptance checks passed |
| 023 notifications                    | **NEVER APPLIED** — table absent from production               |

Lifetime Supabase Management API requests: 5 (1 edge-blocked, 1 `SELECT 1`, 1 = 042, 1 = 043, 1 = 044).

**An approval is bound to a commit and the executor requires `commit == branch
head`.** Any commit after an approval invalidates it. Create approvals last.

## Known defects

| #   | Defect                                                                                                                                                                                                                                                        | Severity | State                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| D1  | 9 tables 42501 for `authenticated`                                                                                                                                                                                                                            | **P1**   | **RESOLVED** 2026-09-02 by 043. Matrix verified behaviourally as a signed-in user; browser audit 20/20 clean |
| D2  | `audit_log` had no INSERT path for the console                                                                                                                                                                                                                | **P1**   | **DATABASE RESOLVED** by 044. Function live, 19/19 acceptance checks. **APPLICATION NOT DEPLOYED** — see D7  |
| D7  | **The admin console deployment still runs pre-044 code.** Proven live: a browser transition moved the fixture lead `new -> lost` and wrote **no** audit row, while the RPC itself works. The fix is committed and pushed but not deployed                     | **P1**   | **Needs a deployment, which is owner-gated**                                                                 |
| D3  | `notifications` absent from production (023 never applied)                                                                                                                                                                                                    | P2       | Not started                                                                                                  |
| D4  | Tenant-isolation E2E never executed                                                                                                                                                                                                                           | P1       | **RESOLVED** — 2/2, twice, non-destructive                                                                   |
| D5  | `service_role` has **no privilege on `audit_log`** (42501 on SELECT). Affects no live path today — the only service-role caller is the website intake, and `createLead` writes no audit record — but `jervis_audit` and any future server-side writer need it | P2       | **Not fixed.** Needs its own grant migration and its own owner decision                                      |
| D6  | Lead creation writes no audit record at all (only transitions do)                                                                                                                                                                                             | P3       | Open, product question                                                                                       |

**Not a defect:** the Activity Timeline is contact-scoped by design — it
aggregates a customer's history across leads, estimates, jobs and invoices, and
is rendered on `/contacts/[id]`. Its absence on `/leads/[id]` is the product
boundary, not a bug.

## Browser audit, 2026-09-02 (read-only, signed in as the Tenant B fixture user)

Run twice, before and after 043.

|                           | Before 043                        | After 043 |
| ------------------------- | --------------------------------- | --------- |
| Pages walked              | 20                                | 20        |
| Clean                     | 18                                | **20**    |
| Visible permission errors | `/companies`, `/service-packages` | none      |

**"Renders without error" is not "works"** — before 043 several tables failed
silently and rendered empty rather than erroring, so a broken page and a
working-but-empty page looked identical. The post-043 pass therefore checks for
functional content, not status codes; see the verification section below.

## Blockers requiring the owner

| #      | Blocker                                                                                                                                                                                  | Why it needs you                                                                                   |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| B2     | **ALL EIGHT providers are now engaged.** DeepSeek's 24h Quant lease has closed. `enabled_providers=[]`, all 8 roles unservable, 112 runs `blocked_on_owner`. The Brain has zero capacity | Releasing providers is an owner action. **This is what blocks BUSINESS_AUTONOMOUS_WORK_EXECUTION** |
| B3     | $1.00/day ceiling. **Not a bottleneck so far** — see below                                                                                                                               | Only decide if you want autonomous multi-agent cycles                                              |
| ~~B4~~ | **CLEARED** 2026-09-02. Deploy key registered; 8 commits pushed; `origin/jervis/leader-v1` == VPS HEAD                                                                                   | —                                                                                                  |

## Cost, measured (not projected)

Provider spend for all of this session's Leader engineering: **$0.00.** Today's
`cost_records` total is $0.002784 across 3 calls, all predating this work.

**$1/day is not a practical bottleneck for engineering done through direct tool
execution.** It only binds if Leader development is routed through Hermes/Jervis
multi-agent cycles, which cost a measured $0.054 (single pass) to $0.46
(iterative) each — 18 or 2 per day respectively.

## Completion standard — status

| Criterion                                       | Status                                                                                                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Canonical E2E tests passing                     | ✅ on the VPS, twice                                                                                                                       |
| Tenant isolation passing                        | ✅ 2/2, non-destructive                                                                                                                    |
| Production permission model verified            | ⚠️ 042 and 043 verified behaviourally; D5 open                                                                                             |
| audit_log defect resolved                       | ⚠️ code fixed and proven; migration pending                                                                                                |
| Primary CRM workflows exercised                 | ⚠️ 20 pages clean; features verified for real content, not just HTTP 200; write flows not exercised (fixture tenant has no jobs/estimates) |
| No known P0/P1 defects                          | ⚠️ D1 resolved; D2 pending 044                                                                                                             |
| No silently swallowed critical writes           | ✅ all six call sites now surface failure                                                                                                  |
| Staging/browser verification complete           | ⚠️ read-only pass done                                                                                                                     |
| Test suite green                                | ✅ db 199, admin-console 53, website 268, Jervis 6735                                                                                      |
| Security/governance checks green                | ✅ all forgery/cross-tenant attacks refused                                                                                                |
| Production changes applied or awaiting approval | ⚠️ 043 applied; 044 awaiting                                                                                                               |

**Leader CRM v1 is NOT complete.**

## 043 verification, 2026-09-02 (post-apply)

Privileges proved **behaviourally**, by using them as the signed-in fixture
user rather than by reading a catalog: SELECT reads, INSERT with a payload that
cannot survive, UPDATE/DELETE matched against a random uuid. Nothing was
written. "permission denied for table" distinguishes a missing GRANT from an
RLS refusal or a constraint violation, which is the whole test.

All nine match the authorized matrix exactly. DELETE on exactly
`estimate_line_items` and `business_service_areas`. 042's four tables
unaffected. `audit_log` INSERT still correctly closed. anon reached nothing.

Features verified for real content: `/settings/hours` renders a 7-row table
with 21 inputs; `/companies` and `/settings/service-areas` show working add
forms with genuine empty states; `/service-packages` renders. Browser audit
20/20 clean, up from 18/20.

## Next actions, in order

1. Owner: approve 044 (fresh approval, bound to the head at that moment)
2. Decide D5 (`service_role` on `audit_log`) and D6 (auditing lead creation)
3. Exercise write flows in the browser — needs a fixture job/estimate first
4. Owner: decide whether to wire project-scoped provider governance
