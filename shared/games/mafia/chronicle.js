/**
 * Structured narrator chronicle — grouped by day / night for review.
 */

/**
 * @typedef {'setup'|'day'|'night'|'morning'|'match_over'} ChroniclePeriodType
 */

/**
 * @typedef {object} ChroniclePeriod
 * @property {ChroniclePeriodType} type
 * @property {number} dayNumber
 * @property {number} nightNumber
 */

/**
 * @typedef {object} ChronicleEntry
 * @property {number} at
 * @property {string} kind
 * @property {ChroniclePeriod} period
 * @property {string} [playerId]
 * @property {string} [actorPlayerId]
 * @property {string} [targetId]
 * @property {string} [roleId]
 * @property {string} [alignment]
 * @property {string} [stepKey]
 * @property {string} [stepTitleEn]
 * @property {boolean} [skipped]
 * @property {string[]} [deaths]
 * @property {string[]} [saved]
 * @property {string[]} [silenced]
 * @property {'good'|'evil'} [winnerTeam]
 */

/**
 * @param {ChroniclePeriod} period
 */
export function periodLabel(period) {
	switch (period.type) {
		case "setup":
			return "Setup & role reveal";
		case "day":
			return period.dayNumber === 1 ? "Day 1" : `Day ${period.dayNumber}`;
		case "night":
			return `Night ${period.nightNumber}`;
		case "morning":
			return period.dayNumber === 0 ?
					"Day 1"
				:	`Day ${period.dayNumber + 1}`;
		case "match_over":
			return "Match end";
		default:
			return "Log";
	}
}

/**
 * @param {ChroniclePeriod} period
 */
export function periodKey(period) {
	return `${period.type}:${period.dayNumber}:${period.nightNumber}`;
}

/**
 * @param {ChronicleEntry[]} entries
 */
export function buildChronicleSections(entries) {
	/** @type {Map<string, { key: string, period: ChroniclePeriod, label: string, entries: ChronicleEntry[] }>} */
	const map = new Map();

	for (const entry of entries) {
		if (entry.kind === "phase_morning") continue;
		const key = periodKey(entry.period);
		if (!map.has(key)) {
			map.set(key, {
				key,
				period: entry.period,
				label: periodLabel(entry.period),
				entries: [],
			});
		}
		map.get(key).entries.push(entry);
	}

	return [...map.values()].reverse();
}
