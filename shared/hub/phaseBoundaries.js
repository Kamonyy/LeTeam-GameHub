/**
 * Deterministic phase gates for aggregate tracking and persistence dispatch.
 * See docs/architecture/persistence-boundaries.md
 */

/** @readonly */
export const PHASE_BOUNDARIES = Object.freeze({
	ROUND_END: "round_end",
	ROUND_OVER: "round_over",
	MATCH_OVER: "match_over",
});

const BOUNDARY_PHASES = new Set(Object.values(PHASE_BOUNDARIES));

/** @param {string | null | undefined} phase */
export function isPhaseBoundary(phase) {
	return BOUNDARY_PHASES.has(phase);
}

/** @param {string} phase @param {number} roundNumber */
export function phaseBoundaryKey(phase, roundNumber) {
	return `${phase}:${roundNumber}`;
}

/**
 * Symmetric, spectator-safe engine slice for boundary payloads.
 * Prefer serializeForSpectator when implemented; fall back to serializeBase.
 * @param {import('../games/BaseGameEngine.js').BaseGameEngine | null | undefined} game
 */
function extractPublicEngineState(game) {
	if (!game) return null;
	if (typeof game.serializeForSpectator === "function") {
		const viewerId = game.playerIds[0] ?? "";
		return game.serializeForSpectator(viewerId);
	}
	return game.serializeBase();
}

/**
 * @param {object} room
 * @param {string} phase
 * @returns {import('./persistenceAdapter.js').PhaseBoundaryPayload}
 */
export function buildPhaseBoundaryPayload(room, phase) {
	const game = room.game;

	return {
		roomId: room.id,
		gameType: room.gameType,
		phase,
		roundNumber: game?.roundNumber ?? null,
		stateVersion: game?.stateVersion ?? null,
		players: (room.players ?? []).map((p) => ({
			id: p.id,
			displayName: p.displayName,
		})),
		enginePublic: extractPublicEngineState(game),
		occurredAt: Date.now(),
	};
}
