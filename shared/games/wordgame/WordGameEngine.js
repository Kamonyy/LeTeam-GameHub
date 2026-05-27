/**
 * WordGameEngine — 2-player secret word guessing (voice-chat companion).
 */

import { getLolChampionById, normalizeWordCategory } from "./lol-champions.js";

const MIN_WORD_LENGTH = 2;
const MAX_WORD_LENGTH = 30;
const WORD_PATTERN = /^[\p{L}\p{N}\s'-]+$/u;

export class WordGameEngine {
	/**
	 * @param {string[]} playerIds — exactly 2
	 * @param {{ pointsToWin?: number, wordCategory?: string }} [settings]
	 */
	constructor(playerIds, settings = {}) {
		if (playerIds.length !== 2) {
			throw new Error("Secret Word requires exactly 2 players");
		}

		const cap = Number(settings.pointsToWin);
		this.pointsToWin = Number.isInteger(cap) && cap >= 1 && cap <= 99 ? cap : 5;
		this.wordCategory = normalizeWordCategory(settings.wordCategory);

		this.playerIds = [...playerIds];
		/** @type {'setup' | 'playing' | 'round_end' | 'match_over'} */
		this.phase = "setup";
		/** Words each player must guess: keyed by guesser id */
		this.wordsForGuesser = /** @type {Record<string, string>} */ ({});
		/** LoL champion ids for guesser (lol-champions mode) */
		this.championIdsForGuesser = /** @type {Record<string, string>} */ ({});
		/** @type {Record<string, boolean>} */
		this.submitted = {};
		/** @type {Record<string, number>} */
		this.scores = {};
		this.roundNumber = 1;
		this.lastAction = null;
		this.winnerId = null;

		for (const id of playerIds) {
			this.scores[id] = 0;
			this.submitted[id] = false;
		}
	}

	/** @param {string} playerId */
	_opponentId(playerId) {
		return this.playerIds.find((id) => id !== playerId);
	}

	/** @param {string} raw */
	_normalizeWord(raw) {
		return raw.trim().replace(/\s+/g, " ");
	}

	/** @param {string} word */
	_validateWord(word) {
		if (word.length < MIN_WORD_LENGTH || word.length > MAX_WORD_LENGTH) {
			return `Word must be ${MIN_WORD_LENGTH}–${MAX_WORD_LENGTH} characters`;
		}
		if (!WORD_PATTERN.test(word)) {
			return "Word may only contain letters, numbers, spaces, hyphens, and apostrophes";
		}
		return null;
	}

	/**
	 * @param {string} creatorId
	 * @param {string | { word?: string, championId?: string }} payload
	 */
	submitWord(creatorId, payload) {
		if (this.phase !== "setup") {
			return { success: false, error: "Not in word selection phase" };
		}

		if (!this.playerIds.includes(creatorId)) {
			return { success: false, error: "Invalid player" };
		}

		if (this.submitted[creatorId]) {
			return { success: false, error: "You already submitted a word" };
		}

		const guesserId = this._opponentId(creatorId);
		let secretWord = "";
		let championId = null;

		if (this.wordCategory === "lol-champions") {
			const id =
				typeof payload === "object" && payload !== null ?
					payload.championId
				:	null;
			if (!id || typeof id !== "string") {
				return { success: false, error: "Select a champion" };
			}
			const champ = getLolChampionById(id);
			if (!champ) {
				return { success: false, error: "Invalid champion" };
			}
			secretWord = champ.name;
			championId = champ.id;
		} else {
			const raw =
				typeof payload === "string" ? payload
				: typeof payload === "object" && payload !== null ? payload.word
				: "";
			if (typeof raw !== "string" || !raw.trim()) {
				return { success: false, error: "Word is required" };
			}
			const normalized = this._normalizeWord(raw);
			const validationError = this._validateWord(normalized);
			if (validationError) {
				return { success: false, error: validationError };
			}
			secretWord = normalized;
		}

		this.wordsForGuesser[guesserId] = secretWord;
		if (championId) {
			this.championIdsForGuesser[guesserId] = championId;
		}
		this.submitted[creatorId] = true;
		this.lastAction = { type: "word_submitted", playerId: creatorId };

		const allSubmitted = this.playerIds.every((id) => this.submitted[id]);
		if (allSubmitted) {
			this.phase = "playing";
			this.lastAction = { type: "round_start", roundNumber: this.roundNumber };
		}

		return { success: true };
	}

	/**
	 * Word creator confirms their opponent guessed correctly.
	 * @param {string} creatorId
	 */
	confirmGuessed(creatorId) {
		if (this.phase !== "playing") {
			return { success: false, error: "Not in active guessing phase" };
		}

		if (!this.playerIds.includes(creatorId)) {
			return { success: false, error: "Invalid player" };
		}

		const guesserId = this._opponentId(creatorId);
		const revealedWord = this.wordsForGuesser[guesserId];
		const revealedChampionId =
			this.championIdsForGuesser[guesserId] ?? null;

		if (!revealedWord) {
			return { success: false, error: "Word not found" };
		}

		this.scores[guesserId] = (this.scores[guesserId] || 0) + 1;

		const revealMeta = {
			word: revealedWord,
			...(revealedChampionId ? { championId: revealedChampionId } : {}),
		};

		if (this.scores[guesserId] >= this.pointsToWin) {
			this.winnerId = guesserId;
			this.phase = "match_over";
			this.lastAction = {
				type: "match_won",
				winnerId: guesserId,
				guesserId,
				roundNumber: this.roundNumber,
				...revealMeta,
			};
		} else {
			this.phase = "round_end";
			this.lastAction = {
				type: "word_guessed",
				guesserId,
				creatorId,
				roundNumber: this.roundNumber,
				...revealMeta,
			};
		}

		return { success: true };
	}

	startNextRound() {
		if (this.phase !== "round_end") return false;

		this.roundNumber += 1;
		this.wordsForGuesser = {};
		this.championIdsForGuesser = {};
		this.submitted = {};
		for (const id of this.playerIds) {
			this.submitted[id] = false;
		}
		this.phase = "setup";
		this.lastAction = { type: "round_reset", roundNumber: this.roundNumber };
		return true;
	}

	_revealedFromLastAction() {
		if (
			this.phase !== "round_end" &&
			this.phase !== "match_over"
		) {
			return { word: null, championId: null };
		}
		if (
			this.lastAction?.type !== "word_guessed" &&
			this.lastAction?.type !== "match_won"
		) {
			return { word: null, championId: null };
		}
		return {
			word: this.lastAction.word ?? null,
			championId: this.lastAction.championId ?? null,
		};
	}

	/**
	 * @param {string} viewerId
	 */
	serializeForPlayer(viewerId) {
		const opponentId = this._opponentId(viewerId);
		const { word: revealedWord, championId: revealedChampionId } =
			this._revealedFromLastAction();

		const myChosenWord =
			this.submitted[viewerId] && this.wordsForGuesser[opponentId] ?
				this.wordsForGuesser[opponentId]
			:	null;

		const myChosenChampionId =
			this.submitted[viewerId] && this.championIdsForGuesser[opponentId] ?
				this.championIdsForGuesser[opponentId]
			:	null;

		return {
			gameType: "wordgame",
			phase: this.phase,
			playerIds: this.playerIds,
			scores: { ...this.scores },
			pointsToWin: this.pointsToWin,
			wordCategory: this.wordCategory,
			roundNumber: this.roundNumber,
			iHaveSubmitted: !!this.submitted[viewerId],
			opponentHasSubmitted: !!this.submitted[opponentId],
			myChosenWord,
			myChosenChampionId,
			revealedWord,
			revealedChampionId,
			winnerId: this.winnerId,
			lastGuesserId:
				(
					this.lastAction?.type === "word_guessed" ||
					this.lastAction?.type === "match_won"
				) ?
					(this.lastAction.guesserId ?? this.lastAction.winnerId)
				:	null,
			canConfirmGuessed: this.phase === "playing",
			lastAction: this.lastAction,
		};
	}
}
