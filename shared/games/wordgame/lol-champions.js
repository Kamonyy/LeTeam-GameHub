/**
 * League of Legends champion roster for Secret Word (Data Dragon).
 * Regenerate: npm run fetch:lol-champions (from frontend/)
 */

import championsData from './data/lol-champions.json' with { type: 'json' };

function loadData() {
  return championsData;
}

export const LOL_DDRAGON_VERSION = () => loadData().version;

/** @returns {{ id: string, key: string, name: string }[]} */
export function getLolChampions() {
  return loadData().champions;
}

/** @param {string} id */
export function getLolChampionById(id) {
  if (!id || typeof id !== 'string') return null;
  return getLolChampions().find((c) => c.id === id) ?? null;
}

/** @param {string} id */
export function isValidLolChampionId(id) {
  return !!getLolChampionById(id);
}

export function normalizeWordCategory(raw) {
  return raw === 'lol-champions' ? 'lol-champions' : 'custom';
}
