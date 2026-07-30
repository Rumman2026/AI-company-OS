export interface CacheEntry<T> {
  value: T;
  cachedAtIso: string;
  expiresAtIso: string | null;
  hitCount: number;
}

export interface CacheSetOptions {
  ttlMs?: number;
}

export interface SemanticCache<T> {
  get(key: string): CacheEntry<T> | null;
  set(key: string, value: T, options?: CacheSetOptions): void;
  has(key: string): boolean;
  delete(key: string): void;
  clear(): void;
}
