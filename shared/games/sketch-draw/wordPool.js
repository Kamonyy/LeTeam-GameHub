/**
 * Build active word pool from lobby settings.
 */

import { getMergedWordPool, normalizeCategoryPackageIds } from "./data/index.js";

const MIN_WORD_LENGTH = 2;
const MAX_WORD_LENGTH = 40;
const MIN_CUSTOM_ONLY_POOL = 10;

/**
 * @param {string} raw
 * @returns {string[]}
 */
export function parseCustomWords(raw) {
  if (typeof raw !== "string" || !raw.trim()) return [];
  const seen = new Set();
  const out = [];
  for (const part of raw.split(",")) {
    const w = part.trim().replace(/\s+/g, " ");
    if (w.length < MIN_WORD_LENGTH || w.length > MAX_WORD_LENGTH) continue;
    const key = w.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(w);
  }
  return out;
}

/**
 * @param {object} settings
 * @returns {{ pool: string[], error?: string }}
 */
export function buildActiveWordPool(settings = {}) {
  const custom = parseCustomWords(settings.customWords ?? "");
  const useCustomOnly = settings.useCustomWordsOnly === true;

  if (useCustomOnly) {
    if (custom.length < MIN_CUSTOM_ONLY_POOL) {
      return {
        pool: [],
        error: `Custom-only mode needs at least ${MIN_CUSTOM_ONLY_POOL} words`,
      };
    }
    return { pool: custom };
  }

  const ids = normalizeCategoryPackageIds(settings);
  const merged = [...getMergedWordPool(ids), ...custom];
  const deduped = [...new Set(merged)];
  if (deduped.length < 3) {
    return { pool: [], error: "Word pool too small — select categories or add custom words" };
  }
  return { pool: deduped };
}

/**
 * @param {string[]} pool
 * @param {Set<string>} used
 * @returns {string[]}
 */
export function pickThreeWords(pool, used = new Set()) {
  if (pool.length === 0) return [];
  const available = pool.filter((w) => !used.has(w));
  const source = available.length >= 3 ? available : pool;
  const copy = [...source];
  const picked = [];
  while (picked.length < 3 && copy.length > 0) {
    const i = Math.floor(Math.random() * copy.length);
    picked.push(copy.splice(i, 1)[0]);
  }
  while (picked.length < 3 && pool.length > 0) {
    picked.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return picked.slice(0, 3);
}
