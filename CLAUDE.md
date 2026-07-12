# CLAUDE.md

Repository-wide instructions for Claude Code in AI Company OS. Keep this file
short — it loads in every session. Deep procedures live in skills; deep
context lives in the durable docs listed under Routing.

## Project identity

- **LeadsInitiative.com** is the parent company.
- **AI Company OS** (this repository) is the platform.
- Businesses powered by the platform: **GreenCal Pressure Washing**,
  **GreenCal Mobile Detailing**, **Navarro Builders**.
- **Quant Trading OS** is a completely separate future project and
  repository. Never share business logic, infrastructure, databases,
  agents, permissions, deployment, credentials, or risk systems with it.
- This repository is currently a **Phase 1 scaffold**: pnpm/TypeScript
  monorepo (`apps/*`, `packages/*`) with placeholder services and no
  business logic implemented yet. See [ARCHITECTURE.md](ARCHITECTURE.md).

## Engineering behavior

- Inspect relevant existing code and documentation before changing anything.
- Reuse existing architecture before creating new architecture.
- Never create duplicate implementations.
- Prefer the smallest correct change; avoid unrelated refactoring.
- Preserve established repository conventions (workspace layout, ESLint/
  Prettier/TypeScript config, naming).
- Investigate root causes instead of hiding symptoms.
- Clearly distinguish confirmed facts from assumptions.
- Do not invent hidden requirements. Ask only when ambiguity would
  materially affect architecture, security, data models, destructive
  behavior, or acceptance criteria.

## Quality requirements

- Run affected-workspace checks (`pnpm --filter <workspace> run lint|typecheck|build`)
  during development.
- Run full repository checks (`pnpm lint`, `pnpm typecheck`, `pnpm build`,
  and relevant tests) before milestone commits, merges, releases, or
  deployment.
- Report checks honestly. Never describe missing, skipped, empty, or no-op
  validation as meaningful success.
- Never add fake, empty, placeholder, or no-op validation to make checks
  appear successful, and never disable legitimate lint/type/test/security
  rules merely to make validation pass.
- Fix the root cause whenever reasonably possible.

## Security and Git boundaries

- Never commit real `.env`/`.env.local`/`.env.*.local`/`.env.production`
  files, or any file containing credentials, API keys, access tokens,
  private keys, passwords, production connection strings, or other
  sensitive account identifiers.
- Sanitized templates (`.env.example`, other placeholder config) may be
  committed once verified to contain no real credentials or secrets —
  values must be fake, empty, or documented placeholders only.
- Never commit `node_modules`, build output, or machine-specific files.
- Do not expose secrets in logs, docs, examples, tests, commits, or reports.
- Do not commit without explicit authorization. Do not push, open a pull
  request, merge, deploy, change infrastructure, modify production systems,
  or delete persistent data without separate explicit authorization.

## Documentation behavior

- Do not automatically load unrelated reference documents — read only what
  the current task needs.
- Do not modify controlled standards or reference documents unless the task
  explicitly requires it.
- Keep documentation synchronized when a code change invalidates a
  documented fact.
- Keep completion reports concise and evidence-based.

## Routing

- **Path-scoped rules** (`.claude/rules/*.md`) — auto-load for their scope
  (frontend, backend, tests, security, documentation). Check
  [docs/INDEX.md](docs/INDEX.md) for the full list and exact path matches.
- **`plan-feature` skill** — before implementing a non-trivial feature;
  produces a plan and waits for approval. Manual invocation only.
- **`fix-bug` skill** — investigating and fixing a defect.
- **`verify-work` skill** — confirming a change is validated before
  calling it done.
- **`write-adr` skill** — recording an architecture decision in
  [DECISIONS.md](DECISIONS.md).
- **`create-checkpoint` skill** — preparing a reviewed, safe commit.
  Manual invocation only.
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — repo/app/package boundaries and
  platform architecture. Read when changing structure or cross-service
  contracts.
- **[PRODUCT.md](PRODUCT.md)** — platform purpose and product boundaries.
  Read when scoping product-facing work.
- **[BUSINESSES.md](BUSINESSES.md)** — parent company, platform, and the
  three businesses it powers. Read when work touches business-specific
  context.
- **[ROADMAP.md](ROADMAP.md)** — phases, sequencing, and what's actually
  done vs. proposed. Read before assuming a phase is complete.
- **[DECISIONS.md](DECISIONS.md)** — architecture decision records. Read
  before revisiting a past decision; update via `write-adr`.
- **[docs/INDEX.md](docs/INDEX.md)** — routing map for every controlled
  document, rule, and skill in this repository. Start here if unsure what
  to read.

This file does not override permission settings, hooks, security controls,
tests, or user approval — it is guidance for how to work within them.
