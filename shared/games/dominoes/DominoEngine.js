/**
 * DominoEngine — Authoritative Block Dominoes (Double-Six)
 * Supports FFA and 2v2 team mode with match scoring to a configurable cap.
 */

import { cryptoRandomInt, fisherYatesShuffle } from "./random.js";

/** @typedef {{ left: number, right: number }} Tile */
/** @typedef {{ tile: Tile, isDouble: boolean, displayLeft: number, displayRight: number }} BoardTile */
/** @typedef {{ scoreCap: number, mode: 'ffa' | '2v2', handSize: number }} MatchSettings */

export function createTileSet() {
	/** @type {Tile[]} */
	const tiles = [];
	for (let i = 0; i <= 6; i++) {
		for (let j = i; j <= 6; j++) {
			tiles.push({ left: i, right: j });
		}
	}
	return tiles;
}

export function shuffle(arr) {
	return fisherYatesShuffle(arr);
}

/** @param {{ tile: Tile, end: 'left' | 'right' }[]} moves */
export function pickHighestValueMove(moves) {
	if (!moves.length) return null;
	let best = moves[0];
	let bestPips = tilePips(best.tile);
	for (let i = 1; i < moves.length; i++) {
		const m = moves[i];
		const pips = tilePips(m.tile);
		if (
			pips > bestPips ||
			(pips === bestPips && m.end === "right" && best.end !== "right")
		) {
			best = m;
			bestPips = pips;
		}
	}
	return best;
}

export function tilePips(tile) {
	return tile.left + tile.right;
}

export function tilesEqual(a, b) {
	return a.left === b.left && a.right === b.right;
}

export function findTileIndex(hand, tile) {
	return hand.findIndex(
		(t) =>
			(t.left === tile.left && t.right === tile.right) ||
			(t.left === tile.right && t.right === tile.left),
	);
}

export class DominoEngine {
	/**
	 * @param {string[]} playerIds
	 * @param {Partial<MatchSettings>} settings
	 */
	constructor(playerIds, settings = {}) {
		if (playerIds.length < 2 || playerIds.length > 4) {
			throw new Error("Dominoes requires 2–4 players");
		}

		this.playerIds = [...playerIds];
		this.settings = {
			scoreCap: settings.scoreCap ?? 100,
			mode: settings.mode ?? "ffa",
			handSize: settings.handSize ?? 7,
		};

		if (this.settings.mode === "2v2" && playerIds.length !== 4) {
			throw new Error("2v2 Team Mode requires exactly 4 players");
		}

		/** @type {Record<string, 'team1' | 'team2'>} */
		this.teamIds = {};
		if (this.settings.mode === "2v2") {
			for (let i = 0; i < playerIds.length; i++) {
				this.teamIds[playerIds[i]] = i % 2 === 0 ? "team1" : "team2";
			}
		}

		this.hands = /** @type {Record<string, Tile[]>} */ ({});
		this.boneyard = /** @type {Tile[]} */ ([]);
		/** @type {BoardTile[]} */
		this.board = [];
		this.currentPlayerIndex = 0;
		/** @type {'playing' | 'round_over' | 'match_over'} */
		this.phase = "playing";
		this.roundWinnerId = null;
		this.matchWinnerId = null;
		this.lastAction = null;
		this.consecutivePasses = 0;
		/** @type {Record<string, number>} */
		this.matchScores = {};
		this.roundNumber = 1;
		this.turnStartedAt = Date.now();
		this.turnTimerPaused = false;
		this.turnTimerPausedAt = null;
		this.turnTimerRemainingMs = 30000;

		this._initMatchScores();
		this._startRound();
		this._processAutoPassChain();
	}

	_initMatchScores() {
		if (this.settings.mode === "2v2") {
			this.matchScores = { team1: 0, team2: 0 };
		} else {
			for (const id of this.playerIds) {
				this.matchScores[id] = 0;
			}
		}
	}

	_startRound() {
		this.hands = {};
		this.boneyard = [];
		this.board = [];
		this.consecutivePasses = 0;
		this.roundWinnerId = null;
		this.lastAction = null;
		this.phase = "playing";
		this._deal();
		this._determineFirstPlayer();
		this.turnStartedAt = Date.now();
		this.turnTimerRemainingMs = 30000;
		this.turnTimerPaused = false;
	}

	/** Deal fixed hand size (7 tiles per player). */
	_deal() {
		const deck = shuffle(createTileSet());
		for (const id of this.playerIds) {
			this.hands[id] = deck.splice(0, this.settings.handSize);
		}
		this.boneyard = deck;
	}

	_determineFirstPlayer() {
		let bestDouble = -1;
		let bestPlayerIndex = 0;

		for (let i = 0; i < this.playerIds.length; i++) {
			const id = this.playerIds[i];
			for (const tile of this.hands[id]) {
				if (tile.left === tile.right && tile.left > bestDouble) {
					bestDouble = tile.left;
					bestPlayerIndex = i;
				}
			}
		}

		this.currentPlayerIndex = bestPlayerIndex;
		this.turnStartedAt = Date.now();
	}

	/** @returns {string} */
	get currentPlayerId() {
		return this.playerIds[this.currentPlayerIndex];
	}

	/** @returns {{ left: number, right: number } | null} */
	getOpenEnds() {
		if (this.board.length === 0) return null;
		const first = this.board[0];
		const last = this.board[this.board.length - 1];
		return { left: first.displayLeft, right: last.displayRight };
	}

	canPlayOnEnd(tile, end) {
		if (this.board.length === 0) return true;
		const openEnds = this.getOpenEnds();
		if (!openEnds) return false;
		const target = end === "left" ? openEnds.left : openEnds.right;
		return tile.left === target || tile.right === target;
	}

	getValidMoves(playerId) {
		const hand = this.hands[playerId];
		if (!hand) return [];

		/** @type {{ tile: Tile, end: 'left' | 'right' }[]} */
		const moves = [];

		if (this.board.length === 0) {
			for (const tile of hand) {
				moves.push({ tile, end: "left" });
			}
			return moves;
		}

		for (const tile of hand) {
			if (this.canPlayOnEnd(tile, "left")) {
				moves.push({ tile, end: "left" });
			}
			if (this.canPlayOnEnd(tile, "right")) {
				if (!moves.some((m) => tilesEqual(m.tile, tile) && m.end === "right")) {
					moves.push({ tile, end: "right" });
				}
			}
		}

		return moves;
	}

	_placeTile(tile, end) {
		const isDouble = tile.left === tile.right;

		if (this.board.length === 0) {
			this.board.push({
				tile: { ...tile },
				isDouble,
				displayLeft: tile.left,
				displayRight: tile.right,
			});
			return;
		}

		const openEnds = this.getOpenEnds();
		if (!openEnds) return;

		if (end === "right") {
			const target = openEnds.right;
			let displayLeft;
			let displayRight;
			if (tile.left === target) {
				displayLeft = tile.left;
				displayRight = tile.right;
			} else {
				displayLeft = tile.right;
				displayRight = tile.left;
			}
			this.board.push({
				tile: { ...tile },
				isDouble,
				displayLeft,
				displayRight,
			});
		} else {
			const target = openEnds.left;
			let displayLeft;
			let displayRight;
			if (tile.right === target) {
				displayLeft = tile.left;
				displayRight = tile.right;
			} else {
				displayLeft = tile.right;
				displayRight = tile.left;
			}
			this.board.unshift({
				tile: { ...tile },
				isDouble,
				displayLeft,
				displayRight,
			});
		}
	}

	playMove(playerId, tile, end) {
		if (this.phase !== "playing") {
			return { success: false, error: "Round is not in progress" };
		}

		if (playerId !== this.currentPlayerId) {
			return { success: false, error: "Not your turn" };
		}

		const hand = this.hands[playerId];
		if (!hand) {
			return { success: false, error: "Invalid player" };
		}
		const idx = findTileIndex(hand, tile);
		if (idx === -1) {
			return { success: false, error: "Tile not in your hand" };
		}

		const actualTile = hand[idx];

		if (this.board.length > 0 && !this.canPlayOnEnd(actualTile, end)) {
			return { success: false, error: "Tile does not match the open end" };
		}

		hand.splice(idx, 1);
		this._placeTile(actualTile, end);
		this.consecutivePasses = 0;
		this.lastAction = { type: "play", playerId, tile: actualTile, end };

		if (hand.length === 0) {
			this._finishRound(playerId, "domino");
			return { success: true };
		}

		this._advanceTurn();
		this._processAutoPassChain();
		return { success: true };
	}

	drawTile(playerId) {
		if (this.phase !== "playing") {
			return { success: false, error: "Round is not in progress" };
		}

		if (playerId !== this.currentPlayerId) {
			return { success: false, error: "Not your turn" };
		}

		const hand = this.hands[playerId];
		if (!hand) {
			return { success: false, error: "Invalid player" };
		}

		if (this.boneyard.length === 0) {
			return { success: false, error: "Boneyard is empty" };
		}

		const drawIndex = cryptoRandomInt(this.boneyard.length);
		const drawn = this.boneyard.splice(drawIndex, 1)[0];
		hand.push(drawn);
		this.lastAction = { type: "draw", playerId, tile: drawn };
		this.consecutivePasses = 0;

		const moves = this.getValidMoves(playerId);
		if (moves.length === 0 && this.boneyard.length === 0) {
			return this.passTurn(playerId);
		}

		this.turnStartedAt = Date.now();
		return { success: true, drawn };
	}

	passTurn(playerId) {
		if (this.phase !== "playing") {
			return { success: false, error: "Round is not in progress" };
		}

		if (playerId !== this.currentPlayerId) {
			return { success: false, error: "Not your turn" };
		}

		const moves = this.getValidMoves(playerId);
		if (moves.length > 0) {
			return { success: false, error: "You have valid moves" };
		}

		if (this.boneyard.length > 0) {
			return { success: false, error: "You must draw from the boneyard first" };
		}

		this.lastAction = { type: "pass", playerId, auto: false };
		this.consecutivePasses += 1;

		if (this.consecutivePasses >= this.playerIds.length) {
			this._finishBlocked();
			return { success: true };
		}

		this._advanceTurn();
		this._processAutoPassChain();
		return { success: true };
	}

	/** Auto-pass when blocked with empty boneyard; chain until someone can play or table locks. */
	_processAutoPassChain() {
		if (this.phase !== "playing") return;

		let safety = 0;
		while (this.phase === "playing" && safety < this.playerIds.length + 1) {
			safety += 1;
			const playerId = this.currentPlayerId;
			const moves = this.getValidMoves(playerId);

			if (moves.length > 0) break;
			if (this.boneyard.length > 0) break;

			this.lastAction = { type: "pass", playerId, auto: true };
			this.consecutivePasses += 1;

			if (this.consecutivePasses >= this.playerIds.length) {
				this._finishBlocked();
				return;
			}

			this.currentPlayerIndex =
				(this.currentPlayerIndex + 1) % this.playerIds.length;
			this.turnStartedAt = Date.now();
			this.turnTimerRemainingMs = 30000;
		}
	}

	/**
	 * Rule-based autoplay: highest-pip valid tile, draw while boneyard has tiles,
	 * pass only when no legal moves and boneyard is empty. Uses only this player's hand.
	 */
	autoPlay(playerId) {
		if (this.phase !== "playing" || playerId !== this.currentPlayerId) {
			return { success: false };
		}

		const moves = this.getValidMoves(playerId);
		if (moves.length > 0) {
			const pick = pickHighestValueMove(moves);
			if (!pick) return { success: false };
			return this.playMove(playerId, pick.tile, pick.end);
		}

		if (this.boneyard.length > 0) {
			return this.drawTile(playerId);
		}

		return this.passTurn(playerId);
	}

	_advanceTurn() {
		this.currentPlayerIndex =
			(this.currentPlayerIndex + 1) % this.playerIds.length;
		this.turnStartedAt = Date.now();
		this.turnTimerRemainingMs = 30000;
	}

	_handPips(playerId) {
		let pips = 0;
		for (const tile of this.hands[playerId]) {
			pips += tilePips(tile);
		}
		return pips;
	}

	_calculateRoundPoints(winnerId) {
		if (this.settings.mode === "2v2") {
			const winTeam = this.teamIds[winnerId];
			let total = 0;
			for (const id of this.playerIds) {
				if (this.teamIds[id] === winTeam) continue;
				total += this._handPips(id);
			}
			return total;
		}

		let total = 0;
		for (const id of this.playerIds) {
			if (id === winnerId) continue;
			total += this._handPips(id);
		}
		return total;
	}

	_checkMatchWinner(winnerId) {
		if (this.settings.mode === "2v2") {
			const winTeam = this.teamIds[winnerId];
			if ((this.matchScores[winTeam] ?? 0) >= this.settings.scoreCap) {
				this.matchWinnerId = winTeam;
				this.phase = "match_over";
				return;
			}
		} else if ((this.matchScores[winnerId] ?? 0) >= this.settings.scoreCap) {
			this.matchWinnerId = winnerId;
			this.phase = "match_over";
			return;
		}

		this.phase = "round_over";
	}

	/**
	 * @param {string} winnerId
	 * @param {'domino' | 'blocked'} reason
	 */
	_finishRound(winnerId, reason) {
		this.roundWinnerId = winnerId;
		const points = this._calculateRoundPoints(winnerId);

		if (this.settings.mode === "2v2") {
			const winTeam = this.teamIds[winnerId];
			this.matchScores[winTeam] = (this.matchScores[winTeam] || 0) + points;
		} else {
			this.matchScores[winnerId] = (this.matchScores[winnerId] || 0) + points;
		}

		this.lastAction = {
			type: "gameover",
			winnerId,
			reason,
			points,
			roundNumber: this.roundNumber,
		};

		this._checkMatchWinner(winnerId);
	}

	_finishBlocked() {
		if (this.settings.mode === "2v2") {
			/** @type {Record<'team1' | 'team2', number>} */
			const teamPips = { team1: 0, team2: 0 };
			for (const id of this.playerIds) {
				teamPips[this.teamIds[id]] += this._handPips(id);
			}

			let winnerTeam = teamPips.team1 <= teamPips.team2 ? "team1" : "team2";
			if (teamPips.team1 === teamPips.team2) {
				winnerTeam = "team1";
			}

			const winnerId =
				this.playerIds.find((id) => this.teamIds[id] === winnerTeam) ??
				this.playerIds[0];
			this._finishRound(winnerId, "blocked");
			return;
		}

		let lowestPips = Infinity;
		let winnerId = this.playerIds[0];

		for (const id of this.playerIds) {
			const pips = this._handPips(id);
			if (pips < lowestPips) {
				lowestPips = pips;
				winnerId = id;
			}
		}

		this._finishRound(winnerId, "blocked");
	}

	startNextRound() {
		if (this.phase !== "round_over") return false;
		this.roundNumber += 1;
		this._startRound();
		this._processAutoPassChain();
		return true;
	}

	pauseTurnTimer() {
		if (this.turnTimerPaused || this.phase !== "playing") return;
		this.turnTimerPaused = true;
		this.turnTimerPausedAt = Date.now();
		const elapsed = Date.now() - this.turnStartedAt;
		this.turnTimerRemainingMs = Math.max(0, 30000 - elapsed);
	}

	resumeTurnTimer() {
		if (!this.turnTimerPaused) return;
		this.turnTimerPaused = false;
		this.turnStartedAt = Date.now() - (30000 - this.turnTimerRemainingMs);
		this.turnTimerPausedAt = null;
	}

	getTurnTimeRemaining() {
		if (this.phase !== "playing") return 0;
		if (this.turnTimerPaused) return this.turnTimerRemainingMs;
		return Math.max(0, 30000 - (Date.now() - this.turnStartedAt));
	}

	getPublicState(viewerId) {
		return {
			phase: this.phase,
			board: this.board.map((b) => ({
				left: b.displayLeft,
				right: b.displayRight,
				isDouble: b.isDouble,
			})),
			openEnds: this.getOpenEnds(),
			currentPlayerId: this.currentPlayerId,
			playerIds: this.playerIds,
			myHand: this.hands[viewerId] || [],
			tileCounts: Object.fromEntries(
				this.playerIds.map((id) => [id, this.hands[id].length]),
			),
			boneyardCount: this.boneyard.length,
			matchScores: { ...this.matchScores },
			roundWinnerId: this.roundWinnerId,
			matchWinnerId: this.matchWinnerId,
			roundNumber: this.roundNumber,
			settings: { ...this.settings },
			teamIds: { ...this.teamIds },
			lastAction: this.lastAction,
			turnTimeRemaining: this.getTurnTimeRemaining(),
			turnTimerPaused: this.turnTimerPaused,
		};
	}

	_handsByPlayerForReveal() {
		return Object.fromEntries(
			this.playerIds.map((id) => [id, this.hands[id].map((t) => ({ ...t }))]),
		);
	}

	serializeForPlayer(viewerId) {
		const state = this.getPublicState(viewerId);
		const isPlayer = this.playerIds.includes(viewerId);
		const revealHands =
			this.phase === "round_over" || this.phase === "match_over";
		return {
			phase: state.phase,
			board: state.board,
			openEnds: state.openEnds,
			currentPlayerId: state.currentPlayerId,
			playerIds: state.playerIds,
			myHand: isPlayer ? state.myHand : [],
			...(revealHands ?
				{ handsByPlayer: this._handsByPlayerForReveal() }
			:	{}),
			tileCounts: state.tileCounts,
			boneyardCount: state.boneyardCount,
			matchScores: state.matchScores,
			roundWinnerId: state.roundWinnerId,
			matchWinnerId: state.matchWinnerId,
			roundNumber: state.roundNumber,
			settings: state.settings,
			teamIds: state.teamIds,
			lastAction: this._sanitizeLastAction(state.lastAction, viewerId),
			turnTimeRemaining: state.turnTimeRemaining,
			turnTimerPaused: state.turnTimerPaused,
			validMoves:
				isPlayer &&
				viewerId === this.currentPlayerId &&
				this.phase === "playing" ?
					this.getValidMoves(viewerId).map((m) => ({
						tile: m.tile,
						end: m.end,
					}))
				:	[],
		};
	}

	_sanitizeLastAction(lastAction, viewerId) {
		if (!lastAction) return null;
		if (lastAction.type === "draw" && lastAction.playerId !== viewerId) {
			return { type: "draw", playerId: lastAction.playerId };
		}
		return lastAction;
	}
}
