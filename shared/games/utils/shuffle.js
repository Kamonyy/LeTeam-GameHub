/**
 * Fisher–Yates shuffle utilities.
 */

/**
 * @template T
 * @param {T[]} array
 * @param {(max: number) => number} randomInt — returns integer in [0, max)
 * @returns {T[]}
 */
export function fisherYatesShuffle(array, randomInt) {
	const result = [...array];
	for (let i = result.length - 1; i > 0; i -= 1) {
		const j = randomInt(i + 1);
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

/**
 * In-place Fisher–Yates shuffle using Math.random.
 * @template T
 * @param {T[]} array
 * @returns {T[]}
 */
export function shuffleInPlace(array) {
	for (let i = array.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

/**
 * @template T
 * @param {T[]} array
 * @returns {T[]}
 */
export function shuffleArray(array) {
	return shuffleInPlace([...array]);
}
