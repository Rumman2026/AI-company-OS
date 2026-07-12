---
name: create-checkpoint
description: Prepares a safe, reviewed commit — inspects git status/diff, flags unintended, sensitive, generated, or machine-specific files, proposes a commit message and file set, and only commits after explicit user authorization (push and PR each require separate further authorization). Use when the user asks to checkpoint, save, or commit current work. Do not use to push, open a pull request, merge, or as a substitute for the user's own review of sensitive content. Manual invocation only.
disable-model-invocation: true
---

# create-checkpoint

## When to use

- The user asks to commit, checkpoint, or save current work to git.
- A logical unit of work is finished and the user wants it captured.

## When not to use

- The user wants to push or open a pull request — those require their own
  separate explicit authorization beyond what this skill covers.
- Mid-task, when work is incomplete and the user hasn't asked to stop and
  save.

## Intended scope

Staging and committing a reviewed file set to the local repository. Never
extends to pushing, opening a pull request, merging, or any remote/shared
action.

## Workflow

1. Run `git status` (never `-uall`) to see all changed and untracked
   files.
2. Run `git diff` (staged and unstaged) to see the actual content changes.
3. Identify unintended files: build output (`dist/`, `build/`,
   `coverage/`), `node_modules`, `.env`/`.env.*` (except tracked
   `.env.example` files), machine-specific files (`.vscode/`, `.idea/`,
   `.DS_Store`), and anything not already covered by `.gitignore` that
   looks accidental.
4. Scan for likely secrets or credentials in the diff (API keys, tokens,
   passwords, connection strings) even in innocuously named files. If
   found, stop and flag it — do not stage or commit it.
5. Propose a concise, professional commit message describing _why_, not
   just _what_, consistent with recent commit style (`git log`).
6. Show the user the exact proposed file set and commit message before
   doing anything else.
7. Stage and commit only after the user gives explicit authorization for
   this specific commit.
8. After commit, report the commit hash and current branch. Do not push.
9. If the user separately and explicitly authorizes a push, push only
   then. If the user separately and explicitly authorizes a pull request,
   open it only then — never bundle these authorizations with the commit
   authorization.

## Approval boundaries

- Committing requires explicit authorization for this specific change set.
- Pushing requires a separate, later explicit authorization.
- Opening a pull request requires a separate, later explicit
  authorization.
- One approval does not carry over to a future commit/push/PR.

## Side-effect boundaries

- Never runs `git add -A` / `git add .` blindly — stages named files only,
  after the user has seen the list.
- Never commits `.env` files, credentials, secrets, `node_modules`,
  generated build output, or machine-specific files.
- Never uses `--no-verify`, `--no-gpg-sign`, force-push, `reset --hard`, or
  other destructive/bypass flags.
- Never amends an existing commit unless the user explicitly requests it.
- Never pushes, opens a PR, merges, deploys, or touches infrastructure.

## Expected completion report

- The reviewed file set and why anything was excluded.
- Any secret/sensitive-data flags raised (and resolution).
- The proposed commit message.
- After authorized commit: commit hash, branch, and `git status` summary.
- Explicit statement that push/PR were not performed and require separate
  authorization.

## Standing limits

This skill does not override repository standards, permission settings,
hooks, security controls, or user approval requirements. It cannot push,
open a pull request, merge, deploy, publish, modify production systems,
change cloud infrastructure, delete or migrate persistent data, or perform
any other action requiring separate user authorization beyond the single
authorized commit.
