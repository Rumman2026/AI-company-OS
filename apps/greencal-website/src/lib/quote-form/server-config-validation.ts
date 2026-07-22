/**
 * Pure validation helpers, deliberately free of `import.meta.env` so they
 * are directly unit-testable under the Playwright test runner (see the
 * Stage 4 tracking module's gtm-id.ts/config.ts split for why this
 * separation matters: import.meta.env cannot even be parsed there).
 */

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isPlausibleHttpsUrl(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isPlausibleEmail(value: unknown): value is string {
  return isNonEmptyString(value) && EMAIL_PATTERN.test(value);
}
