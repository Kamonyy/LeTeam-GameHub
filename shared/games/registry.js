import { DominoEngine } from './dominoes/DominoEngine.js';
import { WordGameEngine } from './wordgame/WordGameEngine.js';
import {
  DEFAULT_MAX_PLAYERS,
  DEFAULT_MIN_PLAYERS,
  WORD_GAME_MAX_PLAYERS,
  WORD_GAME_MIN_PLAYERS,
} from '../hub/constants.js';

/** @typedef {{ minPlayers: number, maxPlayers: number, createEngine: (playerIds: string[], settings?: object) => object }} GameDefinition */

/** @type {Record<string, GameDefinition & { enabled?: boolean }>} */
export const GAMES = {
  dominoes: {
    enabled: false,
    minPlayers: DEFAULT_MIN_PLAYERS,
    maxPlayers: DEFAULT_MAX_PLAYERS,
    createEngine: (playerIds, settings) => new DominoEngine(playerIds, settings),
  },
  wordgame: {
    enabled: true,
    minPlayers: WORD_GAME_MIN_PLAYERS,
    maxPlayers: WORD_GAME_MAX_PLAYERS,
    createEngine: (playerIds, settings) => new WordGameEngine(playerIds, settings),
  },
};

export function getGame(gameType) {
  return GAMES[gameType] ?? null;
}

export function isGameEnabled(gameType) {
  const game = GAMES[gameType];
  return !!game && game.enabled !== false;
}
