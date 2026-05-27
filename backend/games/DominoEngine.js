/**
 * DominoEngine — Authoritative Draw/Block Dominoes (Double-Six)
 *
 * All game state mutations happen here on the server. Clients receive
 * sanitized snapshots via RoomManager → socket broadcasts.
 *
 * State sync flow:
 *   1. initialize() → deal tiles, pick first player (highest double)
 *   2. validateMove() / drawTile() / passTurn() → mutate internal state
 *   3. getPublicState() → strip hidden info (other players' hands, boneyard)
 *   4. RoomManager broadcasts game:state:update to room
 */

/** @typedef {{ left: number, right: number }} Tile */

/** @typedef {{ tile: Tile, isDouble: boolean, displayLeft: number, displayRight: number }} BoardTile */

const TILE_SET_SIZE = 28;

/**
 * Generate the full double-six tile set [0|0] … [6|6].
 * @returns {Tile[]}
 */
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

/**
 * Fisher-Yates shuffle (in-place).
 * @param {Tile[]} arr
 */
export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Sum pips on a tile.
 * @param {Tile} tile
 */
export function tilePips(tile) {
  return tile.left + tile.right;
}

/**
 * Compare two tiles for equality.
 * @param {Tile} a
 * @param {Tile} b
 */
export function tilesEqual(a, b) {
  return a.left === b.left && a.right === b.right;
}

/**
 * Find tile index in hand by value match (order-independent).
 * @param {Tile[]} hand
 * @param {Tile} tile
 */
export function findTileIndex(hand, tile) {
  return hand.findIndex(
    (t) =>
      (t.left === tile.left && t.right === tile.right) ||
      (t.left === tile.right && t.right === tile.left)
  );
}

export class DominoEngine {
  /**
   * @param {string[]} playerIds - Ordered list of player IDs (2–4)
   */
  constructor(playerIds) {
    if (playerIds.length < 2 || playerIds.length > 4) {
      throw new Error('Dominoes requires 2–4 players');
    }

    this.playerIds = [...playerIds];
    this.hands = /** @type {Record<string, Tile[]>} */ ({});
    this.boneyard = /** @type {Tile[]} */ ([]);
    /** @type {BoardTile[]} */
    this.board = [];
    this.currentPlayerIndex = 0;
    this.phase = 'playing'; // 'playing' | 'finished'
    this.winnerId = null;
    this.lastAction = null;
    this.consecutivePasses = 0;
    this.scores = /** @type {Record<string, number>} */ ({});
    this.turnStartedAt = Date.now();
    this.turnTimerPaused = false;
    this.turnTimerPausedAt = null;
    this.turnTimerRemainingMs = 30000;

    for (const id of playerIds) {
      this.scores[id] = 0;
    }

    this._deal();
    this._determineFirstPlayer();
  }

  /** Deal tiles based on player count. */
  _deal() {
    const tilesPerPlayer = this.playerIds.length === 2 ? 7 : 5;
    const deck = shuffle(createTileSet());

    for (const id of this.playerIds) {
      this.hands[id] = deck.splice(0, tilesPerPlayer);
    }
    this.boneyard = deck;
  }

  /** First turn goes to the player holding the highest double. */
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

  /**
   * Check whether a tile can be played on the given end.
   * @param {Tile} tile
   * @param {'left' | 'right'} end
   */
  canPlayOnEnd(tile, end) {
    if (this.board.length === 0) return true;

    const openEnds = this.getOpenEnds();
    if (!openEnds) return false;

    const target = end === 'left' ? openEnds.left : openEnds.right;
    return tile.left === target || tile.right === target;
  }

  /**
   * Find all legal moves for a player.
   * @param {string} playerId
   * @returns {{ tile: Tile, end: 'left' | 'right' }[]}
   */
  getValidMoves(playerId) {
    const hand = this.hands[playerId];
    if (!hand) return [];

    /** @type {{ tile: Tile, end: 'left' | 'right' }[]} */
    const moves = [];

    if (this.board.length === 0) {
      for (const tile of hand) {
        moves.push({ tile, end: 'left' });
      }
      return moves;
    }

    for (const tile of hand) {
      if (this.canPlayOnEnd(tile, 'left')) {
        moves.push({ tile, end: 'left' });
      }
      if (this.canPlayOnEnd(tile, 'right')) {
        const alreadyLeft =
          this.canPlayOnEnd(tile, 'left') &&
          tile.left === tile.right;
        if (!alreadyLeft || this.canPlayOnEnd(tile, 'left') !== this.canPlayOnEnd(tile, 'right')) {
          if (!moves.some((m) => tilesEqual(m.tile, tile) && m.end === 'right')) {
            moves.push({ tile, end: 'right' });
          }
        } else if (!moves.some((m) => tilesEqual(m.tile, tile))) {
          moves.push({ tile, end: 'right' });
        }
      }
    }

    return moves;
  }

  /**
   * Place a tile on the board with correct orientation.
   * @param {Tile} tile
   * @param {'left' | 'right'} end
   */
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

    if (end === 'right') {
      const target = openEnds.right;
      let displayLeft, displayRight;
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
      let displayLeft, displayRight;
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

  /**
   * Execute a move. Returns { success, error? }.
   * @param {string} playerId
   * @param {Tile} tile
   * @param {'left' | 'right'} end
   */
  playMove(playerId, tile, end) {
    if (this.phase !== 'playing') {
      return { success: false, error: 'Game is already finished' };
    }

    if (playerId !== this.currentPlayerId) {
      return { success: false, error: 'Not your turn' };
    }

    const hand = this.hands[playerId];
    const idx = findTileIndex(hand, tile);
    if (idx === -1) {
      return { success: false, error: 'Tile not in your hand' };
    }

    const actualTile = hand[idx];

    if (this.board.length === 0) {
      // First tile of the game — must be a double if highest-double rule applies,
      // but any tile from hand is valid for an empty board in draw dominoes.
    } else if (!this.canPlayOnEnd(actualTile, end)) {
      return { success: false, error: 'Tile does not match the open end' };
    }

    hand.splice(idx, 1);
    this._placeTile(actualTile, end);
    this.consecutivePasses = 0;
    this.lastAction = { type: 'play', playerId, tile: actualTile, end };

    if (hand.length === 0) {
      this._finishGame(playerId, 'domino');
      return { success: true };
    }

    this._advanceTurn();
    return { success: true };
  }

  /**
   * Draw one tile from the boneyard for the current player.
   * @param {string} playerId
   */
  drawTile(playerId) {
    if (this.phase !== 'playing') {
      return { success: false, error: 'Game is already finished' };
    }

    if (playerId !== this.currentPlayerId) {
      return { success: false, error: 'Not your turn' };
    }

    if (this.boneyard.length === 0) {
      return { success: false, error: 'Boneyard is empty' };
    }

    const drawn = this.boneyard.pop();
    this.hands[playerId].push(drawn);
    this.lastAction = { type: 'draw', playerId, tile: drawn };
    this.consecutivePasses = 0;

    // After drawing, player keeps turn if they now have a valid move; otherwise auto-pass
    const moves = this.getValidMoves(playerId);
    if (moves.length === 0) {
      if (this.boneyard.length === 0) {
        return this.passTurn(playerId);
      }
    }

    this.turnStartedAt = Date.now();
    return { success: true, drawn };
  }

  /**
   * Pass turn when no valid moves and boneyard empty.
   * @param {string} playerId
   */
  passTurn(playerId) {
    if (this.phase !== 'playing') {
      return { success: false, error: 'Game is already finished' };
    }

    if (playerId !== this.currentPlayerId) {
      return { success: false, error: 'Not your turn' };
    }

    const moves = this.getValidMoves(playerId);
    if (moves.length > 0) {
      return { success: false, error: 'You have valid moves' };
    }

    if (this.boneyard.length > 0) {
      return { success: false, error: 'You must draw from the boneyard first' };
    }

    this.lastAction = { type: 'pass', playerId };
    this.consecutivePasses += 1;

    if (this.consecutivePasses >= this.playerIds.length) {
      this._finishBlocked();
      return { success: true };
    }

    this._advanceTurn();
    return { success: true };
  }

  /**
   * Auto-action when turn timer expires: play random valid tile, else draw/pass.
   * @param {string} playerId
   */
  autoPlay(playerId) {
    if (this.phase !== 'playing' || playerId !== this.currentPlayerId) {
      return { success: false };
    }

    const moves = this.getValidMoves(playerId);
    if (moves.length > 0) {
      const pick = moves[Math.floor(Math.random() * moves.length)];
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

  /**
   * @param {string} winnerId
   * @param {'domino' | 'blocked'} reason
   */
  _finishGame(winnerId, reason) {
    this.phase = 'finished';
    this.winnerId = winnerId;

    let totalPips = 0;
    for (const id of this.playerIds) {
      if (id === winnerId) continue;
      for (const tile of this.hands[id]) {
        totalPips += tilePips(tile);
      }
    }

    this.scores[winnerId] = (this.scores[winnerId] || 0) + totalPips;
    this.lastAction = { type: 'gameover', winnerId, reason, points: totalPips };
  }

  _finishBlocked() {
    let lowestPips = Infinity;
    let winnerId = this.playerIds[0];

    for (const id of this.playerIds) {
      let pips = 0;
      for (const tile of this.hands[id]) {
        pips += tilePips(tile);
      }
      if (pips < lowestPips) {
        lowestPips = pips;
        winnerId = id;
      }
    }

    this._finishGame(winnerId, 'blocked');
  }

  /** Pause turn timer (e.g. on disconnect). */
  pauseTurnTimer() {
    if (this.turnTimerPaused || this.phase !== 'playing') return;
    this.turnTimerPaused = true;
    this.turnTimerPausedAt = Date.now();
    const elapsed = Date.now() - this.turnStartedAt;
    this.turnTimerRemainingMs = Math.max(0, 30000 - elapsed);
  }

  /** Resume turn timer after reconnect. */
  resumeTurnTimer() {
    if (!this.turnTimerPaused) return;
    this.turnTimerPaused = false;
    this.turnStartedAt = Date.now() - (30000 - this.turnTimerRemainingMs);
    this.turnTimerPausedAt = null;
  }

  /**
   * Remaining ms on current turn (respects pause).
   * @returns {number}
   */
  getTurnTimeRemaining() {
    if (this.phase !== 'playing') return 0;
    if (this.turnTimerPaused) return this.turnTimerRemainingMs;
    return Math.max(0, 30000 - (Date.now() - this.turnStartedAt));
  }

  /**
   * Build a public state snapshot for a specific viewer.
   * Hides other players' tiles and the boneyard contents.
   * @param {string} viewerId
   */
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
        this.playerIds.map((id) => [id, this.hands[id].length])
      ),
      boneyardCount: this.boneyard.length,
      scores: { ...this.scores },
      winnerId: this.winnerId,
      lastAction: this.lastAction,
      turnTimeRemaining: this.getTurnTimeRemaining(),
      turnTimerPaused: this.turnTimerPaused,
      validMoves: playerId =>
        viewerId === playerId ? this.getValidMoves(viewerId) : [],
    };
  }

  /**
   * Sanitized state payload sent over the wire.
   * @param {string} viewerId
   */
  serializeForPlayer(viewerId) {
    const state = this.getPublicState(viewerId);
    return {
      phase: state.phase,
      board: state.board,
      openEnds: state.openEnds,
      currentPlayerId: state.currentPlayerId,
      playerIds: state.playerIds,
      myHand: state.myHand,
      tileCounts: state.tileCounts,
      boneyardCount: state.boneyardCount,
      scores: state.scores,
      winnerId: state.winnerId,
      lastAction: state.lastAction,
      turnTimeRemaining: state.turnTimeRemaining,
      turnTimerPaused: state.turnTimerPaused,
      validMoves:
        viewerId === this.currentPlayerId
          ? this.getValidMoves(viewerId).map((m) => ({
              tile: m.tile,
              end: m.end,
            }))
          : [],
    };
  }
}
