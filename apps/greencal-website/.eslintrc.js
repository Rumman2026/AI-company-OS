module.exports = {
  extends: ['../../.eslintrc.js', 'plugin:astro/recommended'],
  ignorePatterns: ['dist/', '.astro/', 'test-results/', 'playwright-report/'],
  overrides: [
    {
      files: ['*.astro'],
      parser: 'astro-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser',
        extraFileExtensions: ['.astro'],
        sourceType: 'module',
        // Explicitly disable type-aware parsing for .astro files: the
        // inherited root `parserOptions.project` (./tsconfig.json) does
        // not include .astro files, and ESLint's legacy config cascade
        // merges parserOptions rather than replacing them, so this must
        // be reset explicitly (mirrors eslint-plugin-astro's own internal
        // override for extracted <script> blocks).
        project: null,
      },
      rules: {
        // Core Prettier cannot parse .astro syntax without
        // prettier-plugin-astro, which is not installed for this
        // checkpoint (not in the approved dependency list). Astro
        // structural/a11y rules from eslint-plugin-astro still apply.
        'prettier/prettier': 'off',
      },
    },
  ],
};
