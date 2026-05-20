/**
 * Simple in-memory cache service for API responses
 * Reduces load on Heroku API and improves performance
 */

class CacheService {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  /**
   * Get cached data if not expired
   * @param {string} key - Cache key
   * @returns {any|null} - Cached data or null if expired/not found
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data;
  }

  /**
   * Set cached data with TTL
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttlMs - Time to live in milliseconds (default: 5 minutes)
   */
  set(key, data, ttlMs = 300000) {
    const now = Date.now();
    this.cache.set(key, {
      data,
      createdAt: now,
      expiresAt: now + ttlMs
    });
    this.stats.sets++;
  }

  /**
   * Delete cached data
   * @param {string} key - Cache key
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
    }
    return deleted;
  }

  /**
   * Clear all cache entries matching a pattern
   * @param {string} pattern - String to match in keys
   */
  clearPattern(pattern) {
    let cleared = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        cleared++;
      }
    }
    this.stats.deletes += cleared;
    return cleared;
  }

  /**
   * Clear all cache
   */
  clearAll() {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.deletes += size;
    return size;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      size: this.cache.size,
      memoryUsage: this._estimateMemoryUsage()
    };
  }

  /**
   * Estimate memory usage (rough calculation)
   */
  _estimateMemoryUsage() {
    let totalSize = 0;
    for (const [key, entry] of this.cache.entries()) {
      // Rough estimate: key + JSON stringified data
      totalSize += key.length * 2; // UTF-16 encoding
      totalSize += JSON.stringify(entry.data).length * 2;
      totalSize += 24; // metadata (timestamps)
    }

    // Convert to KB
    const kb = (totalSize / 1024).toFixed(2);
    return `${kb} KB`;
  }

  /**
   * Clean up expired entries (run periodically)
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[Cache] Cleaned up ${cleaned} expired entries`);
    }

    return cleaned;
  }
}

// Singleton instance
const cacheService = new CacheService();

// Run cleanup every 10 minutes
setInterval(() => {
  cacheService.cleanup();
}, 600000);

module.exports = cacheService;
