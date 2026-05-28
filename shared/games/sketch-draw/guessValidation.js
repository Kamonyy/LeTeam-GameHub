/**
 * Guess normalization and proximity checks for Sketch Draw.
 */

/**
 * @param {string} raw
 * @returns {string}
 */
export function normalizeGuess(raw) {
  if (typeof raw !== "string") return "";
  return raw.trim().replace(/\s+/g, " ");
}

/**
 * @param {string} a
 * @param {string} b
 */
export function guessesMatchExactly(a, b) {
  const na = normalizeGuess(a);
  const nb = normalizeGuess(b);
  if (!na || !nb) return false;
  return na.toLowerCase() === nb.toLowerCase();
}

/**
 * Edit distance 1 when lengths match (single substitution).
 * Equivalent to Levenshtein distance 1 for equal-length strings.
 * @param {string} guess
 * @param {string} secret
 */
export function isCloseGuess(guess, secret) {
  const g = normalizeGuess(guess);
  const s = normalizeGuess(secret);
  if (!g || !s || g.length !== s.length) return false;

  let mismatches = 0;
  for (let i = 0; i < g.length; i++) {
    if (g[i].toLowerCase() === s[i].toLowerCase()) continue;
    mismatches += 1;
    if (mismatches > 1) return false;
  }
  return mismatches === 1;
}
