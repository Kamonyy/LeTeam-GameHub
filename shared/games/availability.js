/**
 * Canonical game availability flags (hub UI + API).
 * Imported by registry.js for room/create/start guards and by the frontend catalog.
 */
export const GAME_ENABLED = {
  dominoes: false,
  wordgame: true,
  'bara-alsalafa': true,
  mafia: true,
  'sketch-draw': false,
};

export function isGameEnabled(gameType) {
  return gameType in GAME_ENABLED && GAME_ENABLED[gameType] === true;
}
