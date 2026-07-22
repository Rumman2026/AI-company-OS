// Real GTM container ids look like "GTM-XXXXXXX" (letters/digits after the
// prefix). Anything else - empty, missing, or malformed - is treated as
// "not configured", never as a best-effort guess.
const GTM_ID_PATTERN = /^GTM-[A-Z0-9]+$/;

/**
 * Kept in its own file, separate from config.ts, so this validation logic
 * is directly unit-testable in Node: config.ts reads `import.meta.env`,
 * which cannot even be parsed by the Playwright test runner's CommonJS
 * transform (a real, verified failure - not a hypothetical one).
 */
export function isValidGtmContainerId(value: unknown): value is string {
  return typeof value === 'string' && GTM_ID_PATTERN.test(value);
}
