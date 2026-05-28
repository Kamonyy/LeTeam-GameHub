/** Simple in-memory sliding-window rate limiter (per key). */

const DEFAULT_PRUNE_EVERY_ALLOWS = 100;
const DEFAULT_PRUNE_INTERVAL_MS = 60_000;
const DEFAULT_PRUNE_MAX_AGE_MS = 120_000;

export class RateLimiter {
	/**
	 * @param {{ pruneEvery?: number; pruneIntervalMs?: number }} [options]
	 */
	constructor(options = {}) {
		/** @type {Map<string, { start: number; count: number }>} */
		this.buckets = new Map();
		this.allowCount = 0;
		this.pruneEvery = options.pruneEvery ?? DEFAULT_PRUNE_EVERY_ALLOWS;
		this.pruneMaxAgeMs = options.pruneMaxAgeMs ?? DEFAULT_PRUNE_MAX_AGE_MS;
		const pruneIntervalMs =
			options.pruneIntervalMs ?? DEFAULT_PRUNE_INTERVAL_MS;
		this._pruneTimer = setInterval(
			() => this.prune(this.pruneMaxAgeMs),
			pruneIntervalMs,
		);
		if (typeof this._pruneTimer?.unref === "function") {
			this._pruneTimer.unref();
		}
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
		this.allowCount += 1;
		if (this.allowCount >= this.pruneEvery) {
			this.allowCount = 0;
			this.prune(this.pruneMaxAgeMs);
		}
		return bucket.count <= limit;
	}

	/** Drop stale buckets periodically. */
	prune(maxAgeMs = DEFAULT_PRUNE_MAX_AGE_MS) {
		const now = Date.now();
		for (const [key, bucket] of this.buckets) {
			if (now - bucket.start > maxAgeMs) {
				this.buckets.delete(key);
			}
		}
	}
}
