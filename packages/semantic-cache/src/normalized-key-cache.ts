import type { CacheEntry, CacheSetOptions, SemanticCache } from './types';

// Phase 1 scope: exact/normalized-key matching only. True embedding-based
// semantic similarity is a documented future enhancement — implementing
// it now would mean fabricating an unimplemented capability behind a
// misleadingly complete-looking interface. See README.md.
export function normalizeKey(rawKey: string): string {
  return rawKey.trim().toLowerCase().replace(/\s+/g, ' ');
}

export class NormalizedKeyCache<T> implements SemanticCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();

  get(key: string): CacheEntry<T> | null {
    const normalized = normalizeKey(key);
    const entry = this.store.get(normalized);
    if (!entry) {
      return null;
    }
    if (entry.expiresAtIso && new Date(entry.expiresAtIso).getTime() < Date.now()) {
      this.store.delete(normalized);
      return null;
    }
    entry.hitCount += 1;
    return entry;
  }

  set(key: string, value: T, options: CacheSetOptions = {}): void {
    const normalized = normalizeKey(key);
    const nowIso = new Date().toISOString();
    this.store.set(normalized, {
      value,
      cachedAtIso: nowIso,
      expiresAtIso: options.ttlMs ? new Date(Date.now() + options.ttlMs).toISOString() : null,
      hitCount: 0,
    });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.store.delete(normalizeKey(key));
  }

  clear(): void {
    this.store.clear();
  }
}
