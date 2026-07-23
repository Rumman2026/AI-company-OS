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
  // Production runtime fix, revised (2026-07-23): the deployed
  // /api/quote-submit function originally crashed with "Cannot find
  // module 'tslib'" (require originating inside @supabase/functions-js,
  // a transitive dependency of @supabase/supabase-js). A first attempt
  // added both `@supabase/supabase-js` AND `tslib` to `noExternal`, which
  // built successfully in every local test (including a from-scratch
  // `pnpm install --frozen-lockfile` clean-room reinstall) but failed on
  // Vercel's own build with "Rollup failed to resolve import 'tslib'" -
  // a build-time failure, confirmed via Vercel's Build Logs, worse than
  // the original single-endpoint runtime failure because it blocks the
  // entire deployment. This local repository has no Linux/container
  // environment available to reproduce that exact failure directly - it
  // could not be reproduced here under any local configuration tried.
  //
  // Revised fix: only `@supabase/supabase-js` is listed in `noExternal`.
  // This still inlines @supabase/supabase-js's (and therefore
  // @supabase/functions-js's) actual source directly into the compiled
  // server chunk - verified directly that @supabase/functions-js no
  // longer exists as a separate file in the packaged function output at
  // all, so its original `require('tslib')` call (the literal crash
  // site) cannot occur anymore. `tslib` itself is deliberately left
  // external: Rollup consolidates the bundled code's internal
  // tslib-helper calls into one clean top-level `import { __awaiter,
  // __rest } from "tslib"` in our own compiled chunk (verified directly)
  // rather than inlining tslib's own source - forcing Rollup to also
  // inline `tslib` is what produced the confirmed Vercel build failure.
  // This remaining external `tslib` import must still resolve at
  // runtime, but from a materially shorter, simpler path than the
  // original bug: `tslib` is a direct, top-level dependency of this
  // package (see package.json), not a dependency reached only through
  // @supabase/functions-js's own deeply-nested pnpm resolution scope.
  // Whether this fully resolves the original Production error cannot be
  // confirmed from this repository alone - see
  // src/lib/quote-form/README.md's real end-to-end test procedure.
  // Resend has no runtime dependencies of its own (confirmed directly)
  // and is not affected by this class of failure.
  vite: {
    ssr: {
      noExternal: ['@supabase/supabase-js'],
    },
  },
});
