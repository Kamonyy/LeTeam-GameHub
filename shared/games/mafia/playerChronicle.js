import { buildChronicleSections } from "./chronicle.js";

/** @type {Record<string, string>} */
const STEP_KEY_TO_ROLE_ID = {
	healer: "doctor",
	mafia: "mafia",
	sniper: "sniper",
	seer: "seer",
	sheriff: "sheriff",
};

/** @type {Record<string, string>} */
const ROLE_PLAYER_NIGHT_ACTION_KIND = {
	doctor: "player_doctor_action",
	mafia: "player_mafia_action",
	seer: "player_seer_action",
	sniper: "player_sniper_action",
	sheriff: "player_sheriff_action",
};

/**
 * @param {string | null | undefined} stepKey
 * @param {string | null | undefined} viewerRoleId
 */
function canViewerSeeNightStep(stepKey, viewerRoleId) {
	if (!stepKey || !viewerRoleId) return false;
	return STEP_KEY_TO_ROLE_ID[stepKey] === viewerRoleId;
}

/**
 * @param {import("./chronicle.js").ChronicleEntry} e
 * @param {string} viewerRoleId
 */
function transformNightStepForViewer(e, viewerRoleId) {
	const kind = ROLE_PLAYER_NIGHT_ACTION_KIND[viewerRoleId];
	if (!kind || !canViewerSeeNightStep(e.stepKey, viewerRoleId)) return null;
	return {
		at: e.at,
		kind,
		period: e.period,
		targetId: e.targetId,
		skipped: e.skipped,
		nightNumber: e.nightNumber,
	};
}

/**
 * @param {import("./chronicle.js").ChronicleEntry[]} entries
 * @param {string} viewerId
 * @param {string | null | undefined} viewerRoleId
 * @param {boolean} [revealRoleOnDeath=true]
 */
export function buildPlayerLogEntries(
	entries,
	viewerId,
	viewerRoleId,
	revealRoleOnDeath = true,
) {
	/** @type {import("./chronicle.js").ChronicleEntry[]} */
	const filtered = [];

	for (const e of entries) {
		switch (e.kind) {
			case "game_start":
				filtered.push({ ...e, kind: "player_game_start" });
				break;
			case "oath":
				if (e.playerId === viewerId) {
					filtered.push({ ...e, kind: "player_role_seen" });
				}
				break;
			case "phase_day":
				filtered.push({ ...e, kind: "player_phase_day" });
				break;
			case "phase_night":
				filtered.push({ ...e, kind: "player_phase_night" });
				break;
			case "phase_morning":
				break;
			case "day_elimination": {
				/** @type {import("./chronicle.js").ChronicleEntry} */
				const voteOut = {
					...e,
					kind:
						e.targetId === viewerId ?
							"player_you_voted_out"
						:	"player_vote_out",
				};
				if (!revealRoleOnDeath) delete voteOut.roleId;
				filtered.push(voteOut);
				break;
			}
			case "night_step": {
				if (!viewerRoleId || viewerRoleId === "villager") break;
				// Seer inspect result is logged separately via seer_result
				if (e.stepKey === "seer" && !e.skipped) break;
				const action = transformNightStepForViewer(e, viewerRoleId);
				if (action) filtered.push(action);
				break;
			}
			case "seer_result":
				if (viewerRoleId === "seer" && e.targetId && e.alignment) {
					filtered.push({
						at: e.at,
						kind: "player_seer_action",
						period: e.period,
						targetId: e.targetId,
						alignment: e.alignment,
						skipped: false,
						nightNumber: e.nightNumber,
					});
				}
				break;
			case "night_resolved": {
				const deaths = e.deaths ?? [];
				const saved = e.saved ?? [];
				const silenced = e.silenced ?? [];

				if (saved.length > 0 && viewerRoleId === "doctor") {
					filtered.push({
						at: e.at,
						kind: "player_doctor_blocked_kill",
						period: e.period,
						nightNumber: e.nightNumber,
					});
				}
				if (saved.length > 0 && viewerRoleId === "mafia") {
					filtered.push({
						at: e.at,
						kind: "player_mafia_kill_blocked",
						period: e.period,
						nightNumber: e.nightNumber,
					});
				}

				if (deaths.length === 0) {
					filtered.push({
						at: e.at,
						kind: "player_peaceful_night",
						period: e.period,
						nightNumber: e.nightNumber,
					});
				} else {
					for (const id of deaths) {
						filtered.push({
							at: e.at,
							kind:
								id === viewerId ? "player_you_died" : "player_death",
							period: e.period,
							targetId: id,
							nightNumber: e.nightNumber,
						});
					}
				}
				if (silenced.includes(viewerId)) {
					filtered.push({
						at: e.at,
						kind: "player_silenced",
						period: e.period,
						nightNumber: e.nightNumber,
					});
				}
				break;
			}
			case "win":
				filtered.push({ ...e, kind: "player_win" });
				break;
			default:
				break;
		}
	}

	return filtered;
}

/**
 * @param {import("./chronicle.js").ChronicleEntry[]} entries
 * @param {string} viewerId
 * @param {string | null | undefined} viewerRoleId
 * @param {boolean} [revealRoleOnDeath=true]
 */
export function buildPlayerChronicle(
	entries,
	viewerId,
	viewerRoleId,
	revealRoleOnDeath = true,
) {
	return buildChronicleSections(
		buildPlayerLogEntries(
			entries,
			viewerId,
			viewerRoleId,
			revealRoleOnDeath,
		),
	);
}
