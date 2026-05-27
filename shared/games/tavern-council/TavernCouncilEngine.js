/**
 * Mafia engine — face-to-face narrator assistant.
 * Gameplay players only in playerIds; narrator is outside the game.
 */

import { getRole, getRoleAccent, isEvilRole, alignmentLabel } from "./roles.js";
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

/** @typedef {'lobby'|'role_reveal'|'day'|'night'|'morning'|'match_over'} CouncilPhase */

/**
 * @param {string[]} playerIds — gameplay players only (narrator excluded)
 * @param {{
 *   narratorId: string,
 *   revealRoleOnDeath?: boolean,
 *   roleCounts?: Record<string, number>,
 *   roleAssignments?: Record<string, string>,
 * }} settings
 */
export class TavernCouncilEngine {
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

		this.playerIds = [...playerIds];
		this.narratorId = settings.narratorId;
		this.revealRoleOnDeath = settings.revealRoleOnDeath !== false;
		this.roleCounts = normalizeRoleCounts(
			settings.roleCounts ??
				suggestBalancedSetup(playerIds.length).counts,
		);

		/** @type {CouncilPhase} */
		this.phase = "role_reveal";
		this.dayNumber = 1;
		this.nightNumber = 0;
		this.stateVersion = 1;

		/** @type {Record<string, { roleId: string, color: string, alive: boolean, roleAcknowledged: boolean }>} */
		this.players = {};
		/** @type {Record<string, string>} */
		this.roleByPlayer = {};
		/** @type {string[]} */
		this.silencedForDay = [];
		/** @type {Record<string, string | null>} */
		this.nightTargets = {};
		this.nightStepIndex = 0;
		/** @type {string | null} */
		this.lastHealedPlayerId = null;
		/** @type {{ at: number, message: string }[]} */
		this.eventLog = [];
		/** @type {import("./chronicle.js").ChronicleEntry[]} */
		this.logEntries = [];
		this.lastMorningSummary = null;
		this.winnerTeam = null;
		/** @type {Record<string, 'GOOD'|'EVIL'>} */
		this._seerResults = {};
		/** @type {{ playerId: string, alignment: 'GOOD'|'EVIL' } | null} */
		this._lastSeerReveal = null;

		this._assignRoles(settings.roleAssignments);
		this._logEntry("game_start", {});
	}

	_bump() {
		this.stateVersion += 1;
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
				return `Morning after night ${entry.nightNumber ?? this.nightNumber}.`;
			case "day_elimination": {
				const role = entry.roleId ? getRole(entry.roleId) : null;
				return `Day vote: ${entry.targetId} eliminated${role ? ` (${role.nameEn})` : ""}.`;
			}
			case "night_step":
				return entry.skipped ?
						`${entry.stepTitleEn ?? entry.stepKey}: no action`
					:	`${entry.stepTitleEn ?? entry.stepKey} → ${entry.targetId}`;
			case "seer_result":
				return `Seer: ${entry.targetId} is ${entry.alignment}`;
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

	/** @param {string | null | undefined} playerId */
	_isAliveTarget(playerId) {
		return !!playerId && !!this.players[playerId]?.alive;
	}

	_currentStep() {
		return getNightStep(this.nightStepIndex);
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
	 */
	narratorStartDay(actorId) {
		if (!this._isNarrator(actorId)) {
			return { success: false, error: "Only the narrator can control the game" };
		}
		if (this.phase !== "role_reveal") {
			return { success: false, error: "Not in role reveal phase" };
		}
		this.phase = "day";
		this.dayNumber = 1;
		this._logEntry("phase_day", { dayNumber: 1 });
		this._bump();
		return { success: true };
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
		if (this.phase !== "day") {
			return { success: false, error: "Start night from the day phase" };
		}
		this.phase = "night";
		this.nightNumber += 1;
		this.nightStepIndex = 0;
		this.nightTargets = {};
		this._seerResults = {};
		this._lastSeerReveal = null;
		this.silencedForDay = [];
		this._logEntry("phase_night", { nightNumber: this.nightNumber });
		this._advanceToApplicableNightStep();
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
		this.nightTargets[step.key] = targetId;
		this._bump();
		return { success: true };
	}

	_resolveNight() {
		/** @param {string | null | undefined} id */
		const liveTarget = (id) => (this._isAliveTarget(id) ? id : null);
		const mafiaTarget = liveTarget(this.nightTargets.mafia);
		const saveTarget = liveTarget(this.nightTargets.healer);
		const sniperTarget = liveTarget(this.nightTargets.sniper);
		const sheriffTarget = liveTarget(this.nightTargets.sheriff);

		/** @type {string[]} */
		const deaths = [];
		/** @type {string[]} */
		const saved = [];

		// 1. Healing immunity (alive doctor only)
		let mafiaKillLanded = false;
		if (this._hasAliveRoleHolder("mafia") && mafiaTarget) {
			if (
				this._hasAliveRoleHolder("doctor") &&
				saveTarget &&
				saveTarget === mafiaTarget
			) {
				saved.push(mafiaTarget);
			} else {
				mafiaKillLanded = true;
				deaths.push(mafiaTarget);
			}
		}

		if (
			this._hasAliveRoleHolder("doctor") &&
			saveTarget &&
			saveTarget !== this.lastHealedPlayerId
		) {
			this.lastHealedPlayerId = saveTarget;
		}

		// 2. Silences (alive sniper only)
		if (this._hasAliveRoleHolder("sniper") && sniperTarget) {
			this.silencedForDay = [sniperTarget];
		}

		// 3. Kills — sheriff (alive sheriff only)
		if (this._hasAliveRoleHolder("sheriff") && sheriffTarget) {
			const targetEvil = isEvilRole(this.roleByPlayer[sheriffTarget]);
			const sheriffIds = this._playersWithRole("sheriff");
			const sheriffId =
				sheriffIds.find((id) => this.players[id]?.alive) ?? null;
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

		this.lastMorningSummary = {
			deaths: uniqueDeaths.map((id) => ({
				playerId: id,
				roleId: this.revealRoleOnDeath ? this.roleByPlayer[id] : null,
			})),
			saved: saved.map((id) => ({ playerId: id })),
			silenced: [...this.silencedForDay],
			seerInsights: { ...this._seerResults },
			mafiaAttempted: mafiaTarget,
			mafiaKillLanded,
		};

		this._logEntry("night_resolved", {
			deaths: uniqueDeaths,
			saved,
			silenced: [...this.silencedForDay],
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

		if (step.requiresTarget) {
			const target = this.nightTargets[step.key];
			if (target == null && !step.allowSkip) {
				return {
					success: false,
					error: "Select a target (or allowed skip) before continuing",
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
		}

		if (step.key === "seer") {
			const target = this.nightTargets.seer;
			if (target) {
				const alignment = alignmentLabel(this.roleByPlayer[target]);
				this._seerResults[target] = alignment;
				this._lastSeerReveal = { playerId: target, alignment };
				this._logEntry("seer_result", {
					targetId: target,
					alignment,
					roleId: this.roleByPlayer[target],
				});
			}
		}

		if (
			step.requiresTarget &&
			step.key !== "seer" &&
			step.key !== "resolution" &&
			step.key !== "morning"
		) {
			const target = this.nightTargets[step.key];
			this._logEntry("night_step", {
				stepKey: step.key,
				stepTitleEn: step.titleEn,
				targetId: target ?? undefined,
				skipped: target == null && step.allowSkip,
			});
		}

		if (step.key === "resolution") {
			this._resolveNight();
		}

		this.nightStepIndex += 1;
		this._advanceToApplicableNightStep();

		if (this.nightStepIndex >= nightStepCount()) {
			this.phase = "morning";
			this._logEntry("phase_morning", { nightNumber: this.nightNumber });
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
		this.phase = "day";
		this.dayNumber += 1;
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
		Object.assign(this, new TavernCouncilEngine(ids, settings));
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
						color: p?.color ?? "#888",
						roleNameEn: holderRole?.nameEn ?? null,
						roleIcon: holderRole?.icon ?? null,
					};
				})
			: [];
		/** @type {string[]} */
		const blockedTargetIds =
			step.key === "healer" && this.lastHealedPlayerId ?
				[this.lastHealedPlayerId]
			:	[];

		return {
			index: this.nightStepIndex,
			total: nightStepCount(),
			key: step.key,
			titleEn: step.titleEn,
			titleAr: step.titleAr,
			instructionEn: step.instructionEn,
			instructionAr: step.instructionAr,
			requiresTarget: step.requiresTarget,
			allowSkip: step.allowSkip,
			roleId: step.roleId,
			roleNameEn: role?.nameEn ?? null,
			roleNameAr: role?.nameAr ?? null,
			roleIcon: role?.icon ?? null,
			roleHolders: holders,
			selectedTargetId: this.nightTargets[step.key] ?? null,
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
			silenced: this.silencedForDay.includes(playerId),
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
			gameType: "mafia",
			stateVersion: this.stateVersion,
			phase: this.phase,
			playerIds: [...this.playerIds],
			narratorId: this.narratorId,
			dayNumber: this.dayNumber,
			nightNumber: this.nightNumber,
			revealRoleOnDeath: this.revealRoleOnDeath,
			playerCards,
			isNarrator,
			winnerTeam: this.winnerTeam,
			lastMorningSummary: this.lastMorningSummary,
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
							color: p?.color,
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
					eventLog: [...this.eventLog],
					chronicle: buildChronicleSections(this.logEntries ?? []),
					seerResults: { ...this._seerResults },
					canStartDay: this.phase === "role_reveal",
					canDayEliminate: this.phase === "day",
					canBeginNight: this.phase === "day",
					canConfirmNightStep: this.phase === "night",
					canEndMorning: this.phase === "morning",
				},
			};
		}

		let nightCallout = null;
		if (this.phase === "night" && self?.alive && myRoleId) {
			const step = getNightStep(this.nightStepIndex);
			if (step?.roleId === myRoleId) {
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
			playerChronicle: buildPlayerChronicle(
				this.logEntries ?? [],
				viewerId,
				myRoleId,
			),
			nightCallout,
			myRole:
				myRole && (this.phase !== "role_reveal" || self?.roleAcknowledged) ?
					{
						id: myRoleId,
						nameEn: myRole.nameEn,
						nameAr: myRole.nameAr,
						descriptionEn: myRole.descriptionEn,
						descriptionAr: myRole.descriptionAr,
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
						icon: myRole.icon,
						team: myRole.team,
						accentColor: getRoleAccent(myRoleId),
						pendingAcknowledge: true,
					}
				:	null,
			myColor: self?.color ?? null,
			iAmAlive: self?.alive ?? true,
			iAmSilenced: this.silencedForDay.includes(viewerId),
		};
	}
}
