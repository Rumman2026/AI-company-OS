# Product

Status: durable reference, not auto-loaded. Read when scoping product-facing
work. See [docs/INDEX.md](docs/INDEX.md) for routing.

## Confirmed: platform purpose

AI Company OS is a platform, owned by LeadsInitiative.com, intended to power
multiple operating businesses (GreenCal Pressure Washing, GreenCal Mobile
Detailing, Navarro Builders) with shared software infrastructure. See
[BUSINESSES.md](BUSINESSES.md) for the organizational structure.

LeadsInitiative.com develops, operates, and may commercialize AI-powered
software, websites, CRM systems, automations, AI employees, digital
operating systems, and related business infrastructure.

## Confirmed: product boundaries

- The platform is shared infrastructure, distinct from any single business
  it powers.
- Quant Trading OS is out of scope for this platform permanently — it is a
  separate future project and repository (see
  [ARCHITECTURE.md](ARCHITECTURE.md)).

## Current product capabilities supported by the repository

None. The repository is a Phase 1 scaffold: placeholder apps and packages
with no business logic, no CRM functionality, no website functionality,
and no agent behavior implemented. See [ROADMAP.md](ROADMAP.md) for phase
status.

## Proposed future product capabilities

The following are named as intended platform capabilities but are **not
implemented** — treat as **Proposed**:

- CRM systems for the businesses the platform powers.
- Websites for the businesses the platform powers.
- Automations and AI employees operating on behalf of the businesses.
- An agent orchestration layer (`apps/agent-orchestrator`,
  `packages/agent-sdk` exist as placeholders only).

Scope, sequencing, and per-business feature sets are **TBD**.

## Known acceptance principles

- Do not implement business features without an approved plan (see the
  `plan-feature` skill).
- Do not describe a proposed capability as shipped; verify against the
  actual repository state before making claims (see the `verify-work`
  skill).
- Keep the platform's shared code independent of any single business's
  specific logic unless a decision record says otherwise.

## Open product questions

- **TBD**: Which business-specific requirements belong in shared platform
  packages vs. per-business modules?
- **TBD**: Pricing, packaging, and commercialization model for
  LeadsInitiative.com's platform offerings.
- **TBD**: Target customer personas — none are documented in this
  repository; do not invent them.
- **Deferred**: CRM and website product scopes, pending dedicated
  directories/modules (see deferred rule scopes in
  [docs/INDEX.md](docs/INDEX.md)).
