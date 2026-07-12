---
paths:
  - 'apps/web-console/**'
  - 'apps/admin-console/**'
  - 'apps/docs-portal/**'
  - 'packages/ui-kit/**'
---

# Frontend rule

Scope: the three React/TSX apps (`web-console`, `admin-console`,
`docs-portal`) and the shared `ui-kit` package they consume.

- These apps currently contain only a placeholder `src/index.tsx` — there
  is no existing component structure, routing, or state management to
  follow yet. Do not assume a framework beyond what `tsconfig.json`
  declares (`jsx: react-jsx`, `lib: DOM`) without checking `package.json`
  for what's actually installed.
- Put shared, reusable UI (components, design tokens) in
  `packages/ui-kit`, not duplicated across `web-console`/`admin-console`/
  `docs-portal`.
- `web-console` is customer-facing; `admin-console` is internal-only —
  do not share business logic between them beyond what's factored into
  `packages/ui-kit` or another shared package.
- Follow the repository's ESLint browser environment settings
  (`.eslintrc.js` sets `env.browser: true`) and strict TypeScript config
  (`tsconfig.base.json`).
- Before reporting a UI change complete, run the app and exercise it (per
  root `CLAUDE.md`), not just lint/typecheck/build.
