# Leader CRM v1 — completion ledger

Durable state for resuming without chat memory. Update it in place; do not
start a second ledger.

Last updated: 2026-09-02, after the VPS became a full Leader development host
and the tenant-isolation E2E passed there twice.

## Canonical locations

| What                      | Where                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------ |
| Leader source (canonical) | `/opt/jervis/project-sources/leader-crm`, branch `jervis/leader-v1`                  |
| Leader remote             | `github.com/Rumman2026/AI-company-OS` — **VPS still has no push credential; see B4** |
| Jervis-AI-OS source       | `/opt/jervis/project-sources/jervis-ai-os`, branch `jervis/leader-migrator-v1`       |
| Jervis-AI-OS remote       | `git@github.com:Rumman2026/Jervis-AI-OS.git` (deploy key, push works)                |
| Migration executor        | `leader-migrator.service`, artifact `/opt/jervis/leader-migrator/app`                |
| Business Telegram         | `business-telegram.service` — LIVE, frozen, do not develop further                   |
| Supabase                  | Greencal-production, ref `orokuivcetynnzfpebzu`                                      |

## VPS Leader toolchain (installed 2026-09-02)

| Component  | Version       | Source                                      |
| ---------- | ------------- | ------------------------------------------- |
| Node.js    | 22.23.2       | NodeSource `setup_22.x`, Ubuntu 24.04 amd64 |
| npm        | 10.9.8        | bundled                                     |
| pnpm       | 11.12.0       | Corepack, pinned by root `packageManager`   |
| Playwright | 1.61.1        | repo-pinned; `install-deps` run as root     |
| Chromium   | 149.0.7827.55 | `/home/jervis/.cache/ms-playwright`         |

`/home/jervis` is root-owned (system account, uid 999), so `.cache` and
`.local/share/pnpm` were created explicitly as `jervis:jervis`. Do not chown
`/home/jervis/.ssh` — its keys are deliberately `jervis:systemd-journal`.

Run tests as: `sudo -u jervis env HOME=/home/jervis CI=true pnpm ...`
`CI=true` is required — pnpm refuses to purge a stale `node_modules` with no TTY.

## Production migration state

| Migration                            | State                                                                                           |
| ------------------------------------ | ----------------------------------------------------------------------------------------------- |
| 001–040                              | live                                                                                            |
| 041 e2e-fixture-rpc                  | **LIVE** (2026-09-01)                                                                           |
| 042 restore-crm-authenticated-grants | **LIVE** (2026-09-02), verified                                                                 |
| 043 restore-remaining-crm-grants     | **PREPARED, NOT APPLIED.** Approval `a1f92e6b3d8c47059ab7e214fc6d30b8` is **STALE** — see below |
| 023 notifications                    | **NEVER APPLIED** — table absent from production                                                |

Lifetime Supabase Management API requests: 3 (1 edge-blocked, 1 `SELECT 1`, 1 = 042).

### 043 approval is stale and must be replaced, not approved

The approval froze commit `6f4ead4db565e83f0f05a8fc99d6b310c218bb37`. Branch HEAD
then moved to `b819a300144c2168118fa43a74c0472a072719a8` when this ledger was
committed. The executor requires `commit == branch head`, so the approval would
now be **refused** with `COMMIT_NOT_BRANCH_HEAD` before any credential is read.

The migration bytes are unchanged — sha256 is still
`1c5c5e7856ee5e0e72960028609f46082264fc985835323eca3c5101388205f5`. Only the
binding is wrong. **Create the approval immediately before execution**, because
any further commit invalidates it again.

## Verified working in production (as a real authenticated CRM user)

`leads` · `contacts` · `tasks` · `notes` · `audit_log` (read) · `jobs` ·
`estimates` · `bookings` · `invoices` · `payments` · `businesses` ·
`memberships` · `membership_roles`

## Known defects

| #   | Defect                                                                                                                                                                                           | Severity                                                | State                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| D1  | 9 tables return 42501 for `authenticated` — companies, estimate_line_items, review_requests, review_records, photo_assets, photo_pairs, service_packages, business_hours, business_service_areas | **P1** — Review Request feature entirely non-functional | Fix committed as 043; **awaiting owner approval**                                                                    |
| D2  | `audit_log` has no INSERT policy AND no INSERT grant; all 39 call sites discard the failed write, so transitions report success while writing no audit row. History to date is unrecoverable.    | **P1**                                                  | **Not started.** Needs a SECURITY DEFINER writer (pattern: migration 039 `jervis_audit`), not a grant — see ADR-0041 |
| D3  | `notifications` table absent from production (migration 023 never applied)                                                                                                                       | P2                                                      | Not started; needs its own reviewed migration                                                                        |
| D4  | Tenant-isolation E2E never executed end to end                                                                                                                                                   | P1                                                      | **RESOLVED 2026-09-02** — 2/2 passed twice consecutively on the VPS                                                  |

## Blockers requiring the owner

| #   | Blocker                                                                                                                                                                            | Why it needs you                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| B2  | Provider kill switches: only `deepseek` is released, and it was released for the **Jervis-Quant** research objective, not Leader. All seven others engaged.                        | Releasing providers is an owner action                          |
| B3  | Daily ceiling is **$1.00**. Measured: a single-pass cycle costs **$0.054**; an iterative cycle **$0.46**. $1/day buys ~18 single-pass or ~2 iterative cycles.                      | Recommend **$3.00/day** with per-provider caps — owner decision |
| B4  | VPS Leader checkout cannot push to GitHub. The only key present is the Jervis-AI-OS deploy key, and GitHub deploy keys are per-repository. 4 Leader commits exist only on the VPS. | Add the generated deploy key to `Rumman2026/AI-company-OS`      |

B1 (E2E deny rule) is **cleared** — the suite now runs on the VPS, where the
laptop's `.claude/settings.local.json` does not apply.

## Cost facts, measured from `cost_records` (not estimated)

| Role             | Provider | mean $/call | max $/call |
| ---------------- | -------- | ----------- | ---------- |
| planner          | zai      | 0.002509    | 0.005361   |
| researcher       | deepseek | 0.000563    | 0.001029   |
| bulk_builder     | zai      | 0.002155    | 0.006509   |
| routine_debugger | deepseek | 0.000760    | 0.004773   |
| cross_reviewer   | kimi     | 0.021948    | 0.069945   |
| final_engineer   | claude   | 0.014353    | 0.050391   |
| release_reviewer | openai   | 0.012935    | 0.084090   |

`kimi`, `openai` and `claude` are ~90% of cycle cost. Cap those three first.

## Completion standard — status

| Criterion                                       | Status                                         |
| ----------------------------------------------- | ---------------------------------------------- |
| Canonical E2E tests passing                     | ✅ on the VPS, twice                           |
| Tenant isolation passing                        | ✅ 2/2, non-destructive, fixture unchanged     |
| Production permission model verified            | ⚠️ partial — 042 verified; 043 pending         |
| audit_log defect resolved                       | ❌ D2 not started                              |
| Primary CRM workflows exercised                 | ⚠️ data-layer + isolation only                 |
| No known P0/P1 defects                          | ❌ D1, D2 open                                 |
| No silently swallowed critical writes           | ❌ D2                                          |
| Staging/browser verification complete           | ⚠️ browser proven working; full audit not done |
| Test suite green                                | ✅ packages/db 182 passed on the VPS           |
| Security/governance checks green                | ✅                                             |
| Production changes applied or awaiting approval | ✅ 042 applied; 043 awaiting                   |

**Leader CRM v1 is NOT complete.**

## Next actions, in order

1. Owner: add the Leader deploy key (B4) — nothing else durably protects the work
2. Owner: create a **fresh** 043 approval bound to current HEAD, then execute
3. Design and implement the D2 audit writer (SECURITY DEFINER, bounded, tested)
4. Owner: decide B2/B3 if autonomous multi-agent development is wanted
5. Full product/browser audit — now unblocked, Chromium runs on the VPS
