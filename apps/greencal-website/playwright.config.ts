import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4321',
  },
  // Chromium only for Checkpoint 1 — see DECISIONS.md ADR-0004.
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // Stage 4A: @astrojs/vercel does not support `astro preview` at all
    // ("The @astrojs/vercel adapter does not support the preview
    // command." - verified directly, not assumed). `astro dev` is the
    // documented, standard local-testing path for Astro projects using an
    // on-demand adapter route (src/pages/api/quote-submit.ts) - it always
    // serves on-demand routes correctly regardless of adapter. The
    // production build itself is verified separately via `pnpm run
    // build`, which is not affected by this change.
    //
    // ASTRO_DEV_BACKGROUND=1 disables Astro 7's automatic
    // agent-environment detection (it otherwise silently daemonizes
    // `astro dev` when it detects an AI coding agent, which breaks
    // Playwright's webServer child-process lifecycle management -
    // verified directly).
    command: 'pnpm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      ASTRO_DEV_BACKGROUND: '1',
      // Disables the dev toolbar overlay for this server only - see
      // astro.config.mjs. The overlay intercepts pointer events and
      // breaks click-based tests; it has no effect on production builds.
      PLAYWRIGHT_TEST: '1',
    },
  },
});
