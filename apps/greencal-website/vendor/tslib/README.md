# Vendored `tslib` runtime files

- **Upstream package:** `tslib`
- **Upstream version:** `2.8.1`
- **Upstream project:** [Microsoft/tslib](https://github.com/microsoft/tslib) (TypeScript's runtime helper library)
- **License:** 0BSD (see `LICENSE.txt` in this directory, copied verbatim from the upstream package)

## Why these files are vendored

Attempts 4-7 of the `apps/greencal-website` Vercel deployment fix (see
`astro.config.mjs` and `scripts/stage-tslib.mjs` for the full history)
established that Vercel's installed build environment does not reliably
expose the `tslib` package installed via pnpm at build time - neither
`require.resolve('tslib')` nor the deterministic pnpm virtual-store path
(`node_modules/.pnpm/tslib@2.8.1/node_modules/tslib`) could locate it in
Vercel's own Build Log evidence for commit `3b02f81`, despite the exact
same package existing and resolving correctly in every local
reproduction attempted. Rather than continue guessing at Vercel's
dependency-install layout, the five files in this directory make the
runtime files this app actually needs (see below) repository-owned and
independent of any package manager's install behavior at build time.

## Files included

Only the files required for a bare `import ... from "tslib"` (or
`require("tslib")`) to resolve correctly under Node's module resolution,
plus the license file:

| File                   | Purpose                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`         | Package manifest - name, version, and the `"exports"` map Node's resolver reads                                                                               |
| `tslib.js`             | CommonJS/`require()` entry point (`package.json`'s `"main"`/`"default"` export target)                                                                        |
| `modules/index.js`     | ESM `import` entry point (`package.json`'s `"exports"["."]["import"]["node"]` target - the one this app's runtime bare `import "tslib"` actually resolves to) |
| `modules/package.json` | Declares `{"type":"module"}` so Node parses `modules/index.js` as ESM                                                                                         |
| `LICENSE.txt`          | Upstream 0BSD license notice, included unmodified for compliance                                                                                              |

These are copied byte-for-byte from the officially published `tslib@2.8.1`
npm package (verified as installed via this repository's own
`pnpm-lock.yaml`) - **never modified, minified, or reformatted**. `tslib`
ships several other files (`tslib.es6.js`, `tslib.es6.mjs`, `tslib.d.ts`,
`README.md`, `SECURITY.md`, `CopyrightNotice.txt`, HTML demo files) that
are not needed for this app's runtime resolution path and are
intentionally not vendored here.

The upstream package itself mixes line-ending conventions (some files
CRLF, some LF) - `.gitattributes` in this directory (`* -text`) disables
Git's line-ending normalization for everything here, so a checkout on
any platform never silently rewrites a byte that `integrity.json`'s
hashes were computed against. Confirmed directly that without it, Git
would convert several of these files' CRLF line endings to LF on commit.

## How to verify the files haven't drifted

`integrity.json` in this directory records the SHA-256 hash of every
vendored file. `scripts/stage-tslib.mjs` verifies these hashes before
copying any file into `node_modules/tslib` at build time - a hash
mismatch fails the build loudly rather than silently deploying corrupted
or tampered runtime code.

To re-verify by hand:

```sh
cd apps/greencal-website/vendor/tslib
sha256sum LICENSE.txt package.json tslib.js modules/index.js modules/package.json
```

Compare the output against `integrity.json`.

## How to update safely (e.g. for a future tslib version bump)

1. Update `tslib`'s version in `apps/greencal-website/package.json` and run
   `pnpm install` to update `pnpm-lock.yaml` as normal.
2. Copy the five files above, unmodified, from the newly installed
   `tslib` package (e.g.
   `node_modules/.pnpm/tslib@<new-version>/node_modules/tslib/`) into this
   directory, overwriting the old copies.
3. Regenerate `integrity.json`:
   ```sh
   node -e "
   const crypto = require('crypto');
   const fs = require('fs');
   const files = ['LICENSE.txt', 'package.json', 'tslib.js', 'modules/index.js', 'modules/package.json'];
   const hashes = {};
   for (const f of files) hashes[f] = crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
   fs.writeFileSync('integrity.json', JSON.stringify({ name: 'tslib', version: '<new-version>', algorithm: 'sha256', files: hashes }, null, 2) + '\n');
   "
   ```
4. **This version must stay synchronized across three places** - a
   mismatch between any of them is a bug, not a valid intermediate state:
   - `apps/greencal-website/package.json`'s `dependencies.tslib`
   - `pnpm-lock.yaml`'s locked version for the `apps/greencal-website`
     importer
   - `integrity.json`'s `version` field in this directory
5. Run `pnpm run build` locally and the full Playwright suite
   (`tests/vercel-function-smoke.spec.ts` in particular) before pushing -
   these tests verify the staged output against `integrity.json` and will
   fail if any of the three version sources drift from the others.

## Source integrity

Only ever copy from the officially installed npm package (resolved via
this repository's own `pnpm-lock.yaml`) or from the official
[microsoft/tslib](https://github.com/microsoft/tslib) GitHub repository at
the matching tagged release. Never copy `tslib` files from an
unofficial or third-party mirror.
