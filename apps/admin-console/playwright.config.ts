import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Playwright loads this config as CommonJS, not ESM (no "type": "module"
// in package.json) - `__dirname` here is Node's CJS module-scope global,
// not something declared by this file. `import.meta.url` would be a hard
// SyntaxError under CJS.

/**
 * Loads apps/admin-console/.env.e2e.local (gitignored, see
 * .env.e2e.local.example in this same directory) if present - never
 * committed, never required. Does not overwrite a
 * variable already set in the real environment (e.g. a CI secret), and
 * does nothing at all if the file doesn't exist - the default,
 * pure-logic-only test suite never depends on this. No new dependency
 * (dotenv) - this is a deliberately minimal KEY=VALUE parser for exactly
 * this one file.
 */
function loadE2eEnvFile(): void {
  const path = join(__dirname, '.env.e2e.local');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadE2eEnvFile();

/**
 * Whether the credentialed, production-hitting tenant-isolation projects are
 * part of this run AT ALL.
 *
 * WHY THIS GATE EXISTS. Playwright runs every project in `projects` unless
 * `--project` narrows it, so before this gate a bare `playwright test` - i.e.
 * `pnpm test`, and CI's `-r --if-present run test` - loaded and ran the
 * `e2e-tenant-isolation` project too. It happened to be harmless in CI only
 * because the E2E_* variables are absent there and the suite self-skipped. On a
 * machine where .env.e2e.local exists and is complete, `pnpm test` would have
 * hit production and written rows. The comment below has always claimed
 * `pnpm test` stays "fast, offline, and safe by default"; this is what makes
 * that true structurally instead of by accident.
 *
 * `npm_lifecycle_event` is set by npm/pnpm to the name of the script being
 * run, so it distinguishes `pnpm test:e2e:tenant-isolation` from `pnpm test`
 * with no new dependency and no shell-specific `VAR=x cmd` prefix (which does
 * not work on Windows, where this repository is developed). E2E_TENANT_ISOLATION
 * is the explicit escape hatch for a runner that invokes Playwright directly.
 *
 * FAILS CLOSED. If neither signal is present, these projects do not exist, and
 * `--project=e2e-tenant-isolation` exits with "Project(s) not found" - a loud
 * refusal, never a silent pass.
 */
const E2E_TENANT_ISOLATION_ENABLED =
  process.env.npm_lifecycle_event === 'test:e2e:tenant-isolation' ||
  process.env.E2E_TENANT_ISOLATION === '1';

/**
 * The two credentialed projects, or nothing at all.
 *
 * Annotated with Playwright's own `projects` type rather than left to
 * inference: a conditional array loses the contextual typing `defineConfig`
 * would otherwise give the literals inside it, and `screenshot: 'on'` widens
 * to `string`. The annotation is what keeps these literal, and what makes a
 * typo in a Playwright option a typecheck failure instead of a runtime one.
 */
const E2E_TENANT_ISOLATION_PROJECTS: NonNullable<PlaywrightTestConfig['projects']> =
  E2E_TENANT_ISOLATION_ENABLED
    ? [
        // The fixture provisioner - see tests/e2e/fixture.setup.ts. A separate
        // project rather than a config-level `globalSetup` precisely because
        // globalSetup would also run for `chromium`; a dependency project runs
        // only when the project that depends on it runs. It calls one bounded
        // SECURITY DEFINER function
        // (packages/db/migrations/041-e2e-fixture-rpc.sql) and fails the whole
        // run if the fixture cannot be provisioned or verified. It opens no
        // browser.
        {
          name: 'e2e-tenant-isolation-setup',
          testMatch: '**/e2e/fixture.setup.ts',
        },
        {
          name: 'e2e-tenant-isolation',
          testMatch: '**/e2e/tenant-isolation.e2e.spec.ts',
          // Playwright runs the setup project to completion first and skips
          // this one entirely if it fails - so `--project=e2e-tenant-isolation`
          // alone is enough to provision, and there is no path that reaches the
          // browser assertions with an unprovisioned or unverified fixture.
          dependencies: ['e2e-tenant-isolation-setup'],
          use: {
            ...devices['Desktop Chrome'],
            baseURL: process.env.E2E_BASE_URL,
            screenshot: 'on',
            trace: 'on',
            // Sent on every request (both page navigations and page.request.*
            // calls) in this project only - the target deployment has Vercel
            // Deployment Protection (SSO) enabled, which this bypasses
            // per-request without disabling protection itself. Undefined (header
            // omitted entirely) if the secret isn't present, so the run fails on
            // the real response rather than on an empty/invalid header.
            extraHTTPHeaders: process.env.VERCEL_AUTOMATION_BYPASS_SECRET
              ? {
                  'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
                }
              : undefined,
          },
        },
      ]
    : [];

// This milestone's default tests are pure-logic only (no real Supabase
// Auth credentials exist in this environment to drive a real browser
// session against - see DECISIONS.md ADR-0011) - same "Playwright test
// runner, no browser" pattern as apps/greencal-website's
// tests/quote-form-unit.spec.ts.
//
// tests/e2e/** is a real, credentialed, production-hitting exception -
// the CRM tenant-isolation verification. Three things keep it away from
// an ordinary run, in this order: it is excluded from the default
// `chromium` project via testIgnore; its two projects are not even
// DEFINED unless this run asked for them (E2E_TENANT_ISOLATION_ENABLED
// above); and its fixture provisioner refuses to write anything without
// E2E_ALLOW_FIXTURE_MUTATION=true. So `pnpm test` and CI stay fast,
// offline, and safe by default, and this suite only does anything when
// invoked through package.json's `test:e2e:tenant-isolation` script with
// real credentials loaded (see .env.e2e.local.example).
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  projects: [
    {
      name: 'chromium',
      testIgnore: '**/e2e/**',
      use: { ...devices['Desktop Chrome'] },
    },
    // Empty unless this run explicitly asked for the credentialed suite -
    // see E2E_TENANT_ISOLATION_ENABLED above.
    ...E2E_TENANT_ISOLATION_PROJECTS,
  ],
});
