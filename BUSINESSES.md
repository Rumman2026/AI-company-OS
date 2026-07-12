# Businesses

Status: durable reference, not auto-loaded. Read when work touches
business-specific context. See [docs/INDEX.md](docs/INDEX.md) for routing.

## Confirmed structure

**Parent company**

- LeadsInitiative.com — develops, operates, and may commercialize
  AI-powered software, websites, CRM systems, automations, AI employees,
  digital operating systems, and related business infrastructure.

**Platform**

- AI Company OS (this repository) — shared software platform owned by
  LeadsInitiative.com.

**Businesses powered by the platform**

- GreenCal Pressure Washing
- GreenCal Mobile Detailing
- Navarro Builders

**Permanently separate project**

- Quant Trading OS — a completely separate future project and repository.
  It must never share business logic, infrastructure, databases, agents,
  security permissions, deployment systems, credentials, or risk systems
  with AI Company OS or any business listed above.

## Confirmed relationships and boundaries

- Each business is a _consumer_ of the platform, not a fork of it. Shared
  code lives in `packages/*`; business-specific code, when it exists,
  should live in its own `apps/*` or `packages/*` module rather than being
  hardcoded into shared packages.
- No business currently has a dedicated module in this repository (see
  below).

## Known business-specific repository modules

None. As of the Phase 1 scaffold, no directory, app, or package in this
repository is dedicated to GreenCal Pressure Washing, GreenCal Mobile
Detailing, or Navarro Builders specifically. All `apps/*` and `packages/*`
entries are generic platform scaffolding.

## Missing information (TBD)

- Business-specific domain models, services, or websites — **TBD**, no
  repository evidence yet.
- Which platform services each business will use first — **TBD**.
- Legal/operational relationship details (ownership structure, contracts)
  between LeadsInitiative.com and each business — **TBD**, out of scope
  for this repository's documentation.
