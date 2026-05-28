/**
 * Sketch Draw scoring — time-decay guesser points + drawer bonus.
 */

export const GUESSER_POINTS_MAX = 500;
export const GUESSER_FAST_WINDOW_MS = 5000;
export const SKETCH_DRAWER_BASE_POINTS = 100;

/**
 * @param {number} elapsedMs — ms since drawing phase started
 * @param {number} drawDurationMs — total drawing timer length
 * @returns {number}
 */
export function guesserPoints(elapsedMs, drawDurationMs) {
	const elapsed = Math.max(0, elapsedMs);
	const duration = Math.max(1000, drawDurationMs);

	if (elapsed <= GUESSER_FAST_WINDOW_MS) return GUESSER_POINTS_MAX;

	if (elapsed >= duration) return 0;

	const decaySpan = duration - GUESSER_FAST_WINDOW_MS;
	const t = (elapsed - GUESSER_FAST_WINDOW_MS) / decaySpan;
	return Math.round(GUESSER_POINTS_MAX * (1 - t));
}

/**
 * @param {number} correctGuesserCount
 * @returns {number}
 */
export function drawerPoints(correctGuesserCount) {
	const n = Math.max(0, correctGuesserCount);
	return SKETCH_DRAWER_BASE_POINTS * n;
}
