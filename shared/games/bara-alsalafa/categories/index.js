/**
 * Category library for برا السالفة — 25 packs, multi-select in lobby.
 */

import { PACKS_A } from "./packs-a.js";
import { PACKS_B } from "./packs-b.js";
import {
	normalizeCategoryPackageIds as normalizeCategoryPackageIdsUtil,
	getMergedWordPool as getMergedWordPoolUtil,
	formatCategoryNamesAr as formatCategoryNamesArUtil,
	pickRandomWords as pickRandomWordsUtil,
	getCategoryManifest as getCategoryManifestUtil,
} from "../../utils/categoryPackages.js";

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
	return normalizeCategoryPackageIdsUtil(
		PACK_BY_ID,
		CATEGORY_PACKAGE_IDS,
		"food",
		settings,
	);
}

/** @param {string[]} ids */
export function getMergedWordPool(ids) {
	return getMergedWordPoolUtil(PACK_BY_ID, ids);
}

/** Display label for one or more categories (Arabic). */
export function formatCategoryNamesAr(ids) {
	return formatCategoryNamesArUtil(getCategoryPackages(ids));
}

/** @param {string[]} pool @param {number} count */
export function pickRandomWords(pool, count) {
	return pickRandomWordsUtil(pool, count);
}

/** Lobby / UI manifest (no full word lists). */
export function getCategoryManifest() {
	return getCategoryManifestUtil(CATEGORY_PACKAGES);
}
