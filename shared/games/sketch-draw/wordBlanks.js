/**
 * Format secret word as per-letter blanks for the guess UI.
 * @param {string} secret
 * @returns {string}
 */
export function formatWordBlanks(secret) {
  if (typeof secret !== "string" || !secret) return "";
  return [...secret]
    .map((ch) => (/\s/.test(ch) ? "·" : "_"))
    .join(" ");
}

/**
 * @param {string} secret
 * @returns {number}
 */
export function countWordLetters(secret) {
  if (typeof secret !== "string") return 0;
  return [...secret].filter((ch) => !/\s/.test(ch)).length;
}
