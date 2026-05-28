/**
 * Sketch Draw category library — static word packs.
 */

import { SKETCH_CATEGORY_PACKAGES } from "./word-packs.js";

export { SKETCH_CATEGORY_PACKAGES };

export const SKETCH_CATEGORY_PACKAGE_IDS = SKETCH_CATEGORY_PACKAGES.map(
  (p) => p.id,
);

const PACK_BY_ID = new Map(SKETCH_CATEGORY_PACKAGES.map((p) => [p.id, p]));

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
    const raw = settings.categoryPackageIds
      .slice(0, SKETCH_CATEGORY_PACKAGE_IDS.length)
      .filter((id) => typeof id === "string");
    const valid = raw.filter((id) => PACK_BY_ID.has(id));
    if (valid.length > 0) return [...new Set(valid)];
  }
  if (
    settings.categoryPackageId &&
    SKETCH_CATEGORY_PACKAGE_IDS.includes(settings.categoryPackageId)
  ) {
    return [settings.categoryPackageId];
  }
  return ["animals"];
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

/** @param {string[]} ids */
export function formatCategoryNamesAr(ids) {
  const names = getCategoryPackages(ids).map((p) => p.nameAr);
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} و${names[1]}`;
  return `${names.slice(0, -1).join("، ")} و${names[names.length - 1]}`;
}

/** @param {string[]} ids */
export function formatCategoryNamesEn(ids) {
  const names = getCategoryPackages(ids).map((p) => p.nameEn);
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}
