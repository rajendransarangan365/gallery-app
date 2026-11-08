/**
 * @gallery/photo-engine - High Performance LRU Memory Cache
 * Provides bounded in-memory caching with O(1) lookups and deterministic eviction
 * to prevent memory leaks during rapid scrolling across 10,000+ to 50,000+ photo collections.
 */

export interface LRUCacheOptions<K, V> {
  maxEntries: number;
  onEvict?: (key: K, value: V) => void;
}

export interface LRUStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  capacity: number;
}

export class LRUMemoryCache<K, V> {
  private capacity: number;
  private cache: Map<K, V>;
  private onEvict?: (key: K, value: V) => void;
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(options: LRUCacheOptions<K, V>) {
    if (options.maxEntries <= 0) {
      throw new Error('LRUCache maxEntries must be greater than 0');
    }
    this.capacity = options.maxEntries;
    this.cache = new Map<K, V>();
    this.onEvict = options.onEvict;
  }

  /**
   * Retrieves an item from the cache, promoting it to Most Recently Used (MRU).
   */
  public get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      this.misses++;
      return undefined;
    }

    const value = this.cache.get(key)!;
    // Refresh position to MRU by deleting and re-inserting
    this.cache.delete(key);
    this.cache.set(key, value);
    this.hits++;
    return value;
  }

  /**
   * Stores an item in the cache. Evicts Least Recently Used (LRU) entry if capacity is reached.
   */
  public set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Evict least recently used (first item in Map iteration)
      const lruKey = this.cache.keys().next().value;
      if (lruKey !== undefined) {
        const lruValue = this.cache.get(lruKey)!;
        this.cache.delete(lruKey);
        this.evictions++;
        if (this.onEvict) {
          try {
            this.onEvict(lruKey, lruValue);
          } catch {
            // Guard against eviction hook errors
          }
        }
      }
    }

    this.cache.set(key, value);
  }

  /**
   * Checks presence without modifying MRU order.
   */
  public has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Explicitly removes a key and executes eviction hook.
   */
  public delete(key: K): boolean {
    if (!this.cache.has(key)) return false;
    const value = this.cache.get(key)!;
    const deleted = this.cache.delete(key);
    if (deleted && this.onEvict) {
      try {
        this.onEvict(key, value);
      } catch {
        // Guard against eviction hook errors
      }
    }
    return deleted;
  }

  /**
   * Clears the entire cache, executing eviction callbacks for all cached items.
   */
  public clear(): void {
    if (this.onEvict) {
      for (const [key, value] of this.cache.entries()) {
        try {
          this.onEvict(key, value);
        } catch {
          // Guard against eviction hook errors
        }
      }
    }
    this.cache.clear();
  }

  /**
   * Current number of entries in the cache.
   */
  public get size(): number {
    return this.cache.size;
  }

  /**
   * Maximum capacity.
   */
  public get maxEntries(): number {
    return this.capacity;
  }

  /**
   * Dynamically resizes the cache. Evicts excess LRU items if new capacity is smaller.
   */
  public resize(newCapacity: number): void {
    if (newCapacity <= 0) {
      throw new Error('New capacity must be greater than 0');
    }
    this.capacity = newCapacity;
    while (this.cache.size > this.capacity) {
      const lruKey = this.cache.keys().next().value;
      if (lruKey !== undefined) {
        const lruValue = this.cache.get(lruKey)!;
        this.cache.delete(lruKey);
        this.evictions++;
        if (this.onEvict) {
          try {
            this.onEvict(lruKey, lruValue);
          } catch {
            // Guard against eviction hook errors
          }
        }
      }
    }
  }

  /**
   * Cache telemetry and performance statistics.
   */
  public stats(): LRUStats {
    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      size: this.cache.size,
      capacity: this.capacity,
    };
  }
}
