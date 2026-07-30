import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NormalizedKeyCache } from '../src/normalized-key-cache';

test('set/get round-trips a value under a normalized key', () => {
  const cache = new NormalizedKeyCache<string>();
  cache.set('  Some Prompt  ', 'cached-response');
  assert.equal(cache.get('some prompt')?.value, 'cached-response');
});

test('has() reflects expiry via ttlMs', async () => {
  const cache = new NormalizedKeyCache<string>();
  cache.set('short-lived', 'value', { ttlMs: 1 });
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(cache.has('short-lived'), false);
});

test('hitCount increments on repeated get()', () => {
  const cache = new NormalizedKeyCache<number>();
  cache.set('k', 1);
  cache.get('k');
  const entry = cache.get('k');
  assert.equal(entry?.hitCount, 2);
});
