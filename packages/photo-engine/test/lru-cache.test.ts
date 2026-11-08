import { describe, it } from 'node:test';
import assert from 'node:assert';
import { LRUMemoryCache } from '../dist/lru-cache.js';

describe('LRUMemoryCache', () => {
  it('should store and retrieve values correctly', () => {
    const cache = new LRUMemoryCache<string, number>({ maxEntries: 3 });
    cache.set('a', 1);
    cache.set('b', 2);

    assert.strictEqual(cache.get('a'), 1);
    assert.strictEqual(cache.get('b'), 2);
    assert.strictEqual(cache.get('c'), undefined);
    assert.strictEqual(cache.stats().hits, 2);
    assert.strictEqual(cache.stats().misses, 1);
  });

  it('should evict least recently used items when capacity is reached', () => {
    const evicted: Array<{ key: string; value: number }> = [];
    const cache = new LRUMemoryCache<string, number>({
      maxEntries: 2,
      onEvict: (key, value) => {
        evicted.push({ key, value });
      },
    });

    cache.set('x', 10);
    cache.set('y', 20);

    // Access 'x' so 'y' becomes the LRU
    cache.get('x');

    // Add 'z', should evict 'y'
    cache.set('z', 30);

    assert.strictEqual(cache.get('y'), undefined);
    assert.strictEqual(cache.get('x'), 10);
    assert.strictEqual(cache.get('z'), 30);

    assert.deepStrictEqual(evicted, [{ key: 'y', value: 20 }]);
    assert.strictEqual(cache.stats().evictions, 1);
  });

  it('should handle deletion and clear with eviction callbacks', () => {
    const evicted: Array<{ key: string; value: string }> = [];
    const cache = new LRUMemoryCache<string, string>({
      maxEntries: 5,
      onEvict: (key, value) => {
        evicted.push({ key, value });
      },
    });

    cache.set('photo-1', 'blob:http://localhost/1');
    cache.set('photo-2', 'blob:http://localhost/2');

    const deleted = cache.delete('photo-1');
    assert.strictEqual(deleted, true);
    assert.strictEqual(evicted.length, 1);
    assert.strictEqual(evicted[0].key, 'photo-1');

    cache.clear();
    assert.strictEqual(evicted.length, 2);
    assert.strictEqual(evicted[1].key, 'photo-2');
    assert.strictEqual(cache.size, 0);
  });

  it('should dynamically resize and evict excess elements', () => {
    const evicted: string[] = [];
    const cache = new LRUMemoryCache<string, string>({
      maxEntries: 4,
      onEvict: (key) => evicted.push(key),
    });

    cache.set('1', 'one');
    cache.set('2', 'two');
    cache.set('3', 'three');
    cache.set('4', 'four');

    assert.strictEqual(cache.size, 4);

    // Downsize to 2
    cache.resize(2);
    assert.strictEqual(cache.size, 2);
    assert.deepStrictEqual(evicted, ['1', '2']);
  });
});
