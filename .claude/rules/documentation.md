---
paths:
  - 'docs/**'
---

# Documentation rule

Scope: the `docs/` tree (`architecture`, `onboarding`, `api`, `security`,
`plugins`), currently planning `README.md` stubs describing what each
subdirectory will hold.

- These are content-planning stubs, not the durable reference docs — the
  durable docs ([ARCHITECTURE.md](../../ARCHITECTURE.md),
  [PRODUCT.md](../../PRODUCT.md), [BUSINESSES.md](../../BUSINESSES.md),
  [ROADMAP.md](../../ROADMAP.md), [DECISIONS.md](../../DECISIONS.md)) live
  at the repository root and are indexed in [docs/INDEX.md](../../docs/INDEX.md).
- When filling in a `docs/*` stub with real content, keep it scoped to
  what its `README.md` already promises (e.g., `docs/api` = API/contract
  reference, `docs/security` = security/compliance documentation) rather
  than duplicating content that belongs in a root durable doc.
- Do not describe a capability as documented/implemented here unless it
  matches actual repository state — label unconfirmed content `TBD` or
  `Proposed`, consistent with the durable docs' conventions.
- Do not add large procedural or company/business context into these
  files if it's better scoped as a skill or a root durable doc — this
  directory is for content-specific documentation (API details, security
  policy detail, onboarding steps), not repository-wide instructions.
