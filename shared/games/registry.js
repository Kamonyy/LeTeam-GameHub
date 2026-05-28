import { DominoEngine } from './dominoes/DominoEngine.js';
import { WordGameEngine } from './wordgame/WordGameEngine.js';
import { BaraAlsalafaEngine } from './bara-alsalafa/BaraAlsalafaEngine.js';
import { MafiaEngine } from './mafia/MafiaEngine.js';
import { SketchDrawEngine } from './sketch-draw/SketchDrawEngine.js';
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
  SKETCH_DRAW_MIN_PLAYERS,
  SKETCH_DRAW_MAX_PLAYERS,
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
    createEngine: (playerIds, settings) => new MafiaEngine(playerIds, settings),
  },
  'sketch-draw': {
    enabled: GAME_ENABLED['sketch-draw'],
    minPlayers: SKETCH_DRAW_MIN_PLAYERS,
    maxPlayers: SKETCH_DRAW_MAX_PLAYERS,
    createEngine: (playerIds, settings) => new SketchDrawEngine(playerIds, settings),
  },
};

export function getGame(gameType) {
  return GAMES[gameType] ?? null;
}
