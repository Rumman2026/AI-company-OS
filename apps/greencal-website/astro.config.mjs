import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Resolved via Node's own resolver (not a hardcoded pnpm store path like
// `node_modules/.pnpm/tslib@2.8.1/...`) so this stays correct regardless of
// which machine runs the build or what tslib patch/minor version is
// installed - see the Attempt 4 comment below for why this exists.
const require = createRequire(import.meta.url);
const tslibDir = dirname(require.resolve('tslib/package.json'));
const tslibIncludeFiles = [
  'package.json',
  'tslib.js',
  join('modules', 'index.js'),
  join('modules', 'package.json'),
].map((relative) => pathToFileURL(join(tslibDir, relative)).href);

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
  adapter: vercel({
    // Attempt 4 (2026-07-24) - see the extensive vite.build.rolldownOptions
    // comment below for Attempts 1-3. Vercel Runtime Log evidence for
    // commit 2c9c6d6 confirmed the build now succeeds and tslib survives
    // as an external runtime import in the generated chunk, but the
    // deployed function still crashed: "Error [ERR_MODULE_NOT_FOUND]:
    // Cannot find package 'tslib' imported from
    // .../dist/server/chunks/quote-submit_*.mjs".
    //
    // Root cause, confirmed by reading @astrojs/vercel's own packaging
    // code (dist/lib/nft.js): the deployed function's file set is
    // whatever @vercel/nft's static trace discovers from entry.mjs, plus
    // `includeFiles` below. For a symlinked pnpm package, the packaging
    // step (@astrojs/internal-helpers's copyFilesToFolder) copies only a
    // *relative symlink* into the function output - the real file bytes
    // land in the package only if NFT's trace *separately* discovers the
    // real (non-symlinked) target too. Confirmed directly in a local
    // build that this happened correctly here (both the symlink and its
    // real target under node_modules/.pnpm/tslib@.../ were present and
    // self-contained inside .vercel/output/functions/_render.func) - but
    // that only proves my local (Windows) NFT trace succeeded. Vercel's
    // build reruns astro build and its own NFT trace fresh, from scratch,
    // on its own Linux machine - it does not reuse this local output, so
    // a locally-complete trace is not evidence Vercel's trace is also
    // complete (this is the same local/Vercel gap documented in every
    // prior attempt below).
    //
    // Also confirmed directly: a bare `import ... from "tslib"` resolves,
    // per tslib's own package.json "exports" field, to
    // `tslib/modules/index.js` (not `tslib.js`, which is the CJS
    // "require"/"default" target) - and modules/index.js needs its
    // sibling modules/package.json (`{"type":"module"}`) alongside it for
    // Node to parse it as ESM. All four files are listed explicitly below
    // so the deployed function no longer depends on NFT successfully
    // tracing a bare external specifier through a symlinked pnpm
    // directory - `includeFiles` bypasses that trace entirely for this
    // dependency. Paths are resolved via Node's own `require.resolve`
    // rather than a hardcoded `.pnpm/tslib@2.8.1/...` string so this
    // keeps working across any future tslib version bump or differently
    // shaped store layout.
    //
    // Not yet confirmed against a real Vercel deployment - no build/
    // runtime log access exists in this repository. See
    // src/lib/quote-form/README.md for the real end-to-end test
    // procedure.
    includeFiles: tslibIncludeFiles,
  }),
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
