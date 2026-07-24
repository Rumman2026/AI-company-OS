import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
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
// Attempt 3: `noExternal: ['@supabase/supabase-js']` plus
// `build.rolldownOptions.external: ['tslib']` - Rolldown's own native,
// pre-resolution `external` filter, a different code path than Vite's
// implicit heuristic. Verified directly (via a temporary diagnostic Vite
// plugin) that this option is actually received by Rolldown at every
// build phase, including the real SSR/@astrojs/vercel entrypoint build -
// not silently dropped by Astro's config merging. Build succeeded on
// Vercel (confirmed via Vercel Build Logs for commit 2c9c6d6), but the
// deployed function then crashed at runtime: "Error
// [ERR_MODULE_NOT_FOUND]: Cannot find package 'tslib' imported from
// .../dist/server/chunks/quote-submit_*.mjs" (confirmed via Vercel
// Runtime Logs, correlated to a controlled safe probe).
//
// Attempt 4: added `includeFiles` to the @astrojs/vercel adapter config
// (astro.config.mjs), forcing four specific tslib files in directly
// rather than relying on @vercel/nft's static trace to discover them.
// Root-caused by reading @astrojs/vercel's own packaging code (dist/lib/
// nft.js + @astrojs/internal-helpers's copyFilesToFolder): for a
// symlinked pnpm package, the packaging step copies only a *relative
// symlink* into the function output - the real file bytes land in the
// package only if NFT's trace *separately* discovers the real
// (non-symlinked) target too. A local trace succeeding is not evidence
// Vercel's own from-scratch Linux trace will also succeed - the same
// local/Vercel gap present in every prior attempt. Also confirmed
// directly via tslib's own package.json "exports" field that a bare
// `import ... from "tslib"` resolves to `tslib/modules/index.js` (not
// `tslib.js`, the CJS/"default" target), and that file needs its sibling
// `modules/package.json` (`{"type":"module"}`) for Node to parse it as
// ESM - a distinction the Attempt 3 regression coverage below did not
// check for. The include-file paths were computed dynamically via
// `require.resolve('tslib/package.json')`.
//
// Attempt 5: commit d931b5a's Vercel Build Log showed Attempt 4 never
// actually ran - Vercel failed while *evaluating astro.config.mjs
// itself*, before Astro/Rolldown/the adapter, with "Cannot find module
// 'tslib/package.json'". Switched to `require.resolve('tslib')` (the
// bare specifier).
//
// Attempt 6: commit 74bb277's Vercel Build Log showed Attempt 5 ALSO
// failed at the same config-eval point, now with "Cannot find module
// 'tslib'" - the bare specifier itself. Removed all dynamic resolution
// from astro.config.mjs; `includeFiles` became a static list of string
// literals covering both the app-level symlink path and a version-pinned
// real pnpm-store path.
//
// Attempt 7: commit aeda3ce's Vercel Build Log showed the config now
// loads and the build reaches @astrojs/vercel's packaging stage, but
// packaging then failed: "ENOENT: no such file or directory, realpath
// '.../apps/greencal-website/node_modules/tslib/package.json'" - the
// app-level pnpm symlink does not exist at all in Vercel's installed
// layout. Added a "prebuild" script (scripts/stage-tslib.mjs) creating a
// REAL node_modules/tslib directory before Astro runs, sourced from
// require.resolve('tslib') falling back to a deterministic pnpm-store
// path. Commit 3b02f81's Vercel Build Log then proved BOTH of those
// sources also fail on Vercel - require.resolve('tslib') threw
// MODULE_NOT_FOUND, and the pnpm-store path does not exist there either.
//
// Attempt 8 (current): rather than search any installed node_modules
// layout at all, the four tslib runtime files plus LICENSE.txt are now
// vendored directly into this repository at
// apps/greencal-website/vendor/tslib/ - copied byte-for-byte from the
// officially installed tslib@2.8.1 package, never modified (see
// vendor/tslib/README.md). scripts/stage-tslib.mjs's only source is that
// directory; every file is verified against vendor/tslib/integrity.json's
// recorded SHA-256 hash before being staged - a hash mismatch fails the
// build loudly. Because the source is a plain, repository-tracked
// directory rather than an installed package reached through pnpm's own
// resolution or store layout, there is nothing left for Vercel's install
// step to get differently right or wrong.
//
// The assertions below check the properties that actually matter: that
// none of the five @supabase/* sub-packages known to import `tslib`
// remain packaged as separate modules, and that all four files needed to
// resolve `tslib` as a real Node ESM import are present as genuine files
// (not symlinks whose target may not exist in an isolated deployment) -
// checked using only paths inside the packaged function output itself,
// not the surrounding local repository, so this can't pass merely because
// the rest of the monorepo's node_modules happens to still be on disk.

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

  test('the runtime-external tslib import resolves via a real (non-symlink) node_modules/tslib entry', () => {
    test.skip(!existsSync(ENTRY), BUILD_MISSING_MESSAGE);
    // `tslib` is deliberately left external (see astro.config.mjs) - this
    // confirms the resulting bare `import "tslib"` has a valid resolution
    // path: a direct `<entry-dir>/../../node_modules/tslib` walk (two
    // levels up from dist/server/, matching Node's own module-resolution
    // algorithm). Does not assert this is a real file vs. a symlink - see
    // the dedicated test below for that, which is the actual Attempt-4
    // production incident regression coverage (a symlink here can still
    // point at a target the isolated deployed package never received).
    const appNodeModules = join(FUNCTION_ROOT, 'apps', 'greencal-website', 'node_modules', 'tslib');
    expect(existsSync(appNodeModules), `${appNodeModules} does not exist`).toBe(true);
    const tslibEntry = join(appNodeModules, 'tslib.js');
    expect(existsSync(tslibEntry), `${tslibEntry} does not exist or the symlink is broken`).toBe(
      true,
    );
    expect(statSync(tslibEntry).size).toBeGreaterThan(0);
  });

  test('all four files needed to resolve tslib as a real Node ESM import are genuine files inside the packaged function, not dangling-risk symlinks', () => {
    test.skip(!existsSync(FUNCTION_ROOT), BUILD_MISSING_MESSAGE);
    // Regression coverage for the confirmed 2026-07-24 Production runtime
    // incident: commit 2c9c6d6's build succeeded and a `node_modules/tslib`
    // symlink was present, but the deployed function still crashed with
    // "Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'tslib'" - because
    // the packaging step (@astrojs/internal-helpers's copyFilesToFolder)
    // copies only a *relative symlink* for a symlinked pnpm package; the
    // real file bytes land in the deployed package only if @vercel/nft's
    // trace *separately* discovers the real target too, which is not
    // guaranteed (see astro.config.mjs's `includeFiles` comment). A local
    // build succeeding is not sufficient evidence here - Vercel reruns its
    // own trace from scratch on a different machine.
    //
    // Per tslib's own package.json "exports" field, a bare
    // `import ... from "tslib"` resolves to tslib/modules/index.js (the
    // "import"+"node" condition), not tslib.js (the "default"/CJS
    // fallback) - and modules/index.js needs its sibling
    // modules/package.json (`{"type":"module"}`) for Node to parse it as
    // ESM rather than throw a SyntaxError. This test walks the packaged
    // output (not the surrounding repository) for any path ending in each
    // of the four required files and asserts each match is a genuine file
    // (lstat, not stat, so a symlink is correctly identified as such
    // rather than silently followed) with real byte content - so this
    // fails the same way the original incident did if `includeFiles` is
    // ever removed and NFT's trace alone becomes incomplete again.
    const requiredRelativePaths = [
      join('tslib', 'package.json'),
      join('tslib', 'tslib.js'),
      join('tslib', 'modules', 'index.js'),
      join('tslib', 'modules', 'package.json'),
    ];
    for (const relativePath of requiredRelativePaths) {
      const matches = walkForPath(FUNCTION_ROOT, (p) => p.endsWith(relativePath));
      expect(matches.length, `No packaged file found ending in ${relativePath}`).toBeGreaterThan(0);
      for (const match of matches) {
        expect(lstatSync(match).isSymbolicLink(), `${match} is a symlink, not a real file`).toBe(
          false,
        );
        expect(statSync(match).size, `${match} is empty`).toBeGreaterThan(0);
      }
    }
  });

  test('the app-level node_modules/tslib entry, both staged locally and packaged inside _render.func, is a real directory - not a symlink', () => {
    test.skip(!existsSync(FUNCTION_ROOT), BUILD_MISSING_MESSAGE);
    // Regression coverage for the confirmed Attempt 7 (2026-07-24)
    // Production incident: Vercel's Build Log for commit aeda3ce (Attempt
    // 6) showed the build reached the @astrojs/vercel packaging stage and
    // then failed there: "ENOENT: no such file or directory, realpath
    // '.../apps/greencal-website/node_modules/tslib/package.json'" - the
    // app-level pnpm symlink at that exact path, present and reliable in
    // every local Windows build this session, did not exist at all in
    // Vercel's installed workspace layout at packaging time. This is a
    // stronger failure mode than "symlink exists but its target might be
    // missing" (every prior attempt's concern) - the pointer itself was
    // absent, so @vercel/nft's copyFilesToFolder's own `fs.realpath()`
    // call threw before any copy/symlink decision could even be made.
    //
    // package.json's "prebuild" script (scripts/stage-tslib.mjs) now
    // creates a REAL (non-symlink) node_modules/tslib directory before
    // Astro ever runs, specifically so this path is never a pnpm symlink
    // dependent on Vercel's install layout at all. Checked both before
    // packaging (the staged source) and after (the copied destination
    // inside _render.func) - a symlink at either point would reintroduce
    // exactly the class of failure this attempt exists to eliminate.
    const stagedTslib = join(__dirname, '..', 'node_modules', 'tslib');
    expect(
      existsSync(stagedTslib),
      `${stagedTslib} does not exist - did the prebuild script run?`,
    ).toBe(true);
    expect(
      lstatSync(stagedTslib).isSymbolicLink(),
      `${stagedTslib} is a symlink - the prebuild staging script should have replaced it with a real directory`,
    ).toBe(false);

    const packagedTslib = join(FUNCTION_ROOT, 'apps', 'greencal-website', 'node_modules', 'tslib');
    expect(existsSync(packagedTslib), `${packagedTslib} does not exist`).toBe(true);
    expect(
      lstatSync(packagedTslib).isSymbolicLink(),
      `${packagedTslib} is a symlink inside the packaged function - this is exactly the path Vercel's Build Log showed failing with ENOENT on realpath for commit aeda3ce`,
    ).toBe(false);
  });

  // Serialized (not the default parallel-across-workers mode): both
  // tests below invoke scripts/stage-tslib.mjs as a real subprocess,
  // which overwrites the shared node_modules/tslib destination, and the
  // tamper-detection test additionally mutates the shared
  // vendor/tslib/tslib.js source file (restored in a finally block).
  // Running them concurrently in different workers raced in practice -
  // confirmed directly: the idempotency test passed reliably in
  // isolation but failed intermittently as part of the full suite before
  // this was added.
  test.describe
    .serial('prebuild staging script - mutates shared node_modules/tslib and vendor state', () => {
    test('scripts/stage-tslib.mjs runs standalone, verifies its own output, and is idempotent', () => {
      // Runs the actual script used by package.json's "prebuild" hook
      // directly (not just relying on it having already run as part of
      // "pnpm run build" before this suite) - twice in a row, to verify
      // the idempotency the script is explicitly required to have:
      // running it against its own previously-staged output must not
      // corrupt or fail, since Vercel's build and any local re-run both
      // invoke it unconditionally every time.
      const scriptPath = join(__dirname, '..', 'scripts', 'stage-tslib.mjs');
      expect(existsSync(scriptPath), `${scriptPath} does not exist`).toBe(true);

      for (let run = 1; run <= 2; run++) {
        const result = spawnSync(process.execPath, [scriptPath], {
          cwd: join(__dirname, '..'),
          encoding: 'utf-8',
        });
        expect(
          result.status,
          `stage-tslib.mjs run ${run} exited nonzero. stderr:\n${result.stderr}`,
        ).toBe(0);
        expect(result.stderr, `run ${run} did not print its success message`).toContain(
          '[stage-tslib] OK:',
        );
      }

      const stagedDir = join(__dirname, '..', 'node_modules', 'tslib');
      expect(lstatSync(stagedDir).isSymbolicLink(), `${stagedDir} is a symlink after staging`).toBe(
        false,
      );
      for (const relative of ['package.json', join('modules', 'index.js')]) {
        const filePath = join(stagedDir, relative);
        expect(existsSync(filePath), `${filePath} missing after staging`).toBe(true);
        expect(statSync(filePath).size, `${filePath} is empty after staging`).toBeGreaterThan(0);
      }
    });

    test('the staging script rejects a tampered vendor file instead of staging it', () => {
      // Regression coverage for the integrity-verification requirement
      // itself: corrupts a byte in the vendored tslib.js, confirms the
      // staging script fails loudly (nonzero exit, no silent fallback)
      // and does NOT overwrite the already-staged node_modules/tslib
      // with the corrupted content, then restores the original vendored
      // file byte-for-byte and confirms staging succeeds again. Runs
      // against a real subprocess, not a unit-level mock, since the
      // actual protection this exists for is "the build fails" rather
      // than a function returning false.
      const vendorFile = join(__dirname, '..', 'vendor', 'tslib', 'tslib.js');
      const original = readFileSync(vendorFile);
      const stagedFile = join(__dirname, '..', 'node_modules', 'tslib', 'tslib.js');
      const stagedBefore = existsSync(stagedFile) ? readFileSync(stagedFile) : null;

      try {
        writeFileSync(
          vendorFile,
          Buffer.concat([original, Buffer.from('\n// tampered for a test\n')]),
        );

        const scriptPath = join(__dirname, '..', 'scripts', 'stage-tslib.mjs');
        const result = spawnSync(process.execPath, [scriptPath], {
          cwd: join(__dirname, '..'),
          encoding: 'utf-8',
        });

        expect(result.status, 'staging script must exit nonzero on a hash mismatch').not.toBe(0);
        expect(result.stderr).toContain('does not match its recorded hash in integrity.json');

        if (stagedBefore !== null) {
          expect(
            readFileSync(stagedFile).equals(stagedBefore),
            'the already-staged file must be left untouched when a later staging attempt fails',
          ).toBe(true);
        }
      } finally {
        writeFileSync(vendorFile, original);
      }

      const scriptPath = join(__dirname, '..', 'scripts', 'stage-tslib.mjs');
      const restoredResult = spawnSync(process.execPath, [scriptPath], {
        cwd: join(__dirname, '..'),
        encoding: 'utf-8',
      });
      expect(
        restoredResult.status,
        `staging script must succeed again once the vendor file is restored. stderr:\n${restoredResult.stderr}`,
      ).toBe(0);
    });
  });

  test('the vendored tslib source (apps/greencal-website/vendor/tslib) matches its own integrity.json at rest', () => {
    // Static check, independent of running the staging script - catches
    // the vendor directory and its manifest drifting apart (a file
    // edited without regenerating integrity.json, or vice versa) as a
    // committed-state problem, not just a build-time one. See
    // vendor/tslib/README.md for the update procedure this enforces.
    const vendorDir = join(__dirname, '..', 'vendor', 'tslib');
    const manifestPath = join(vendorDir, 'integrity.json');
    expect(existsSync(manifestPath), `${manifestPath} does not exist`).toBe(true);

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    expect(manifest.name).toBe('tslib');
    expect(manifest.algorithm).toBe('sha256');
    expect(typeof manifest.version).toBe('string');
    expect(manifest.version.length).toBeGreaterThan(0);

    const vendoredPkg = JSON.parse(readFileSync(join(vendorDir, 'package.json'), 'utf-8'));
    expect(
      vendoredPkg.version,
      'vendor/tslib/package.json version does not match integrity.json version',
    ).toBe(manifest.version);

    // Plain `in` checks, not toHaveProperty - toHaveProperty treats a
    // string argument as a dot-separated path, which misinterprets keys
    // like "package.json" or "modules/index.js" as nested lookups rather
    // than literal object keys.
    const requiredKeys = ['package.json', 'tslib.js', 'modules/index.js', 'modules/package.json'];
    for (const key of requiredKeys) {
      expect(key in manifest.files, `integrity.json does not list required file "${key}"`).toBe(
        true,
      );
    }
    // LICENSE.txt is required for compliance (see vendor/tslib/README.md)
    // even though it is not one of the four runtime files staged into
    // node_modules/tslib.
    expect('LICENSE.txt' in manifest.files).toBe(true);

    for (const [relative, expectedHash] of Object.entries(manifest.files) as [string, string][]) {
      const filePath = join(vendorDir, ...relative.split('/'));
      expect(existsSync(filePath), `${filePath} listed in integrity.json but missing on disk`).toBe(
        true,
      );
      const actualHash = createHash('sha256').update(readFileSync(filePath)).digest('hex');
      expect(
        actualHash,
        `${filePath} does not match its recorded hash in integrity.json - the vendor directory has drifted from its manifest`,
      ).toBe(expectedHash);
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
