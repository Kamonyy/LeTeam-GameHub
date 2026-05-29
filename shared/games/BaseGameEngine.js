/**
 * BaseGameEngine — shared state, timers, and serialization contract for all game engines.
 *
 * Spectator baseline: docs/architecture/platform-spectator-contract.md
 * — serializeBase: symmetric public shell only
 * — serializeForPlayer / serializeForSpectator: override any asymmetric base fields
 */

export class BaseGameEngine {
	/** @type {string[]} */
	static TRANSIENT_KEYS = [
		"canvasBuffer",
		"canvasUndoStack",
		"canvasRedoStack",
	];

	/**
	 * @param {string[]} playerIds
	 * @param {object} [_settings]
	 */
	constructor(playerIds, _settings = {}) {
		this.roomId = null;
		this.playerIds = [...new Set(playerIds)];
		/** @type {Map<string, { id: string, index: number }>} */
		this.players = new Map();
		/** @type {string} */
		this.phase = "setup";
		this.roundNumber = 1;
		/** @type {Record<string, { endsAt?: number, timeoutRef?: ReturnType<typeof setTimeout>, onExpire?: () => void }>} */
		this.timers = {};
		/** @type {Array<{ at: number, message: string }>} */
		this.eventLog = [];
		this.stateVersion = 0;
		this.lastAction = null;

		this.playerIds.forEach((id, i) => {
			this.players.set(id, { id, index: i });
		});
	}

	/** @param {string} playerId */
	addPlayer(playerId) {
		if (this.players.has(playerId)) return;
		const index = this.playerIds.length;
		this.playerIds.push(playerId);
		this.players.set(playerId, { id: playerId, index });
	}

	/** @param {string} playerId */
	removePlayer(playerId) {
		if (!this.players.has(playerId)) return;
		this.players.delete(playerId);
		this.playerIds = this.playerIds.filter((id) => id !== playerId);
		this.playerIds.forEach((id, i) => {
			const entry = this.players.get(id);
			if (entry) entry.index = i;
		});
	}

	/** @param {string} _viewerId */
	serializeForPlayer(_viewerId) {
		throw new Error(
			`${this.constructor.name} must override serializeForPlayer()`,
		);
	}

	/**
	 * Symmetric public shell only — see docs/architecture/platform-spectator-contract.md.
	 * Asymmetric or secret fields must be overridden in serializeForPlayer and
	 * serializeForSpectator (or non-player branch), never leaked via spread alone.
	 * @param {string} [_viewerId]
	 */
	serializeBase(_viewerId) {
		return {
			stateVersion: this.stateVersion,
			phase: this.phase,
			roundNumber: this.roundNumber,
			playerIds: this.playerIds,
			lastAction: this.lastAction,
		};
	}

	nextTurn() {
		throw new Error(`${this.constructor.name} must override nextTurn()`);
	}

	/**
	 * @param {string} key
	 * @param {number} durationMs
	 * @param {() => void} onExpire
	 */
	startTimeout(key, durationMs, onExpire) {
		if (this.timers[key]?.timeoutRef) {
			clearTimeout(this.timers[key].timeoutRef);
		}
		const endsAt = Date.now() + durationMs;
		const timeoutRef = setTimeout(() => {
			onExpire();
			this._bumpStateVersion();
		}, durationMs);
		this.timers[key] = { endsAt, timeoutRef, onExpire };
	}

	/** @param {string} key */
	clearTimeout(key) {
		const t = this.timers[key];
		if (t?.timeoutRef) clearTimeout(t.timeoutRef);
		delete this.timers[key];
	}

	/** @param {string} key */
	getRemainingMs(key) {
		const t = this.timers[key];
		return t?.endsAt ? Math.max(0, t.endsAt - Date.now()) : 0;
	}

	teardown() {
		for (const key of Object.keys(this.timers)) {
			this.clearTimeout(key);
		}
		this.timers = {};
	}

	_bumpStateVersion() {
		this.stateVersion += 1;
	}
}
