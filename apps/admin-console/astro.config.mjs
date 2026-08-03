import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

// Every page here is authenticated/dynamic (unlike apps/greencal-website's
// mostly-static site) - full server output, not the static-first default.
// See DECISIONS.md ADR-0011.
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [react()],
  server: {
    port: 4322,
  },
  devToolbar: { enabled: !process.env.PLAYWRIGHT_TEST },
  // apps/greencal-website's astro.config.mjs documents an extensive,
  // hard-won fix for a Vercel-build-only "Cannot find module 'tslib'"
  // failure when @supabase/supabase-js is bundled into a Vercel
  // serverless function - never reproduced locally there, only on
  // Vercel's own Linux build machine. This app also bundles
  // @supabase/supabase-js (via @supabase/ssr) into every page's SSR
  // render, so the same class of failure is a real, live risk here too,
  // not yet confirmed one way or the other against a real Vercel
  // deployment (none exists for this app yet). Applying the same
  // noExternal/external settings preemptively, since they cost nothing
  // locally; if the same tslib-not-found failure recurs on Vercel, the
  // fuller vendor/tslib fix documented in that file is the next step.
  vite: {
    ssr: {
      noExternal: ['@supabase/supabase-js', '@supabase/ssr'],
    },
    build: {
      rolldownOptions: {
        external: ['tslib'],
      },
    },
  },
});
