/**
 * برا السالفة / Out of the Loop — scoring rules.
 *
 * Points (نقاط): cumulative per player; tie-breaker at match end.
 * Round victories (فوز الجولة): outcast alone vs insider team toward roundsToWin.
 */

/** @typedef {'outcast_stole_win' | 'wrong_accusation' | 'insiders_win'} BaraRoundOutcomeType */

export const BARA_SCORING = {
	/** Outcast guesses the secret word after being voted out. */
	OUTCAST_CORRECT_GUESS_OUTCAST: 2,
	/** Group voted out an innocent player. */
	WRONG_VOTE_OUTCAST: 2,
	/** Each insider when outcast was caught but guessed wrong. */
	INSIDER_WHEN_OUTCAST_FAILS_GUESS: 1,
};

/**
 * Apply official round outcome points and team round victories.
 *
 * @param {{
 *   roundOutcome: { type: BaraRoundOutcomeType } | null;
 *   outcastId: string | null;
 *   playerIds: string[];
 *   scores: Record<string, number>;
 *   roundWins: Record<string, number>;
 *   insiderRoundWins: number;
 *   outcastRoundWins: number;
 * }} state
 * @returns {{ insiderRoundWins: number; outcastRoundWins: number; roundWinnerSide: 'outcast' | 'insiders' | null }}
 */
export function applyBaraRoundScoring(state) {
	const {
		roundOutcome,
		outcastId,
		playerIds,
		scores,
		roundWins,
		insiderRoundWins,
		outcastRoundWins,
	} = state;

	if (!roundOutcome || !outcastId) {
		return {
			insiderRoundWins,
			outcastRoundWins,
			roundWinnerSide: null,
		};
	}

	let nextInsider = insiderRoundWins;
	let nextOutcast = outcastRoundWins;

	if (roundOutcome.type === "outcast_stole_win") {
		scores[outcastId] =
			(scores[outcastId] || 0) + BARA_SCORING.OUTCAST_CORRECT_GUESS_OUTCAST;
		roundWins[outcastId] = (roundWins[outcastId] || 0) + 1;
		nextOutcast += 1;
		return {
			insiderRoundWins: nextInsider,
			outcastRoundWins: nextOutcast,
			roundWinnerSide: "outcast",
		};
	}

	if (roundOutcome.type === "wrong_accusation") {
		scores[outcastId] =
			(scores[outcastId] || 0) + BARA_SCORING.WRONG_VOTE_OUTCAST;
		roundWins[outcastId] = (roundWins[outcastId] || 0) + 1;
		nextOutcast += 1;
		return {
			insiderRoundWins: nextInsider,
			outcastRoundWins: nextOutcast,
			roundWinnerSide: "outcast",
		};
	}

	if (roundOutcome.type === "insiders_win") {
		for (const id of playerIds) {
			if (id !== outcastId) {
				scores[id] =
					(scores[id] || 0) + BARA_SCORING.INSIDER_WHEN_OUTCAST_FAILS_GUESS;
			}
		}
		nextInsider += 1;
		return {
			insiderRoundWins: nextInsider,
			outcastRoundWins: nextOutcast,
			roundWinnerSide: "insiders",
		};
	}

	return {
		insiderRoundWins: nextInsider,
		outcastRoundWins: nextOutcast,
		roundWinnerSide: null,
	};
}

/**
 * @param {number} insiderRoundWins
 * @param {number} outcastRoundWins
 * @param {number} roundsToWin
 */
export function isBaraMatchOver(
	insiderRoundWins,
	outcastRoundWins,
	roundsToWin,
) {
	return insiderRoundWins >= roundsToWin || outcastRoundWins >= roundsToWin;
}

/**
 * @param {number} insiderRoundWins
 * @param {number} outcastRoundWins
 * @param {string} outcastId
 * @param {Record<string, number>} scores
 * @param {string[]} playerIds
 */
export function resolveBaraMatchWinnerId(
	insiderRoundWins,
	outcastRoundWins,
	outcastId,
	scores,
	playerIds,
) {
	if (outcastRoundWins > insiderRoundWins) {
		return outcastId;
	}
	if (insiderRoundWins > outcastRoundWins) {
		let best = null;
		let bestScore = -1;
		for (const id of playerIds) {
			if (id === outcastId) continue;
			const pts = scores[id] || 0;
			if (pts > bestScore) {
				bestScore = pts;
				best = id;
			}
		}
		return best;
	}
	return (
		[...playerIds].sort((a, b) => (scores[b] || 0) - (scores[a] || 0))[0] ??
		null
	);
}
