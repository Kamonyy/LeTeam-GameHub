import { DominoEngine } from './dominoes/DominoEngine.js';
import { WordGameEngine } from './wordgame/WordGameEngine.js';
import { BaraAlsalafaEngine } from './bara-alsalafa/BaraAlsalafaEngine.js';
import { TavernCouncilEngine } from './tavern-council/TavernCouncilEngine.js';
import { GAME_ENABLED } from './availability.js';
import {
  DEFAULT_MAX_PLAYERS,
  DEFAULT_MIN_PLAYERS,
  WORD_GAME_MAX_PLAYERS,
  WORD_GAME_MIN_PLAYERS,
  BARA_MIN_PLAYERS,
  BARA_MAX_PLAYERS,
  MAFIA_MIN_PLAYERS,
  MAFIA_MAX_PLAYERS,
} from '../hub/constants.js';

export { isGameEnabled } from './availability.js';

/** @typedef {{ minPlayers: number, maxPlayers: number, createEngine: (playerIds: string[], settings?: object) => object }} GameDefinition */

/** @type {Record<string, GameDefinition & { enabled?: boolean }>} */
export const GAMES = {
  dominoes: {
    enabled: GAME_ENABLED.dominoes,
    minPlayers: DEFAULT_MIN_PLAYERS,
    maxPlayers: DEFAULT_MAX_PLAYERS,
    createEngine: (playerIds, settings) => new DominoEngine(playerIds, settings),
  },
  wordgame: {
    enabled: GAME_ENABLED.wordgame,
    minPlayers: WORD_GAME_MIN_PLAYERS,
    maxPlayers: WORD_GAME_MAX_PLAYERS,
    createEngine: (playerIds, settings) => new WordGameEngine(playerIds, settings),
  },
  'bara-alsalafa': {
    enabled: GAME_ENABLED['bara-alsalafa'],
    minPlayers: BARA_MIN_PLAYERS,
    maxPlayers: BARA_MAX_PLAYERS,
    createEngine: (playerIds, settings) => new BaraAlsalafaEngine(playerIds, settings),
  },
  mafia: {
    enabled: GAME_ENABLED.mafia,
    minPlayers: MAFIA_MIN_PLAYERS,
    maxPlayers: MAFIA_MAX_PLAYERS,
    createEngine: (playerIds, settings) => new TavernCouncilEngine(playerIds, settings),
  },
};

export function getGame(gameType) {
  return GAMES[gameType] ?? null;
}
