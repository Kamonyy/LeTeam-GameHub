/**
 * Category library for برا السالفة — 25 packs, multi-select in lobby.
 */

import { PACKS_A } from "./packs-a.js";
import { PACKS_B } from "./packs-b.js";

/** @type {import('./types.js').CategoryPackage[]} */
export const CATEGORY_PACKAGES = [...PACKS_A, ...PACKS_B];

export const CATEGORY_PACKAGE_IDS = CATEGORY_PACKAGES.map((p) => p.id);

const PACK_BY_ID = new Map(CATEGORY_PACKAGES.map((p) => [p.id, p]));

/** @param {string} id */
export function getCategoryPackage(id) {
  return PACK_BY_ID.get(id) ?? null;
}

/** @param {string[]} ids */
export function getCategoryPackages(ids) {
  return ids.map((id) => getCategoryPackage(id)).filter(Boolean);
}

/**
 * @param {{ categoryPackageIds?: string[], categoryPackageId?: string }} settings
 * @returns {string[]}
 */
export function normalizeCategoryPackageIds(settings = {}) {
  if (Array.isArray(settings.categoryPackageIds)) {
    const valid = settings.categoryPackageIds.filter((id) =>
      CATEGORY_PACKAGE_IDS.includes(id),
    );
    if (valid.length > 0) return [...new Set(valid)];
  }
  if (
    settings.categoryPackageId &&
    CATEGORY_PACKAGE_IDS.includes(settings.categoryPackageId)
  ) {
    return [settings.categoryPackageId];
  }
  return ["food"];
}

/** @param {string[]} ids */
export function getMergedWordPool(ids) {
  const words = [];
  for (const id of ids) {
    const pkg = getCategoryPackage(id);
    if (pkg) words.push(...pkg.words);
  }
  return [...new Set(words)];
}

/** Display label for one or more categories (Arabic). */
export function formatCategoryNamesAr(ids) {
  const names = getCategoryPackages(ids).map((p) => p.nameAr);
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} و${names[1]}`;
  return `${names.slice(0, -1).join("، ")} و${names[names.length - 1]}`;
}

/** @param {string[]} pool @param {number} count */
export function pickRandomWords(pool, count) {
  const copy = [...pool];
  const picked = [];
  while (picked.length < count && copy.length > 0) {
    const idx = Math.floor(Math.random() * copy.length);
    picked.push(copy.splice(idx, 1)[0]);
  }
  return picked;
}

/** Lobby / UI manifest (no full word lists). */
export function getCategoryManifest() {
  return CATEGORY_PACKAGES.map((p) => ({
    id: p.id,
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    description: p.description,
    wordCount: p.words.length,
    sampleWords: p.words.slice(0, 6),
  }));
}
