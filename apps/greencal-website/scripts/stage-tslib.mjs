#!/usr/bin/env node
// Prebuild staging script - Attempt 8 (2026-07-24) of the ongoing tslib
// Vercel deployment fix. See astro.config.mjs for the full attempt
// history. Runs as a plain, standalone Node process (via package.json's
// "prebuild" script, invoked automatically by "pnpm run build" - Vercel's
// observed build command), before Astro ever starts.
//
// Attempt 7 tried two dependency-install-derived sources in order:
// require.resolve('tslib') (a plain Node process, not Astro/Vite's
// config loader) and a deterministic pnpm virtual-store path built from
// pnpm-lock.yaml's locked version. Vercel's Build Log for commit
// 3b02f81 proved BOTH fail on Vercel - `require.resolve('tslib')` threw
// MODULE_NOT_FOUND, and
// /vercel/path0/node_modules/.pnpm/tslib@2.8.1/node_modules/tslib does
// not exist either - despite `tslib` being a correctly declared direct
// dependency in package.json and pnpm-lock.yaml. Vercel's installed
// workspace layout for this package cannot be relied on at build time by
// any method tried so far.
//
// This script no longer searches Vercel's (or any) installed
// node_modules layout at all. Its only source is
// apps/greencal-website/vendor/tslib/ - five files (four tslib runtime
// files plus LICENSE.txt) vendored directly into this repository,
// copied byte-for-byte from the officially installed tslib@2.8.1
// package and never modified (see vendor/tslib/README.md for the full
// provenance, license, and update procedure). Every file is verified
// against vendor/tslib/integrity.json's recorded SHA-256 hash before
// being copied anywhere - a hash mismatch (a corrupted checkout, a
// tampered file, or the vendor directory and integrity.json drifting
// out of sync) fails the build loudly rather than silently deploying
// unverified code.
//
// Because the source is now a plain, repository-tracked directory - not
// an installed npm package reached through pnpm's own resolution or
// store layout - there is nothing left for Vercel's install step to get
// differently right or wrong.

import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
} from 'node:fs';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Forward-slash form, matching vendor/tslib/integrity.json's "files"
// keys exactly (JSON/npm convention - not OS-specific). Use
// resolveManifestPath() below to convert one of these to a real
// filesystem path.
const REQUIRED_FILES = ['package.json', 'tslib.js', 'modules/index.js', 'modules/package.json'];

function fail(message) {
  console.error(`[stage-tslib] FAILED: ${message}`);
  process.exit(1);
}

// Fixed 2026-07-25: this used to be a single variadic helper
// (`toPath(...segments)`) that ran `.split('/')` over *every* argument,
// including the absolute base directory itself. On POSIX (Vercel's
// Linux build machine - never reproduced on Windows, where this
// session's local testing happens, because Windows paths use backslash
// separators with no '/' for split() to act on), splitting an absolute
// path like "/vercel/path0/.../vendor/tslib" on "/" produces a leading
// empty-string segment; `path.join()` then silently drops it, turning
// an absolute path into a relative one. Confirmed directly: this
// produced the exact malformed path
// "vercel/path0/apps/greencal-website/vendor/tslib/LICENSE.txt" (no
// leading slash) in Vercel's Build Log for commit 2de078d, causing
// `existsSync()` to report a file that a diagnostic directory listing
// in the same log proved was genuinely present - not a Vercel cache,
// Git checkout, or repository-content problem, all of which were ruled
// out first by inspecting the actual committed Git tree/blob hashes via
// `git ls-tree`/`git cat-file`.
//
// Fix: only the relative manifest-key argument is ever split - the base
// directory is passed to `join()` untouched, so an absolute POSIX path
// keeps its leading separator (`join()` never strips a leading `/` that
// was never split off of it in the first place). Also rejects unsafe
// relative segments ("", ".", "..") so a manifest entry can never
// resolve outside the base directory it was given.
function resolveManifestPath(baseDir, relativePath) {
  const segments = relativePath.split('/');
  if (segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')) {
    fail(
      `unsafe relative path in manifest: "${relativePath}" (must not contain empty, "." or ".." segments)`,
    );
  }
  const resolved = join(baseDir, ...segments);
  if (resolved !== baseDir && !resolved.startsWith(baseDir + sep)) {
    fail(`resolved path "${resolved}" escapes its base directory "${baseDir}"`);
  }
  return resolved;
}

// Diagnostic only - lists exactly what readdirSync sees, with each
// entry's mode bits (lstatSync, not stat, so a broken/dangling symlink
// shows as such rather than throwing). Added after a real incident
// (Vercel Build Log for commit a77aab6) where integrity.json listed
// "LICENSE.txt" as missing at an exact path that - per exhaustive local
// `git cat-file`/`git ls-tree` inspection of both the local HEAD and the
// origin remote-tracking branch - unambiguously exists, correctly cased,
// with a matching blob hash, in the exact commit Vercel reported
// cloning. That rules out the repository itself; this exists to capture
// direct evidence of what Vercel's own checkout actually contains next
// time, rather than continuing to infer it indirectly through which
// specific fail() message fires.
function listDirRecursive(dir, prefix = '') {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    console.error(`[stage-tslib]   (could not list ${dir}: ${err.code ?? err.message})`);
    return;
  }
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = join(dir, entry.name);
    let kind = 'file';
    try {
      const lst = lstatSync(full);
      kind = lst.isSymbolicLink() ? 'symlink' : lst.isDirectory() ? 'dir' : `file (${lst.size}b)`;
    } catch (err) {
      kind = `unreadable (${err.code ?? err.message})`;
    }
    console.error(`[stage-tslib]   ${prefix}${entry.name} [${kind}]`);
    if (entry.isDirectory()) {
      listDirRecursive(full, `${prefix}${entry.name}/`);
    }
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

// Retries a rename past a transient lock instead of failing outright.
// Observed locally on Windows: a running `astro dev` server (or the OS)
// can briefly hold node_modules/tslib open, which surfaces as EPERM/EBUSY
// on renameSync and clears within milliseconds once the lock releases.
function renameWithRetry(from, to, attempts = 5, delayMs = 50) {
  for (let attempt = 1; ; attempt++) {
    try {
      renameSync(from, to);
      return;
    } catch (err) {
      if (!['EPERM', 'EBUSY'].includes(err.code) || attempt >= attempts) {
        throw err;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs);
    }
  }
}

// Determined from this script's own location, not process.cwd() - safe
// regardless of the directory pnpm/Vercel invokes the build command
// from.
const appRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const vendorDir = join(appRoot, 'vendor', 'tslib');

function lockfileTslibVersion() {
  const lockfilePath = join(appRoot, '..', '..', 'pnpm-lock.yaml');
  if (!existsSync(lockfilePath)) {
    fail(`pnpm-lock.yaml not found at ${lockfilePath}`);
  }
  const lockfile = readFileSync(lockfilePath, 'utf-8');
  // Scoped specifically to the GreenCal app's own importer block (not
  // any other workspace package, and not the root package.json).
  const importerMatch = lockfile.match(
    /apps\/greencal-website:\s*\n\s*dependencies:[\s\S]*?tslib:\s*\n\s*specifier:[^\n]*\n\s*version:\s*([\d.]+)/,
  );
  if (!importerMatch) {
    fail(
      "could not find apps/greencal-website's tslib dependency version in pnpm-lock.yaml - has the lockfile format changed, or is tslib no longer a direct dependency?",
    );
  }
  return importerMatch[1];
}

function verifyVendorSource(expectedVersion) {
  if (!existsSync(vendorDir)) {
    console.error(`[stage-tslib] diagnostic: listing ${appRoot} (vendor dir itself is missing)`);
    listDirRecursive(appRoot);
    fail(`vendor source directory missing: ${vendorDir}`);
  }

  const manifestPath = join(vendorDir, 'integrity.json');
  if (!existsSync(manifestPath)) {
    fail(`integrity manifest missing: ${manifestPath}`);
  }
  const manifest = readJson(manifestPath);
  if (manifest.name !== 'tslib') {
    fail(`${manifestPath} has name "${manifest.name}", expected "tslib"`);
  }
  if (manifest.algorithm !== 'sha256') {
    fail(`${manifestPath} uses algorithm "${manifest.algorithm}", expected "sha256"`);
  }
  if (manifest.version !== expectedVersion) {
    fail(
      `${manifestPath} records tslib@${manifest.version}, but pnpm-lock.yaml locks apps/greencal-website to tslib@${expectedVersion} - the vendor directory is out of sync with the declared dependency version (see vendor/tslib/README.md's update procedure)`,
    );
  }

  const pkg = readJson(join(vendorDir, 'package.json'));
  if (pkg.name !== 'tslib') {
    fail(`vendored package.json has name "${pkg.name}", expected "tslib"`);
  }
  if (pkg.version !== expectedVersion) {
    fail(
      `vendored package.json is tslib@${pkg.version}, but pnpm-lock.yaml locks apps/greencal-website to tslib@${expectedVersion} - refusing to stage a version mismatch`,
    );
  }

  // Hash every manifest-listed file (LICENSE.txt included, even though
  // it is not one of the four files staged into node_modules/tslib
  // below) - this is the integrity check the manifest exists for, and
  // skipping LICENSE.txt here would leave license-notice tampering
  // undetected.
  for (const [relative, expectedHash] of Object.entries(manifest.files)) {
    const filePath = resolveManifestPath(vendorDir, relative);
    if (!existsSync(filePath)) {
      console.error(`[stage-tslib] diagnostic: actual contents of ${vendorDir} (recursive):`);
      listDirRecursive(vendorDir);
      fail(`${manifestPath} lists "${relative}" but the file is missing at ${filePath}`);
    }
    const actualHash = sha256(filePath);
    if (actualHash !== expectedHash) {
      fail(
        `${filePath} does not match its recorded hash in integrity.json (expected ${expectedHash}, got ${actualHash}) - the vendored file may be corrupted or was edited without updating the manifest`,
      );
    }
  }

  for (const relative of REQUIRED_FILES) {
    if (!(relative in manifest.files)) {
      fail(`${manifestPath} does not list required runtime file "${relative}"`);
    }
    const filePath = resolveManifestPath(vendorDir, relative);
    const stats = statSync(filePath);
    if (stats.size === 0) {
      fail(`vendored file is empty: ${filePath}`);
    }
  }
}

function stage() {
  const destDir = join(appRoot, 'node_modules', 'tslib');
  const tmpDir = join(appRoot, 'node_modules', `.tslib-staging-tmp-${process.pid}-${Date.now()}`);

  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(join(tmpDir, 'modules'), { recursive: true });

  for (const relative of REQUIRED_FILES) {
    copyFileSync(resolveManifestPath(vendorDir, relative), resolveManifestPath(tmpDir, relative));
  }

  // Verify the staged copy before it ever becomes visible at the real
  // destination path - a failure here leaves only the discarded tmp
  // directory behind, never a partially-staged destination.
  for (const relative of REQUIRED_FILES) {
    const stagedPath = resolveManifestPath(tmpDir, relative);
    if (lstatSync(stagedPath).isSymbolicLink()) {
      fail(`staged file is a symlink, not a real copy: ${stagedPath}`);
    }
    if (statSync(stagedPath).size === 0) {
      fail(`staged file is empty: ${stagedPath}`);
    }
    if (sha256(stagedPath) !== sha256(resolveManifestPath(vendorDir, relative))) {
      fail(`staged file ${stagedPath} does not match its vendor source after copying`);
    }
  }
  const stagedPkg = readJson(resolveManifestPath(tmpDir, 'package.json'));
  if (stagedPkg.name !== 'tslib') {
    fail(`staged package.json has name "${stagedPkg.name}", expected "tslib"`);
  }

  // Idempotent: swap in the freshly staged, verified copy in place of any
  // stale destination (a prior run's output, a leftover symlink, or
  // nothing at all). The old destination is moved aside rather than
  // deleted outright first, and restored if the final rename fails, so a
  // transient rename failure can never leave destDir missing - it either
  // ends up as the new staged copy or reverts to exactly what was there
  // before this call.
  const oldDir = join(appRoot, 'node_modules', `.tslib-staging-old-${process.pid}-${Date.now()}`);
  const hadExisting = existsSync(destDir);
  if (hadExisting) {
    rmSync(oldDir, { recursive: true, force: true });
    renameWithRetry(destDir, oldDir);
  }
  try {
    renameWithRetry(tmpDir, destDir);
  } catch (err) {
    if (hadExisting) {
      renameSync(oldDir, destDir);
    }
    throw err;
  }
  if (hadExisting) {
    rmSync(oldDir, { recursive: true, force: true });
  }

  return { destDir, version: stagedPkg.version };
}

const expectedVersion = lockfileTslibVersion();
console.error(
  `[stage-tslib] apps/greencal-website depends on tslib@${expectedVersion} (per pnpm-lock.yaml)`,
);

verifyVendorSource(expectedVersion);
console.error(`[stage-tslib] vendor source verified against integrity.json: ${vendorDir}`);

const { destDir, version } = stage();

console.error(
  `[stage-tslib] OK: staged tslib@${version} as real, hash-verified files at ${destDir} (package.json, tslib.js, modules/index.js, modules/package.json)`,
);
