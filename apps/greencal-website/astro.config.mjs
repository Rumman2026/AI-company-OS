import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// Static, non-dynamic tslib file list for the Vercel adapter's
// `includeFiles` (see the adapter comment below for full Attempt 4-6
// history). No require.resolve/createRequire/import.meta.resolve here -
// both dynamic-resolution attempts (Attempts 4 and 5) failed while
// Vercel evaluated this exact config file, before Astro/Rolldown/the
// adapter ever ran.
//
// Two distinct sets of paths are required, proven by directly inspecting
// generated build output (not assumed):
//
// 1. The app-level symlink itself
//    (apps/greencal-website/node_modules/tslib), included via its
//    through-the-symlink path. This is the only location Node's own
//    bare-specifier resolution walk will actually check when resolving
//    `import ... from "tslib"` from
//    dist/server/chunks/quote-submit_*.mjs (Node walks up from the
//    requiring file's directory checking literal `node_modules/tslib` at
//    each ancestor level - it does not know to look inside a `.pnpm`
//    store on its own). Confirmed directly that including only this
//    path recreates just another *symlink* at the destination (via
//    @astrojs/internal-helpers's copyFilesToFolder, which detects
//    `fs.realpath(origin) !== origin` for any path traversing a
//    symlinked directory and always emits a symlink, never a byte copy,
//    for such a path) - this alone does not guarantee the symlink's
//    target contains real bytes; it only guarantees a pointer exists.
//
// 2. The real, non-symlinked pnpm-store files
//    (node_modules/.pnpm/tslib@2.8.1/node_modules/tslib/...), included
//    directly. Confirmed directly these are NOT reached through any
//    symlinked path segment, so copyFilesToFolder's realpath check finds
//    `origin === realpath` and performs an actual `fs.copyFile` - a real
//    byte copy, independent of whether @vercel/nft's own trace also
//    happens to find them (which is the exact dependency this fix
//    removes; see the adapter comment below for why that dependency was
//    unsafe).
//
// Together, both sets make the deployed function self-contained for
// tslib resolution without depending on NFT's trace for either the
// pointer or its target. The pnpm store path is version-pinned
// (tslib@2.8.1, matching the exact locked version in pnpm-lock.yaml) -
// intentionally not resolved dynamically per the explicit requirement to
// remove all Node package resolution from config-eval time. A future
// tslib version bump requires updating this literal string; the build
// fails loudly (missing file) rather than silently deploying a broken
// runtime import if it's forgotten - see the regression test in
// tests/vercel-function-smoke.spec.ts asserting the pinned version
// matches pnpm-lock.yaml.
const tslibIncludeFiles = [
  './node_modules/tslib/package.json',
  './node_modules/tslib/tslib.js',
  './node_modules/tslib/modules/index.js',
  './node_modules/tslib/modules/package.json',
  '../../node_modules/.pnpm/tslib@2.8.1/node_modules/tslib/package.json',
  '../../node_modules/.pnpm/tslib@2.8.1/node_modules/tslib/tslib.js',
  '../../node_modules/.pnpm/tslib@2.8.1/node_modules/tslib/modules/index.js',
  '../../node_modules/.pnpm/tslib@2.8.1/node_modules/tslib/modules/package.json',
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
    // Attempt 5 (2026-07-24): commit d931b5a's Vercel Build Log showed
    // Attempt 4 never actually ran - the build failed even earlier, while
    // evaluating this config file itself, before Astro/Rolldown/this
    // adapter's packaging step, with "Cannot find module
    // 'tslib/package.json'". Switched to `require.resolve('tslib')`
    // (the bare specifier, needing only the exports map's simple
    // "default" target, not wildcard subpath matching).
    //
    // Attempt 6 (2026-07-24): commit 74bb277's Vercel Build Log showed
    // Attempt 5 ALSO failed at the same config-eval point, now with
    // "Cannot find module 'tslib'" - the bare specifier itself. Both
    // dynamic-resolution mechanisms (require.resolve('tslib/
    // package.json') and require.resolve('tslib')) fail during Vercel's
    // config load, despite every local reproduction attempted succeeding
    // for both (plain Node, and through Astro's actual config-loading
    // pipeline, confirmed via temporary diagnostics removed before
    // finalizing) - the same irreducible local/Vercel gap present in
    // every attempt this session, now affecting config-eval time itself
    // rather than build or runtime.
    //
    // Per explicit direction, all dynamic tslib resolution (require.
    // resolve, createRequire, import.meta.resolve, bare-specifier
    // resolution of any kind) is removed from this file. tslibIncludeFiles
    // above is now a static list of string literals only.
    //
    // Empirically tested (not assumed) two candidate path styles by
    // building locally and inspecting .vercel/output/functions/
    // _render.func directly:
    //
    // - Paths through the app-level symlink alone
    //   (./node_modules/tslib/...) only recreate another *symlink* in the
    //   output (confirmed via @astrojs/internal-helpers's
    //   copyFilesToFolder: any path whose realpath differs from the
    //   literal path - true for anything traversing a symlinked
    //   directory - always produces a recreated symlink, never a byte
    //   copy). This alone does not guarantee the symlink's target
    //   contains real bytes independent of @vercel/nft's own trace - the
    //   exact dependency this fix exists to remove.
    //
    // - The real, non-symlinked pnpm-store paths
    //   (../../node_modules/.pnpm/tslib@2.8.1/node_modules/tslib/...)
    //   are not reached through any symlinked segment, so
    //   copyFilesToFolder's realpath check finds origin === realpath and
    //   performs a genuine fs.copyFile - independent of NFT.
    //
    // Both sets are included together: the symlink path so Node's own
    // bare-specifier resolution walk (which only checks literal
    // `node_modules/tslib` at each ancestor directory of the requiring
    // chunk file - it has no special knowledge of a `.pnpm` store) finds
    // a pointer at the one location it will actually look, and the real
    // pnpm-store path so that pointer's target is guaranteed to contain
    // real bytes. Verified locally by copying the packaged
    // _render.func directory to a location outside this repository
    // entirely and running the same module-load smoke test from there -
    // confirming resolution succeeds without any dependency on the rest
    // of the monorepo still being present on disk, not just within it.
    //
    // The pnpm-store path is version-pinned to tslib@2.8.1 (matching
    // pnpm-lock.yaml exactly) rather than dynamically resolved, per the
    // explicit requirement to remove all Node package resolution from
    // config-eval time. This is intentionally fragile to a future tslib
    // version bump - the build will fail loudly (file not found) rather
    // than silently deploy a broken runtime import if this string is not
    // updated alongside a version bump. See
    // tests/vercel-function-smoke.spec.ts for a regression test that
    // fails locally, at test time, if this pinned version ever drifts
    // from pnpm-lock.yaml's actual resolved tslib version.
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
