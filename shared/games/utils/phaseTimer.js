/**
 * Phase timer helpers for engines using phaseEndsAt timestamps.
 */

/**
 * @param {number | null | undefined} phaseEndsAt
 * @returns {number}
 */
export function getPhaseRemainingMs(phaseEndsAt) {
	if (phaseEndsAt == null) return 0;
	return Math.max(0, phaseEndsAt - Date.now());
}

/**
 * @param {number} durationMs
 * @returns {number}
 */
export function setPhaseEndsAt(durationMs) {
	return Date.now() + durationMs;
}
