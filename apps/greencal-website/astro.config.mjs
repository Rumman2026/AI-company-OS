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
  // Production runtime fix, revised again (2026-07-23): the deployed
  // /api/quote-submit function originally crashed with "Cannot find
  // module 'tslib'" (require originating inside @supabase/functions-js,
  // a transitive dependency of @supabase/supabase-js).
  //
  // Attempt 1: `noExternal: ['@supabase/supabase-js', 'tslib']`. Built
  // successfully in every local test, including a from-scratch
  // `pnpm install --frozen-lockfile` reinstall, but failed on Vercel's
  // build: "[vite]: Rollup failed to resolve import 'tslib'".
  //
  // Attempt 2: `noExternal: ['@supabase/supabase-js']` only, leaving
  // `tslib` external by omission. Verified directly that
  // @supabase/functions-js no longer exists as a separate packaged file
  // (its source is inlined), but this still failed on Vercel - this time
  // "[vite]: Rolldown failed to resolve import 'tslib'" from
  // @supabase/auth-js's GoTrueAdminApi.js. Confirmed directly that
  // @supabase/auth-js, @supabase/postgrest-js, @supabase/realtime-js, and
  // @supabase/storage-js all independently declare and import `tslib` too
  // (not just functions-js) - inlining @supabase/supabase-js pulls in
  // every one of these, each with its own `import ... from "tslib"`.
  // Astro 7 resolves to Vite 8, whose default bundler is Rolldown (not
  // classic Rollup) - Vite's SSR "leave external by omission" heuristic
  // apparently still asks Rolldown to *resolve* the specifier before
  // categorizing it as external, and that resolution is what fails in
  // Vercel's build environment specifically (never reproduced locally,
  // including from a clean-room reinstall - no Linux/container
  // environment was available in this repository to test against
  // directly).
  //
  // Attempt 3 (current): `noExternal: ['@supabase/supabase-js']` plus
  // `build.rolldownOptions.external: ['tslib']` - Rolldown's own native
  // `external` option, a pre-resolution string/pattern filter (documented
  // Rollup/Rolldown behavior: matched specifiers are never passed through
  // module resolution at all, unlike Vite's higher-level SSR-externality
  // heuristic that resolves first). This is a different code path than
  // Attempt 2's implicit externalization, intended to avoid triggering
  // the resolution step that failed on Vercel. `tslib` remains a direct,
  // top-level dependency of this package (see package.json) so the
  // resulting bare runtime `import "tslib"` has a short, standard
  // resolution path from the packaged function's own node_modules if
  // Node's resolution is what actually runs it.
  //
  // Whether this resolves the original Production error cannot be
  // confirmed from this repository alone - no Vercel build/runtime log
  // access exists here. See src/lib/quote-form/README.md's real
  // end-to-end test procedure. Resend has no runtime dependencies of its
  // own (confirmed directly) and is not affected by this class of
  // failure.
  vite: {
    ssr: {
      noExternal: ['@supabase/supabase-js'],
    },
    build: {
      rolldownOptions: {
        external: ['tslib'],
      },
    },
  },
});
