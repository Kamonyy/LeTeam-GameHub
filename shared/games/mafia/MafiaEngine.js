/**
 * Mafia engine — face-to-face narrator assistant.
 * Gameplay players only in playerIds; narrator is outside the game.
 */

import { getRole, getRoleAccent, isEvilRole, alignmentLabel, ROLE_IDS } from "./roles.js";
import { colorForPlayerIndex } from "./playerColors.js";
import { getNightStep, nightStepCount } from "./nightSequence.js";
import {
	suggestBalancedSetup,
	validateLobbySetup,
	expandRolePool,
	normalizeRoleCounts,
} from "./balancing.js";
import { buildChronicleSections } from "./chronicle.js";
import { buildPlayerChronicle } from "./playerChronicle.js";
import { BaseGameEngine } from "../BaseGameEngine.js";

const EVENT_LOG_SERIALIZE_CAP = 20;

/** @typedef {'lobby'|'role_reveal'|'day'|'night'|'morning'|'match_over'} MafiaEnginePhase */

/**
 * @param {string[]} playerIds — gameplay players only (narrator excluded)
 * @param {{
 *   narratorId: string,
 *   revealRoleOnDeath?: boolean,
 *   roleCounts?: Record<string, number>,
 *   roleAssignments?: Record<string, string>,
 * }} settings
 */
export class MafiaEngine extends BaseGameEngine {
	constructor(playerIds, settings = {}) {
		if (playerIds.length < 5 || playerIds.length > 11) {
			throw new Error("Mafia requires 5–11 gameplay players (plus narrator)");
		}
		if (!settings.narratorId) {
			throw new Error("Narrator id is required");
		}
		if (playerIds.includes(settings.narratorId)) {
			throw new Error("Narrator must not be a gameplay player");
		}

		super(playerIds, settings);
		this.stateVersion = 1;

		this.narratorId = settings.narratorId;
		this.revealRoleOnDeath = settings.revealRoleOnDeath === true;
		this.roleCounts = normalizeRoleCounts(
			settings.roleCounts ??
				suggestBalancedSetup(playerIds.length).counts,
		);

		/** @type {MafiaEnginePhase} */
		this.phase = "role_reveal";
		this.dayNumber = 0;
		this.nightNumber = 0;

		/** @type {Record<string, { roleId: string, color: string, alive: boolean, roleAcknowledged: boolean }>} */
		this.players = {};
		/** @type {Record<string, string>} */
		this.roleByPlayer = {};
		/** @type {string[]} */
		this.silencedForDay = new Set();
		/** @type {string | null} */
		this.pendingSilencedForDay = null;
		/** @type {string | null} */
		this.lastSilencedPlayerId = null;
		this._aliveMafiaHolderIdsCache = null;
		/** @type {Record<string, string | null>} */
		this.nightTargets = {};
		this.nightStepIndex = 0;
		/** @type {string | null} */
		this.lastHealedPlayerId = null;
		this.eventLog = [];
		/** @type {import("./chronicle.js").ChronicleEntry[]} */
		this.logEntries = [];
		this.lastMorningSummary = null;
		this.winnerTeam = null;
		/** @type {Record<string, 'GOOD'|'EVIL'>} */
		this._seerResults = {};
		/** @type {{ playerId: string, alignment: 'GOOD'|'EVIL' } | null} */
		this._lastSeerReveal = null;

		/** @type {ReturnType<typeof buildChronicleSections> | null} */
		this._chronicleSectionsCache = null;
		/** @type {Map<string, ReturnType<typeof buildChronicleSections>>} */
		this._playerChronicleCache = new Map();

		this._assignRoles(settings.roleAssignments);
		this._logEntry("game_start", {});
	}

	_bump() {
		this._bumpStateVersion();
		this._chronicleSectionsCache = null;
		this._playerChronicleCache.clear();
	}

	/** @returns {ReturnType<typeof buildChronicleSections>} */
	_getChronicleSections() {
		if (!this._chronicleSectionsCache) {
			this._chronicleSectionsCache = buildChronicleSections(
				this.logEntries ?? [],
			);
		}
		return this._chronicleSectionsCache;
	}

	/**
	 * @param {string} viewerId
	 * @param {string | null | undefined} viewerRoleId
	 */
	_getPlayerChronicle(viewerId, viewerRoleId) {
		const key = `${viewerId}\0${viewerRoleId ?? ""}\0${this.revealRoleOnDeath}`;
		const cached = this._playerChronicleCache.get(key);
		if (cached) return cached;
		const sections = buildPlayerChronicle(
			this.logEntries ?? [],
			viewerId,
			viewerRoleId,
			this.revealRoleOnDeath,
		);
		this._playerChronicleCache.set(key, sections);
		return sections;
	}

	/**
	 * Player-safe morning summary (no seer/mafia narrator-only fields).
	 * @param {typeof this.lastMorningSummary} summary
	 */
	_playerSafeMorningSummary(summary) {
		if (!summary) return null;
		return {
			deaths: summary.deaths,
			saved: summary.saved,
			silenced: summary.silenced,
		};
	}

	/** @returns {import("./chronicle.js").ChroniclePeriod} */
	_logPeriod() {
		if (this.phase === "role_reveal") {
			return { type: "setup", dayNumber: 0, nightNumber: 0 };
		}
		if (this.phase === "day") {
			return {
				type: "day",
				dayNumber: this.dayNumber,
				nightNumber: 0,
			};
		}
		if (this.phase === "night") {
			return {
				type: "night",
				dayNumber: this.dayNumber,
				nightNumber: this.nightNumber,
			};
		}
		if (this.phase === "morning") {
			return {
				type: "morning",
				dayNumber: this.dayNumber,
				nightNumber: this.nightNumber,
			};
		}
		return {
			type: "match_over",
			dayNumber: this.dayNumber,
			nightNumber: this.nightNumber,
		};
	}

	/**
	 * @param {string} kind
	 * @param {Record<string, unknown>} [data]
	 */
	_logEntry(kind, data = {}) {
		const at = Date.now();
		/** @type {import("./chronicle.js").ChronicleEntry} */
		const entry = {
			at,
			kind,
			period: this._logPeriod(),
			...data,
		};
		this.logEntries.push(entry);
		if (this.logEntries.length > 150) this.logEntries.shift();
		this.eventLog.push({ at, message: this._legacyLogMessage(entry) });
		if (this.eventLog.length > 80) this.eventLog.shift();
	}

	/** @param {import("./chronicle.js").ChronicleEntry} entry */
	_legacyLogMessage(entry) {
		switch (entry.kind) {
			case "game_start":
				return "Game started — roles dealt.";
			case "oath":
				return `Player ${entry.playerId} acknowledged their role.`;
			case "phase_day":
				return `Day ${entry.dayNumber ?? this.dayNumber} begins.`;
			case "phase_night":
				return `Night ${entry.nightNumber ?? this.nightNumber} begins.`;
			case "phase_morning":
				return `Day ${Math.max(1, (entry.dayNumber ?? this.dayNumber) + 1)} — announce night outcomes.`;
			case "day_elimination": {
				const role = entry.roleId ? getRole(entry.roleId) : null;
				return `Day vote: ${entry.targetId} eliminated${role ? ` (${role.nameEn})` : ""}.`;
			}
			case "night_step": {
				const actor = entry.actorPlayerId ?? "unknown";
				if (entry.playAlong) return `${actor}: play-along (dead role)`;
				return entry.skipped ?
						`${actor}: no action`
					:	`${actor} → ${entry.targetId}`;
			}
			case "seer_result":
				return `${entry.actorPlayerId ?? "Seer"}: ${entry.targetId} is ${entry.alignment}`;
			case "night_resolved":
				return `Night resolved — ${(entry.deaths ?? []).length} death(s).`;
			case "win":
				return entry.winnerTeam === "good" ?
						"Good wins."
					:	"Evil wins.";
			default:
				return entry.kind;
		}
	}

	/**
	 * @param {Record<string, string> | undefined} overrides
	 */
	_assignRoles(overrides) {
		this.roleCounts = normalizeRoleCounts(this.roleCounts);
		const setup = validateLobbySetup(this.playerIds.length, this.roleCounts);
		if (!setup.valid) {
			throw new Error(setup.errors[0] ?? "Invalid role setup");
		}

		const pool = expandRolePool(this.roleCounts);
		if (pool.length !== this.playerIds.length) {
			throw new Error(
				`Role pool (${pool.length}) does not match player count (${this.playerIds.length})`,
			);
		}

		this.playerIds.forEach((id, i) => {
			const roleId =
				overrides?.[id] && getRole(overrides[id]) ? overrides[id] : pool[i];
			this.roleByPlayer[id] = roleId;
			this.players[id] = {
				roleId,
				color: colorForPlayerIndex(i),
				alive: true,
				roleAcknowledged: false,
			};
		});

		/** @type {Record<string, number>} */
		const assignedCounts = {};
		for (const id of ROLE_IDS) assignedCounts[id] = 0;
		for (const id of this.playerIds) {
			const roleId = this.roleByPlayer[id];
			if (roleId) assignedCounts[roleId] = (assignedCounts[roleId] ?? 0) + 1;
		}
		for (const id of ROLE_IDS) {
			const expected = this.roleCounts[id] ?? 0;
			const actual = assignedCounts[id] ?? 0;
			if (actual !== expected) {
				throw new Error(
					`Role assignment mismatch for ${id}: expected ${expected}, got ${actual}`,
				);
			}
		}
	}

	_isNarrator(actorId) {
		return actorId === this.narratorId;
	}

	_playersWithRole(roleId) {
		return this.playerIds.filter((id) => this.roleByPlayer[id] === roleId);
	}

	_hasAliveRoleHolder(roleId) {
		return this._playersWithRole(roleId).some(
			(id) => this.players[id]?.alive,
		);
	}

	_invalidateMafiaHolderCache() {
		this._aliveMafiaHolderIdsCache = null;
	}

	/** Alive Mafia role holders (for kill quota and self-target rules). */
	_aliveMafiaHolderIds() {
		if (this._aliveMafiaHolderIdsCache) return this._aliveMafiaHolderIdsCache;
		this._aliveMafiaHolderIdsCache = this._playersWithRole("mafia").filter(
			(id) => this.players[id]?.alive,
		);
		return this._aliveMafiaHolderIdsCache;
	}

	/** Max victims per night: 2 when two or more living Mafia, otherwise 1. */
	_mafiaMaxKills() {
		return this._aliveMafiaHolderIds().length >= 2 ? 2 : 1;
	}

	/**
	 * @param {string | string[] | null | undefined} raw
	 * @returns {string[]}
	 */
	_mafiaTargetList(raw) {
		if (raw == null) return [];
		const ids = Array.isArray(raw) ? raw : [raw];
		return ids.filter((id) => this._isAliveTarget(id));
	}

	_mafiaNightChoiceComplete() {
		if (
			!Object.prototype.hasOwnProperty.call(this.nightTargets, "mafia")
		) {
			return false;
		}
		const raw = this.nightTargets.mafia;
		if (raw === null) return true;
		return this._mafiaTargetList(raw).length >= 1;
	}

	/** Night step ritual only — holder(s) dead; narrator runs theater, no recorded target. */
	_stepPlayAlongOnly(step) {
		if (!step?.roleId) return false;
		if (!this._roleEnabledInSetup(step.roleId)) return false;
		return this._playersWithRole(step.roleId).length > 0 && !this._hasAliveRoleHolder(step.roleId);
	}

	_playAlongMessages(roleId) {
		const role = getRole(roleId);
		const name = role?.nameEn ?? "role";
		return {
			en: `The ${name} is dead. Ask the player(s) to play along as if the ${name} were still alive — they may gesture or whisper, but you will not record a target. Tap Continue when the ritual is done.`,
			ar: `الـ${role?.nameAr ?? name} ميّت. اطلب من اللاعب(ين) أن يمثّلوا كأن الدور ما زال حياً — ثم اضغط متابعة دون تسجيل هدف.`,
		};
	}

	/** Role was dealt in this match (for morning recap after deaths resolve). */
	_roleInNightRecap(roleId) {
		return this._playersWithRole(roleId).length > 0;
	}

	/** Role was included in lobby counts (may be 0 = not in this game). */
	_roleEnabledInSetup(roleId) {
		return (this.roleCounts[roleId] ?? 0) > 0;
	}

	_stepApplies(step) {
		if (!step?.roleId) return true;
		return this._roleEnabledInSetup(step.roleId);
	}

	_advanceToApplicableNightStep() {
		while (this.nightStepIndex < nightStepCount()) {
			const step = getNightStep(this.nightStepIndex);
			if (step && this._stepApplies(step)) return;
			this.nightStepIndex += 1;
		}
	}

	/** Silence applies during day only (talk + vote), never during night actions. */
	_isSilencedForDay(playerId) {
		return this.phase === "day" && this.silencedForDay.has(playerId);
	}

	/** @param {string} playerId */
	isPlayerSilencedForDay(playerId) {
		return this._isSilencedForDay(playerId);
	}

	/** @param {string | null | undefined} playerId */
	_isAliveTarget(playerId) {
		return !!playerId && !!this.players[playerId]?.alive;
	}

	_currentStep() {
		return getNightStep(this.nightStepIndex);
	}

	/** First alive holder of a role, else any holder (for chronicle attribution). */
	_primaryRoleHolder(roleId) {
		if (!roleId) return null;
		const ids = this._playersWithRole(roleId);
		const alive = ids.find((id) => this.players[id]?.alive);
		return alive ?? ids[0] ?? null;
	}

	_aliveCount(teamFilter) {
		return this.playerIds.filter((id) => {
			if (!this.players[id]?.alive) return false;
			const role = getRole(this.roleByPlayer[id]);
			if (!role) return false;
			if (teamFilter === "evil") return role.team === "evil";
			if (teamFilter === "good") return role.team === "good";
			return true;
		}).length;
	}

	_checkWin() {
		const evilAlive = this._aliveCount("evil");
		const goodAlive = this._aliveCount("good");
		if (evilAlive === 0 && goodAlive > 0) {
			this.winnerTeam = "good";
			this.phase = "match_over";
			this._logEntry("win", { winnerTeam: "good" });
			this._bump();
			return true;
		}
		if (evilAlive >= goodAlive && evilAlive > 0) {
			this.winnerTeam = "evil";
			this.phase = "match_over";
			this._logEntry("win", { winnerTeam: "evil" });
			this._bump();
			return true;
		}
		return false;
	}

	/**
	 * @param {string} playerId
	 */
	acknowledgeRole(playerId) {
		if (this.phase !== "role_reveal") {
			return { success: false, error: "Not in role reveal phase" };
		}
		if (!this.players[playerId]) {
			return { success: false, error: "Unknown player" };
		}
		this.players[playerId].roleAcknowledged = true;
		this._logEntry("oath", { playerId });
		this._bump();
		return { success: true };
	}

	/**
	 * @param {string} actorId
	 * @deprecated Use begin_night from role_reveal; kept for older clients.
	 */
	narratorStartDay(actorId) {
		return this.narratorBeginNight(actorId);
	}

	/** @param {{ firstNight?: boolean }} [opts] */
	_enterNightPhase(opts = {}) {
		this.phase = "night";
		if (opts.firstNight) {
			this.nightNumber = 1;
		} else {
			this.nightNumber += 1;
		}
		this.nightStepIndex = 0;
		this.nightTargets = {};
		this._seerResults = {};
		this._lastSeerReveal = null;
		this.silencedForDay = new Set();
		this.pendingSilencedForDay = null;
		this._aliveMafiaHolderIdsCache = null;
		this._logEntry("phase_night", { nightNumber: this.nightNumber });
		this._advanceToApplicableNightStep();
	}

	/**
	 * @param {string} actorId
	 * @param {string} targetId
	 */
	narratorDayEliminate(actorId, targetId) {
		if (!this._isNarrator(actorId)) {
			return { success: false, error: "Only the narrator can control the game" };
		}
		if (this.phase !== "day") {
			return { success: false, error: "Eliminations happen during the day phase" };
		}
		if (!this.players[targetId]) {
			return { success: false, error: "Invalid player" };
		}
		if (!this.players[targetId].alive) {
			return { success: false, error: "Player is already dead" };
		}
		this.players[targetId].alive = false;
		this._invalidateMafiaHolderCache();
		const role = getRole(this.roleByPlayer[targetId]);
		this._logEntry("day_elimination", {
			targetId,
			roleId: this.roleByPlayer[targetId],
		});
		if (this._checkWin()) return { success: true };
		this._bump();
		return { success: true };
	}

	/**
	 * @param {string} actorId
	 */
	narratorBeginNight(actorId) {
		if (!this._isNarrator(actorId)) {
			return { success: false, error: "Only the narrator can control the game" };
		}
		if (this.phase === "role_reveal") {
			this._enterNightPhase({ firstNight: true });
		} else if (this.phase === "day") {
			this._enterNightPhase();
		} else {
			return {
				success: false,
				error: "Start night after role reveal or from the day phase",
			};
		}
		this._bump();
		return { success: true };
	}

	/**
	 * @param {string} actorId
	 * @param {string | null} targetId
	 */
	narratorSetNightTarget(actorId, targetId) {
		if (!this._isNarrator(actorId)) {
			return { success: false, error: "Only the narrator can control the game" };
		}
		if (this.phase !== "night") {
			return { success: false, error: "Not in night phase" };
		}
		const step = this._currentStep();
		if (!step || !step.requiresTarget) {
			return { success: false, error: "This step does not take a target" };
		}
		if (this._stepPlayAlongOnly(step)) {
			return {
				success: false,
				error: "No target for this step — role holder is dead (play along only)",
			};
		}
		if (targetId != null && !this.players[targetId]) {
			return { success: false, error: "Invalid target" };
		}
		if (targetId != null && !this._isAliveTarget(targetId)) {
			return { success: false, error: "Cannot target a dead player" };
		}
		if (targetId == null && !step.allowSkip) {
			return { success: false, error: "A target is required for this step" };
		}
		if (
			step.key === "healer" &&
			targetId != null &&
			targetId === this.lastHealedPlayerId
		) {
			return {
				success: false,
				error: "Doctor cannot heal the same player two nights in a row",
			};
		}
		if (
			step.key === "sniper" &&
			targetId != null &&
			targetId === this.lastSilencedPlayerId
		) {
			return {
				success: false,
				error: "Sniper cannot silence the same player two nights in a row",
			};
		}
		if (step.key === "seer" && targetId != null) {
			const seerIds = this._playersWithRole("seer");
			if (seerIds.includes(targetId)) {
				return {
					success: false,
					error: "Seer cannot inspect themselves",
				};
			}
		}
		if (step.key === "sheriff" && targetId != null) {
			const sheriffIds = this._playersWithRole("sheriff");
			if (sheriffIds.includes(targetId)) {
				return {
					success: false,
					error: "Sheriff cannot judge themselves",
				};
			}
		}
		if (step.key === "mafia" && targetId != null) {
			if (this._aliveMafiaHolderIds().includes(targetId)) {
				return {
					success: false,
					error: "Mafia cannot target themselves",
				};
			}
			const maxKills = this._mafiaMaxKills();
			if (maxKills === 1) {
				this.nightTargets.mafia = targetId;
			} else {
				/** @type {string[]} */
				let current = this._mafiaTargetList(this.nightTargets.mafia);
				if (current.includes(targetId)) {
					current = current.filter((id) => id !== targetId);
				} else {
					if (current.length >= maxKills) {
						return {
							success: false,
							error: `Mafia may kill at most ${maxKills} players tonight`,
						};
					}
					current = [...current, targetId];
				}
				this.nightTargets.mafia = current;
			}
		} else {
			this.nightTargets[step.key] = targetId;
		}
		this._bump();
		return { success: true };
	}

	/**
	 * @param {string} roleId
	 * @param {string | null} targetPlayerId
	 * @param {string} outcome
	 * @param {'GOOD' | 'EVIL'} [alignment]
	 */
	_nightRecapBeat(roleId, targetPlayerId, outcome, alignment) {
		const role = getRole(roleId);
		return {
			roleId,
			icon: role?.icon ?? "•",
			titleEn: role?.nameEn ?? roleId,
			targetPlayerId,
			outcome,
			...(alignment ? { alignment } : {}),
		};
	}

	/**
	 * Narrator-only beats summarizing each role’s night action (ritual order).
	 * @param {object} ctx
	 */
	_buildNightRecap(ctx) {
		const {
			mafiaTargets,
			saveTarget,
			sniperTarget,
			sheriffTarget,
			saved,
			mafiaKillLandedByTarget,
			uniqueDeaths,
		} = ctx;
		/** @type {object[]} */
		const recap = [];

		if (this._roleInNightRecap("doctor")) {
			if (saveTarget) {
				const blocked =
					mafiaTargets.includes(saveTarget) &&
					saved.includes(saveTarget);
				recap.push(
					this._nightRecapBeat(
						"doctor",
						saveTarget,
						blocked ? "saved_kill" : "protected",
					),
				);
			} else {
				recap.push(this._nightRecapBeat("doctor", null, "skipped"));
			}
		}

		if (this._roleInNightRecap("mafia")) {
			if (mafiaTargets.length > 0) {
				for (const mafiaTarget of mafiaTargets) {
					const landed = mafiaKillLandedByTarget.get(mafiaTarget) === true;
					const blocked = !landed && saved.includes(mafiaTarget);
					recap.push(
						this._nightRecapBeat(
							"mafia",
							mafiaTarget,
							blocked ? "saved_kill" : "kill_landed",
						),
					);
				}
			} else if (
				Object.prototype.hasOwnProperty.call(this.nightTargets, "mafia")
			) {
				recap.push(this._nightRecapBeat("mafia", null, "skipped"));
			}
		}

		if (this._roleInNightRecap("sniper")) {
			if (sniperTarget) {
				recap.push(
					this._nightRecapBeat("sniper", sniperTarget, "silenced"),
				);
			} else {
				recap.push(this._nightRecapBeat("sniper", null, "skipped"));
			}
		}

		if (this._roleInNightRecap("seer")) {
			for (const [targetId, alignment] of Object.entries(this._seerResults)) {
				recap.push(
					this._nightRecapBeat("seer", targetId, "inspected", alignment),
				);
			}
			if (Object.keys(this._seerResults).length === 0) {
				recap.push(this._nightRecapBeat("seer", null, "skipped"));
			}
		}

		if (this._roleInNightRecap("sheriff") && sheriffTarget) {
			const sheriffIds = this._playersWithRole("sheriff");
			const sheriffId =
				sheriffIds.find((id) => this.players[id]?.alive) ?? sheriffIds[0] ?? null;
			if (sheriffTarget === sheriffId) {
				recap.push(this._nightRecapBeat("sheriff", null, "skipped"));
			} else {
				const targetEvil = isEvilRole(this.roleByPlayer[sheriffTarget]);
				let outcome;
				if (targetEvil) {
					outcome = "sheriff_executed_evil";
				} else if (sheriffId && uniqueDeaths.includes(sheriffId)) {
					outcome = "sheriff_misfire";
				} else {
					outcome = "sheriff_executed_innocent";
				}
				recap.push(
					this._nightRecapBeat("sheriff", sheriffTarget, outcome),
				);
			}
		} else if (this._roleInNightRecap("sheriff")) {
			recap.push(this._nightRecapBeat("sheriff", null, "skipped"));
		}

		return recap;
	}

	_resolveNight() {
		/** @param {string | null | undefined} id */
		const liveTarget = (id) => (this._isAliveTarget(id) ? id : null);
		const mafiaTargets = this._mafiaTargetList(this.nightTargets.mafia);
		const saveTarget = liveTarget(this.nightTargets.healer);
		const sniperTarget = liveTarget(this.nightTargets.sniper);
		const sheriffTarget = liveTarget(this.nightTargets.sheriff);

		/** @type {string[]} */
		const deaths = [];
		/** @type {string[]} */
		const saved = [];
		/** @type {Map<string, boolean>} */
		const mafiaKillLandedByTarget = new Map();

		// 1. Mafia kills (alive mafia only)
		let mafiaKillLanded = false;
		if (this._hasAliveRoleHolder("mafia")) {
			for (const mafiaTarget of mafiaTargets) {
				if (
					this._hasAliveRoleHolder("doctor") &&
					saveTarget &&
					saveTarget === mafiaTarget
				) {
					if (!saved.includes(mafiaTarget)) saved.push(mafiaTarget);
					mafiaKillLandedByTarget.set(mafiaTarget, false);
				} else {
					mafiaKillLanded = true;
					mafiaKillLandedByTarget.set(mafiaTarget, true);
					if (!deaths.includes(mafiaTarget)) deaths.push(mafiaTarget);
				}
			}
		}

		if (
			this._hasAliveRoleHolder("doctor") &&
			saveTarget &&
			saveTarget !== this.lastHealedPlayerId
		) {
			this.lastHealedPlayerId = saveTarget;
		}

		// 2. Silences (alive sniper only) — takes effect next day, not this night
		if (this._hasAliveRoleHolder("sniper") && sniperTarget) {
			this.pendingSilencedForDay = sniperTarget;
			this.lastSilencedPlayerId = sniperTarget;
		} else if (this._hasAliveRoleHolder("sniper")) {
			this.pendingSilencedForDay = null;
		}

		const silencedNextDay = this.pendingSilencedForDay ?
			[this.pendingSilencedForDay]
		:	[];

		// 3. Kills — sheriff (alive sheriff only; cannot judge themselves)
		const sheriffIds = this._playersWithRole("sheriff");
		const sheriffId =
			sheriffIds.find((id) => this.players[id]?.alive) ?? null;
		if (
			this._hasAliveRoleHolder("sheriff") &&
			sheriffTarget &&
			sheriffTarget !== sheriffId
		) {
			const targetEvil = isEvilRole(this.roleByPlayer[sheriffTarget]);
			if (targetEvil) {
				if (!deaths.includes(sheriffTarget)) deaths.push(sheriffTarget);
			} else if (sheriffId) {
				if (!deaths.includes(sheriffTarget)) deaths.push(sheriffTarget);
				if (this.players[sheriffId]?.alive && !deaths.includes(sheriffId)) {
					deaths.push(sheriffId);
				}
			}
		}

		// 4. Apply death outcomes
		const uniqueDeaths = [...new Set(deaths)];
		for (const id of uniqueDeaths) {
			if (this.players[id]) this.players[id].alive = false;
		}
		if (uniqueDeaths.length > 0) this._invalidateMafiaHolderCache();

		const nightRecap = this._buildNightRecap({
			mafiaTargets,
			saveTarget,
			sniperTarget,
			sheriffTarget,
			saved,
			mafiaKillLandedByTarget,
			uniqueDeaths,
		});

		this.lastMorningSummary = {
			deaths: uniqueDeaths.map((id) => ({
				playerId: id,
				roleId: this.revealRoleOnDeath ? this.roleByPlayer[id] : null,
			})),
			saved: saved.map((id) => ({ playerId: id })),
			silenced: silencedNextDay,
			seerInsights: { ...this._seerResults },
			mafiaAttempted: mafiaTargets[0] ?? null,
			mafiaAttempts: mafiaTargets,
			mafiaKillLanded,
			nightRecap,
		};

		this._logEntry("night_resolved", {
			deaths: uniqueDeaths,
			saved,
			silenced: silencedNextDay,
			nightNumber: this.nightNumber,
		});
	}

	/**
	 * @param {string} actorId
	 */
	narratorConfirmNightStep(actorId) {
		if (!this._isNarrator(actorId)) {
			return { success: false, error: "Only the narrator can control the game" };
		}
		if (this.phase !== "night") {
			return { success: false, error: "Not in night phase" };
		}

		const step = this._currentStep();
		if (!step) {
			return { success: false, error: "Invalid night step" };
		}

		const playAlongOnly = this._stepPlayAlongOnly(step);

		if (step.requiresTarget && !playAlongOnly) {
			if (step.key === "mafia") {
				if (!this._mafiaNightChoiceComplete()) {
					return {
						success: false,
						error: "Choose a player or tap Skip before continuing",
					};
				}
				const raw = this.nightTargets.mafia;
				if (raw !== null) {
					const targets = this._mafiaTargetList(raw);
					for (const id of targets) {
						if (!this._isAliveTarget(id)) {
							return {
								success: false,
								error: "Cannot target a dead player",
							};
						}
						if (this._aliveMafiaHolderIds().includes(id)) {
							return {
								success: false,
								error: "Mafia cannot target themselves",
							};
						}
					}
				}
			} else {
				const hasChoice = Object.prototype.hasOwnProperty.call(
					this.nightTargets,
					step.key,
				);
				const target = this.nightTargets[step.key];
				if (!hasChoice) {
					return {
						success: false,
						error: "Choose a player or tap Skip before continuing",
					};
				}
				if (target == null && !step.allowSkip) {
					return {
						success: false,
						error: "Select a target before continuing",
					};
				}
				if (target != null && !this._isAliveTarget(target)) {
					return {
						success: false,
						error: "Cannot target a dead player",
					};
				}
				if (
					step.key === "healer" &&
					target != null &&
					target === this.lastHealedPlayerId
				) {
					return {
						success: false,
						error: "Doctor cannot heal the same player two nights in a row",
					};
				}
				if (
					step.key === "sniper" &&
					target != null &&
					target === this.lastSilencedPlayerId
				) {
					return {
						success: false,
						error: "Sniper cannot silence the same player two nights in a row",
					};
				}
				if (step.key === "seer" && target != null) {
					const seerIds = this._playersWithRole("seer");
					if (seerIds.includes(target)) {
						return {
							success: false,
							error: "Seer cannot inspect themselves",
						};
					}
				}
				if (step.key === "sheriff" && target != null) {
					const sheriffIds = this._playersWithRole("sheriff");
					if (sheriffIds.includes(target)) {
						return {
							success: false,
							error: "Sheriff cannot judge themselves",
						};
					}
				}
			}
		}

		if (playAlongOnly) {
			this._logEntry("night_step", {
				stepKey: step.key,
				stepTitleEn: step.titleEn,
				roleId: step.roleId ?? undefined,
				actorPlayerId: step.roleId ?
					this._primaryRoleHolder(step.roleId)
				:	undefined,
				playAlong: true,
			});
		} else if (step.key === "seer") {
			const target = this.nightTargets.seer;
			if (target) {
				const alignment = alignmentLabel(this.roleByPlayer[target]);
				this._seerResults[target] = alignment;
				this._lastSeerReveal = { playerId: target, alignment };
				this._logEntry("seer_result", {
					actorPlayerId: this._primaryRoleHolder("seer"),
					targetId: target,
					alignment,
					roleId: this.roleByPlayer[target],
				});
			}
		}

		if (
			!playAlongOnly &&
			step.requiresTarget &&
			step.key !== "seer" &&
			step.key !== "morning"
		) {
			const actorPlayerId = step.roleId ?
				this._primaryRoleHolder(step.roleId)
			:	undefined;
			if (step.key === "mafia") {
				const raw = this.nightTargets.mafia;
				if (raw === null && step.allowSkip) {
					this._logEntry("night_step", {
						stepKey: step.key,
						stepTitleEn: step.titleEn,
						roleId: step.roleId ?? undefined,
						actorPlayerId,
						skipped: true,
					});
				} else {
					for (const targetId of this._mafiaTargetList(raw)) {
						this._logEntry("night_step", {
							stepKey: step.key,
							stepTitleEn: step.titleEn,
							roleId: step.roleId ?? undefined,
							actorPlayerId,
							targetId,
						});
					}
				}
			} else {
				const target = this.nightTargets[step.key];
				this._logEntry("night_step", {
					stepKey: step.key,
					stepTitleEn: step.titleEn,
					roleId: step.roleId ?? undefined,
					actorPlayerId,
					targetId: target ?? undefined,
					skipped: target == null && step.allowSkip,
				});
			}
		}

		this.nightStepIndex += 1;
		this._advanceToApplicableNightStep();

		if (this.nightStepIndex >= nightStepCount()) {
			this._resolveNight();
			this.phase = "morning";
		}

		this._checkWin();
		this._bump();
		return { success: true };
	}

	/**
	 * @param {string} actorId
	 */
	narratorEndMorning(actorId) {
		if (!this._isNarrator(actorId)) {
			return { success: false, error: "Only the narrator can control the game" };
		}
		if (this.phase !== "morning") {
			return { success: false, error: "Not in morning phase" };
		}
		if (this._checkWin()) return { success: true };
		if (this.pendingSilencedForDay) {
			this.silencedForDay = new Set([this.pendingSilencedForDay]);
			this.pendingSilencedForDay = null;
		} else {
			this.silencedForDay = new Set();
		}
		this.phase = "day";
		if (this.dayNumber === 0) {
			this.dayNumber = 1;
		} else {
			this.dayNumber += 1;
		}
		this.lastMorningSummary = null;
		this._logEntry("phase_day", { dayNumber: this.dayNumber });
		this._bump();
		return { success: true };
	}

	/**
	 * @param {string} actorId
	 */
	narratorResetMatch(actorId) {
		if (!this._isNarrator(actorId)) {
			return { success: false, error: "Only the narrator can control the game" };
		}
		const settings = {
			narratorId: this.narratorId,
			revealRoleOnDeath: this.revealRoleOnDeath,
			roleCounts: { ...this.roleCounts },
		};
		const ids = [...this.playerIds];
		Object.assign(this, new MafiaEngine(ids, settings));
		return { success: true };
	}

	_getNightStepView() {
		const step = this._currentStep();
		if (!step) return null;
		const role = step.roleId ? getRole(step.roleId) : null;
		const holders = step.roleId
			? this._playersWithRole(step.roleId).map((id) => {
					const p = this.players[id];
					const holderRole = getRole(this.roleByPlayer[id]);
					return {
						id,
						alive: p?.alive ?? false,
						color: getRoleAccent(this.roleByPlayer[id]),
						roleNameEn: holderRole?.nameEn ?? null,
						roleIcon: holderRole?.icon ?? null,
					};
				})
			: [];
		/** @type {string[]} */
		const blockedTargetIds = [];
		if (step.key === "healer" && this.lastHealedPlayerId) {
			blockedTargetIds.push(this.lastHealedPlayerId);
		}
		if (step.key === "sniper" && this.lastSilencedPlayerId) {
			blockedTargetIds.push(this.lastSilencedPlayerId);
		}
		if (step.key === "seer") {
			for (const id of this._playersWithRole("seer")) {
				if (!blockedTargetIds.includes(id)) blockedTargetIds.push(id);
			}
		}
		if (step.key === "mafia") {
			for (const id of this._aliveMafiaHolderIds()) {
				if (!blockedTargetIds.includes(id)) blockedTargetIds.push(id);
			}
		}
		if (step.key === "sheriff") {
			for (const id of this._playersWithRole("sheriff")) {
				if (!blockedTargetIds.includes(id)) blockedTargetIds.push(id);
			}
		}

		const hasChoice = Object.prototype.hasOwnProperty.call(
			this.nightTargets,
			step.key,
		);
		const rawTarget = this.nightTargets[step.key];
		const playAlongOnly = this._stepPlayAlongOnly(step);
		const playAlong = playAlongOnly ? this._playAlongMessages(step.roleId) : null;
		const maxTargetCount =
			step.key === "mafia" ? this._mafiaMaxKills() : 1;
		const selectedTargetIds =
			step.key === "mafia" ?
				this._mafiaTargetList(rawTarget)
			:	hasChoice && rawTarget != null ?
				[rawTarget]
			:	[];
		const choiceRecorded =
			step.key === "mafia" ? this._mafiaNightChoiceComplete() : hasChoice;
		const selectedTargetId =
			choiceRecorded && selectedTargetIds.length > 0 ?
				selectedTargetIds[0]
			:	null;

		return {
			index: this.nightStepIndex,
			total: nightStepCount(),
			key: step.key,
			titleEn: step.titleEn,
			titleAr: step.titleAr,
			instructionEn: step.instructionEn,
			instructionAr: step.instructionAr,
			playAlongOnly,
			playAlongMessageEn: playAlong?.en ?? null,
			playAlongMessageAr: playAlong?.ar ?? null,
			requiresTarget: step.requiresTarget,
			allowSkip: step.allowSkip,
			requiredTargetCount: 1,
			maxTargetCount,
			roleId: step.roleId,
			roleNameEn: role?.nameEn ?? null,
			roleNameAr: role?.nameAr ?? null,
			roleIcon: role?.icon ?? null,
			roleHolders: holders,
			choiceRecorded,
			skipped: hasChoice && rawTarget == null && step.allowSkip,
			selectedTargetId,
			selectedTargetIds,
			blockedTargetIds,
		};
	}

	_rolePublic(playerId) {
		const p = this.players[playerId];
		if (!p) return null;
		const role = getRole(p.roleId);
		const showRole = this.revealRoleOnDeath && !p.alive;
		return {
			id: playerId,
			color: p.color,
			alive: p.alive,
			roleRevealed: showRole,
			roleId: showRole ? p.roleId : null,
			roleNameEn: showRole && role ? role.nameEn : null,
			roleNameAr: showRole && role ? role.nameAr : null,
			roleIcon: showRole && role ? role.icon : null,
			silenced: this._isSilencedForDay(playerId),
		};
	}

	/**
	 * @param {string} viewerId
	 */
	serializeForPlayer(viewerId) {
		const isNarrator = viewerId === this.narratorId;
		const self = this.players[viewerId];
		const myRoleId = self ? this.roleByPlayer[viewerId] : null;
		const myRole = myRoleId ? getRole(myRoleId) : null;

		const playerCards = this.playerIds.map((id) => this._rolePublic(id));

		const suggested = suggestBalancedSetup(this.playerIds.length);
		const lobbySetup = validateLobbySetup(
			this.playerIds.length,
			this.roleCounts,
		);
		const setupWarnings = [...lobbySetup.errors, ...lobbySetup.warnings];

		const base = {
			...this.serializeBase(viewerId),
			gameType: "mafia",
			narratorId: this.narratorId,
			dayNumber: this.dayNumber,
			nightNumber: this.nightNumber,
			revealRoleOnDeath: this.revealRoleOnDeath,
			playerCards,
			isNarrator,
			winnerTeam: this.winnerTeam,
			lastMorningSummary:
				isNarrator ?
					this.lastMorningSummary
				:	this._playerSafeMorningSummary(this.lastMorningSummary),
			canAcknowledgeRole:
				this.phase === "role_reveal" &&
				!!self &&
				!self.roleAcknowledged &&
				!isNarrator,
			myRoleAcknowledged: self?.roleAcknowledged ?? false,
		};

		if (isNarrator) {
			return {
				...base,
				narratorPanel: {
					allPlayers: this.playerIds.map((id) => {
						const role = getRole(this.roleByPlayer[id]);
						const p = this.players[id];
						return {
							id,
							color: getRoleAccent(this.roleByPlayer[id]),
							alive: p?.alive ?? false,
							roleId: this.roleByPlayer[id],
							roleNameEn: role?.nameEn,
							roleNameAr: role?.nameAr,
							roleIcon: role?.icon,
							team: role?.team,
							roleAcknowledged: p?.roleAcknowledged ?? false,
						};
					}),
					roleCounts: { ...this.roleCounts },
					suggestedCounts: suggested.counts,
					setupWarnings,
					nightStep: this.phase === "night" ? this._getNightStepView() : null,
					lastSeerReveal: this._lastSeerReveal,
					eventLog: this.eventLog.slice(-EVENT_LOG_SERIALIZE_CAP),
					chronicle: this._getChronicleSections(),
					seerResults: { ...this._seerResults },
					canStartDay: false,
					canDayEliminate: this.phase === "day",
					canBeginNight: this.phase === "day" || this.phase === "role_reveal",
					canConfirmNightStep: this.phase === "night",
					canEndMorning: this.phase === "morning",
				},
			};
		}

		let nightCallout = null;
		if (this.phase === "night" && self?.alive && myRoleId) {
			const step = getNightStep(this.nightStepIndex);
			if (
				step?.roleId === myRoleId &&
				!this._stepPlayAlongOnly(step)
			) {
				nightCallout = {
					isYourTurn: true,
					stepTitleEn: step.titleEn,
					stepTitleAr: step.titleAr,
					roleNameEn: myRole?.nameEn ?? null,
					roleIcon: myRole?.icon ?? null,
				};
			} else {
				nightCallout = {
					isYourTurn: false,
					stepTitleEn: null,
					stepTitleAr: null,
					roleNameEn: null,
					roleIcon: null,
				};
			}
		}

		return {
			...base,
			playerChronicle: this._getPlayerChronicle(viewerId, myRoleId),
			nightCallout,
			myRole:
				myRole && (this.phase !== "role_reveal" || self?.roleAcknowledged) ?
					{
						id: myRoleId,
						nameEn: myRole.nameEn,
						nameAr: myRole.nameAr,
						descriptionEn: myRole.descriptionEn,
						descriptionAr: myRole.descriptionAr,
						summaryEn: myRole.summaryEn ?? myRole.descriptionEn,
						summaryAr: myRole.summaryAr ?? myRole.descriptionAr,
						icon: myRole.icon,
						team: myRole.team,
						accentColor: getRoleAccent(myRoleId),
					}
				:	this.phase === "role_reveal" && myRole && !self?.roleAcknowledged ?
					{
						id: myRoleId,
						nameEn: myRole.nameEn,
						nameAr: myRole.nameAr,
						descriptionEn: myRole.descriptionEn,
						descriptionAr: myRole.descriptionAr,
						summaryEn: myRole.summaryEn ?? myRole.descriptionEn,
						summaryAr: myRole.summaryAr ?? myRole.descriptionAr,
						icon: myRole.icon,
						team: myRole.team,
						accentColor: getRoleAccent(myRoleId),
						pendingAcknowledge: true,
					}
				:	null,
			myColor: self?.color ?? null,
			iAmAlive: self?.alive ?? true,
			iAmSilenced: this._isSilencedForDay(viewerId),
		};
	}
}
