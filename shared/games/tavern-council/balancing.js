import { ROLE_IDS } from "./roles.js";

/**
 * Suggested role counts by player count (mafia, seer, doctor, sniper, sheriff, villagers).
 * @param {number} playerCount
 */
export function suggestBalancedSetup(playerCount) {
	const counts = {
		mafia: 0,
		seer: 0,
		doctor: 0,
		sniper: 0,
		sheriff: 0,
		villager: 0,
	};

	if (playerCount < 5) {
		return { counts, warnings: ["Need at least 5 players for a fair game."] };
	}

	if (playerCount <= 6) {
		counts.mafia = 1;
		counts.seer = 1;
		counts.doctor = 1;
		counts.villager = playerCount - 3;
	} else if (playerCount <= 9) {
		counts.mafia = playerCount <= 7 ? 1 : 2;
		counts.seer = 1;
		counts.doctor = 1;
		counts.sniper = playerCount >= 8 ? 1 : 0;
		counts.villager =
			playerCount -
			counts.mafia -
			counts.seer -
			counts.doctor -
			counts.sniper;
	} else {
		counts.mafia = Math.max(2, Math.floor(playerCount / 4));
		counts.seer = 1;
		counts.doctor = 1;
		counts.sniper = 1;
		counts.sheriff = playerCount >= 11 ? 1 : 0;
		const special =
			counts.mafia +
			counts.seer +
			counts.doctor +
			counts.sniper +
			counts.sheriff;
		counts.villager = Math.max(0, playerCount - special);
	}

	const warnings = validateSetup(playerCount, counts);
	return { counts, warnings };
}

/**
 * Strict lobby validation before starting a game.
 * @param {number} gameplayPlayerCount — players receiving roles (excludes narrator)
 * @param {Record<string, number>} roleCounts
 * @returns {{ valid: boolean, errors: string[], warnings: string[], roleTotal: number, gameplayCount: number, matches: boolean, slotsRemaining: number }}
 */
export function validateLobbySetup(gameplayPlayerCount, roleCounts) {
	const errors = [];
	const warnings = [];
	let roleTotal = 0;

	for (const id of ROLE_IDS) {
		const raw = Number(roleCounts?.[id]);
		const n = Number.isFinite(raw) ? raw : 0;
		if (n < 0) {
			errors.push(`Invalid negative count for ${id}.`);
		}
		roleTotal += n;
	}

	if (gameplayPlayerCount < 5) {
		errors.push("Need at least 5 gameplay players for a fair game.");
	}
	if (roleTotal !== gameplayPlayerCount) {
		errors.push(
			`Role total (${roleTotal}) must equal gameplay players (${gameplayPlayerCount}).`,
		);
	}
	const mafia = Number(roleCounts?.mafia) || 0;
	if (mafia < 1) {
		errors.push("At least one Mafia is required.");
	}
	if (
		gameplayPlayerCount > 0 &&
		mafia >= Math.ceil(gameplayPlayerCount / 2)
	) {
		errors.push("Too many Mafia for a fair game.");
	}
	if ((roleCounts?.seer ?? 0) > 1) {
		warnings.push("More than one Seer is unusual.");
	}

	if (gameplayPlayerCount > 11) {
		errors.push("At most 11 gameplay players (narrator is separate).");
	}

	const slotsRemaining = Math.max(0, gameplayPlayerCount - roleTotal);
	const matches = roleTotal === gameplayPlayerCount;

	return {
		valid: errors.length === 0,
		errors,
		warnings,
		roleTotal,
		gameplayCount: gameplayPlayerCount,
		matches,
		slotsRemaining,
	};
}

/**
 * @param {number} playerCount
 * @param {Record<string, number>} counts
 */
export function validateSetup(playerCount, counts) {
	const { errors, warnings } = validateLobbySetup(playerCount, counts);
	return [...errors, ...warnings];
}

/**
 * Ensure every role id is present; missing keys become 0 (not in this game).
 * @param {Record<string, number> | null | undefined} roleCounts
 */
export function normalizeRoleCounts(roleCounts) {
	/** @type {Record<string, number>} */
	const normalized = {};
	for (const id of ROLE_IDS) {
		const n = Number(roleCounts?.[id]);
		normalized[id] =
			Number.isInteger(n) && n >= 0 ? n : 0;
	}
	return normalized;
}

/**
 * Build role id array from counts, shuffled.
 * @param {Record<string, number>} counts
 */
export function expandRolePool(counts) {
	const normalized = normalizeRoleCounts(counts);
	/** @type {string[]} */
	const pool = [];
	for (const id of ROLE_IDS) {
		const n = normalized[id];
		for (let i = 0; i < n; i++) pool.push(id);
	}
	for (let i = pool.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[pool[i], pool[j]] = [pool[j], pool[i]];
	}
	return pool;
}
