/**
 * Injectable persistence seam — default noop until D1 / Postgres adapter is wired.
 * See docs/architecture/persistence-boundaries.md
 */

/**
 * @typedef {object} PhaseBoundaryPlayer
 * @property {string} id
 * @property {string} displayName
 */

/**
 * @typedef {object} PhaseBoundaryPayload
 * @property {string} roomId
 * @property {string} gameType
 * @property {string} phase
 * @property {number | null} roundNumber
 * @property {number | null} stateVersion
 * @property {PhaseBoundaryPlayer[]} players
 * @property {object | null} enginePublic
 * @property {number} occurredAt
 */

/**
 * @typedef {object} PersistenceAdapter
 * @property {(payload: PhaseBoundaryPayload) => void | Promise<void>} onPhaseBoundary
 */

/** @returns {PersistenceAdapter} */
export function createNoopPersistenceAdapter() {
	return {
		async onPhaseBoundary() {},
	};
}
