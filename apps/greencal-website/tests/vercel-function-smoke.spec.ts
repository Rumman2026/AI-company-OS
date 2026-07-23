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
// Revised 2026-07-23: an earlier fix attempt also added `tslib` to
// astro.config.mjs's `vite.ssr.noExternal`, which built successfully in
// every local configuration (including a from-scratch
// `pnpm install --frozen-lockfile` reinstall) but failed on Vercel's own
// build with "Rollup failed to resolve import 'tslib'" (confirmed via
// Vercel's Build Logs) - a build-time failure that could not be
// reproduced locally under any configuration available in this
// repository (no Linux/container environment was available to test
// against). The current fix keeps only `@supabase/supabase-js` in
// `noExternal` and leaves `tslib` external on purpose - see the
// assertions below, which check for the actually-relevant property
// (the crash-site file no longer exists in the packaged function) rather
// than asserting `tslib` is never externally referenced, which is no
// longer the intended state.

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

  test('the original crash-site file (@supabase/functions-js, which called require("tslib")) is no longer packaged as a separate module', () => {
    test.skip(!existsSync(FUNCTION_ROOT), BUILD_MISSING_MESSAGE);
    // Filesystem-existence check, not a text match - cannot produce a
    // comment/JSDoc false positive. The original Production crash
    // ("Cannot find module 'tslib'") originated inside this exact file
    // (node_modules/@supabase/functions-js/.../helper.js, per the Vercel
    // Runtime Log). Because @supabase/supabase-js is now inlined
    // (noExternal), @supabase/functions-js's source is compiled directly
    // into our own chunk and this file should no longer be packaged as a
    // standalone module at all.
    const found = walkForPath(FUNCTION_ROOT, (p) => p.includes(join('@supabase', 'functions-js')));
    expect(found, 'Found @supabase/functions-js still packaged as a separate module').toEqual([]);
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
