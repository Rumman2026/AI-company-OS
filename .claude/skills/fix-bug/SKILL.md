---
name: fix-bug
description: Investigates a reported defect, separates root cause from symptoms, and applies the smallest correct fix with appropriate validation. Use when something is broken, erroring, or behaving incorrectly and the cause isn't already obvious. Do not use for new-feature work (use plan-feature) or for changes with no defect to reproduce or isolate.
---

# fix-bug

## When to use

- A user reports an error, crash, incorrect output, or regression.
- Tests, lint, typecheck, or build are failing and the cause needs
  diagnosis.

## When not to use

- The work is a new feature or enhancement with no existing defect — use
  `plan-feature` instead.
- The root cause and fix are already obvious and trivial (e.g., an
  obvious typo) — just fix it directly without the full workflow below.

## Intended scope

Diagnosis and the minimal code change that resolves the confirmed root
cause, within the affected app(s)/package(s). Does not include unrelated
refactoring or speculative hardening.

## Workflow

1. Reproduce or isolate the issue where possible (failing test, error
   message, repro steps). If it cannot be reproduced, say so explicitly
   rather than guessing.
2. Collect evidence before changing any code: read the relevant source,
   logs, error output, and recent related changes (`git log`/`git diff`
   for the affected paths).
3. Separate symptoms (what the user observed) from the underlying cause.
4. State the root cause, and explicitly mark it as **confirmed** (backed
   by reproduced evidence) or an **assumption** (best explanation without
   full reproduction).
5. Implement the smallest correct fix for the confirmed root cause. Avoid
   unrelated refactoring, renames, or "while I'm in here" changes.
6. Run the validation appropriate to the change (see `verify-work`):
   affected-workspace lint/typecheck/build/tests at minimum.
7. Report the fix, the evidence behind it, and any remaining uncertainty
   (e.g., "cause confirmed via failing test X" vs. "cause is my best
   assumption; couldn't reproduce locally").

## Approval boundaries

- Code edits to fix the confirmed defect proceed without separate
  approval, consistent with normal repository editing.
- Any fix that would touch security controls, delete data, change
  infrastructure, or require a dependency change with broad blast radius
  should be flagged to the user before proceeding, per the root
  [CLAUDE.md](../../../CLAUDE.md) escalation criteria.

## Side-effect boundaries

- No commits, pushes, pull requests, merges, deploys, or production/
  infrastructure changes — those remain gated by explicit user
  authorization and are outside this skill's scope.
- No modification of validation scripts to force a pass; if a check
  reveals a real problem, fix the problem, not the check.

## Expected completion report

- Root cause (confirmed or assumption, clearly labeled).
- The fix applied and why it's minimal.
- Validation run and its outcome.
- Any remaining uncertainty or follow-up recommended.

## Standing limits

This skill does not override repository standards, permission settings,
hooks, security controls, or user approval requirements. It cannot commit,
push, open a pull request, merge, deploy, publish, modify production
systems, change cloud infrastructure, delete or migrate persistent data, or
perform any other action requiring separate user authorization.
