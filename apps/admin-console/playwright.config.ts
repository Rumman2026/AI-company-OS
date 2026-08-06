import { defineConfig, devices } from '@playwright/test';
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

// This milestone's default tests are pure-logic only (no real Supabase
// Auth credentials exist in this environment to drive a real browser
// session against - see DECISIONS.md ADR-0011) - same "Playwright test
// runner, no browser" pattern as apps/greencal-website's
// tests/quote-form-unit.spec.ts.
//
// tests/e2e/** is a real, credentialed, production-hitting exception -
// the CRM tenant-isolation verification. It is a SEPARATE project,
// excluded from the default `chromium` project via testIgnore, and each
// e2e test self-skips (test.skip) if its required E2E_* environment
// variables aren't present - so `pnpm test` and CI stay fast, offline,
// and safe by default, and this project only does anything when
// explicitly invoked with real credentials loaded (see
// .env.e2e.local.example and package.json's
// `test:e2e:tenant-isolation` script).
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
    {
      name: 'e2e-tenant-isolation',
      testMatch: '**/e2e/tenant-isolation.e2e.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.E2E_BASE_URL,
        screenshot: 'on',
        trace: 'on',
        // Sent on every request (both page navigations and
        // page.request.* calls) in this project only - the target
        // deployment has Vercel Deployment Protection (SSO) enabled,
        // which this bypasses per-request without disabling
        // protection itself. Undefined (header omitted entirely) if
        // the secret isn't present, so this project still just
        // self-skips rather than sending an empty/invalid header.
        extraHTTPHeaders: process.env.VERCEL_AUTOMATION_BYPASS_SECRET
          ? { 'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET }
          : undefined,
      },
    },
  ],
});
