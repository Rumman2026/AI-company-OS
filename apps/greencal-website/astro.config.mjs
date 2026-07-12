import { defineConfig } from 'astro/config';

// Static-first output, no SSR adapter — see DECISIONS.md ADR-0004.
//
// `site` is intentionally left unset: no production domain has been
// confirmed or approved yet. Setting it would fabricate a canonical/
// sitemap base URL for an environment that does not exist. Set it once a
// production domain is approved (see the Phase 2 plan's production-
// migration decisions).
export default defineConfig({
  output: 'static',
  server: {
    port: 4321,
  },
});
