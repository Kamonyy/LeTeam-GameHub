/**
 * Cryptographically unbiased random integers and Fisher–Yates shuffle.
 * Uses global crypto.getRandomValues (Node, Workers, browsers).
 */

function cryptoRandomUint32() {
	const buf = new Uint32Array(1);
	crypto.getRandomValues(buf);
	return buf[0];
}

/** Uniform integer in [0, max) without modulo bias. */
export function cryptoRandomInt(max) {
	if (max <= 0) return 0;
	if (max === 1) return 0;
	const limit = Math.floor(0x1_0000_0000 / max) * max;
	let x;
	do {
		x = cryptoRandomUint32();
	} while (x >= limit);
	return x % max;
}

/** In-place Fisher–Yates shuffle with crypto randomness. */
export function fisherYatesShuffle(arr) {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = cryptoRandomInt(i + 1);
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr;
}
