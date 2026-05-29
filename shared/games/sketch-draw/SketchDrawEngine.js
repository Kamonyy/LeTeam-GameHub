/**
 * SketchDrawEngine — authoritative drawing & guessing game state machine.
 */

import { BaseGameEngine } from "../BaseGameEngine.js";
import { shuffleArray } from "../utils/shuffle.js";
import { getPhaseRemainingMs } from "../utils/phaseTimer.js";
import { buildActiveWordPool, pickThreeWords } from "./wordPool.js";
import { guessesMatchExactly, isCloseGuess, normalizeGuess } from "./guessValidation.js";
import { drawerPoints, guesserPoints } from "./scoring.js";
import { normalizeCategoryPackageIds } from "./data/index.js";
import { formatWordBlanks } from "./wordBlanks.js";

export const SKETCH_WORD_SELECT_MS = 10_000;
export const SKETCH_DRAW_ROUND_DELAY_MS = 6000;

const DRAW_TIMER_MIN_SEC = 30;
const DRAW_TIMER_MAX_SEC = 600;
const MAX_BATCHES = 2000;

/**
 * @param {string[]} playerIds
 * @param {object} settings
 */
export class SketchDrawEngine extends BaseGameEngine {
  constructor(playerIds, settings = {}) {
    if (playerIds.length < 3 || playerIds.length > 12) {
      throw new Error("Sketch Draw requires 3–12 players");
    }

    super(playerIds, settings);

    const rounds = Number(settings.totalRounds);
    this.totalRounds =
      Number.isInteger(rounds) && rounds >= 1 && rounds <= 20 ? rounds : 5;

    const timerSec = Number(settings.drawTimerSec);
    this.drawTimerSec =
      Number.isFinite(timerSec) &&
      timerSec >= DRAW_TIMER_MIN_SEC &&
      timerSec <= DRAW_TIMER_MAX_SEC ?
        Math.floor(timerSec)
      : 90;
    this.drawDurationMs = this.drawTimerSec * 1000;

    this.categoryPackageIds = normalizeCategoryPackageIds(settings);
    this.customWordsRaw =
      typeof settings.customWords === "string" ? settings.customWords : "";
    this.useCustomWordsOnly = settings.useCustomWordsOnly === true;

    const { pool, error } = buildActiveWordPool({
      categoryPackageIds: this.categoryPackageIds,
      customWords: this.customWordsRaw,
      useCustomWordsOnly: this.useCustomWordsOnly,
    });
    if (error) throw new Error(error);
    this.activeWordPool = pool;

    this.turnOrder = shuffleArray(this.playerIds);
    this.currentTurnIndex = 0;
    this.phaseEndsAt = Date.now() + SKETCH_WORD_SELECT_MS;

    this.secretWord = "";
    /** @type {string[]} */
    this.wordOptions = [];
    this.usedWords = new Set();
    this.drawingStartedAt = null;

    /** @type {Record<string, number>} */
    this.scores = {};
    /** @type {Set<string>} */
    this.solvedThisRound = new Set();
    /** @type {Set<string>} */
    this.frozenGuessers = new Set();

    /** @type {Array<{ batchId: string, tool: string, color: string, size: number, points: number[][], strokeComplete?: boolean }>} */
    this.canvasBuffer = [];
    /** @type {Map<string, typeof this.canvasBuffer[number]>} */
    this.strokeMap = new Map();
    this.canvasBufferVersion = 0;
    /** @type {typeof this.canvasBuffer} */
    this.canvasRedoStack = [];

    this.lastRoundBreakdown = null;
    this.winnerId = null;

    for (const id of this.playerIds) {
      this.scores[id] = 0;
    }

    this._beginWordSelect();
  }

  get currentDrawerId() {
    return this.turnOrder[this.currentTurnIndex] ?? null;
  }

  _beginWordSelect() {
    this.phase = "word_select";
    this.phaseEndsAt = Date.now() + SKETCH_WORD_SELECT_MS;
    this.secretWord = "";
    this.drawingStartedAt = null;
    this.solvedThisRound = new Set();
    this.frozenGuessers = new Set();
    this.clearCanvasBuffer();
    this.wordOptions = pickThreeWords(this.activeWordPool, this.usedWords);
    this.lastAction = {
      type: "word_select_start",
      drawerId: this.currentDrawerId,
      roundNumber: this.roundNumber,
    };
    this._bumpStateVersion();
  }

  _enterDrawing(secretWord) {
    this.secretWord = secretWord;
    this.usedWords.add(secretWord);
    this.phase = "drawing";
    this.drawingStartedAt = Date.now();
    this.phaseEndsAt = this.drawingStartedAt + this.drawDurationMs;
    this.clearCanvasBuffer();
    this.lastAction = {
      type: "drawing_start",
      drawerId: this.currentDrawerId,
      roundNumber: this.roundNumber,
    };
    this._bumpStateVersion();
  }

  clearCanvasBuffer() {
    this.canvasBuffer = [];
    this.strokeMap.clear();
    this.canvasRedoStack = [];
    this.canvasBufferVersion += 1;
  }

  /** @param {string} baseId */
  _lookupStroke(baseId) {
    const direct = this.strokeMap.get(baseId);
    if (direct) return direct;
    for (const batch of this.strokeMap.values()) {
      if (
        batch.batchId === baseId ||
        batch.batchId.startsWith(`${baseId}-`) ||
        baseId.startsWith(batch.batchId)
      ) {
        return batch;
      }
    }
    return undefined;
  }

  /** @param {typeof this.canvasBuffer[number]} batch */
  _indexStroke(batch) {
    this.strokeMap.set(batch.batchId, batch);
  }

  /** @param {typeof this.canvasBuffer[number]} batch */
  _unindexStroke(batch) {
    if (batch?.batchId) this.strokeMap.delete(batch.batchId);
  }

  /**
   * @param {string} drawerId
   * @param {number} index
   */
  selectWord(drawerId, index) {
    if (this.phase !== "word_select") {
      return { success: false, error: "Not in word selection phase" };
    }
    if (drawerId !== this.currentDrawerId) {
      return { success: false, error: "Only the drawer can select a word" };
    }
    const i = Number(index);
    if (!Number.isInteger(i) || i < 0 || i > 2) {
      return { success: false, error: "Invalid word index" };
    }
    const word = this.wordOptions[i] ?? this.wordOptions[0];
    if (!word) return { success: false, error: "No words available" };
    this._enterDrawing(word);
    return { success: true };
  }

  onWordSelectTimerExpired() {
    if (this.phase !== "word_select") return { changed: false };
    const word = this.wordOptions[0];
    if (!word) return { changed: false };
    this._enterDrawing(word);
    return { changed: true };
  }

  onDrawingTimerExpired() {
    if (this.phase !== "drawing") return { changed: false };
    return this._endDrawingTurn();
  }

  /**
   * @param {string} drawerId
   * @param {object} batch
   */
  appendCanvasBatch(drawerId, batch) {
    if (this.phase !== "drawing") {
      return { success: false, error: "Not in drawing phase" };
    }
    if (drawerId !== this.currentDrawerId) {
      return { success: false, error: "Only the drawer can draw" };
    }
    if (!batch || typeof batch !== "object") {
      return { success: false, error: "Invalid batch" };
    }

    const points = batch.points;
    if (!Array.isArray(points) || points.length === 0) {
      return { success: false, error: "Empty stroke" };
    }
    if (this.canvasBuffer.length >= MAX_BATCHES) {
      return { success: false, error: "Canvas stroke limit reached" };
    }

    const sanitizedPoints = points.map((p) => {
      if (!Array.isArray(p) || p.length < 2) return [0, 0];
      return [
        Math.max(0, Math.min(1, Number(p[0]) || 0)),
        Math.max(0, Math.min(1, Number(p[1]) || 0)),
      ];
    });

    const baseMeta = {
      tool: typeof batch.tool === "string" ? batch.tool.slice(0, 16) : "brush",
      color: typeof batch.color === "string" ? batch.color.slice(0, 32) : "#000000",
      size: Math.min(64, Math.max(1, Number(batch.size) || 4)),
      strokeComplete: batch.strokeComplete === true,
    };

    const rawId =
      typeof batch.batchId === "string" && batch.batchId ?
        batch.batchId.slice(0, 64)
      : `b-${Date.now()}`;
    const dash = rawId.lastIndexOf("-");
    const baseId =
      dash > 0 && /^\d{2,}$/.test(rawId.slice(dash + 1)) ?
        rawId.slice(0, dash)
      : rawId;

    const existing = this._lookupStroke(baseId);

    let stored;
    if (existing && rawId !== existing.batchId && existing.tool !== "fill") {
      existing.points.push(...sanitizedPoints);
      existing.strokeComplete =
        existing.strokeComplete || baseMeta.strokeComplete;
      stored = existing;
    } else if (existing && rawId === existing.batchId) {
      stored = existing;
    } else {
      if (this.canvasBuffer.length >= MAX_BATCHES) {
        return { success: false, error: "Canvas stroke limit reached" };
      }
      stored = {
        batchId: baseId,
        ...baseMeta,
        points: sanitizedPoints,
        strokeComplete: baseMeta.strokeComplete,
      };
      this.canvasBuffer.push(stored);
      this._indexStroke(stored);
    }

    this.canvasRedoStack = [];
    this.canvasBufferVersion += 1;
    this._bumpStateVersion();
    return { success: true, batch: stored, batches: [stored] };
  }

  /**
   * @param {string} drawerId
   */
  undoCanvas(drawerId) {
    if (this.phase !== "drawing") return { success: false, error: "Not in drawing phase" };
    if (drawerId !== this.currentDrawerId) {
      return { success: false, error: "Only the drawer can undo" };
    }
    if (this.canvasBuffer.length === 0) {
      return { success: false, error: "Nothing to undo" };
    }
    const removed = this.canvasBuffer.pop();
    if (removed) {
      this._unindexStroke(removed);
      this.canvasRedoStack.push(removed);
    }
    this.canvasBufferVersion += 1;
    this._bumpStateVersion();
    return { success: true };
  }

  /**
   * @param {string} drawerId
   */
  redoCanvas(drawerId) {
    if (this.phase !== "drawing") return { success: false, error: "Not in drawing phase" };
    if (drawerId !== this.currentDrawerId) {
      return { success: false, error: "Only the drawer can redo" };
    }
    if (this.canvasRedoStack.length === 0) {
      return { success: false, error: "Nothing to redo" };
    }
    const batch = this.canvasRedoStack.pop();
    this.canvasBuffer.push(batch);
    this._indexStroke(batch);
    this.canvasBufferVersion += 1;
    this._bumpStateVersion();
    return { success: true, batch };
  }

  /**
   * @param {string} drawerId
   */
  clearCanvas(drawerId) {
    if (this.phase !== "drawing") return { success: false, error: "Not in drawing phase" };
    if (drawerId !== this.currentDrawerId) {
      return { success: false, error: "Only the drawer can clear" };
    }
    this.clearCanvasBuffer();
    this._bumpStateVersion();
    return { success: true };
  }

  /**
   * @param {string} drawerId
   * @param {{ x: number, y: number, color: string }} payload
   */
  applyCanvasFill(drawerId, payload) {
    if (this.phase !== "drawing") {
      return { success: false, error: "Not in drawing phase" };
    }
    if (drawerId !== this.currentDrawerId) {
      return { success: false, error: "Only the drawer can fill" };
    }
    const x = Number(payload?.x);
    const y = Number(payload?.y);
    const color =
      typeof payload?.color === "string" ? payload.color.slice(0, 32) : "#000000";

    const batch = {
      batchId: `fill-${Date.now()}`,
      tool: "fill",
      color,
      size: 0,
      points: [
        [
          Math.max(0, Math.min(1, x)),
          Math.max(0, Math.min(1, y)),
        ],
      ],
      strokeComplete: true,
    };

    this.canvasBuffer.push(batch);
    this._indexStroke(batch);
    this.canvasRedoStack = [];
    this.canvasBufferVersion += 1;
    this._bumpStateVersion();
    return { success: true, batch };
  }

  /**
   * @param {string} playerId
   * @param {string} rawMessage
   */
  processGuess(playerId, rawMessage) {
    if (this.phase !== "drawing") {
      return { type: "ignore" };
    }
    if (playerId === this.currentDrawerId) {
      return { type: "ignore" };
    }
    if (!this.playerIds.includes(playerId)) {
      return { type: "ignore" };
    }
    if (this.frozenGuessers.has(playerId)) {
      return { type: "ignore" };
    }

    const guess = normalizeGuess(rawMessage);
    if (!guess) return { type: "ignore" };

    if (guessesMatchExactly(guess, this.secretWord)) {
      const elapsed = Date.now() - (this.drawingStartedAt ?? Date.now());
      const pts = guesserPoints(elapsed, this.drawDurationMs);
      this.scores[playerId] = (this.scores[playerId] || 0) + pts;
      this.solvedThisRound.add(playerId);
      this.frozenGuessers.add(playerId);
      this.lastAction = {
        type: "player_guessed",
        playerId,
        points: pts,
      };
      this._bumpStateVersion();

      if (this._allGuessersSolved()) {
        this._endDrawingTurn();
        return {
          type: "correct",
          playerId,
          points: pts,
          roundEnded: true,
        };
      }

      return { type: "correct", playerId, points: pts };
    }

    if (isCloseGuess(guess, this.secretWord)) {
      return { type: "close" };
    }

    return { type: "wrong" };
  }

  _endDrawingTurn() {
    const drawerId = this.currentDrawerId;
    const correctCount = this.solvedThisRound.size;
    const dPts = drawerPoints(correctCount);
    if (drawerId) {
      this.scores[drawerId] = (this.scores[drawerId] || 0) + dPts;
    }

    this.lastRoundBreakdown = {
      drawerId,
      secretWord: this.secretWord,
      correctGuessers: [...this.solvedThisRound],
      drawerPoints: dPts,
      roundNumber: this.roundNumber,
    };

    if (this.roundNumber >= this.totalRounds) {
      this.phase = "match_over";
      this.phaseEndsAt = null;
      this.winnerId = this._leadingPlayerId();
      this.lastAction = {
        type: "match_over",
        winnerId: this.winnerId,
        scores: { ...this.scores },
        ...this.lastRoundBreakdown,
      };
    } else {
      this.phase = "round_end";
      this.phaseEndsAt = null;
      this.lastAction = {
        type: "round_end",
        ...this.lastRoundBreakdown,
      };
    }
    this._bumpStateVersion();

    return { changed: true };
  }

  /** @returns {string[]} */
  _guesserIds() {
    const drawerId = this.currentDrawerId;
    return this.playerIds.filter((id) => id !== drawerId);
  }

  _allGuessersSolved() {
    const guessers = this._guesserIds();
    if (guessers.length === 0) return false;
    return guessers.every((id) => this.solvedThisRound.has(id));
  }

  _leadingPlayerId() {
    let best = null;
    let bestScore = -1;
    for (const id of this.playerIds) {
      const s = this.scores[id] || 0;
      if (s > bestScore) {
        bestScore = s;
        best = id;
      }
    }
    return best;
  }

  startNextRound() {
    if (this.phase !== "round_end") {
      return { success: false, error: "Cannot advance now" };
    }

    this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnOrder.length;
    this.roundNumber += 1;
    this._beginWordSelect();
    return { success: true };
  }

  getPhaseTimeRemaining() {
    return getPhaseRemainingMs(this.phaseEndsAt);
  }

  /**
   * @param {string} viewerId
   */
  serializeForPlayer(viewerId) {
    const drawerId = this.currentDrawerId;
    const isDrawer = viewerId === drawerId;
    const isPlayer = this.playerIds.includes(viewerId);

    const base = {
      ...this.serializeBase(viewerId),
      gameType: "sketch-draw",
      turnOrder: this.turnOrder,
      currentDrawerId: drawerId,
      totalRounds: this.totalRounds,
      drawTimerSec: this.drawTimerSec,
      scores: { ...this.scores },
      phaseTimeRemaining: this.getPhaseTimeRemaining(),
      phaseEndsAt: this.phaseEndsAt,
      lastRoundBreakdown: this.lastRoundBreakdown,
      winnerId: this.winnerId,
      canvasBufferVersion: this.canvasBufferVersion,
      solvedThisRound: [...this.solvedThisRound],
      isDrawer,
      canSelectWord: isDrawer && this.phase === "word_select",
      canDraw: isDrawer && this.phase === "drawing",
      canGuess:
        isPlayer &&
        !isDrawer &&
        this.phase === "drawing" &&
        !this.frozenGuessers.has(viewerId),
      guessFrozen: this.frozenGuessers.has(viewerId),
    };

    // Live strokes use sketch-draw:canvas:stroke:batch; full buffer only after the round.
    if (this.phase === "round_end" || this.phase === "match_over") {
      base.canvasBuffer = this.canvasBuffer.map((b) => ({ ...b, points: [...b.points] }));
    } else {
      base.canvasBuffer = [];
    }

    if (isDrawer && this.phase === "word_select") {
      base.wordOptions = [...this.wordOptions];
    } else {
      base.wordOptions = null;
    }

    if (this.phase === "round_end" || this.phase === "match_over") {
      base.revealedWord = this.secretWord;
    } else {
      base.revealedWord = null;
    }

    if (this.phase === "drawing" && this.secretWord) {
      base.wordBlanks = formatWordBlanks(this.secretWord);
      base.drawerWord = isDrawer ? this.secretWord : null;
    } else {
      base.wordBlanks = null;
      base.drawerWord = null;
    }

    return base;
  }
}
