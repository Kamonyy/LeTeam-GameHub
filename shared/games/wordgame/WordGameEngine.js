/**
 * WordGameEngine — 2-player secret word guessing (voice-chat companion).
 */

const MIN_WORD_LENGTH = 2;
const MAX_WORD_LENGTH = 30;
const WORD_PATTERN = /^[\p{L}\p{N}\s'-]+$/u;

export class WordGameEngine {
  /**
   * @param {string[]} playerIds — exactly 2
   */
  constructor(playerIds) {
    if (playerIds.length !== 2) {
      throw new Error('Secret Word requires exactly 2 players');
    }

    this.playerIds = [...playerIds];
    /** @type {'setup' | 'playing' | 'round_end'} */
    this.phase = 'setup';
    /** Words each player must guess: keyed by guesser id */
    this.wordsForGuesser = /** @type {Record<string, string>} */ ({});
    /** @type {Record<string, boolean>} */
    this.submitted = {};
    /** @type {Record<string, number>} */
    this.scores = {};
    this.roundNumber = 1;
    this.lastAction = null;

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
    return raw.trim().replace(/\s+/g, ' ');
  }

  /** @param {string} word */
  _validateWord(word) {
    if (word.length < MIN_WORD_LENGTH || word.length > MAX_WORD_LENGTH) {
      return `Word must be ${MIN_WORD_LENGTH}–${MAX_WORD_LENGTH} characters`;
    }
    if (!WORD_PATTERN.test(word)) {
      return 'Word may only contain letters, numbers, spaces, hyphens, and apostrophes';
    }
    return null;
  }

  /**
   * @param {string} creatorId
   * @param {string} word
   */
  submitWord(creatorId, word) {
    if (this.phase !== 'setup') {
      return { success: false, error: 'Not in word selection phase' };
    }

    if (!this.playerIds.includes(creatorId)) {
      return { success: false, error: 'Invalid player' };
    }

    if (this.submitted[creatorId]) {
      return { success: false, error: 'You already submitted a word' };
    }

    const normalized = this._normalizeWord(word);
    const validationError = this._validateWord(normalized);
    if (validationError) {
      return { success: false, error: validationError };
    }

    const guesserId = this._opponentId(creatorId);
    this.wordsForGuesser[guesserId] = normalized;
    this.submitted[creatorId] = true;
    this.lastAction = { type: 'word_submitted', playerId: creatorId };

    const allSubmitted = this.playerIds.every((id) => this.submitted[id]);
    if (allSubmitted) {
      this.phase = 'playing';
      this.lastAction = { type: 'round_start', roundNumber: this.roundNumber };
    }

    return { success: true };
  }

  /**
   * Word creator confirms their opponent guessed correctly.
   * @param {string} creatorId
   */
  confirmGuessed(creatorId) {
    if (this.phase !== 'playing') {
      return { success: false, error: 'Not in active guessing phase' };
    }

    if (!this.playerIds.includes(creatorId)) {
      return { success: false, error: 'Invalid player' };
    }

    const guesserId = this._opponentId(creatorId);
    const revealedWord = this.wordsForGuesser[guesserId];

    if (!revealedWord) {
      return { success: false, error: 'Word not found' };
    }

    this.scores[guesserId] = (this.scores[guesserId] || 0) + 1;
    this.phase = 'round_end';
    this.lastAction = {
      type: 'word_guessed',
      guesserId,
      creatorId,
      word: revealedWord,
      roundNumber: this.roundNumber,
    };

    return { success: true };
  }

  startNextRound() {
    if (this.phase !== 'round_end') return false;

    this.roundNumber += 1;
    this.wordsForGuesser = {};
    this.submitted = {};
    for (const id of this.playerIds) {
      this.submitted[id] = false;
    }
    this.phase = 'setup';
    this.lastAction = { type: 'round_reset', roundNumber: this.roundNumber };
    return true;
  }

  /**
   * @param {string} viewerId
   */
  serializeForPlayer(viewerId) {
    const opponentId = this._opponentId(viewerId);
    const wordToGuess = this.wordsForGuesser[viewerId];

    const revealedWord =
      this.phase === 'round_end' && this.lastAction?.type === 'word_guessed'
        ? this.lastAction.word
        : null;

    return {
      gameType: 'wordgame',
      phase: this.phase,
      playerIds: this.playerIds,
      scores: { ...this.scores },
      roundNumber: this.roundNumber,
      iHaveSubmitted: !!this.submitted[viewerId],
      opponentHasSubmitted: !!this.submitted[opponentId],
      targetWordLength:
        this.phase === 'playing' && wordToGuess ? wordToGuess.length : 0,
      revealedWord,
      lastGuesserId:
        this.lastAction?.type === 'word_guessed'
          ? this.lastAction.guesserId
          : null,
      canConfirmGuessed: this.phase === 'playing',
      lastAction: this.lastAction,
    };
  }
}
