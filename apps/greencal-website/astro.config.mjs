import { defineConfig } from 'astro/config';

// Static-first output, no SSR adapter — see DECISIONS.md ADR-0004.
//
// Production domain confirmed and authorized — see DECISIONS.md ADR-0005.
// This value is used only to generate correct canonical URLs, sitemap.xml,
// and Open Graph/Twitter metadata. It does not imply DNS, hosting, or
// deployment configuration, which remain separate, unauthorized actions.
export default defineConfig({
  site: 'https://www.greencalpressurewashing.com',
  output: 'static',
  server: {
    port: 4321,
  },
});
