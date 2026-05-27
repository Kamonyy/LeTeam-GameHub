/**
 * BaraAlsalafaEngine — برا السالفة (Out of the Loop) social deduction party game.
 */

import {
  CATEGORY_PACKAGE_IDS,
  getCategoryPackage,
  pickRandomWords,
} from "./categories.js";

const INTERROGATION_MS = 45_000;
const DEFEND_MS = 30_000;
const CHEAT_SHEET_SIZE = 10;

/** @typedef {'reveal'|'interrogation'|'voting'|'defend'|'revote'|'outcast_guess'|'round_end'|'match_over'} BaraPhase */

/**
 * @param {string[]} playerIds
 * @param {{ categoryPackageId?: string, roundsToWin?: number }} [settings]
 */
export class BaraAlsalafaEngine {
  constructor(playerIds, settings = {}) {
    if (playerIds.length < 3 || playerIds.length > 12) {
      throw new Error("برا السالفة requires 3–12 players");
    }

    const pkgId =
      settings.categoryPackageId &&
      CATEGORY_PACKAGE_IDS.includes(settings.categoryPackageId) ?
        settings.categoryPackageId
      : CATEGORY_PACKAGE_IDS[0];

    const rounds = Number(settings.roundsToWin);
    this.roundsToWin =
      Number.isInteger(rounds) && rounds >= 1 && rounds <= 10 ? rounds : 3;

    this.playerIds = [...playerIds];
    /** @type {BaraPhase} */
    this.phase = "reveal";
    this.roundNumber = 1;
    this.categoryPackageId = pkgId;
    this.secretWord = "";
    this.outcastId = null;
    this.cheatSheetWords = [];
    this.interviewerIndex = 0;
    this.currentInterviewerId = null;
    this.currentTargetId = null;
    this.phaseEndsAt = null;
    this.tiedPlayerIds = [];
    this.votes = /** @type {Record<string, string>} */ ({});
    this.eliminatedThisRound = null;
    this.roundOutcome = null;
    this.lastAction = null;
    /** @type {Record<string, number>} */
    this.scores = {};
    /** @type {Record<string, { roleRevealed: boolean, microStatus: string, eliminated: boolean }>} */
    this.playerMeta = {};

    for (const id of playerIds) {
      this.scores[id] = 0;
      this.playerMeta[id] = {
        roleRevealed: false,
        microStatus: "waiting_reveal",
        eliminated: false,
      };
    }

    this._startRound();
  }

  _activePlayerIds() {
    return this.playerIds.filter((id) => !this.playerMeta[id]?.eliminated);
  }

  _pickSecretAndOutcast() {
    const pkg = getCategoryPackage(this.categoryPackageId);
    if (!pkg) throw new Error("Invalid category package");

    const active = this._activePlayerIds();
    const wordPool = pkg.words;
    this.secretWord = wordPool[Math.floor(Math.random() * wordPool.length)];
    this.outcastId = active[Math.floor(Math.random() * active.length)];

    const decoys = pickRandomWords(
      wordPool.filter((w) => w !== this.secretWord),
      CHEAT_SHEET_SIZE,
    );
    if (!decoys.includes(this.secretWord) && decoys.length < CHEAT_SHEET_SIZE) {
      decoys.push(this.secretWord);
    }
    this.cheatSheetWords = decoys.slice(0, CHEAT_SHEET_SIZE).sort();
  }

  _startRound() {
    this.phase = "reveal";
    this.phaseEndsAt = null;
    this.votes = {};
    this.tiedPlayerIds = [];
    this.eliminatedThisRound = null;
    this.roundOutcome = null;
    this.interviewerIndex = 0;

    for (const id of this.playerIds) {
      this.playerMeta[id].eliminated = false;
      this.playerMeta[id].roleRevealed = false;
      this.playerMeta[id].microStatus = "waiting_reveal";
    }

    this._pickSecretAndOutcast();
    this.lastAction = { type: "round_start", roundNumber: this.roundNumber };
  }

  _setInterrogationPair() {
    const active = this._activePlayerIds();
    if (active.length < 2) return;

    const interviewer = active[this.interviewerIndex % active.length];
    let targetIdx = (this.interviewerIndex + 1) % active.length;
    if (active[targetIdx] === interviewer) {
      targetIdx = (targetIdx + 1) % active.length;
    }
    const target = active[targetIdx];

    this.currentInterviewerId = interviewer;
    this.currentTargetId = target;
    this.phaseEndsAt = Date.now() + INTERROGATION_MS;

    for (const id of active) {
      if (id !== interviewer && id !== target) {
        this.playerMeta[id].microStatus = "thinking";
      }
    }
    this.playerMeta[interviewer].microStatus = "thinking";
    this.playerMeta[target].microStatus = "thinking";
  }

  _enterInterrogation() {
    this.phase = "interrogation";
    this.interviewerIndex = 0;
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
    return this._activePlayerIds().every((id) => this.playerMeta[id].roleRevealed);
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

  _resolveVoteOutcome() {
    const { top } = this._tallyVotes();
    const active = this._activePlayerIds();

    if (top.length === 0) {
      this._enterVoting();
      return { success: false, error: "No votes cast" };
    }

    if (top.length > 1) {
      this.phase = "defend";
      this.tiedPlayerIds = top;
      this.phaseEndsAt = Date.now() + DEFEND_MS;
      for (const id of active) {
        this.playerMeta[id].microStatus = "thinking";
      }
      for (const id of top) {
        this.playerMeta[id].microStatus = "thinking";
      }
      this.lastAction = { type: "tie_defend", tiedPlayerIds: [...top] };
      return { success: true, tied: true };
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
      this.phase = "outcast_guess";
      this.phaseEndsAt = null;
      this.playerMeta[eliminatedId].microStatus = "role_revealed";
      this.roundOutcome = {
        type: "outcast_caught",
        eliminatedId,
        awaitingGuess: true,
      };
      this.lastAction = { type: "outcast_caught", playerId: eliminatedId };
      return { success: true, outcastCaught: true };
    }

    this.playerMeta[eliminatedId].eliminated = true;
    this.playerMeta[eliminatedId].microStatus = "role_revealed";
    this.scores[this.outcastId] = (this.scores[this.outcastId] || 0) + 2;
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
    return { success: true, wrongAccusation: true };
  }

  /** @param {string} playerId */
  revealRole(playerId) {
    if (this.phase !== "reveal") {
      return { success: false, error: "Not in reveal phase" };
    }
    if (!this.playerIds.includes(playerId)) {
      return { success: false, error: "Invalid player" };
    }
    if (this.playerMeta[playerId].eliminated) {
      return { success: false, error: "Player is eliminated" };
    }
    if (this.playerMeta[playerId].roleRevealed) {
      return { success: false, error: "Already revealed" };
    }

    this.playerMeta[playerId].roleRevealed = true;
    this.playerMeta[playerId].microStatus = "role_revealed";
    this.lastAction = { type: "role_revealed", playerId };

    if (this._allRevealed()) {
      this._enterInterrogation();
    }

    return { success: true };
  }

  /** @param {string} playerId */
  advanceInterrogation(playerId) {
    if (this.phase !== "interrogation") {
      return { success: false, error: "Not in interrogation phase" };
    }

    const active = this._activePlayerIds();
    this.interviewerIndex += 1;

    if (this.interviewerIndex >= active.length) {
      this._enterVoting();
      return { success: true, advancedToVoting: true };
    }

    this._setInterrogationPair();
    this.lastAction = { type: "interrogation_next", by: playerId };
    return { success: true };
  }

  /** Called when interrogation timer expires */
  onInterrogationTimerExpired() {
    if (this.phase !== "interrogation") return { changed: false };
    this.advanceInterrogation("system");
    return { changed: true };
  }

  /** @param {string} playerId @param {string} targetId */
  castVote(playerId, targetId) {
    if (this.phase !== "voting" && this.phase !== "revote") {
      return { success: false, error: "Not in voting phase" };
    }
    if (!this.playerIds.includes(playerId)) {
      return { success: false, error: "Invalid voter" };
    }
    if (this.playerMeta[playerId].eliminated) {
      return { success: false, error: "Eliminated players cannot vote" };
    }
    if (this.votes[playerId]) {
      return { success: false, error: "Already voted" };
    }

    const allowedTargets =
      this.phase === "revote" ? this.tiedPlayerIds : this._activePlayerIds();

    if (!allowedTargets.includes(targetId)) {
      return { success: false, error: "Invalid vote target" };
    }
    if (targetId === playerId) {
      return { success: false, error: "Cannot vote for yourself" };
    }

    this.votes[playerId] = targetId;
    this.playerMeta[playerId].microStatus = "voted";
    this.lastAction = { type: "vote_cast", voterId: playerId, targetId };

    const active = this._activePlayerIds();
    const expectedVotes =
      this.phase === "revote" ?
        active.filter((id) => !this.tiedPlayerIds.includes(id)).length
      :	active.length;

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

    this.phase = "revote";
    this.votes = {};
    this.phaseEndsAt = null;
    const active = this._activePlayerIds();
    for (const id of active) {
      if (!this.tiedPlayerIds.includes(id)) {
        this.playerMeta[id].microStatus = "thinking";
      }
    }
    this.lastAction = { type: "revote_start", tiedPlayerIds: [...this.tiedPlayerIds] };
    return { changed: true };
  }

  /**
   * @param {string} playerId
   * @param {string} guess
   */
  submitOutcastGuess(playerId, guess) {
    if (this.phase !== "outcast_guess") {
      return { success: false, error: "Not awaiting outcast guess" };
    }
    if (playerId !== this.outcastId) {
      return { success: false, error: "Only the outcast can guess" };
    }

    const normalized = guess.trim().replace(/\s+/g, " ");
    const secretNorm = this.secretWord.trim();
    const match =
      normalized.localeCompare(secretNorm, "ar", { sensitivity: "base" }) ===
        0 || normalized === secretNorm;

    if (match) {
      this.scores[playerId] = (this.scores[playerId] || 0) + 3;
      this.roundOutcome = {
        type: "outcast_stole_win",
        guess: normalized,
      };
      this.lastAction = { type: "outcast_stole_win", playerId };
    } else {
      const insiders = this.playerIds.filter(
        (id) => id !== this.outcastId && !this.playerMeta[id].eliminated,
      );
      for (const id of insiders) {
        this.scores[id] = (this.scores[id] || 0) + 1;
      }
      this.roundOutcome = {
        type: "insiders_win",
        guess: normalized,
        secretWord: this.secretWord,
      };
      this.lastAction = { type: "insiders_win", playerId };
    }

    this.phase = "round_end";
    return { success: true, match };
  }

  startNextRound() {
    if (this.phase !== "round_end") return false;

    const leader = Object.entries(this.scores).sort((a, b) => b[1] - a[1])[0];
    if (leader && leader[1] >= this.roundsToWin) {
      this.phase = "match_over";
      this.lastAction = { type: "match_over", winnerId: leader[0] };
      return true;
    }

    this.roundNumber += 1;
    this._startRound();
    return true;
  }

  getPhaseRemainingMs() {
    if (!this.phaseEndsAt) return null;
    return Math.max(0, this.phaseEndsAt - Date.now());
  }

  /**
   * @param {string} viewerId
   */
  serializeForPlayer(viewerId) {
    const pkg = getCategoryPackage(this.categoryPackageId);
    const isOutcast = viewerId === this.outcastId;
    const meta = this.playerMeta[viewerId] ?? {
      roleRevealed: false,
      microStatus: "waiting_reveal",
      eliminated: false,
    };

    const showSecret =
      meta.roleRevealed &&
      this.phase !== "reveal" &&
      (isOutcast ?
        false
      :	this.phase === "round_end" ||
        this.phase === "match_over" ||
        this.phase === "outcast_guess");

    const revealWordToOutcast =
      meta.roleRevealed && isOutcast && this.phase === "reveal";

    const playerCards = this.playerIds.map((id) => ({
      id,
      microStatus: this.playerMeta[id]?.microStatus ?? "waiting_reveal",
      roleRevealed: !!this.playerMeta[id]?.roleRevealed,
      eliminated: !!this.playerMeta[id]?.eliminated,
      voteLocked: !!this.votes[id],
      isOutcast: id === this.outcastId && this.phase === "round_end",
    }));

    const activeCount = this._activePlayerIds().length;
    const expectedVotes =
      this.phase === "revote" ?
        this._activePlayerIds().filter((id) => !this.tiedPlayerIds.includes(id))
          .length
      :	activeCount;

    return {
      gameType: "bara-alsalafa",
      phase: this.phase,
      playerIds: this.playerIds,
      playerCards,
      scores: { ...this.scores },
      roundsToWin: this.roundsToWin,
      roundNumber: this.roundNumber,
      categoryPackageId: this.categoryPackageId,
      categoryName: pkg?.nameAr ?? "",
      categoryNameEn: pkg?.nameEn ?? "",
      secretWord:
        meta.roleRevealed && !isOutcast && this.phase !== "reveal" ?
          this.secretWord
        : null,
      roleView:
        meta.roleRevealed ?
          {
            isOutcast,
            categoryName: pkg?.nameAr ?? "",
            showSecretWord: !isOutcast,
            secretWord: !isOutcast ? this.secretWord : null,
            outcastMessage: isOutcast ? "أنت برا السالفة!" : null,
          }
        :	null,
      cheatSheetWords:
        this.phase === "interrogation" || this.phase === "voting" ?
          this.cheatSheetWords
        :	[],
      currentInterviewerId: this.currentInterviewerId,
      currentTargetId: this.currentTargetId,
      phaseEndsAt: this.phaseEndsAt,
      phaseRemainingMs: this.getPhaseRemainingMs(),
      votesCast: this._voteCount(),
      votesExpected: expectedVotes,
      tiedPlayerIds: [...this.tiedPlayerIds],
      myVoteTarget: this.votes[viewerId] ?? null,
      canReveal: this.phase === "reveal" && !meta.roleRevealed && !meta.eliminated,
      canVote:
        (this.phase === "voting" || this.phase === "revote") &&
        !meta.eliminated &&
        !this.votes[viewerId] &&
        (this.phase !== "revote" || !this.tiedPlayerIds.includes(viewerId)),
      canGuess: this.phase === "outcast_guess" && isOutcast,
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
      lastAction: this.lastAction,
      iAmOutcast: isOutcast,
    };
  }
}
