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
        project: null,
      },
      rules: {
        'prettier/prettier': 'off',
      },
    },
  ],
};
