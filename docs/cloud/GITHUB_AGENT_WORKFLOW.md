# GitHub Agent Workflow

Status: durable reference for the Cost-Efficient Multi-Model Cloud
Infrastructure Preparation Stage. See [DECISIONS.md](../../DECISIONS.md)
ADR-0008. Describes the controlled pipeline any provider/agent's code
changes must go through — not automated by this repository's current
CI (`.github/workflows/ci.yml` only runs lint/typecheck repo-wide plus
build/test for `apps/greencal-website`; see the note below).

## Pipeline

1. **Task created** — via `packages/job-queue` (agent-worker) or a
   GitHub issue (e.g., opened by the GreenCal Website and Lead Health
   Agent — see `docs/agents/GREENCAL_WEBSITE_AND_LEAD_HEALTH_AGENT.md`).
2. **Isolated branch or worktree created** — every provider/agent works
   on its own branch; Kimi Code CLI in particular must only ever run in
   an isolated branch or worktree (never directly against `main` or an
   existing feature branch).
3. **Provider performs bounded work** — scoped by `packages/task-router`'s
   routing decision, `packages/context-builder`'s compact context, and
   `packages/cost-controller`'s budget check.
4. **Claude reviews when escalation rules require it** — see
   `docs/cloud/AI_ROUTING_AND_TOKEN_POLICY.md`'s escalation conditions
   (security/auth/infra-affecting code is always one of them).
5. **Typecheck, lint, tests, and build run** — `pnpm lint`, `pnpm
typecheck`, and the relevant workspace's `test`/`build` scripts. A
   change is not "done" until these actually pass — see the
   `verify-work` skill.
6. **Pull request is created** — never a direct commit to `main`.
7. **Owner approval occurs when required** — per the Authority Rules
   (`packages/policy-engine`'s `checkAuthority()`), no provider or agent
   may approve its own output.
8. **Controlled merge** — only the owner merges, or an explicitly
   owner-authorized automated gate that itself does not run as the
   authoring provider/agent.
9. **Controlled deployment** — a separate, explicitly authorized step;
   not automatic on merge for anything in this cloud-infrastructure
   track today.

## Authority rules (enforced by `packages/policy-engine`)

No provider or agent may independently: push to `main`, merge a pull
request, deploy production, modify production data, alter credentials,
disable tests, disable security controls, approve its own output, access
an unrelated repository, or exceed its assigned token/spending limit.
`checkAuthority()` blocks all of these unless the caller is the owner.

## Current CI reality vs. this pipeline

`.github/workflows/ci.yml` today runs `pnpm lint` and `pnpm typecheck`
across the whole workspace, then builds/tests only
`apps/greencal-website` (see `ci.yml`'s comment citing ADR-0004). It does
not yet enforce steps 2, 4, 7, or 8 above as automated gates — those are
process requirements for how any human or agent contributor works in
this repository today, not (yet) machine-enforced branch-protection
rules. Extending CI to cover the new `apps/ai-gateway`,
`apps/jervis-api`, `apps/worker-service` (agent-worker role), and the
ADR-0008 packages' own `lint`/`typecheck`/`test` scripts is recommended
future work — not done as part of this stage (see
`docs/cloud/IMPLEMENTATION_CHECKLIST.md`).

## Kimi-specific constraints

Kimi Code CLI output must pass through the exact same policy engine,
testing requirements, Git controls, audit logging, and review process as
any other provider's output. Kimi must never: push to `main`, merge pull
requests, deploy production, access production credentials, modify
production data, disable tests, or disable security controls.
