import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// Static, non-dynamic tslib file list for the Vercel adapter's
// `includeFiles` (see the adapter comment below for full attempt
// history). These paths only work because package.json's "prebuild"
// script (scripts/stage-tslib.mjs) runs before "astro build" and
// guarantees a REAL (non-symlink) node_modules/tslib directory exists
// here first - see that script's own extensive comment for why. Without
// it, Vercel's Build Log for commit aeda3ce proved this exact path does
// not reliably exist in Vercel's installed workspace layout at all
// ("ENOENT: no such file or directory, realpath '.../apps/
// greencal-website/node_modules/tslib/package.json'").
const tslibIncludeFiles = [
  './node_modules/tslib/package.json',
  './node_modules/tslib/tslib.js',
  './node_modules/tslib/modules/index.js',
  './node_modules/tslib/modules/package.json',
];

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
    // Attempt 5: commit d931b5a's Vercel Build Log showed Attempt 4 never
    // actually ran - the build failed even earlier, while evaluating this
    // config file itself, with "Cannot find module 'tslib/package.json'".
    // Switched to `require.resolve('tslib')` (the bare specifier).
    //
    // Attempt 6: commit 74bb277's Vercel Build Log showed Attempt 5 ALSO
    // failed at the same config-eval point, now with "Cannot find module
    // 'tslib'" - the bare specifier itself. Both dynamic-resolution
    // mechanisms failed during Vercel's config load despite succeeding in
    // every local reproduction attempted (plain Node, and through
    // Astro's actual config-loading pipeline) - removed all dynamic
    // resolution from this file per explicit direction; `includeFiles`
    // became a static list of string literals covering both the
    // app-level symlink path and a version-pinned real pnpm-store path.
    // Empirically confirmed (by building locally and inspecting
    // .vercel/output/functions/_render.func) that a path traversing the
    // app-level symlink alone only recreates another symlink at the
    // destination (via @astrojs/internal-helpers's copyFilesToFolder,
    // which detects `fs.realpath(origin) !== origin` for any symlinked
    // path and always emits a symlink, never a byte copy) - the
    // non-symlinked pnpm-store path was needed alongside it to guarantee
    // real bytes independent of @vercel/nft's own trace.
    //
    // Attempt 7 (current): commit aeda3ce's Vercel Build Log showed
    // Attempt 6's config now loads successfully and the build reaches
    // the @astrojs/vercel function-packaging stage - but packaging then
    // fails: "ENOENT: no such file or directory, realpath '.../apps/
    // greencal-website/node_modules/tslib/package.json'", from
    // @astrojs/vercel/dist/lib/nft.js's copyDependenciesToFunction. This
    // proves the app-level `node_modules/tslib` pnpm symlink - present
    // and reliable in every local Windows build this session - does not
    // exist at all in Vercel's installed workspace layout at packaging
    // time (copyFilesToFolder's `fs.realpath()` call throws ENOENT for a
    // path that doesn't exist, distinct from the "symlink exists but its
    // target might be missing" risk every prior attempt was addressing).
    //
    // Rather than reference that unreliable path at all, package.json's
    // "prebuild" script (scripts/stage-tslib.mjs, which pnpm's lifecycle
    // automatically runs before "build" - i.e. before "astro build" -
    // whenever Vercel's observed build command "pnpm run build" is
    // invoked) now creates a REAL (non-symlink) node_modules/tslib
    // directory in the app before Astro ever evaluates this config file,
    // copying only the four required files by bytes from wherever the
    // installed tslib package actually resolves (see that script for its
    // own resolution/verification/idempotency logic - it runs as a plain
    // Node process, not through Astro/Vite's config loader, which is the
    // mechanism that failed in Attempts 4-5). Because the staged files
    // are real, non-symlinked copies, `includeFiles` no longer needs a
    // separate pnpm-store fallback path - copyFilesToFolder finds
    // `origin === realpath` for a real file and performs a genuine
    // fs.copyFile, the same guarantee Attempt 6 needed two path sets to
    // achieve.
    //
    // Not yet confirmed against a real Vercel deployment - no build/
    // runtime log access exists in this repository.
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
