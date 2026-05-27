import { DominoEngine } from './dominoes/DominoEngine.js';
import { DEFAULT_MAX_PLAYERS, DEFAULT_MIN_PLAYERS } from '../hub/constants.js';

/** @typedef {{ minPlayers: number, maxPlayers: number, createEngine: (playerIds: string[], settings?: object) => object }} GameDefinition */

/** @type {Record<string, GameDefinition>} */
export const GAMES = {
  dominoes: {
    minPlayers: DEFAULT_MIN_PLAYERS,
    maxPlayers: DEFAULT_MAX_PLAYERS,
    createEngine: (playerIds, settings) => new DominoEngine(playerIds, settings),
  },
};

export function getGame(gameType) {
  return GAMES[gameType] ?? null;
}
