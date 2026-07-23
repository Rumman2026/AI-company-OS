# Documentation Index

Routing map for every controlled document, path-scoped rule, and skill in
this repository. This file is a pointer list, not a copy of the content it
points to — read the linked file itself for details.

## Root instructions

| Document                  | Purpose                                          | When to read                | When to update automatically                                                                                        |
| ------------------------- | ------------------------------------------------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [CLAUDE.md](../CLAUDE.md) | Repository-wide, always-loaded engineering rules | Every session (auto-loaded) | Only when repository-wide behavior genuinely changes; keep it concise. Otherwise flag conflicts instead of editing. |

## Durable reference documents

Not auto-loaded. Read the specific document only when the current task
needs it.

| Document                                  | Purpose                                                         | When to read                                                                          | When to update automatically                                                        | Requires approval to change                                                                                                  |
| ----------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [ARCHITECTURE.md](../ARCHITECTURE.md)     | Repo/app/package boundaries, platform architecture, constraints | Changing structure, cross-service contracts, or evaluating a new architectural choice | When a change alters confirmed structure (new app/package, changed boundary)        | Adding a new _proposed_ future-architecture item is fine; changing a _confirmed_ section should go through `write-adr` first |
| [PRODUCT.md](../PRODUCT.md)               | Platform purpose, product boundaries, open questions            | Scoping product-facing work                                                           | When a capability moves from Proposed to actually implemented                       | Marking something implemented requires repository evidence (see `verify-work`)                                               |
| [BUSINESSES.md](../BUSINESSES.md)         | Parent company, platform, and the three businesses it powers    | Work touching business-specific context                                               | When a business gains a real repository module                                      | New business relationships/structure require user confirmation                                                               |
| [ROADMAP.md](../ROADMAP.md)               | Phases, sequencing, what's done vs. proposed                    | Before assuming a phase is complete                                                   | After a phase's work lands with evidence                                            | Do not mark a phase complete without repository evidence                                                                     |
| [DECISIONS.md](../DECISIONS.md)           | Architecture decision records                                   | Before revisiting a past decision                                                     | Via the `write-adr` skill only                                                      | New/updated ADRs should reflect what was actually decided, not invented reasoning                                            |
| [BUSINESS_FACTS.md](../BUSINESS_FACTS.md) | Owner-approved GreenCal service scope and city coverage         | Scoping any GreenCal service/city/navigation/quote-form/SEO work                      | When the owner approves a service or city scope change (with DECISIONS.md ADR-0007) | Requires explicit owner approval — see ADR-0007's future scope-change procedure                                              |

## Path-scoped rules (`.claude/rules/`)

Auto-load only when the session touches a matching path.

| Rule                                                  | Matches                                                                                                                                                                                                                                                                   | Purpose                                                                                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| [frontend.md](../.claude/rules/frontend.md)           | `apps/web-console/**`, `apps/admin-console/**`, `apps/docs-portal/**`, `packages/ui-kit/**`                                                                                                                                                                               | React/TSX app and shared UI conventions                                                                                              |
| [backend.md](../.claude/rules/backend.md)             | `apps/api-gateway/**`, `apps/core-api/**`, `apps/agent-orchestrator/**`, `apps/worker-service/**`, `packages/auth/**`, `packages/db/**`, `packages/core-models/**`, `packages/agent-sdk/**`, `packages/telemetry/**`, `packages/platform-utils/**`, `packages/toolkit/**` | Node/TypeScript service and shared backend package conventions                                                                       |
| [tests.md](../.claude/rules/tests.md)                 | `tests/**`                                                                                                                                                                                                                                                                | Test category scope and honesty-in-reporting conventions                                                                             |
| [security.md](../.claude/rules/security.md)           | `infra/secrets/**`, `infra/iam/**`, `config/policies/**`, `config/env/**`                                                                                                                                                                                                 | Secret/IAM/policy handling boundaries                                                                                                |
| [documentation.md](../.claude/rules/documentation.md) | `docs/**`                                                                                                                                                                                                                                                                 | Content-planning stub conventions, distinct from root durable docs                                                                   |
| [websites.md](../.claude/rules/websites.md)           | `apps/greencal-website/**`                                                                                                                                                                                                                                                | Public marketing-site conventions (Astro, static-first, verified-content requirement) — see [DECISIONS.md](../DECISIONS.md) ADR-0004 |

**Deferred candidate scopes** (no matching repository path exists yet — do
not create these rules until the path exists):

- `crm` — would apply once a CRM-specific module exists, e.g. `apps/crm/**`
  or `packages/crm/**`.
- Additional business websites (GreenCal Mobile Detailing, Navarro
  Builders) — would extend the `websites.md` rule's path list, or gain
  their own rule file, once those modules exist.

## Skills (`.claude/skills/`)

| Skill                                                             | Invocation                                     | Purpose                                                          |
| ----------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------- |
| [plan-feature](../.claude/skills/plan-feature/SKILL.md)           | Manual only (`disable-model-invocation: true`) | Scope a non-trivial feature and get approval before implementing |
| [fix-bug](../.claude/skills/fix-bug/SKILL.md)                     | Automatic or manual                            | Root-cause a defect and apply the minimal fix                    |
| [verify-work](../.claude/skills/verify-work/SKILL.md)             | Automatic or manual                            | Run and honestly report real validation commands                 |
| [write-adr](../.claude/skills/write-adr/SKILL.md)                 | Automatic or manual                            | Record/update an entry in `DECISIONS.md`                         |
| [create-checkpoint](../.claude/skills/create-checkpoint/SKILL.md) | Manual only (`disable-model-invocation: true`) | Prepare a reviewed commit; never pushes or opens a PR on its own |

## Notes

- None of the above overrides permission settings, hooks, security
  controls, or the requirement to get explicit user approval for commits,
  pushes, pull requests, merges, deployments, or infrastructure/production
  changes.
- If a controlled document conflicts with another, do not silently resolve
  it — report the conflict and preserve existing content until the user
  decides.
