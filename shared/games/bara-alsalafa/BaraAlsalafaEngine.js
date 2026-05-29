/**
 * BaraAlsalafaEngine — برا السالفة (Out of the Loop) social deduction party game.
 */

import { BaseGameEngine } from "../BaseGameEngine.js";
import { shuffleInPlace } from "../utils/shuffle.js";
import { getPhaseRemainingMs as getPhaseRemainingMsUtil } from "../utils/phaseTimer.js";
import {
	getCategoryPackage,
	normalizeCategoryPackageIds,
	formatCategoryNamesAr,
	pickRandomWords,
} from "./categories/index.js";
import { BARA_INTERROGATION_MS } from "./timing.js";
import {
	applyBaraRoundScoring,
	isBaraMatchOver,
	resolveBaraMatchWinnerId,
} from "./scoring.js";

/** @typedef {'reveal'|'ready'|'interrogation'|'voting'|'defend'|'revote'|'outcast_guess'|'round_end'|'match_over'} BaraPhase */

const OUTCAST_MESSAGE = "انت برا السالفة";

/**
 * @param {string[]} playerIds
 * @param {{ categoryPackageIds?: string[], categoryPackageId?: string, roundsToWin?: number }} [settings]
 */
export class BaraAlsalafaEngine extends BaseGameEngine {
	constructor(playerIds, settings = {}) {
		if (playerIds.length < 3 || playerIds.length > 12) {
			throw new Error("برا السالفة requires 3–12 players");
		}

		super(playerIds, settings);

		const rounds = Number(settings.roundsToWin);
		this.roundsToWin =
			Number.isInteger(rounds) && rounds >= 1 && rounds <= 10 ? rounds : 3;

		this.hostId =
			typeof settings.hostId === "string" && settings.hostId ?
				settings.hostId
			:	null;
		this.categoryPackageIds = normalizeCategoryPackageIds(settings);
		/** @type {string | null} — category used for the current round */
		this.activeCategoryId = null;
		this.secretWord = "";
		this.outcastId = null;
		this.interviewerIndex = 0;
		/** @type {{ interviewerId: string, targetId: string }[]} */
		this.interrogationQueue = [];
		this.interrogationStepIndex = 0;
		/** @type {Set<string>} */
		this.voteEndRequests = new Set();
		this.currentInterviewerId = null;
		this.currentTargetId = null;
		this.phaseEndsAt = null;
		this.tiedPlayerIds = [];
		/** @type {boolean} — interrogation rounds before revote when vote is tied */
		this.isTiebreak = false;
		/** @type {string[]} — six options (one correct) for outcast multiple-choice guess */
		this.outcastGuessOptions = [];
		/** @type {'choices' | 'free'} */
		this.outcastGuessMode = "choices";
		this.votes = /** @type {Record<string, string>} */ ({});
		this.eliminatedThisRound = null;
		this.roundOutcome = null;
		this._roundScoringApplied = false;
		/** @type {Record<string, number>} — in-round points (display / tie-breaker) */
		this.scores = {};
		/** @type {Record<string, number>} — personal round wins (outcast only) */
		this.roundWins = {};
		/** Team round victories — insiders vs outcast toward roundsToWin */
		this.insiderRoundWins = 0;
		this.outcastRoundWins = 0;
		/** @type {Record<string, { roleRevealed: boolean, microStatus: string, eliminated: boolean }>} */
		this.playerMeta = {};

		for (const id of this.playerIds) {
			this.scores[id] = 0;
			this.roundWins[id] = 0;
			this.playerMeta[id] = {
				roleRevealed: false,
				ready: false,
				microStatus: "waiting_reveal",
				eliminated: false,
			};
		}

		this._startRound();
	}

	_invalidateActiveCaches() {
		this._activePlayerIdSet = null;
	}

	_recomputeActiveSet() {
		this._activePlayerIdSet = new Set(
			this.playerIds.filter((id) => !this.playerMeta[id]?.eliminated),
		);
	}

	_activePlayerIds() {
		if (!this._activePlayerIdSet) this._recomputeActiveSet();
		return [...this._activePlayerIdSet];
	}

	_pickSecretAndOutcast() {
		const catId =
			this.categoryPackageIds[
				Math.floor(Math.random() * this.categoryPackageIds.length)
			];
		this.activeCategoryId = catId;
		const pkg = getCategoryPackage(catId);
		if (!pkg) throw new Error("حزمة فئات غير صالحة");

		const active = this._activePlayerIds();
		const wordPool = pkg.words;
		this.secretWord = wordPool[Math.floor(Math.random() * wordPool.length)];
		this.outcastId = active[Math.floor(Math.random() * active.length)];
	}

	_startRound() {
		this.phase = "reveal";
		this.phaseEndsAt = null;
		this.votes = {};
		this.tiedPlayerIds = [];
		this.isTiebreak = false;
		this.outcastGuessOptions = [];
		this.outcastGuessMode = "choices";
		this.eliminatedThisRound = null;
		this.roundOutcome = null;
		this._roundScoringApplied = false;
		this.interviewerIndex = 0;
		this.interrogationQueue = [];
		this.interrogationStepIndex = 0;
		this.voteEndRequests = new Set();

		this._invalidateActiveCaches();
		for (const id of this.playerIds) {
			this.playerMeta[id].eliminated = false;
			this.playerMeta[id].roleRevealed = false;
			this.playerMeta[id].ready = false;
			this.playerMeta[id].microStatus = "waiting_reveal";
		}

		this._pickSecretAndOutcast();
		this.lastAction = { type: "round_start", roundNumber: this.roundNumber };
	}

	_voteEndThreshold() {
		const n = this._activePlayerIds().length;
		return Math.max(2, Math.ceil((n * 2) / 3));
	}

	_voteEndThresholdMet() {
		return this.voteEndRequests.size >= this._voteEndThreshold();
	}

	/** Random turn order for this round (shuffled ring of question pairs). */
	_buildInterrogationQueue() {
		const active = shuffleInPlace([...this._activePlayerIds()]);
		const n = active.length;
		/** @type {{ interviewerId: string, targetId: string }[]} */
		const queue = [];
		for (let i = 0; i < n; i++) {
			const interviewer = active[i];
			const target = active[(i + 1) % n];
			if (interviewer !== target) {
				queue.push({ interviewerId: interviewer, targetId: target });
			}
		}
		this.interrogationQueue = shuffleInPlace(queue);
		this.interrogationStepIndex = 0;
	}

	_setInterrogationPair() {
		if (this.interrogationQueue.length === 0) {
			this._buildInterrogationQueue();
		}
		if (this.interrogationQueue.length === 0) return;

		const step =
			this.interrogationQueue[
				this.interrogationStepIndex % this.interrogationQueue.length
			];
		const interviewer = step.interviewerId;
		const target = step.targetId;
		const active = this._activePlayerIds();

		this.currentInterviewerId = interviewer;
		this.currentTargetId = target;
		this.phaseEndsAt = Date.now() + BARA_INTERROGATION_MS;

		for (const id of active) {
			if (this.voteEndRequests.has(id)) {
				this.playerMeta[id].microStatus = "vote_requested";
			} else if (id !== interviewer && id !== target) {
				this.playerMeta[id].microStatus = "thinking";
			}
		}
		this.playerMeta[interviewer].microStatus = "thinking";
		this.playerMeta[target].microStatus = "thinking";
	}

	_enterReady() {
		this.phase = "ready";
		this.phaseEndsAt = null;
		const active = this._activePlayerIds();
		for (const id of active) {
			this.playerMeta[id].ready = false;
			if (this.playerMeta[id].roleRevealed) {
				this.playerMeta[id].microStatus = "role_revealed";
			}
		}
		this.lastAction = { type: "ready_phase_start" };
	}

	_enterInterrogation() {
		this.phase = "interrogation";
		this.interviewerIndex = 0;
		this.voteEndRequests = new Set();
		this._buildInterrogationQueue();
		this._setInterrogationPair();
		this.lastAction = { type: "interrogation_start" };
	}

	_enterVoting() {
		this.phase = "voting";
		this.phaseEndsAt = null;
		this.votes = {};
		this.tiedPlayerIds = [];
		const active = this._activePlayerIds();
		for (const id of active) {
			this.playerMeta[id].microStatus = "thinking";
		}
		this.lastAction = { type: "voting_start" };
	}

	_allRevealed() {
		return this._activePlayerIds().every(
			(id) => this.playerMeta[id].roleRevealed,
		);
	}

	_allReady() {
		return this._activePlayerIds().every((id) => this.playerMeta[id].ready);
	}

	_voteCount() {
		return Object.keys(this.votes).length;
	}

	_tallyVotes() {
		/** @type {Record<string, number>} */
		const counts = {};
		for (const targetId of Object.values(this.votes)) {
			counts[targetId] = (counts[targetId] || 0) + 1;
		}
		const entries = Object.entries(counts);
		if (entries.length === 0) return { top: [], maxVotes: 0 };

		const maxVotes = Math.max(...entries.map(([, c]) => c));
		const top = entries.filter(([, c]) => c === maxVotes).map(([id]) => id);
		return { top, maxVotes };
	}

	/** Active players who may cast a ballot during revote. */
	_revoteVoterIds() {
		if (!this._activePlayerIdSet) this._recomputeActiveSet();
		const activeSet = this._activePlayerIdSet;
		const tiedSet = new Set(
			this.tiedPlayerIds.filter((id) => activeSet.has(id)),
		);
		if (tiedSet.size === 0) return [...activeSet];

		const nonTiedVoters = [...activeSet].filter((id) => !tiedSet.has(id));
		if (nonTiedVoters.length > 0) return nonTiedVoters;
		return [...activeSet];
	}

	/** @param {string} voterId */
	_revoteAllowedTargets(voterId) {
		if (!this._activePlayerIdSet) this._recomputeActiveSet();
		const tied = this.tiedPlayerIds.filter(
			(id) => this._activePlayerIdSet.has(id) && id !== voterId,
		);
		return tied;
	}

	/** One random question per tied player before revote. */
	_buildTiebreakQueue(tiedIds) {
		const active = this._activePlayerIds();
		const shuffledTied = shuffleInPlace(
			tiedIds.filter((id) => active.includes(id)),
		);
		/** @type {{ interviewerId: string, targetId: string }[]} */
		const queue = [];
		for (const targetId of shuffledTied) {
			const pool = active.filter((id) => id !== targetId);
			if (pool.length === 0) continue;
			const interviewerId = pool[Math.floor(Math.random() * pool.length)];
			queue.push({ interviewerId, targetId });
		}
		this.interrogationQueue = queue;
		this.interrogationStepIndex = 0;
	}

	_enterTiebreak(top) {
		this.isTiebreak = true;
		this.tiedPlayerIds = top;
		this.phase = "interrogation";
		this.voteEndRequests = new Set();
		this.votes = {};
		this._buildTiebreakQueue(top);

		if (this.interrogationQueue.length === 0) {
			this.isTiebreak = false;
			this._enterRevote();
			return { success: true, advancedToRevote: true };
		}

		this._setInterrogationPair();
		this.lastAction = { type: "tiebreak_start", tiedPlayerIds: [...top] };
		return { success: true, tied: true };
	}

	/** Six shuffled options — secret + decoys from the active round category only. */
	_buildOutcastGuessOptions() {
		const secret = this.secretWord.trim();
		const pkg = getCategoryPackage(this.activeCategoryId ?? "");
		const pool = [
			...new Set((pkg?.words ?? []).map((w) => w.trim()).filter(Boolean)),
		];

		let others = pool.filter((w) => w !== secret);

		if (others.length > 5) {
			const len = secret.length;
			const slack = Math.max(2, Math.floor(len * 0.3));
			const similarLen = others.filter(
				(w) => Math.abs(w.length - len) <= slack,
			);
			if (similarLen.length >= 5) {
				others = similarLen;
			}
		}

		const distractors = pickRandomWords(others, Math.min(5, others.length));

		this.outcastGuessOptions = shuffleInPlace([
			secret,
			...distractors.slice(0, 5),
		]);
		this.outcastGuessMode = "choices";
	}

	_enterOutcastGuess(eliminatedId) {
		this.phase = "outcast_guess";
		this.phaseEndsAt = null;
		this.playerMeta[eliminatedId].microStatus = "role_revealed";
		this._buildOutcastGuessOptions();
		this.roundOutcome = {
			type: "outcast_caught",
			eliminatedId,
			awaitingGuess: true,
		};
		this.lastAction = { type: "outcast_caught", playerId: eliminatedId };
	}

	_enterRevote() {
		this.phase = "revote";
		this.isTiebreak = false;
		this.votes = {};
		this.phaseEndsAt = null;
		this.currentInterviewerId = null;
		this.currentTargetId = null;
		const active = this._activePlayerIds();
		for (const id of active) {
			this.playerMeta[id].microStatus = "thinking";
		}
		this.lastAction = {
			type: "revote_start",
			tiedPlayerIds: [...this.tiedPlayerIds],
		};
	}

	_resolveVoteOutcome() {
		const { top } = this._tallyVotes();

		if (top.length === 0) {
			this._enterVoting();
			return { success: false, error: "لم يُصوَّت أحد" };
		}

		if (top.length > 1) {
			return this._enterTiebreak(top);
		}

		return this._eliminatePlayer(top[0]);
	}

	/**
	 * @param {string} eliminatedId
	 */
	_eliminatePlayer(eliminatedId) {
		this.eliminatedThisRound = eliminatedId;
		const isOutcast = eliminatedId === this.outcastId;

		if (isOutcast) {
			this._enterOutcastGuess(eliminatedId);
			return { success: true, outcastCaught: true };
		}

		this.playerMeta[eliminatedId].eliminated = true;
		this._invalidateActiveCaches();
		this.playerMeta[eliminatedId].microStatus = "role_revealed";
		this.roundOutcome = {
			type: "wrong_accusation",
			eliminatedId,
			innocent: true,
		};
		this.phase = "round_end";
		this.lastAction = {
			type: "wrong_accusation",
			eliminatedId,
			outcastId: this.outcastId,
		};
		this._applyRoundScoring();
		return { success: true, wrongAccusation: true };
	}

	/** @param {string} playerId */
	revealRole(playerId) {
		if (this.phase !== "reveal") {
			return { success: false, error: "ليست مرحلة الكشف" };
		}
		if (!this.playerIds.includes(playerId)) {
			return { success: false, error: "لاعب غير صالح" };
		}
		if (this.playerMeta[playerId].eliminated) {
			return { success: false, error: "اللاعب مُستبعد" };
		}
		if (this.playerMeta[playerId].roleRevealed) {
			return { success: false, error: "كُشفت بطاقتك مسبقاً" };
		}

		this.playerMeta[playerId].roleRevealed = true;
		this.playerMeta[playerId].microStatus = "role_revealed";
		this.lastAction = { type: "role_revealed", playerId };

		if (this._allRevealed()) {
			this._enterReady();
		}

		return { success: true };
	}

	/** @param {string} playerId */
	markReady(playerId) {
		if (this.phase !== "ready") {
			return { success: false, error: "ليست مرحلة الاستعداد" };
		}
		if (!this.playerIds.includes(playerId)) {
			return { success: false, error: "لاعب غير صالح" };
		}
		if (this.playerMeta[playerId].eliminated) {
			return { success: false, error: "اللاعب مُستبعد" };
		}
		if (!this.playerMeta[playerId].roleRevealed) {
			return { success: false, error: "اكشف بطاقتك أولاً" };
		}
		if (this.playerMeta[playerId].ready) {
			return { success: false, error: "أنت جاهز مسبقاً" };
		}

		this.playerMeta[playerId].ready = true;
		this.playerMeta[playerId].microStatus = "ready";
		this.lastAction = { type: "player_ready", playerId };

		if (this._allReady()) {
			this._enterInterrogation();
		}

		return { success: true };
	}

	/** Signal end of interrogation — voting starts at ⅔ of active players. */
	requestVoteEnd(playerId) {
		if (this.phase !== "interrogation") {
			return { success: false, error: "ليست مرحلة الاستجواب" };
		}
		if (this.isTiebreak) {
			return { success: false, error: "لا يمكن طلب التصويت أثناء كسر التعادل" };
		}
		if (!this.playerIds.includes(playerId)) {
			return { success: false, error: "لاعب غير صالح" };
		}
		if (this.playerMeta[playerId].eliminated) {
			return { success: false, error: "المُستبعدون لا يمكنهم التصويت" };
		}
		if (this.voteEndRequests.has(playerId)) {
			return { success: false, error: "طلبت التصويت مسبقاً" };
		}

		this.voteEndRequests.add(playerId);
		this.playerMeta[playerId].microStatus = "vote_requested";
		this.lastAction = { type: "vote_end_requested", playerId };

		if (this._voteEndThresholdMet()) {
			this._enterVoting();
			return { success: true, advancedToVoting: true };
		}

		return { success: true };
	}

	_advanceInterrogationStep(by) {
		if (this.isTiebreak) {
			const nextIndex = this.interrogationStepIndex + 1;
			if (nextIndex >= this.interrogationQueue.length) {
				this._enterRevote();
				return { success: true, advancedToRevote: true };
			}
			this.interrogationStepIndex = nextIndex;
			this._setInterrogationPair();
			this.lastAction = { type: "tiebreak_next", by, step: nextIndex };
			return { success: true };
		}

		if (this._voteEndThresholdMet()) {
			this._enterVoting();
			return { success: true, advancedToVoting: true };
		}

		this.interrogationStepIndex += 1;
		this._setInterrogationPair();
		this.lastAction = { type: "interrogation_next", by };
		return { success: true };
	}

	/** @param {string} actorId — current interviewer may skip to the next pair */
	advanceInterrogation(actorId) {
		if (this.phase !== "interrogation") {
			return { success: false, error: "ليست مرحلة الاستجواب" };
		}
		if (actorId !== this.currentInterviewerId) {
			return {
				success: false,
				error: "فقط السائس الحالي يمكنه تخطي هذه الجولة",
			};
		}

		return this._advanceInterrogationStep(actorId);
	}

	/** Called when interrogation timer expires */
	onInterrogationTimerExpired() {
		if (this.phase !== "interrogation") return { changed: false };
		this._advanceInterrogationStep("system");
		return { changed: true };
	}

	/** @param {string} playerId @param {string} targetId */
	castVote(playerId, targetId) {
		if (this.phase !== "voting" && this.phase !== "revote") {
			return { success: false, error: "ليست مرحلة التصويت" };
		}
		if (!this.playerIds.includes(playerId)) {
			return { success: false, error: "مُصوّت غير صالح" };
		}
		if (this.playerMeta[playerId].eliminated) {
			return { success: false, error: "المُستبعدون لا يمكنهم التصويت" };
		}
		if (this.votes[playerId]) {
			return { success: false, error: "صوّتت مسبقاً" };
		}

		const allowedTargets =
			this.phase === "revote" ?
				this._revoteAllowedTargets(playerId)
			:	this._activePlayerIds();

		if (!allowedTargets.includes(targetId)) {
			return { success: false, error: "هدف التصويت غير صالح" };
		}
		if (targetId === playerId) {
			return { success: false, error: "لا يمكنك التصويت لنفسك" };
		}

		if (this.phase === "revote" && !this._revoteVoterIds().includes(playerId)) {
			return { success: false, error: "لا يمكنك التصويت في إعادة التصويت" };
		}

		this.votes[playerId] = targetId;
		this.playerMeta[playerId].microStatus = "voted";
		this.lastAction = { type: "vote_cast", voterId: playerId, targetId };

		const expectedVotes =
			this.phase === "revote" ?
				this._revoteVoterIds().length
			:	this._activePlayerIds().length;

		if (this._voteCount() >= expectedVotes) {
			if (this.phase === "revote") {
				return this._resolveVoteOutcome();
			}
			return this._resolveVoteOutcome();
		}

		return { success: true };
	}

	onDefendTimerExpired() {
		if (this.phase !== "defend") return { changed: false };
		this._enterRevote();
		return { changed: true };
	}

	/** Outcast skips multiple-choice and types the word directly. */
	enableOutcastFreeGuess(playerId) {
		if (this.phase !== "outcast_guess") {
			return { success: false, error: "ليست مرحلة تخمين برا السالفة" };
		}
		if (playerId !== this.outcastId) {
			return { success: false, error: "فقط برا السالفة يمكنه التخمين" };
		}
		if (this.outcastGuessMode === "free") {
			return { success: false, error: "أنت بالفعل في وضع التخمين الحر" };
		}

		this.outcastGuessMode = "free";
		this.lastAction = { type: "outcast_free_guess_enabled", playerId };
		return { success: true };
	}

	/**
	 * @param {string} playerId
	 * @param {string} guess
	 */
	submitOutcastGuess(playerId, guess) {
		if (this.phase !== "outcast_guess") {
			return { success: false, error: "ليست مرحلة تخمين برا السالفة" };
		}
		if (playerId !== this.outcastId) {
			return { success: false, error: "فقط برا السالفة يمكنه التخمين" };
		}

		const normalized = guess.trim().replace(/\s+/g, " ");
		const secretNorm = this.secretWord.trim();
		const match =
			normalized.localeCompare(secretNorm, "ar", { sensitivity: "base" }) ===
				0 || normalized === secretNorm;

		if (match) {
			this.roundOutcome = {
				type: "outcast_stole_win",
				guess: normalized,
			};
			this.lastAction = { type: "outcast_stole_win", playerId };
		} else {
			this.roundOutcome = {
				type: "insiders_win",
				guess: normalized,
				secretWord: this.secretWord,
			};
			this.lastAction = { type: "insiders_win", playerId };
		}

		this._applyRoundScoring();

		this.phase = "round_end";
		return { success: true, match };
	}

	_applyRoundScoring() {
		if (this._roundScoringApplied) return null;
		this._roundScoringApplied = true;

		const result = applyBaraRoundScoring({
			roundOutcome: this.roundOutcome,
			outcastId: this.outcastId,
			playerIds: this.playerIds,
			scores: this.scores,
			roundWins: this.roundWins,
			insiderRoundWins: this.insiderRoundWins,
			outcastRoundWins: this.outcastRoundWins,
		});
		this.insiderRoundWins = result.insiderRoundWins;
		this.outcastRoundWins = result.outcastRoundWins;
		return result.roundWinnerSide;
	}

	startNextRound() {
		if (this.phase !== "round_end") return false;

		if (
			isBaraMatchOver(
				this.insiderRoundWins,
				this.outcastRoundWins,
				this.roundsToWin,
			)
		) {
			const winnerId = resolveBaraMatchWinnerId(
				this.insiderRoundWins,
				this.outcastRoundWins,
				this.outcastId,
				this.scores,
				this.playerIds,
			);
			this.phase = "match_over";
			this.lastAction = { type: "match_over", winnerId };
			return true;
		}

		this.roundNumber += 1;
		this._startRound();
		return true;
	}

	getPhaseRemainingMs() {
		if (!this.phaseEndsAt) return null;
		return getPhaseRemainingMsUtil(this.phaseEndsAt);
	}

	/**
	 * @param {string} viewerId
	 */
	serializeForPlayer(viewerId) {
		const pkg = getCategoryPackage(
			this.activeCategoryId ?? this.categoryPackageIds[0],
		);
		const isOutcast = viewerId === this.outcastId;
		const categorySummary = formatCategoryNamesAr(this.categoryPackageIds);
		const meta = this.playerMeta[viewerId] ?? {
			roleRevealed: false,
			microStatus: "waiting_reveal",
			eliminated: false,
		};

		const playPhases = new Set([
			"ready",
			"interrogation",
			"voting",
			"defend",
			"revote",
		]);
		const showRoleDuringPlay = meta.roleRevealed && playPhases.has(this.phase);

		const showCategory =
			this.phase === "reveal" ||
			this.phase === "round_end" ||
			this.phase === "match_over";

		const playerCards = this.playerIds.map((id) => ({
			id,
			microStatus: this.playerMeta[id]?.microStatus ?? "waiting_reveal",
			roleRevealed: !!this.playerMeta[id]?.roleRevealed,
			ready: !!this.playerMeta[id]?.ready,
			eliminated: !!this.playerMeta[id]?.eliminated,
			voteLocked: !!this.votes[id],
			voteEndRequested: this.voteEndRequests.has(id),
			isOutcast: id === this.outcastId && this.phase === "round_end",
		}));

		const activeIds = this._activePlayerIds();
		const revoteVoterIds =
			this.phase === "revote" ? this._revoteVoterIds() : null;
		const activeCount = activeIds.length;
		const expectedVotes =
			revoteVoterIds ? revoteVoterIds.length : activeCount;
		const revoteVoterSet =
			revoteVoterIds ? new Set(revoteVoterIds) : null;

		return {
			...this.serializeBase(viewerId),
			gameType: "bara-alsalafa",
			playerCards,
			scores: { ...this.scores },
			roundWins: { ...this.roundWins },
			insiderRoundWins: this.insiderRoundWins,
			outcastRoundWins: this.outcastRoundWins,
			roundsToWin: this.roundsToWin,
			categoryPackageIds: [...this.categoryPackageIds],
			activeCategoryId: this.activeCategoryId,
			categoryPackageId: this.activeCategoryId,
			categoryName: showCategory ? (pkg?.nameAr ?? "") : "",
			categoryNameEn: showCategory ? (pkg?.nameEn ?? "") : "",
			categoryNamesSummary: categorySummary,
			selectedCategoryCount: this.categoryPackageIds.length,
			secretWord:
				showRoleDuringPlay && !isOutcast ? this.secretWord
				: this.phase === "round_end" || this.phase === "match_over" ?
					!isOutcast ? this.secretWord
					:	null
				:	null,
			roleView:
				meta.roleRevealed ?
					{
						isOutcast,
						categoryName: showCategory ? (pkg?.nameAr ?? "") : "",
						showSecretWord:
							!isOutcast && (showRoleDuringPlay || this.phase === "reveal"),
						secretWord:
							!isOutcast && (showRoleDuringPlay || this.phase === "reveal") ?
								this.secretWord
							:	null,
						outcastMessage: isOutcast ? OUTCAST_MESSAGE : null,
					}
				:	null,
			currentInterviewerId: this.currentInterviewerId,
			currentTargetId: this.currentTargetId,
			phaseEndsAt: this.phaseEndsAt,
			phaseRemainingMs: this.getPhaseRemainingMs(),
			votesCast: this._voteCount(),
			votesExpected: expectedVotes,
			tiedPlayerIds: [...this.tiedPlayerIds],
			isTiebreak: this.isTiebreak,
			tiebreakStep: this.isTiebreak ? this.interrogationStepIndex + 1 : 0,
			tiebreakTotal: this.isTiebreak ? this.interrogationQueue.length : 0,
			myVoteTarget: this.votes[viewerId] ?? null,
			canReveal:
				this.phase === "reveal" && !meta.roleRevealed && !meta.eliminated,
			canReady:
				this.phase === "ready" &&
				meta.roleRevealed &&
				!meta.ready &&
				!meta.eliminated,
			readyCount: activeIds.filter((id) => this.playerMeta[id].ready).length,
			readyExpected: activeCount,
			canRequestVoteEnd:
				this.phase === "interrogation" &&
				!this.isTiebreak &&
				!meta.eliminated &&
				!this.voteEndRequests.has(viewerId),
			voteEndCount: this.voteEndRequests.size,
			voteEndExpected: this._voteEndThreshold(),
			canVote:
				(this.phase === "voting" || this.phase === "revote") &&
				!meta.eliminated &&
				!this.votes[viewerId] &&
				(this.phase !== "revote" || revoteVoterSet?.has(viewerId)),
			canGuess: this.phase === "outcast_guess" && isOutcast,
			outcastGuessChoices:
				(
					isOutcast &&
					this.phase === "outcast_guess" &&
					this.outcastGuessMode === "choices"
				) ?
					[...this.outcastGuessOptions]
				:	[],
			outcastGuessMode:
				isOutcast && this.phase === "outcast_guess" ?
					this.outcastGuessMode
				:	null,
			canUseFreeGuess:
				isOutcast &&
				this.phase === "outcast_guess" &&
				this.outcastGuessMode === "choices",
			outcastGuessing: this.phase === "outcast_guess",
			canAdvanceInterrogation:
				this.phase === "interrogation" &&
				viewerId === this.currentInterviewerId,
			eliminatedThisRound: this.eliminatedThisRound,
			roundOutcome: this.roundOutcome,
			outcastId:
				this.phase === "round_end" || this.phase === "match_over" ?
					this.outcastId
				:	null,
			revealedSecretWord:
				this.phase === "round_end" || this.phase === "match_over" ?
					this.secretWord
				:	null,
			winnerId:
				this.phase === "match_over" && this.lastAction?.type === "match_over" ?
					this.lastAction.winnerId
				:	null,
			iAmOutcast: isOutcast,
		};
	}
}
