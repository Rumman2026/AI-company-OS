import { defineConfig, devices } from '@playwright/test';

// This milestone's tests are pure-logic only (no real Supabase Auth
// credentials exist in this environment to drive a real browser session
// against - see DECISIONS.md ADR-0011) - same "Playwright test runner,
// no browser" pattern as apps/greencal-website's
// tests/quote-form-unit.spec.ts. No webServer is configured because no
// test here navigates a real page.
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
