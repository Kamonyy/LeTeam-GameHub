/** Simple in-memory sliding-window rate limiter (per key). */

export class RateLimiter {
  constructor() {
    /** @type {Map<string, { start: number, count: number }>} */
    this.buckets = new Map();
  }

  /**
   * @param {string} key
   * @param {number} limit max events per window
   * @param {number} windowMs
   */
  allow(key, limit, windowMs) {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket || now - bucket.start > windowMs) {
      bucket = { start: now, count: 0 };
      this.buckets.set(key, bucket);
    }

    bucket.count += 1;
    return bucket.count <= limit;
  }

  /** Drop stale buckets periodically. */
  prune(maxAgeMs = 120_000) {
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.start > maxAgeMs) {
        this.buckets.delete(key);
      }
    }
  }
}
