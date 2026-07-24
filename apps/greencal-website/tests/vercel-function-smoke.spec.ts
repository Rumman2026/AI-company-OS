import { test, expect } from '@playwright/test';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

function walkForPath(
  dir: string,
  matches: (path: string) => boolean,
  found: string[] = [],
): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (matches(full)) {
      found.push(full);
      continue; // don't descend into a matched directory - existence is enough
    }
    if (statSync(full).isDirectory()) {
      walkForPath(full, matches, found);
    }
  }
  return found;
}

// Regression coverage for the 2026-07-23 Production incident: the deployed
// /api/quote-submit function crashed with "Cannot find module 'tslib'"
// (require originating inside @supabase/functions-js) even though local
// dependency resolution, lint, typecheck, and the full Playwright suite
// all passed - because none of those checks ever imported the actual
// *packaged* Vercel function output. This suite does. It requires a
// production build to have been run first (`pnpm run build`) - it inspects
// generated build artifacts (.vercel/output), not source, and does not run
// under `astro dev`.
//
// Revised twice more on 2026-07-23 as new Vercel Build Log evidence
// arrived:
//
// Attempt 1: `noExternal: ['@supabase/supabase-js', 'tslib']` - built
// locally (including from a clean-room `pnpm install --frozen-lockfile`
// reinstall) but failed on Vercel: "[vite]: Rollup failed to resolve
// import 'tslib'".
//
// Attempt 2: `noExternal: ['@supabase/supabase-js']` only, leaving
// `tslib` external by omission. Still failed on Vercel, this time
// "[vite]: Rolldown failed to resolve import 'tslib'" from
// @supabase/auth-js's GoTrueAdminApi.js - confirmed directly that
// @supabase/auth-js, @supabase/postgrest-js, @supabase/realtime-js, and
// @supabase/storage-js (not just @supabase/functions-js) all
// independently declare and import `tslib`. Astro 7 resolves to Vite 8,
// whose default bundler is Rolldown - Vite's implicit SSR-external
// heuristic apparently still triggers Rolldown module resolution for
// `tslib` before categorizing it as external, and that resolution is
// what failed on Vercel (never reproduced locally under any
// configuration - no Linux/container environment was available in this
// repository to test against).
//
// Attempt 3 (current): `noExternal: ['@supabase/supabase-js']` plus
// `build.rolldownOptions.external: ['tslib']` - Rolldown's own native,
// pre-resolution `external` filter, a different code path than Vite's
// implicit heuristic. Verified directly (via a temporary diagnostic Vite
// plugin) that this option is actually received by Rolldown at every
// build phase, including the real SSR/@astrojs/vercel entrypoint build -
// not silently dropped by Astro's config merging.
//
// The assertions below check the properties that actually matter rather
// than re-asserting `tslib` is never externally referenced (it is now
// intentionally external): that none of the five @supabase/* sub-packages
// known to import `tslib` remain packaged as separate modules, and that
// the resulting bare `tslib` import has the shortest possible resolution
// path from the packaged entry point (a direct, standard two-levels-up
// node_modules walk to a package.json-declared direct dependency, not a
// deep .pnpm-store path reached only through a third-party sub-package's
// own resolution scope).

const FUNCTION_ROOT = join(__dirname, '..', '.vercel', 'output', 'functions', '_render.func');
const ENTRY = join(FUNCTION_ROOT, 'apps', 'greencal-website', 'dist', 'server', 'entry.mjs');
const CHUNKS_DIR = join(FUNCTION_ROOT, 'apps', 'greencal-website', 'dist', 'server', 'chunks');
const VC_CONFIG = join(FUNCTION_ROOT, '.vc-config.json');

const BUILD_MISSING_MESSAGE =
  'Generated Vercel output not found - run "pnpm run build" before this test suite.';

test.describe('Vercel serverless function packaging (tslib production-incident regression)', () => {
  test('the generated Vercel function output exists', () => {
    expect(existsSync(ENTRY), BUILD_MISSING_MESSAGE).toBe(true);
  });

  test('the packaged server entry module imports without a module-resolution error', async () => {
    test.skip(!existsSync(ENTRY), BUILD_MISSING_MESSAGE);
    // This is the same import Vercel's Node runtime performs when invoking
    // the function - a real module-load smoke test against the actual
    // packaged artifact, not source code. Reproduces exactly the failure
    // mode observed in Production ("Cannot find module 'tslib'").
    await expect(import(pathToFileURL(ENTRY).href)).resolves.toBeTruthy();
  });

  test('no packaged server chunk externally imports @supabase/supabase-js as a bare specifier', () => {
    test.skip(!existsSync(CHUNKS_DIR), BUILD_MISSING_MESSAGE);
    const files = [ENTRY, ...readdirSync(CHUNKS_DIR).map((f) => join(CHUNKS_DIR, f))].filter((f) =>
      f.endsWith('.mjs'),
    );
    expect(files.length).toBeGreaterThan(0);

    // Verified directly (with `noExternal` unset vs. set to
    // `['@supabase/supabase-js']`) that this specific check correctly
    // distinguishes the two states: without `noExternal`, the compiled
    // chunk contains a live `from "@supabase/supabase-js"` bare-specifier
    // import; with it, that bare import disappears entirely because the
    // package's source is inlined into the chunk instead.
    //
    // Deliberately does NOT assert `tslib` is never externally imported -
    // it is now intentionally left external (see astro.config.mjs) after
    // forcing it into `noExternal` caused a confirmed Vercel build
    // failure ("Rollup failed to resolve import 'tslib'"). The next test
    // checks the property that actually matters instead: the file that
    // contained the original crash-causing `require('tslib')` call no
    // longer exists in the packaged function at all.
    //
    // Comments are stripped before matching. @supabase/functions-js's own
    // bundled source contains JSDoc examples like
    // `* import { FunctionsError } from '@supabase/functions-js'`, and
    // Rollup emits `//#region ../../node_modules/.pnpm/@supabase+
    // functions-js@.../...` bookkeeping comments for every inlined module -
    // both are false-positive text matches for an un-stripped regex,
    // verified directly by this exact false positive occurring during
    // development of this test.
    const stripComments = (code: string): string =>
      code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

    for (const file of files) {
      const stripped = stripComments(readFileSync(file, 'utf-8'));
      expect(stripped, `${file} must not externally import "@supabase/supabase-js"`).not.toMatch(
        /from\s*["']@supabase\/supabase-js["']/,
      );
    }
  });

  test('none of the five @supabase/* sub-packages confirmed to import tslib remain packaged as a separate module', () => {
    test.skip(!existsSync(FUNCTION_ROOT), BUILD_MISSING_MESSAGE);
    // Filesystem-existence check, not a text match - cannot produce a
    // comment/JSDoc false positive. Both confirmed Production crash sites
    // (@supabase/functions-js, then @supabase/auth-js) originated inside
    // one of these five sub-packages' own compiled files - each declares
    // and imports `tslib` independently (verified directly by reading
    // each package.json and its dist/module source). Because
    // @supabase/supabase-js is inlined (noExternal), all five should be
    // compiled directly into our own chunk and none should be packaged
    // as standalone modules.
    const supabaseSubpackages = [
      'functions-js',
      'auth-js',
      'postgrest-js',
      'realtime-js',
      'storage-js',
    ];
    for (const pkg of supabaseSubpackages) {
      const found = walkForPath(FUNCTION_ROOT, (p) => p.includes(join('@supabase', pkg)));
      expect(found, `Found @supabase/${pkg} still packaged as a separate module`).toEqual([]);
    }
  });

  test('the runtime-external tslib import resolves via the shortest possible path from the packaged entry point', () => {
    test.skip(!existsSync(ENTRY), BUILD_MISSING_MESSAGE);
    // `tslib` is deliberately left external (see astro.config.mjs) - this
    // confirms the resulting bare `import "tslib"` has the shortest,
    // most standard resolution path available: a direct
    // `<entry-dir>/../../node_modules/tslib` walk (two levels up from
    // dist/server/, matching Node's own module-resolution algorithm),
    // landing on `tslib` as a package.json-declared direct dependency of
    // this app - not a path reachable only through a third-party
    // sub-package's own deeply-nested pnpm resolution scope, which is
    // what the original incident's crash sites required.
    const appNodeModules = join(FUNCTION_ROOT, 'apps', 'greencal-website', 'node_modules', 'tslib');
    expect(existsSync(appNodeModules), `${appNodeModules} does not exist`).toBe(true);
    const tslibEntry = join(appNodeModules, 'tslib.js');
    expect(existsSync(tslibEntry), `${tslibEntry} does not exist or the symlink is broken`).toBe(
      true,
    );
    expect(statSync(tslibEntry).size).toBeGreaterThan(0);
  });

  test('the deployment manifest points at the expected handler', () => {
    test.skip(!existsSync(VC_CONFIG), BUILD_MISSING_MESSAGE);
    const config = JSON.parse(readFileSync(VC_CONFIG, 'utf-8'));
    expect(config.handler).toBe('apps/greencal-website/dist/server/entry.mjs');
    expect(config.runtime).toMatch(/^nodejs/);
  });
});

test.describe('Client-bundle secret scan (built output, not just rendered HTML)', () => {
  test('no client-side JS bundle references Supabase, Resend, or a secret-shaped string', () => {
    const clientAstroDir = join(__dirname, '..', 'dist', 'client', '_astro');
    test.skip(
      !existsSync(clientAstroDir),
      'Requires a production build - run pnpm run build first.',
    );

    const jsFiles = readdirSync(clientAstroDir).filter((f) => f.endsWith('.js'));
    expect(jsFiles.length).toBeGreaterThan(0);

    for (const file of jsFiles) {
      const content = readFileSync(join(clientAstroDir, file), 'utf-8');
      const lowered = content.toLowerCase();
      expect(lowered, `${file} must not reference @supabase`).not.toContain('@supabase');
      expect(lowered, `${file} must not reference the resend package`).not.toContain('"resend"');
      expect(lowered, `${file} must not reference service_role`).not.toContain('service_role');
      // JWT- or Resend-API-key-shaped strings.
      expect(content, `${file} must not contain a JWT-shaped string`).not.toMatch(
        /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/,
      );
      expect(content, `${file} must not contain a Resend-key-shaped string`).not.toMatch(
        /re_[a-zA-Z0-9]{16,}/,
      );
    }
  });
});
