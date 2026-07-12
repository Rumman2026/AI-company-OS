---
name: write-adr
description: Records or updates an architecture decision record in DECISIONS.md — context, decision, alternatives, trade-offs, risks, and consequences. Use when an architectural choice has actually been made (or is being formally proposed) and needs a durable record. Do not use to document routine implementation details, and do not use to invent reasoning for past decisions the repository has no evidence for.
---

# write-adr

## When to use

- A real architectural decision has been made (e.g., choice of database,
  communication pattern, deployment target) and needs to be recorded.
- The user asks to propose a decision for review before it's finalized.
- An existing ADR in [DECISIONS.md](../../../DECISIONS.md) needs a status
  update (e.g., Proposed → Confirmed, or Confirmed → Superseded).

## When not to use

- Routine implementation details that don't reflect an architectural
  choice — that belongs in code comments or PR descriptions, not an ADR.
- Retroactively inventing "why" for a past decision when the repository
  and conversation have no evidence of the actual reasoning — record only
  what is known, and mark the rest **unknown**.

## Intended scope

Editing [DECISIONS.md](../../../DECISIONS.md) only. Does not modify
implementation code unless the user explicitly asks for both in the same
request.

## Workflow

1. Determine whether this is a new decision or an update to an existing
   ADR entry.
2. Gather context from the actual conversation and repository state —
   what problem prompted the decision, what was chosen, and why, as
   stated by the user or clearly evidenced in the code.
3. Identify alternatives that were actually considered, if known; if not
   known, write "not recorded" rather than fabricating options.
4. Record trade-offs, risks, and consequences based on the real change,
   not speculative ones.
5. Set **Status** accurately: `Proposed` (not yet decided/implemented),
   `Confirmed` (decided and/or implemented), or `Superseded` (replaced by
   a later ADR — link it).
6. Append the ADR to [DECISIONS.md](../../../DECISIONS.md) following the
   existing format (Status, Context, Decision, Alternatives, Trade-offs,
   Consequences, Related documents), keeping numbering sequential.
7. Cross-link related documents ([ARCHITECTURE.md](../../../ARCHITECTURE.md),
   [PRODUCT.md](../../../PRODUCT.md), etc.) where relevant.

## Approval boundaries

- Recording a `Proposed` decision does not require approval to write, but
  should be clearly labeled as not yet decided.
- Marking a decision `Confirmed` should reflect that the user has actually
  confirmed it in conversation — do not upgrade a proposal to confirmed
  status on your own judgment.

## Side-effect boundaries

- Edits are limited to [DECISIONS.md](../../../DECISIONS.md) (and, only if
  explicitly requested, a specific cross-reference in another durable doc).
- No implementation code changes, no commits, no pushes, no deployment.

## Expected completion report

The new or updated ADR text, its status, and confirmation of where it was
appended in [DECISIONS.md](../../../DECISIONS.md).

## Standing limits

This skill does not override repository standards, permission settings,
hooks, security controls, or user approval requirements. It cannot commit,
push, open a pull request, merge, deploy, publish, modify production
systems, change cloud infrastructure, delete or migrate persistent data, or
perform any other action requiring separate user authorization.
