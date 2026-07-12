# GreenCal Website

Public marketing/lead-generation website for GreenCal Pressure Washing.

This is **Phase 2A, Checkpoint 1**: technical foundation only. See
[DECISIONS.md](../../DECISIONS.md) ADR-0004, [ROADMAP.md](../../ROADMAP.md),
and `.claude/rules/websites.md` for scope and rationale.

Contains: an Astro static-site foundation, one real homepage, a custom 404
page, app-local design tokens and global CSS, and a Playwright/Chromium
smoke-test suite.

Does **not** contain: any content migrated from the current live site, any
unverified business claim, a public address, `LocalBusiness` structured
data, a working quote form, or any production/deployment configuration. See
the Phase 2 plan and Architecture Addendum for the full checkpoint sequence.

## Scripts

- `pnpm run dev` — local dev server
- `pnpm run build` — production static build (`dist/`)
- `pnpm run preview` — serve the production build locally
- `pnpm run typecheck` — `astro check`
- `pnpm run lint` — ESLint (`.ts` and `.astro`)
- `pnpm run format` — Prettier
- `pnpm run test` — Playwright (Chromium) smoke tests against the preview server
