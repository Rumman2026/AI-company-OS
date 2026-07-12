---
name: verify-work
description: Confirms a change is actually validated — runs the correct affected-workspace and/or full-repository lint/typecheck/build/test commands and reports exact results. Use before calling any change done, and always before a commit, merge, release, or deployment. Do not use as a substitute for manual/browser verification of UI behavior, and do not use to fabricate a passing result.
---

# verify-work

## When to use

- Before reporting that a change is complete.
- Before a commit, merge, release, or deployment (full repository checks).
- After `fix-bug` or implementing an approved `plan-feature` plan.

## When not to use

- As a replacement for actually exercising a UI change in a browser — that
  is a separate, required step for frontend work, not covered by this
  skill.
- To justify skipping a check that is genuinely configured — this skill
  runs what exists, it does not decide checks are unnecessary.

## Intended scope

Running and honestly reporting the repository's real validation commands.
It does not modify application code, and it does not modify validation
scripts except to fix a check that this task's own instruction changes
broke (e.g., a typo introduced while editing config in this session).

## Workflow

1. Identify the affected workspace(s): which `apps/*` or `packages/*`
   directories changed, or whether the change touches shared root tooling
   (`tsconfig.base.json`, `.eslintrc.js`, `prettier.config.js`,
   `package.json` scripts, CI config).
2. Run affected-workspace checks first, e.g.
   `pnpm --filter <workspace> run lint`,
   `pnpm --filter <workspace> run typecheck`,
   `pnpm --filter <workspace> run build`, and any workspace test script.
3. Run full repository checks (`pnpm lint`, `pnpm typecheck`, `pnpm build`,
   and relevant tests under `tests/*`) when the change is broad, touches
   shared/root configuration, or is preparing work for commit, merge,
   release, or deployment.
4. Record the exact command run and its exact outcome (pass/fail/exit
   code, key output) for each check.
5. Explicitly classify each check as: executed and passed, executed and
   failed, unavailable (not configured for this workspace), skipped (with
   reason), or a script that exists but currently performs no meaningful
   validation (e.g., a `build` script that only echoes a placeholder
   message).
6. If a check fails, do not modify the check to force a pass — report the
   failure and, if within scope, hand off to `fix-bug` for the underlying
   issue.

## Approval boundaries

Running validation commands is a regular, non-destructive action and does
not require separate approval. Fixing a validation script that is
genuinely broken as a result of this session's own edits is in scope;
loosening or disabling a rule to make an unrelated failure disappear is
not, and requires flagging to the user instead.

## Side-effect boundaries

- No commits, pushes, pull requests, merges, deploys, or infrastructure
  changes.
- No edits to lint/type/test/security rules to manufacture a pass.
- No fake, empty, or no-op scripts introduced to make a check "exist."

## Expected completion report

A per-check table or list: command run, result, and classification
(passed / failed / unavailable / skipped / no-op), plus any warnings that
remain and whether they block the current task.

## Standing limits

This skill does not override repository standards, permission settings,
hooks, security controls, or user approval requirements. It cannot commit,
push, open a pull request, merge, deploy, publish, modify production
systems, change cloud infrastructure, delete or migrate persistent data, or
perform any other action requiring separate user authorization.
