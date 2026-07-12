---
paths:
  - 'apps/greencal-website/**'
---

# Websites rule

Scope: `apps/greencal-website`, the public marketing/lead-generation
website for GreenCal Pressure Washing. See [DECISIONS.md](../../DECISIONS.md)
ADR-0004 for why this is a dedicated app rather than a reuse of
`apps/web-console` or a generic multi-business marketing app.

- This is a **public, unauthenticated, SEO-indexed marketing site** — a
  different concern from `apps/web-console` (an authenticated customer
  console) or `apps/admin-console` (internal-only). Do not share business
  logic or routing assumptions between them.
- **Static-first Astro architecture.** Prefer static output and minimal
  shipped JavaScript over client-side frameworks or SSR adapters unless a
  specific, approved requirement (e.g. a real interactive form) justifies
  otherwise — see [DECISIONS.md](../../DECISIONS.md) ADR-0004 for the
  framework rationale.
- **Accessibility and performance are foundational, not optional**: semantic
  landmarks, a working skip-navigation link, visible keyboard-focus states,
  `prefers-reduced-motion` handling, and no horizontal overflow at mobile
  widths are baseline requirements for every page, not just the homepage.
- **Verified-content requirement**: do not add business claims, guarantees,
  licensing/insurance statements, years-in-business claims, owner
  biography, reviews/testimonials, pricing, or city/service-area claims
  unless the owner has explicitly confirmed them (see the Phase 2 plan's
  business-information verification checklist and the Architecture
  Addendum). Prefer omission over an unverified or fabricated claim.
- **No public street address or `LocalBusiness`/`ProfessionalService`
  structured data** until the owner has resolved the NAP (name/address/
  phone) inconsistency documented in the Phase 2 plan and explicitly
  approved what to publish.
- **Separation from GreenCal Mobile Detailing**: do not add auto-detailing
  content, navigation, or cross-links into this app. That business has its
  own, separately-scoped future module — see [BUSINESSES.md](../../BUSINESSES.md).
- **No production integration or deployment without explicit, separate
  approval**: no CRM, database, authentication, analytics, Search Console
  changes, hosting/DNS/domain configuration, or live deployment may be
  added here on the basis of this rule alone — each requires its own
  explicit user authorization, per root [CLAUDE.md](../../CLAUDE.md).
- Keep GreenCal-specific design tokens and styles local to this app
  (`src/styles/`) rather than in `packages/ui-kit`, unless and until a
  second business website exists and a decision record authorizes
  extracting a shared template — do not design for that prematurely.
- Before reporting a UI change complete, run the app and exercise it
  manually (per root `CLAUDE.md`), not just lint/typecheck/build/test.
