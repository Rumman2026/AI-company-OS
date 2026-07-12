# GreenCal Website

Public marketing/lead-generation website for GreenCal Pressure Washing.

This is **Phase 2A**. Checkpoint 1 (technical foundation) and Checkpoint 2
(first content slice, residential-only) are implemented. See
[DECISIONS.md](../../DECISIONS.md) ADR-0004, [ROADMAP.md](../../ROADMAP.md),
and `.claude/rules/websites.md` for scope and rationale.

Contains: an Astro static-site foundation; a homepage, Residential Services
overview, Roof Cleaning (`/roof`), House & Stucco Washing
(`/restoration/house-washing`), and Contact (`/contact-us`) pages; a
reusable `ServicePageLayout`; typed site/navigation/service data under
`src/data/` and `src/types/`; app-local design tokens and global CSS; and a
Playwright/Chromium test suite covering the shell and the new routes.

Route note: `/roof` and `/restoration/house-washing` intentionally preserve
the current live site's existing slugs rather than adopting a cleaner
`/residential-services/*` pattern — the resulting inconsistent URL taxonomy
is known and deferred to a later SEO migration/redirect decision, not
resolved here.

Does **not** contain: Commercial Services, Concrete & Hardscape Cleaning,
Driveway Cleaning, About, Service Areas, city pages, blog, projects,
galleries, reviews, testimonials, any unverified business claim, a public
address, `LocalBusiness` structured data, a working quote form (Contact
uses phone/email only), or any production/deployment configuration. See the
Phase 2 plan and Architecture Addendum for the full checkpoint sequence.

## Content and data architecture

Plain typed TypeScript data (`src/types/content.ts`, `src/data/site.ts`,
`src/data/navigation.ts`, `src/data/services.ts`) plus Astro file-based
routing — no Content Collections, MDX, or CMS. `/roof` and
`/restoration/house-washing` are separate static page files (they don't
share a URL prefix) that both render through the shared
`ServicePageLayout`, reading their content from `src/data/services.ts` so
copy isn't duplicated between the individual pages and their `ServiceCard`
listings on the homepage and Residential Services overview.

## Scripts

- `pnpm run dev` — local dev server
- `pnpm run build` — production static build (`dist/`)
- `pnpm run preview` — serve the production build locally
- `pnpm run typecheck` — `astro check`
- `pnpm run lint` — ESLint (`.ts` and `.astro`)
- `pnpm run format` — Prettier
- `pnpm run test` — Playwright (Chromium) smoke tests against the preview server
