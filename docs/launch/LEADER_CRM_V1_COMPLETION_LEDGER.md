# Leader CRM v1 — completion ledger

Durable state for resuming without chat memory. Update it in place; do not
start a second ledger.

Last updated: 2026-09-02, after migration 042 applied and 043 prepared.

## Canonical locations

| What | Where |
|---|---|
| Leader source (canonical) | `/opt/jervis/project-sources/leader-crm`, branch `jervis/leader-v1` |
| Leader remote | `github.com/Rumman2026/AI-company-OS` — **VPS has no push credential** |
| Jervis-AI-OS source | `/opt/jervis/project-sources/jervis-ai-os`, branch `jervis/leader-migrator-v1` |
| Jervis-AI-OS remote | `git@github.com:Rumman2026/Jervis-AI-OS.git` (deploy key, push works) |
| Migration executor | `leader-migrator.service`, artifact `/opt/jervis/leader-migrator/app` |
| Business Telegram | `business-telegram.service` — LIVE, frozen, do not develop further |
| Supabase | Greencal-production, ref `orokuivcetynnzfpebzu` |

## Production migration state

| Migration | State |
|---|---|
| 001–040 | live |
| 041 e2e-fixture-rpc | **LIVE** (2026-09-01) |
| 042 restore-crm-authenticated-grants | **LIVE** (2026-09-02), verified |
| 043 restore-remaining-crm-grants | **PREPARED, NOT APPLIED** — approval `a1f92e6b3d8c47059ab7e214fc6d30b8` pending |
| 023 notifications | **NEVER APPLIED** — table absent from production |

Lifetime Supabase Management API requests: 3 (1 edge-blocked, 1 `SELECT 1`, 1 = 042).

## Verified working in production (as a real authenticated CRM user)

`leads` · `contacts` · `tasks` · `notes` · `audit_log` (read) · `jobs` ·
`estimates` · `bookings` · `invoices` · `payments` · `businesses` ·
`memberships` · `membership_roles`

## Known defects

| # | Defect | Severity | State |
|---|---|---|---|
| D1 | 9 tables return 42501 for `authenticated` — companies, estimate_line_items, review_requests, review_records, photo_assets, photo_pairs, service_packages, business_hours, business_service_areas | **P1** — Review Request feature entirely non-functional | Fix committed as 043; **awaiting owner approval** |
| D2 | `audit_log` has no INSERT policy AND no INSERT grant; all 39 call sites discard the failed write, so transitions report success while writing no audit row. History to date is unrecoverable. | **P1** | **Not started.** Needs a SECURITY DEFINER writer (pattern: migration 039 `jervis_audit`), not a grant — see ADR-0041 |
| D3 | `notifications` table absent from production (migration 023 never applied) | P2 | Not started; needs its own reviewed migration |
| D4 | Tenant-isolation E2E never executed end to end | P1 | **Blocked** — see B1 |

## Blockers requiring the owner

| # | Blocker | Why it needs you |
|---|---|---|
| B1 | Tenant-isolation E2E is deny-listed in `.claude/settings.local.json` (18 rules, 0 allow). The assistant is blocked by the auto-mode classifier from editing its own permission config. | Remove `Bash(pnpm --filter * run test:e2e:tenant-isolation*)` or run it yourself |
| B2 | Provider kill switches: only `deepseek` released. Autonomous multi-role CRM work needs zai + deepseek + (kimi or qwen) + claude + openai | Releasing providers is an owner action |
| B3 | Daily budget ceiling is **$1.00** (pause at $0.80). One planner call cost $0.0012; a full plan→research→build→review→final→release cycle across 5 providers will not fit | Raising a budget is explicitly owner-only (CLAUDE.md) |
| B4 | VPS Leader checkout cannot push to GitHub (no credential for AI-company-OS) | Add a deploy key, or Leader commits stay VPS-only |

## Capability gaps found

- **No Node/pnpm on the VPS** → Leader's TypeScript tests and Playwright cannot run there. Currently run on the Windows laptop. This is the main obstacle to fully laptop-independent Leader development.
- Jervis-AI-OS tests run fine on the VPS (Python toolchain installed).

## Completion standard — status

| Criterion | Status |
|---|---|
| Canonical E2E tests passing | ❌ blocked (B1) |
| Tenant isolation passing | ❌ not executed |
| Production permission model verified | ⚠️ partial — 042 verified; 043 pending |
| audit_log defect resolved | ❌ D2 not started |
| Primary CRM workflows exercised | ⚠️ data-layer only; no browser verification |
| No known P0/P1 defects | ❌ D1, D2, D4 open |
| No silently swallowed critical writes | ❌ D2 |
| Staging/browser verification complete | ❌ not started |
| Test suite green | ✅ packages/db 182 passed |
| Security/governance checks green | ✅ |
| Production changes applied or awaiting approval | ✅ 042 applied; 043 awaiting |

**Leader CRM v1 is NOT complete.**

## Next actions, in order

1. Owner: approve `a1f92e6b3d8c47059ab7e214fc6d30b8` (043) — unblocks Review Requests + 8 more tables
2. Owner: clear B1 so the tenant-isolation E2E can run
3. Design and implement the D2 audit writer (SECURITY DEFINER, bounded, tested) — prepare migration, stop at approval
4. Owner: decide B2/B3 if autonomous multi-agent development is wanted
5. Full product/browser audit once B1 and B3 are resolved
