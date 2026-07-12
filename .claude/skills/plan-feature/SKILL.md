---
name: plan-feature
description: Produces a written implementation plan for a non-trivial feature or change — scope, affected files/workspaces, dependencies, risks, validation requirements, and acceptance criteria — then stops for explicit approval before any code is written. Use when a request would touch multiple files, a shared package, or an unclear boundary between apps/packages/businesses. Do not use for a one-line fix, a purely exploratory question, or after a plan is already approved (implement directly instead). Manual invocation only.
disable-model-invocation: true
---

# plan-feature

## When to use

- The request is a new feature, a cross-workspace change, or anything
  touching more than one `apps/*` or `packages/*` module.
- The request could plausibly affect a business boundary (see
  [BUSINESSES.md](../../../BUSINESSES.md)), a shared package contract, or
  an architectural constraint in [ARCHITECTURE.md](../../../ARCHITECTURE.md).
- The user asks to "plan", "scope", or "design" work before building it.

## When not to use

- Trivial, single-file fixes — just make the change (or use `fix-bug` if
  it's a defect).
- Pure research/explanation requests with no intended code change.
- After a plan from this skill has already been approved — proceed to
  implementation directly instead of re-planning.

## Intended scope

Planning only. This skill produces a document; it does not write
application code, install dependencies, or modify configuration.

## Workflow

1. Read only the context relevant to the request: the specific
   apps/packages involved, their `README.md`/`package.json`, and any
   directly relevant sections of [ARCHITECTURE.md](../../../ARCHITECTURE.md),
   [PRODUCT.md](../../../PRODUCT.md), [BUSINESSES.md](../../../BUSINESSES.md),
   and applicable `.claude/rules/*.md`. Do not load unrelated documents.
2. Identify which business(es), the platform, and which system boundaries
   the change touches. Flag anything that would cross into Quant Trading OS
   territory as out of bounds (see [DECISIONS.md](../../../DECISIONS.md)
   ADR-0002) — do not plan for it.
3. Check for existing architecture/utilities that already solve part of the
   problem; prefer reusing them over introducing new abstractions.
4. Draft the smallest viable implementation that satisfies the request.
5. Produce a plan containing:
   - Summary of the change and why.
   - Affected files and workspaces.
   - Dependencies (new packages, other in-flight work, external services).
   - Risks (technical, data, security, business-boundary).
   - Validation requirements (which lint/typecheck/build/tests apply, per
     [verify-work](../verify-work/SKILL.md)).
   - Acceptance criteria.
   - Explicit list of assumptions that need the user's confirmation before
     implementation starts.
6. Present the plan and stop. Wait for explicit user approval before any
   implementation work begins.

## Approval boundaries

- Never proceeds to implementation on its own — approval must be explicit
  and separate from invoking this skill.
- Does not assume silence or a related-but-different approval counts as
  approval for this plan.

## Side-effect boundaries

- Read-only with respect to the repository: no file edits beyond writing
  the plan itself (e.g., to a scratch location or the conversation), no
  installs, no commits, no pushes, no deployments, no infrastructure or
  production changes.
- Does not invent business, security, legal, infrastructure, or pricing
  requirements not present in the repository or stated by the user.

## Expected completion report

A structured plan (as in step 5 above) plus an explicit call-out of open
assumptions requiring approval. Nothing further happens until the user
responds.

## Standing limits

This skill does not override repository standards, permission settings,
hooks, security controls, or user approval requirements. It cannot commit,
push, open a pull request, merge, deploy, publish, modify production
systems, change cloud infrastructure, delete or migrate persistent data, or
perform any other action requiring separate user authorization.
