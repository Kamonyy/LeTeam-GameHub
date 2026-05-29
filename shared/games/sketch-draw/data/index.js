/**
 * Sketch Draw category library — static word packs.
 */

import { SKETCH_CATEGORY_PACKAGES } from "./word-packs.js";
import {
	normalizeCategoryPackageIds as normalizeCategoryPackageIdsUtil,
	getMergedWordPool as getMergedWordPoolUtil,
	formatCategoryNamesAr as formatCategoryNamesArUtil,
	formatCategoryNamesEn as formatCategoryNamesEnUtil,
	pickRandomWords as pickRandomWordsUtil,
	getCategoryManifest as getCategoryManifestUtil,
} from "../../utils/categoryPackages.js";

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
	return normalizeCategoryPackageIdsUtil(
		PACK_BY_ID,
		SKETCH_CATEGORY_PACKAGE_IDS,
		"animals",
		settings,
	);
}

/** @param {string[]} ids */
export function getMergedWordPool(ids) {
	return getMergedWordPoolUtil(PACK_BY_ID, ids);
}

/** @param {string[]} ids */
export function formatCategoryNamesAr(ids) {
	return formatCategoryNamesArUtil(getCategoryPackages(ids));
}

/** @param {string[]} ids */
export function formatCategoryNamesEn(ids) {
	return formatCategoryNamesEnUtil(getCategoryPackages(ids));
}

/** @param {string[]} pool @param {number} count */
export function pickRandomWords(pool, count) {
	return pickRandomWordsUtil(pool, count);
}

/** Lobby / UI manifest (no full word lists). */
export function getCategoryManifest() {
	return getCategoryManifestUtil(SKETCH_CATEGORY_PACKAGES);
}
