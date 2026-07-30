const SECRET_WORDS = new Set([
  'key',
  'apikey',
  'token',
  'secret',
  'password',
  'credential',
  'credentials',
  'authorization',
  'auth',
]);
const REDACTED = '[redacted]';

// Whole-word match on camelCase/snake_case/kebab-case parts, not a bare
// substring test — a substring test on "token" would also redact
// legitimate count fields like usage.inputTokens/outputTokens (plural,
// not a credential), defeating the "record tokens, latency, provider,
// cost" requirement.
function isSecretShapedKey(key: string): boolean {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .split(/[_\-\s]+/)
    .map((word) => word.toLowerCase());
  return words.some((word) => SECRET_WORDS.has(word));
}

/**
 * Deep-redacts any object property whose key looks secret-shaped, so
 * audit metadata can never leak a credential even if a caller passes one
 * in by mistake. Never disable or bypass this for "trusted" callers.
 */
export function redactSecrets<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = isSecretShapedKey(key) ? REDACTED : redactSecrets(val);
    }
    return result as unknown as T;
  }
  return value;
}
