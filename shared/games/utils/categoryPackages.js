/**
 * Shared category package helpers for Bara and Sketch Draw word packs.
 */

/**
 * @param {Map<string, unknown>} packById
 * @param {string[]} allIds
 * @param {string} defaultId
 * @param {{ categoryPackageIds?: string[], categoryPackageId?: string }} settings
 * @returns {string[]}
 */
export function normalizeCategoryPackageIds(
	packById,
	allIds,
	defaultId,
	settings = {},
) {
	if (Array.isArray(settings.categoryPackageIds)) {
		const raw = settings.categoryPackageIds
			.slice(0, allIds.length)
			.filter((id) => typeof id === "string");
		const valid = raw.filter((id) => packById.has(id));
		if (valid.length > 0) return [...new Set(valid)];
	}
	if (
		settings.categoryPackageId &&
		allIds.includes(settings.categoryPackageId)
	) {
		return [settings.categoryPackageId];
	}
	return [defaultId];
}

/**
 * @param {Map<string, { words: string[] }>} packById
 * @param {string[]} ids
 * @returns {string[]}
 */
export function getMergedWordPool(packById, ids) {
	const words = [];
	for (const id of ids) {
		const pkg = packById.get(id);
		if (pkg) words.push(...pkg.words);
	}
	return [...new Set(words)];
}

/**
 * @param {Array<{ nameAr: string }>} packages
 * @returns {string}
 */
export function formatCategoryNamesAr(packages) {
	const names = packages.map((p) => p.nameAr);
	if (names.length === 0) return "";
	if (names.length === 1) return names[0];
	if (names.length === 2) return `${names[0]} و${names[1]}`;
	return `${names.slice(0, -1).join("، ")} و${names[names.length - 1]}`;
}

/**
 * @param {Array<{ nameEn: string }>} packages
 * @returns {string}
 */
export function formatCategoryNamesEn(packages) {
	const names = packages.map((p) => p.nameEn);
	if (names.length === 0) return "";
	if (names.length === 1) return names[0];
	if (names.length === 2) return `${names[0]} & ${names[1]}`;
	return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

/**
 * @param {string[]} pool
 * @param {number} count
 * @returns {string[]}
 */
export function pickRandomWords(pool, count) {
	const copy = [...pool];
	const picked = [];
	while (picked.length < count && copy.length > 0) {
		const idx = Math.floor(Math.random() * copy.length);
		picked.push(copy.splice(idx, 1)[0]);
	}
	return picked;
}

/**
 * @param {Array<{ id: string, nameAr: string, nameEn: string, description?: string, words: string[] }>} packages
 */
export function getCategoryManifest(packages) {
	return packages.map((p) => ({
		id: p.id,
		nameAr: p.nameAr,
		nameEn: p.nameEn,
		description: p.description,
		wordCount: p.words.length,
		sampleWords: p.words.slice(0, 6),
	}));
}
