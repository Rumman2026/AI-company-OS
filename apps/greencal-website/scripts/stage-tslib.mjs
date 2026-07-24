#!/usr/bin/env node
// Prebuild staging script - Attempt 7 (2026-07-24) of the ongoing tslib
// Vercel deployment fix. See astro.config.mjs for the full attempt
// history. Runs as a plain, standalone Node process (via package.json's
// "prebuild" script, invoked automatically by "pnpm run build" - Vercel's
// observed build command) - NOT through Astro/Vite's config loader,
// which is where Attempts 4-6 failed.
//
// Vercel's Build Log for commit aeda3ce (Attempt 6) proved the
// app-level `apps/greencal-website/node_modules/tslib` pnpm symlink -
// present and reliable in every local Windows build this session - does
// not exist in Vercel's installed workspace layout at Astro's
// "astro:build:done" packaging hook: "ENOENT: no such file or
// directory, realpath '.../apps/greencal-website/node_modules/tslib/
// package.json'". Astro config's `includeFiles` (a static list of
// string literals as of Attempt 6, per explicit direction to remove all
// dynamic resolution from astro.config.mjs) cannot fix a source path
// that does not exist at all.
//
// This script creates a REAL (non-symlink) `node_modules/tslib`
// directory inside the app, containing only the four files the runtime
// bare `import ... from "tslib"` actually needs, copied by bytes - so
// astro.config.mjs's `includeFiles` entries for
// `./node_modules/tslib/...` always find real, physical files
// regardless of whether pnpm/Vercel materializes its own symlink there.
//
// Deliberately does NOT depend on Astro/Vite config-time resolution
// (the mechanism that failed twice - Attempts 4 and 5). Resolution here
// runs as a plain Node process, verified working in this exact form
// through local reproduction; the pnpm-lock.yaml-derived fallback below
// exists specifically so this script does not share a single point of
// failure with require.resolve, in case that also proves unreliable in
// Vercel's build environment for a reason not yet identified.

import { createRequire } from 'node:module';
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_FILES = [
  'package.json',
  'tslib.js',
  join('modules', 'index.js'),
  join('modules', 'package.json'),
];

function fail(message) {
  console.error(`[stage-tslib] FAILED: ${message}`);
  process.exit(1);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

// Determined from this script's own location, not process.cwd() - safe
// regardless of the directory pnpm/Vercel invokes the build command
// from.
const appRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = join(appRoot, '..', '..');

function lockfileTslibVersion() {
  const lockfilePath = join(repoRoot, 'pnpm-lock.yaml');
  if (!existsSync(lockfilePath)) {
    fail(`pnpm-lock.yaml not found at ${lockfilePath}`);
  }
  const lockfile = readFileSync(lockfilePath, 'utf-8');
  // Scoped specifically to the GreenCal app's own importer block (not
  // any other workspace package, and not the root package.json) - see
  // the exact structure this matches in pnpm-lock.yaml.
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

function findSourceDir(expectedVersion) {
  // Method 1: standalone Node resolution. This runs as a plain process,
  // not through Astro/Vite's config loader (the mechanism that failed
  // twice on Vercel for this exact package) - verified working locally
  // in this exact standalone form.
  try {
    const require = createRequire(import.meta.url);
    const resolved = dirname(require.resolve('tslib'));
    console.error(`[stage-tslib] require.resolve('tslib') succeeded: ${resolved}`);
    return resolved;
  } catch (err) {
    console.error(
      `[stage-tslib] require.resolve('tslib') failed (${err.code ?? err.message}) - falling back to a deterministic pnpm-store path derived from pnpm-lock.yaml.`,
    );
  }

  // Method 3 (method 2's glob search collapses to this, since the exact
  // version is already known from the lockfile - searching for a glob
  // and then having to cross-check it against the lockfile version
  // anyway is strictly more work for the same result): construct the
  // pnpm virtual-store path directly from the version pnpm-lock.yaml
  // says this app actually depends on.
  const candidate = join(
    repoRoot,
    'node_modules',
    '.pnpm',
    `tslib@${expectedVersion}`,
    'node_modules',
    'tslib',
  );
  if (!existsSync(candidate)) {
    fail(
      `neither require.resolve('tslib') nor the deterministic pnpm-store path (${candidate}) could locate the installed tslib@${expectedVersion} package.`,
    );
  }
  console.error(`[stage-tslib] using deterministic pnpm-store path: ${candidate}`);
  return candidate;
}

function verifySource(sourceDir, expectedVersion) {
  const pkgJsonPath = join(sourceDir, 'package.json');
  if (!existsSync(pkgJsonPath)) {
    fail(`source package.json missing at ${pkgJsonPath}`);
  }
  const pkg = readJson(pkgJsonPath);
  if (pkg.name !== 'tslib') {
    fail(`source package at ${sourceDir} has name "${pkg.name}", expected "tslib"`);
  }
  if (pkg.version !== expectedVersion) {
    fail(
      `source package at ${sourceDir} is tslib@${pkg.version}, but pnpm-lock.yaml locks apps/greencal-website to tslib@${expectedVersion} - refusing to stage a version mismatch`,
    );
  }
  for (const relative of REQUIRED_FILES) {
    const filePath = join(sourceDir, relative);
    if (!existsSync(filePath)) {
      fail(`required source file missing: ${filePath}`);
    }
    let stats;
    try {
      stats = statSync(filePath);
    } catch (err) {
      fail(`required source file unreadable: ${filePath} (${err.message})`);
    }
    if (stats.size === 0) {
      fail(`required source file is empty: ${filePath}`);
    }
  }
}

function stage(sourceDir) {
  const destDir = join(appRoot, 'node_modules', 'tslib');
  const tmpDir = join(appRoot, 'node_modules', `.tslib-staging-tmp-${process.pid}-${Date.now()}`);

  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(join(tmpDir, 'modules'), { recursive: true });

  for (const relative of REQUIRED_FILES) {
    copyFileSync(join(sourceDir, relative), join(tmpDir, relative));
  }

  // Verify the staged copy before it ever becomes visible at the real
  // destination path - a failure here leaves only the discarded tmp
  // directory behind, never a partially-staged destination.
  for (const relative of REQUIRED_FILES) {
    const stagedPath = join(tmpDir, relative);
    if (lstatSync(stagedPath).isSymbolicLink()) {
      fail(`staged file is a symlink, not a real copy: ${stagedPath}`);
    }
    if (statSync(stagedPath).size === 0) {
      fail(`staged file is empty: ${stagedPath}`);
    }
  }
  const stagedPkg = readJson(join(tmpDir, 'package.json'));
  if (stagedPkg.name !== 'tslib') {
    fail(`staged package.json has name "${stagedPkg.name}", expected "tslib"`);
  }

  // Idempotent: remove any stale destination (a prior run's output, a
  // leftover symlink, or nothing at all) before making the freshly
  // staged, verified copy visible in its place.
  rmSync(destDir, { recursive: true, force: true });
  renameSync(tmpDir, destDir);

  return { destDir, version: stagedPkg.version };
}

const expectedVersion = lockfileTslibVersion();
console.error(
  `[stage-tslib] apps/greencal-website depends on tslib@${expectedVersion} (per pnpm-lock.yaml)`,
);

const sourceDir = findSourceDir(expectedVersion);
verifySource(sourceDir, expectedVersion);

const { destDir, version } = stage(sourceDir);

console.error(
  `[stage-tslib] OK: staged tslib@${version} as real files at ${destDir} (package.json, tslib.js, modules/index.js, modules/package.json)`,
);
