---
paths:
  - 'tests/**'
---

# Tests rule

Scope: the shared, top-level test suites (`tests/unit`, `tests/integration`,
`tests/e2e`, `tests/contract`, `tests/perf`).

- Every directory here currently holds only a planning `README.md` — no
  test files or test runner configuration exist yet. Do not assume a
  framework (Jest, Vitest, Playwright, etc.) is installed; check root
  `package.json` and `devDependencies` first.
- When adding the first real tests to one of these directories, keep them
  scoped to what the directory name promises (`unit` = single
  function/module, `integration` = cross-module within one service,
  `e2e` = full user-facing flow, `contract` = API contract between
  services, `perf` = load/performance) rather than mixing categories.
- Prefer colocating a package/app's own unit tests inside that
  package/app (e.g., `apps/core-api/src/**/*.test.ts`) and reserve
  top-level `tests/*` for cross-cutting suites, unless the repository's
  test runner configuration says otherwise once one is chosen.
- Do not mark a phase or feature "tested" in [ROADMAP.md](../../ROADMAP.md)
  or a completion report without an actual runnable test backing the
  claim — see the `verify-work` skill.
