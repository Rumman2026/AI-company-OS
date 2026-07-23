import { test, expect } from '@playwright/test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Regression coverage for the 2026-07-23 Production incident: the deployed
// /api/quote-submit function crashed with "Cannot find module 'tslib'"
// (require originating inside @supabase/functions-js) even though local
// dependency resolution, lint, typecheck, and the full Playwright suite
// all passed - because none of those checks ever imported the actual
// *packaged* Vercel function output. This suite does. It requires a
// production build to have been run first (`pnpm run build`) - it inspects
// generated build artifacts (.vercel/output), not source, and does not run
// under `astro dev`.

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

  test('no packaged server chunk externally imports @supabase/supabase-js or tslib as a bare specifier', () => {
    test.skip(!existsSync(CHUNKS_DIR), BUILD_MISSING_MESSAGE);
    const files = [ENTRY, ...readdirSync(CHUNKS_DIR).map((f) => join(CHUNKS_DIR, f))].filter((f) =>
      f.endsWith('.mjs'),
    );
    expect(files.length).toBeGreaterThan(0);

    // Verified directly (both with and without the `noExternal` fix in
    // astro.config.mjs) that this specific check correctly distinguishes
    // the two states: without `noExternal`, the compiled chunk contains a
    // live `from "@supabase/supabase-js"` bare-specifier import (Vite left
    // the package external, so @supabase/functions-js's own
    // require('tslib') call is resolved at runtime from node_modules -
    // the exact failure mode observed in Production); with `noExternal`,
    // that bare import disappears entirely because the package's source is
    // inlined into the chunk instead.
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
      expect(stripped, `${file} must not externally import "tslib"`).not.toMatch(
        /from\s*["']tslib["']/,
      );
      expect(stripped, `${file} must not contain require("tslib")`).not.toMatch(
        /require\(["']tslib["']\)/,
      );
    }
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
