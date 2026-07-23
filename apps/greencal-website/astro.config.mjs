import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// Static-first output — see DECISIONS.md ADR-0004. `output` remains
// 'static': every existing page stays prerendered by default. The Vercel
// adapter (DECISIONS.md ADR-0006) is required only so the single
// on-demand quote-submission endpoint (src/pages/api/quote-submit.ts,
// which sets `export const prerender = false`) has a trusted server
// runtime to execute in. No other route opts out of prerendering.
//
// Production domain confirmed and authorized — see DECISIONS.md ADR-0005.
// This value is used only to generate correct canonical URLs, sitemap.xml,
// and Open Graph/Twitter metadata. It does not imply DNS, hosting, or
// deployment configuration, which remain separate, unauthorized actions.
// Installing this adapter does not deploy anything - see ADR-0006.
export default defineConfig({
  site: 'https://www.greencalpressurewashing.com',
  output: 'static',
  adapter: vercel(),
  server: {
    port: 4321,
  },
  // Legacy routes retired by the approved-scope update (see DECISIONS.md
  // ADR-0007) - permanent redirects to their replacements, not new pages.
  // No excluded-service legacy route exists to redirect (this site never
  // published one), so this list is limited to the residential-page
  // restructure.
  redirects: {
    '/roof': '/services/roof-cleaning',
    '/restoration/house-washing': '/services/house-washing',
    '/residential-services': '/residential',
  },
  // The dev toolbar is a local-only convenience overlay, already absent
  // from every production build - disabling it has no effect on the
  // deployed site. Disabled only when Playwright starts the dev server
  // (PLAYWRIGHT_TEST, set in playwright.config.ts's webServer.env):
  // verified directly that the toolbar's floating overlay intercepts
  // pointer events and breaks click-based tests. A human running
  // `pnpm run dev` normally still gets the toolbar.
  devToolbar: { enabled: !process.env.PLAYWRIGHT_TEST },
});
