/**
 * Hub room manager — game-agnostic lobby/session layer.
 * useSocketRooms: true for Node (socket.join); false for Cloudflare DO (direct emit).
 *
 * Persistence demarcation: docs/architecture/persistence-boundaries.md
 * — sole orchestrator for connection maps, transient memory, and phase-boundary dispatch.
 */

import {
	DEFAULT_MATCH_SETTINGS,
	DEFAULT_WORD_GAME_SETTINGS,
	DEFAULT_BARA_SETTINGS,
	DEFAULT_MAFIA_SETTINGS,
	DISCONNECT_GRACE_MS,
	LOBBY_IDLE_PURGE_MS,
	ROUND_RESTART_DELAY_MS,
	SCORE_CAP_OPTIONS,
	TURN_TIMER_TICK_MS,
	BARA_PHASE_TICK_MS,
	BARA_ROUND_RESET_DELAY_MS,
	WORD_POINTS_OPTIONS,
	WORD_ROUND_RESET_DELAY_MS,
	BARA_ROUNDS_OPTIONS,
	DEFAULT_SKETCH_DRAW_SETTINGS,
	SKETCH_DRAW_ROUND_DELAY_MS,
	SKETCH_DRAW_ROUNDS_OPTIONS,
	SKETCH_DRAW_TIMER_OPTIONS,
	SKETCH_DRAW_TIMER_MIN_SEC,
	SKETCH_DRAW_TIMER_MAX_SEC,
} from "./constants.js";
import {
	CATEGORY_PACKAGE_IDS,
	normalizeCategoryPackageIds,
} from "../games/bara-alsalafa/categories/index.js";
import {
	SKETCH_CATEGORY_PACKAGE_IDS,
	normalizeCategoryPackageIds as normalizeSketchCategoryPackageIds,
} from "../games/sketch-draw/data/index.js";
import { buildActiveWordPool } from "../games/sketch-draw/wordPool.js";
import { generateRoomId } from "./generateRoomId.js";
import { getGame, isGameEnabled } from "../games/registry.js";
import { RateLimiter } from "./RateLimiter.js";
import { verifyPlayerSession } from "./session.js";
import { sanitizeChatMessage, sanitizeDisplayName } from "./validate.js";
import { isValidRoomReaction } from "./engagementCatalog.js";
import { INVITE_TTL_MS, MAX_ROOMS, RATE_LIMIT_WINDOW_MS } from "./constants.js";
import { cryptoRandomInt } from "../games/dominoes/random.js";
import {
	isActiveWordGameSession,
	isWordGameRoom,
	isWordGameWon,
	shouldPreserveWordGameRoom,
} from "./wordgame-session.js";
import {
	parseScratchpadRoundNumber,
	sanitizeWordScratchpadNotes,
} from "./word-scratchpad.js";
import {
	suggestBalancedSetup,
	validateLobbySetup,
	normalizeRoleCounts,
} from "../games/mafia/balancing.js";
import { ROLE_IDS } from "../games/mafia/roles.js";
import {
	isDevBotsEnabled,
	createBotPlayer,
} from "./devBots.js";
import { createNoopPersistenceAdapter } from "./persistenceAdapter.js";
import {
	buildPhaseBoundaryPayload,
	isPhaseBoundary,
	phaseBoundaryKey,
} from "./phaseBoundaries.js";

export class RoomManager {
	/**
	 * @param {import('socket.io').Server} io
	 * @param {{ useSocketRooms?: boolean, persistenceAdapter?: import('./persistenceAdapter.js').PersistenceAdapter }} options
	 */
	constructor(io, { useSocketRooms = false, persistenceAdapter } = {}) {
		this.io = io;
		this.useSocketRooms = useSocketRooms;
		this.persistenceAdapter =
			persistenceAdapter ?? createNoopPersistenceAdapter();
		this.rooms = new Map();
		this.socketToPlayer = new Map();
		this.playerToSocket = new Map();
		this.playerToRoom = new Map();
		this.spectatorToRoom = new Map();
		this.playerSessions = new Map();
		this.hubPresence = new Map();
		/** @type {Map<string, { inviteId: string, senderId: string, targetId: string, roomId: string, gameType: string, expiresAt: number, timeoutRef: ReturnType<typeof setTimeout> }>} */
		this.pendingInvites = new Map();
		this._hubPresenceFlushTimer = null;
		this._gameStateFlushTimers = new Map();
		this.rateLimiter = new RateLimiter();
		/** @type {ReturnType<typeof setInterval>[]} */
		this._intervalHandles = [];
		/** @type {Set<string>} */
		this._dominoTurnRoomIds = new Set();
		/** @type {Set<string>} */
		this._baraPhaseRoomIds = new Set();
		/** @type {Set<string>} */
		this._sketchPhaseRoomIds = new Set();
		this._startTurnTimerLoop();
		this._startBaraPhaseLoop();
		this._startSketchDrawPhaseLoop();
		this._startCleanupLoop();
	}

	shutdown() {
		for (const handle of this._intervalHandles) {
			clearInterval(handle);
		}
		this._intervalHandles.length = 0;
		if (this._hubPresenceFlushTimer != null) {
			clearTimeout(this._hubPresenceFlushTimer);
			this._hubPresenceFlushTimer = null;
		}
		for (const timer of this._gameStateFlushTimers.values()) {
			clearTimeout(timer);
		}
		this._gameStateFlushTimers.clear();
	}

	/** Update Socket.io server after Cloudflare DO hibernation restore. */
	setServer(io) {
		this.io = io;
	}

	_findRoomForPlayer(playerId) {
		let roomId = this.playerToRoom.get(playerId);
		if (roomId) {
			const room = this.rooms.get(roomId);
			if (room) return { roomId, room };
		}

		for (const [id, candidate] of this.rooms) {
			if (candidate.players.some((p) => p.id === playerId)) {
				this.playerToRoom.set(playerId, id);
				return { roomId: id, room: candidate };
			}
		}

		return null;
	}

	_findRoomForSpectator(playerId) {
		let roomId = this.spectatorToRoom.get(playerId);
		if (roomId) {
			const room = this.rooms.get(roomId);
			if (room) return { roomId, room };
		}

		for (const [id, candidate] of this.rooms) {
			if (candidate.spectators?.some((s) => s.id === playerId)) {
				this.spectatorToRoom.set(playerId, id);
				return { roomId: id, room: candidate };
			}
		}

		return null;
	}

	_getRoomIdForSocket(playerId) {
		return (
			this.playerToRoom.get(playerId) ?? this.spectatorToRoom.get(playerId) ?? null
		);
	}

	_resolvePlayerSession(playerId, sessionToken) {
		const result = verifyPlayerSession(
			this.playerSessions,
			playerId,
			sessionToken,
		);
		if (result.error) return { error: result.error };
		return { sessionToken: result.sessionToken };
	}

	/** Resolve player + room even if playerToRoom map was lost (e.g. reconnect). */
	_getPlayerContext(socket) {
		const playerId = this.socketToPlayer.get(socket.id);
		if (!playerId) return { error: "Not registered" };

		let roomId = this.playerToRoom.get(playerId);
		let room = roomId ? this.rooms.get(roomId) : null;

		if (!room) {
			const found = this._findRoomForPlayer(playerId);
			if (found) {
				roomId = found.roomId;
				room = found.room;
			}
		}

		if (!room) {
			const spectating = this._findRoomForSpectator(playerId);
			if (spectating) {
				roomId = spectating.roomId;
				room = spectating.room;
			}
		}

		if (!roomId || !room) return { error: "Not in a room" };

		this.playerToSocket.set(playerId, socket.id);
		return { playerId, roomId, room };
	}

	_requireConnectedPlayer(room, playerId) {
		const player = this._getRoomPlayer(room, playerId);
		if (!player) return { error: "Player not in room" };
		if (!player.connected) return { error: "Player not connected" };
		return { player };
	}

	_sanitizeMafiaRoleAssignments(room, incoming) {
		if (!incoming || typeof incoming !== "object") return {};
		const MAX_ENTRIES = 11;
		const out = {};
		let n = 0;
		for (const [playerId, roleId] of Object.entries(incoming)) {
			if (n >= MAX_ENTRIES) break;
			if (typeof playerId !== "string" || typeof roleId !== "string") continue;
			if (!room.players.some((p) => p.id === playerId)) continue;
			if (!ROLE_IDS.includes(roleId)) continue;
			out[playerId] = roleId;
			n += 1;
		}
		return out;
	}

	_ensureRoomLink(playerId, roomId) {
		this.playerToRoom.set(playerId, roomId);
	}

	_touchRoomActivity(room) {
		room.lastActivityAt = Date.now();
	}

	_ensurePlayersById(room) {
		if (!room.playersById) {
			room.playersById = new Map(room.players.map((p) => [p.id, p]));
		}
	}

	_rebuildPlayersById(room) {
		room.playersById = new Map(room.players.map((p) => [p.id, p]));
	}

	_indexRoomPlayer(room, player) {
		this._ensurePlayersById(room);
		room.playersById.set(player.id, player);
	}

	_unindexRoomPlayer(room, playerId) {
		room.playersById?.delete(playerId);
	}

	_getRoomPlayer(room, playerId) {
		this._ensurePlayersById(room);
		return room.playersById.get(playerId);
	}

	_destroyRoom(roomId) {
		const room = this.rooms.get(roomId);
		if (!room) return;

		for (const player of room.players) {
			if (player.disconnectTimer) {
				clearTimeout(player.disconnectTimer);
				player.disconnectTimer = null;
			}
			this._cancelPendingInvitesForPlayer(player.id);
		}
		for (const spectator of room.spectators ?? []) {
			this._cancelPendingInvitesForPlayer(spectator.id);
		}

		this._clearNextRoundTimer(room);
		this._clearAutoPlayTimer(room);
		room.game?.teardown?.();

		const flushTimer = this._gameStateFlushTimers.get(roomId);
		if (flushTimer) {
			clearTimeout(flushTimer);
			this._gameStateFlushTimers.delete(roomId);
		}

		for (const player of room.players) {
			const id = player.id;
			this.playerToRoom.delete(id);
			this.spectatorToRoom.delete(id);
			this.playerToSocket.delete(id);
			if (!this.playerToSocket.has(id)) {
				this.hubPresence.delete(id);
			}
			this._unindexRoomPlayer(room, id);
		}

		for (const spectator of room.spectators ?? []) {
			const id = spectator.id;
			this.spectatorToRoom.delete(id);
			this.playerToRoom.delete(id);
			this.playerToSocket.delete(id);
			if (!this.playerToSocket.has(id)) {
				this.hubPresence.delete(id);
			}
		}

		this._dominoTurnRoomIds.delete(roomId);
		this._baraPhaseRoomIds.delete(roomId);
		this._sketchPhaseRoomIds.delete(roomId);
		this.rooms.delete(roomId);
	}

	checkRateLimit(socketId, action, limit) {
		const ok = this.rateLimiter.allow(
			`${socketId}:${action}`,
			limit,
			RATE_LIMIT_WINDOW_MS,
		);
		if (!ok) this.rateLimiter.prune();
		return ok;
	}

	_upsertHubPresence(playerId, displayName, socketId) {
		this.hubPresence.set(playerId, {
			displayName: sanitizeDisplayName(displayName),
			socketId,
		});
	}

	_removeHubPresence(playerId, socketId) {
		const entry = this.hubPresence.get(playerId);
		if (entry?.socketId === socketId) {
			this.hubPresence.delete(playerId);
		}
	}

	_getPlayerPresenceMeta(playerId) {
		const spectatorRoomId = this.spectatorToRoom.get(playerId);
		if (spectatorRoomId) {
			const room = this.rooms.get(spectatorRoomId);
			if (room) {
				return {
					status: "spectating",
					inviteable: false,
					roomId: spectatorRoomId,
					hostId: room.hostId ?? null,
					gameType: room.gameType ?? null,
				};
			}
		}

		const roomId = this.playerToRoom.get(playerId);
		if (!roomId) {
			return {
				status: "hub",
				inviteable: true,
				roomId: null,
				hostId: null,
				gameType: null,
			};
		}
		const room = this.rooms.get(roomId);
		if (!room) {
			return {
				status: "hub",
				inviteable: true,
				roomId: null,
				hostId: null,
				gameType: null,
			};
		}
		const roomMeta = {
			roomId,
			hostId: room.hostId ?? null,
			gameType: room.gameType ?? null,
		};
		if (room.status === "playing") {
			return { status: "playing", inviteable: false, ...roomMeta };
		}
		if (room.status === "finished") {
			return { status: "lobby", inviteable: true, ...roomMeta };
		}
		return { status: "lobby", inviteable: true, ...roomMeta };
	}

	_isPlayerInviteable(playerId) {
		if (!this.hubPresence.has(playerId)) return false;
		return this._getPlayerPresenceMeta(playerId).inviteable;
	}

	/** Lobby join hints for presence list direct-join (strict `lobby` status only). */
	_getLobbyJoinPresenceFields(playerId) {
		const roomId = this.playerToRoom.get(playerId);
		if (!roomId) return {};
		const room = this.rooms.get(roomId);
		if (!room || room.status !== "lobby") return {};
		const gameDef = getGame(room.gameType);
		const maxCap = gameDef?.maxPlayers ?? 4;
		const playerCount = room.players.length;
		return {
			targetRoomId: roomId,
			gameType: room.gameType ?? null,
			isRoomFull: playerCount >= maxCap,
			lobbyPlayerCount: playerCount,
			lobbyMaxPlayers: maxCap,
		};
	}

	_buildHubPresencePayload(forPlayerId) {
		const players = [...this.hubPresence.entries()]
			.filter(([id]) => id !== forPlayerId)
			.map(([id, entry]) => {
				const meta = this._getPlayerPresenceMeta(id);
				const joinFields = this._getLobbyJoinPresenceFields(id);
				return {
					id,
					displayName: entry.displayName,
					status: meta.status,
					inviteable: meta.inviteable,
					roomId: meta.roomId,
					hostId: meta.hostId,
					gameType: meta.gameType,
					...joinFields,
				};
			})
			.sort((a, b) => a.displayName.localeCompare(b.displayName));

		return { total: players.length, players };
	}

	_emitToPlayer(playerId, event, payload) {
		const socketId = this.playerToSocket.get(playerId);
		if (!socketId) return;
		this.io.to(socketId).emit(event, payload);
	}

	_emitInviteError(socket, message) {
		socket.emit("invite:error", { message });
	}

	_findPendingInviteByPair(senderId, targetId) {
		for (const invite of this.pendingInvites.values()) {
			if (invite.senderId === senderId && invite.targetId === targetId) {
				return invite;
			}
		}
		return null;
	}

	_clearPendingInvite(inviteId, { emitExpired = false } = {}) {
		const invite = this.pendingInvites.get(inviteId);
		if (!invite) return;
		clearTimeout(invite.timeoutRef);
		this.pendingInvites.delete(inviteId);
		if (emitExpired) {
			const payload = { inviteId, roomId: invite.roomId };
			this._emitToPlayer(invite.senderId, "invite:expired", payload);
			this._emitToPlayer(invite.targetId, "invite:expired", payload);
		}
	}

	_cancelPendingInvitesForPlayer(playerId) {
		for (const [inviteId, invite] of [...this.pendingInvites.entries()]) {
			if (invite.senderId === playerId || invite.targetId === playerId) {
				this._clearPendingInvite(inviteId, { emitExpired: true });
			}
		}
	}

	_requireInviteSender(socket, sessionToken) {
		const playerId = this.socketToPlayer.get(socket.id);
		if (!playerId) return { error: "Not registered" };
		const session = this._resolvePlayerSession(playerId, sessionToken);
		if (session.error) return { error: session.error };
		return { playerId };
	}

	_canJoinRoomAsPlayer(room, playerId) {
		const gameDef = getGame(room.gameType);
		if (!gameDef) return { error: "Invalid room game type" };
		const alreadyIn = room.players.some((p) => p.id === playerId);
		if (alreadyIn) return { ok: true };
		if (room.status === "playing") {
			return { error: "Game already in progress" };
		}
		if (room.players.length >= gameDef.maxPlayers) {
			return { error: "Room is full" };
		}
		return { ok: true };
	}

	sendInvite(socket, { targetPlayerId, roomId, gameType, sessionToken }) {
		const auth = this._requireInviteSender(socket, sessionToken);
		if (auth.error) return { error: auth.error };
		const senderId = auth.playerId;

		if (senderId === targetPlayerId) {
			return { error: "Cannot invite yourself" };
		}

		const senderRoomId = this.playerToRoom.get(senderId);
		if (senderRoomId !== roomId) {
			return { error: "You must be in this room to invite" };
		}

		const room = this.rooms.get(roomId);
		if (!room) return { error: "Room not found" };
		if (room.status !== "lobby") {
			return { error: "Can only invite while in lobby" };
		}
		if (room.gameType !== gameType) {
			return { error: "Game type mismatch" };
		}
		if (!isGameEnabled(gameType)) {
			return { error: "This game is temporarily unavailable" };
		}

		if (!this.hubPresence.has(targetPlayerId)) {
			return { error: "Player is offline" };
		}
		if (this.playerToRoom.get(targetPlayerId) === roomId) {
			return { error: "Player is already in your lobby" };
		}
		if (!this._isPlayerInviteable(targetPlayerId)) {
			return { error: "Player is not available for invites" };
		}

		const joinCheck = this._canJoinRoomAsPlayer(room, targetPlayerId);
		if (joinCheck.error) return { error: joinCheck.error };

		const existing = this._findPendingInviteByPair(senderId, targetPlayerId);
		if (existing) {
			this._clearPendingInvite(existing.inviteId);
		}

		const inviteId = crypto.randomUUID();
		const expiresAt = Date.now() + INVITE_TTL_MS;
		const fromName = this.hubPresence.get(senderId)?.displayName ?? "Player";

		const timeoutRef = setTimeout(() => {
			this._clearPendingInvite(inviteId, { emitExpired: true });
		}, INVITE_TTL_MS);

		this.pendingInvites.set(inviteId, {
			inviteId,
			senderId,
			targetId: targetPlayerId,
			roomId,
			gameType,
			expiresAt,
			timeoutRef,
		});

		this._emitToPlayer(targetPlayerId, "invite:received", {
			inviteId,
			fromName,
			fromPlayerId: senderId,
			roomId,
			gameType,
			expiresAt,
		});

		return { inviteId, expiresAt };
	}

	respondToInvite(socket, { inviteId, accept, sessionToken }) {
		const auth = this._requireInviteSender(socket, sessionToken);
		if (auth.error) return { error: auth.error };
		const playerId = auth.playerId;

		const invite = this.pendingInvites.get(inviteId);
		if (!invite) return { error: "Invite not found or expired" };
		if (invite.targetId !== playerId) {
			return { error: "Not authorized for this invite" };
		}
		if (Date.now() > invite.expiresAt) {
			this._clearPendingInvite(inviteId);
			return { error: "Invite expired" };
		}

		this._clearPendingInvite(inviteId);

		const senderName =
			this.hubPresence.get(invite.senderId)?.displayName ?? "Player";
		const targetName =
			this.hubPresence.get(playerId)?.displayName ?? "Player";

		if (!accept) {
			this._emitToPlayer(invite.senderId, "invite:declined", {
				inviteId,
				targetId: playerId,
				displayName: targetName,
			});
			return { success: true, accepted: false };
		}

		this.leaveRoom(socket, { force: true });

		const joinResult = this.joinRoom(
			socket,
			invite.roomId,
			targetName,
		);
		if (joinResult.error) {
			this._emitInviteError(socket, joinResult.error);
			return { error: joinResult.error };
		}

		this._emitToPlayer(invite.senderId, "invite:accepted", {
			inviteId,
			targetId: playerId,
			displayName: targetName,
			roomId: invite.roomId,
			gameType: invite.gameType,
		});
		this._scheduleBroadcastHubPresence();

		return {
			success: true,
			accepted: true,
			roomId: invite.roomId,
			gameType: invite.gameType,
		};
	}

	joinRoomByTargetPlayer(socket, { targetPlayerId, playerId, sessionToken }) {
		const joiningId = this.socketToPlayer.get(socket.id);
		if (!joiningId) return { error: "Not registered" };
		if (playerId && playerId !== joiningId) {
			return { error: "Player id mismatch" };
		}

		const session = this._resolvePlayerSession(joiningId, sessionToken);
		if (session.error) return { error: session.error };

		if (joiningId === targetPlayerId) {
			return { error: "Cannot join your own lobby" };
		}

		const roomId = this.playerToRoom.get(targetPlayerId);
		if (!roomId) {
			return { error: "Target player is not in a room" };
		}

		const room = this.rooms.get(roomId);
		if (!room) {
			return { error: "Target player is not in a room" };
		}

		if (room.status !== "lobby") {
			return { error: "Target room match has already started" };
		}

		const gameDef = getGame(room.gameType);
		if (!gameDef) return { error: "Invalid room game type" };
		if (!isGameEnabled(room.gameType)) {
			return { error: "This game is temporarily unavailable" };
		}
		if (room.players.length >= gameDef.maxPlayers) {
			return { error: "Target lobby is full" };
		}

		const spectatorRoomId = this.spectatorToRoom.get(joiningId);
		if (spectatorRoomId) {
			if (this.useSocketRooms) socket.leave(spectatorRoomId);
			this._removeSpectatorFromRoom(joiningId, spectatorRoomId);
		}

		const currentRoomId = this.playerToRoom.get(joiningId);
		if (currentRoomId && currentRoomId !== roomId) {
			if (this.useSocketRooms) socket.leave(currentRoomId);
			this._removePlayerFromRoom(joiningId, currentRoomId);
		}

		const displayName =
			this.hubPresence.get(joiningId)?.displayName ?? "Player";
		const joinResult = this.joinRoom(socket, roomId, displayName);
		if (joinResult.error) {
			return { error: joinResult.error };
		}

		this._scheduleBroadcastHubPresence();

		return {
			roomId: joinResult.roomId ?? roomId,
			gameType: room.gameType,
		};
	}

	sendHubPresenceToSocket(socket) {
		const playerId = this.socketToPlayer.get(socket.id);
		if (!playerId) return;
		socket.emit("hub:presence", this._buildHubPresencePayload(playerId));
	}

	_broadcastHubPresence() {
		for (const socketId of this.socketToPlayer.keys()) {
			const playerId = this.socketToPlayer.get(socketId);
			if (!playerId) continue;
			this.io
				.to(socketId)
				.emit("hub:presence", this._buildHubPresencePayload(playerId));
		}
	}

	/** Coalesce rapid join/leave/name updates into one hub fan-out. */
	_scheduleBroadcastHubPresence() {
		if (this._hubPresenceFlushTimer != null) return;
		this._hubPresenceFlushTimer = setTimeout(() => {
			this._hubPresenceFlushTimer = null;
			this._broadcastHubPresence();
		}, 250);
	}

	/** Remove a prior player id tied to this socket (client identity reset). */
	_detachSocketIdentity(socket, playerId) {
		if (!playerId) return;

		this._removeHubPresence(playerId, socket.id);
		this.playerToSocket.delete(playerId);
		this.playerSessions.delete(playerId);

		const spectatorRoomId = this.spectatorToRoom.get(playerId);
		if (spectatorRoomId) {
			if (this.useSocketRooms) socket.leave(spectatorRoomId);
			this._removeSpectatorFromRoom(playerId, spectatorRoomId);
		}

		const roomId = this.playerToRoom.get(playerId);
		if (roomId) {
			const room = this.rooms.get(roomId);
			if (room) {
				const player = this._getRoomPlayer(room, playerId);
				if (player?.disconnectTimer) {
					clearTimeout(player.disconnectTimer);
					player.disconnectTimer = null;
				}
			}
			if (this.useSocketRooms) socket.leave(roomId);
			this._removePlayerFromRoom(playerId, roomId);
		}

		this._scheduleBroadcastHubPresence();
	}

	registerPlayer(socket, playerId, displayName, sessionToken) {
		const previousPlayerId = this.socketToPlayer.get(socket.id);
		if (previousPlayerId && previousPlayerId !== playerId) {
			this._detachSocketIdentity(socket, previousPlayerId);
		}

		const session = this._resolvePlayerSession(playerId, sessionToken);
		if (session.error) return { error: session.error };

		const safeName = sanitizeDisplayName(displayName);
		const prevSocketId = this.playerToSocket.get(playerId);
		if (prevSocketId && prevSocketId !== socket.id) {
			const prevSocket = this.io.sockets.sockets.get(prevSocketId);
			if (prevSocket) {
				prevSocket.emit("session:superseded", {});
				prevSocket.disconnect(true);
			}
		}
		this.socketToPlayer.set(socket.id, playerId);
		this.playerToSocket.set(playerId, socket.id);

		const found = this._findRoomForPlayer(playerId);
		if (found) {
			const { roomId, room } = found;
			const player = this._getRoomPlayer(room, playerId);
			if (player) {
				// Authoritative player reconnect — never retain spectator mappings.
				this.playerToRoom.set(playerId, roomId);
				this.spectatorToRoom.delete(playerId);
				if (room.spectators?.length) {
					room.spectators = room.spectators.filter((s) => s.id !== playerId);
				}

				if (player.disconnectTimer) {
					clearTimeout(player.disconnectTimer);
					player.disconnectTimer = null;
				}
				player.connected = true;
				player.displayName = safeName;
				player.tabFocused = true;
				this._ensureRoomLink(playerId, roomId);
				if (this.useSocketRooms) socket.join(roomId);

				if (room.game) {
					if (
						room.status === "playing" &&
						typeof room.game.resumeTurnTimer === "function"
					) {
						room.game.resumeTurnTimer();
					}
				}

				this._touchRoomActivity(room);
				this._emitReconnectSync(socket, room, playerId, { isSpectator: false });
				this.broadcastLobbyState(roomId);
				this._upsertHubPresence(playerId, safeName, socket.id);
				this._scheduleBroadcastHubPresence();
				return {
					reconnected: true,
					roomId,
					isSpectator: false,
					sessionToken: session.sessionToken,
				};
			}
		}

		const spectating = this._findRoomForSpectator(playerId);
		if (spectating) {
			const { roomId, room } = spectating;
			const spectator = room.spectators?.find((s) => s.id === playerId);
			if (spectator) {
				spectator.connected = true;
				spectator.displayName = safeName;
				this.spectatorToRoom.set(playerId, roomId);
				if (this.useSocketRooms) socket.join(roomId);

				this._touchRoomActivity(room);
				this._emitReconnectSync(socket, room, playerId, { isSpectator: true });
				this.broadcastLobbyState(roomId);
				this._upsertHubPresence(playerId, safeName, socket.id);
				this._scheduleBroadcastHubPresence();
				return {
					reconnected: true,
					roomId,
					isSpectator: true,
					sessionToken: session.sessionToken,
				};
			}
		}

		this._upsertHubPresence(playerId, safeName, socket.id);
		this._scheduleBroadcastHubPresence();
		return { reconnected: false, sessionToken: session.sessionToken };
	}

	updateDisplayName(socket, displayName) {
		const playerId = this.socketToPlayer.get(socket.id);
		if (!playerId) return { error: "Not registered" };

		const safeName = sanitizeDisplayName(displayName);
		const roomId = this._getRoomIdForSocket(playerId);

		if (roomId) {
			const room = this.rooms.get(roomId);
			if (!room) return { error: "Room not found" };
			if (room.status !== "lobby") {
				return { error: "Cannot change name during a match" };
			}

			const player = this._getRoomPlayer(room, playerId);
			if (player) {
				player.displayName = safeName;
			} else {
				const spectator = room.spectators?.find((s) => s.id === playerId);
				if (spectator) {
					spectator.displayName = safeName;
				} else {
					return { error: "Not in room" };
				}
			}
			this.broadcastLobbyState(roomId);
		}

		this._upsertHubPresence(playerId, safeName, socket.id);
		this._scheduleBroadcastHubPresence();
		this.sendHubPresenceToSocket(socket);
		return { success: true };
	}

	createRoom(socket, displayName, gameType = "dominoes") {
		const playerId = this.socketToPlayer.get(socket.id);
		if (!playerId) return { error: "Not registered" };
		if (this.playerToRoom.has(playerId) || this.spectatorToRoom.has(playerId)) {
			return { error: "Already in a room" };
		}

		if (this.rooms.size >= MAX_ROOMS) {
			return { error: "Server at room capacity, try again later" };
		}

		const game = getGame(gameType);
		if (!game) return { error: "Unknown game type" };
		if (!isGameEnabled(gameType)) {
			return { error: "This game is temporarily unavailable" };
		}

		const safeName = sanitizeDisplayName(displayName);

		let roomId = generateRoomId();
		while (this.rooms.has(roomId)) roomId = generateRoomId();

		const room = {
			id: roomId,
			hostId: playerId,
			status: "lobby",
			gameType,
			players: [
				{
					id: playerId,
					displayName: safeName,
					connected: true,
					disconnectTimer: null,
					tabFocused: true,
				},
			],
			spectators: [],
			game: null,
			settings:
				gameType === "wordgame" ?
					{ ...DEFAULT_WORD_GAME_SETTINGS }
				: gameType === "bara-alsalafa" ?
					{ ...DEFAULT_BARA_SETTINGS }
				: gameType === "mafia" ?
					{ ...DEFAULT_MAFIA_SETTINGS }
				: gameType === "sketch-draw" ?
					{ ...DEFAULT_SKETCH_DRAW_SETTINGS }
				:	{ ...DEFAULT_MATCH_SETTINGS },
			nextRoundTimer: null,
			autoPlayTimer: null,
			autoPlayPending: false,
			createdAt: Date.now(),
			engagement: {
				winStreaks: {},
			},
		};

		this._rebuildPlayersById(room);
		this.rooms.set(roomId, room);
		this._touchRoomActivity(room);
		this.playerToRoom.set(playerId, roomId);
		if (this.useSocketRooms) socket.join(roomId);

		this._upsertHubPresence(playerId, safeName, socket.id);
		this._scheduleBroadcastHubPresence();
		this.broadcastLobbyState(roomId);
		return {
			roomId,
			lobby: this._lobbyStatePayload(room, playerId),
		};
	}

	joinRoom(socket, roomId, displayName) {
		const playerId = this.socketToPlayer.get(socket.id);
		if (!playerId) return { error: "Not registered" };

		const room = this.rooms.get(roomId);
		if (!room) return { error: "Room not found" };

		const safeName = sanitizeDisplayName(displayName);

		const gameDef = getGame(room.gameType);
		if (!gameDef) return { error: "Invalid room game type" };

		const alreadyInRoom = this._getRoomPlayer(room, playerId);
		if (!isGameEnabled(room.gameType) && !alreadyInRoom) {
			return { error: "This game is temporarily unavailable" };
		}

		const spectatingElsewhere = this.spectatorToRoom.get(playerId);
		if (spectatingElsewhere && spectatingElsewhere !== roomId) {
			return { error: "Leave current room first" };
		}
		if (spectatingElsewhere === roomId) {
			this._removeSpectatorFromRoom(playerId, roomId);
		} else if (this.spectatorToRoom.has(playerId)) {
			return { error: "Already spectating this room" };
		}
		if (room.spectators?.some((s) => s.id === playerId)) {
			this._removeSpectatorFromRoom(playerId, roomId);
		}

		if (this.playerToRoom.has(playerId) && this.playerToRoom.get(playerId) !== roomId) {
			return { error: "Already in a room" };
		}

		if (room.status === "playing") {
			const existing = this._getRoomPlayer(room, playerId);
			if (!existing) return { error: "Game already in progress" };
		}

		const alreadyIn = this._getRoomPlayer(room, playerId);
		if (alreadyIn) {
			if (alreadyIn.disconnectTimer) {
				clearTimeout(alreadyIn.disconnectTimer);
				alreadyIn.disconnectTimer = null;
			}
			alreadyIn.connected = true;
			alreadyIn.displayName = safeName;
		} else {
			if (room.players.length >= gameDef.maxPlayers) {
				return { error: "Room is full" };
			}
			const joined = {
				id: playerId,
				displayName: safeName,
				connected: true,
				disconnectTimer: null,
				tabFocused: true,
			};
			room.players.push(joined);
			this._indexRoomPlayer(room, joined);
		}

		this.playerToRoom.set(playerId, roomId);
		if (this.useSocketRooms) socket.join(roomId);

		this._touchRoomActivity(room);
		this._upsertHubPresence(playerId, safeName, socket.id);
		this._scheduleBroadcastHubPresence();
		this.broadcastLobbyState(roomId);
		if (room.game) {
			const state = room.game.serializeForPlayer(playerId);
			socket.emit("game:state:update", { roomId, ...state });
		}
		return { roomId };
	}

	spectateRoom(socket, roomId, displayName) {
		const playerId = this.socketToPlayer.get(socket.id);
		if (!playerId) return { error: "Not registered" };

		const room = this.rooms.get(roomId);
		if (!room) return { error: "Room not found" };
		if (room.gameType !== "dominoes" && room.gameType !== "wordgame") {
			return { error: "Spectating is not available for this game type" };
		}

		const alreadySpectating = room.spectators?.find((s) => s.id === playerId);
		if (!isGameEnabled(room.gameType) && !alreadySpectating) {
			return { error: "This game is temporarily unavailable" };
		}

		if (room.players.some((p) => p.id === playerId)) {
			return { error: "You are already in this room as a player" };
		}

		const playerRoomId = this.playerToRoom.get(playerId);
		if (playerRoomId && playerRoomId !== roomId) {
			return { error: "Already in a room" };
		}
		if (playerRoomId === roomId) {
			return { error: "You are already in this room as a player" };
		}

		const safeName = sanitizeDisplayName(displayName);
		if (!room.spectators) room.spectators = [];

		const existing = room.spectators.find((s) => s.id === playerId);
		if (existing) {
			existing.connected = true;
			existing.displayName = safeName;
		} else {
			room.spectators.push({
				id: playerId,
				displayName: safeName,
				connected: true,
			});
		}

		this.spectatorToRoom.set(playerId, roomId);
		if (this.useSocketRooms) socket.join(roomId);

		this._touchRoomActivity(room);
		this._upsertHubPresence(playerId, safeName, socket.id);
		this._scheduleBroadcastHubPresence();
		this.broadcastLobbyState(roomId);

		if (room.game && room.status === "playing") {
			const state = this._augmentWordSpectatorState(
				room,
				room.game.serializeForPlayer(playerId),
			);
			socket.emit("game:state:update", { roomId, ...state });
		}

		return { roomId, isSpectator: true };
	}

	leaveRoom(socket, payload = {}) {
		const force = payload?.force === true;
		let playerId = this.socketToPlayer.get(socket.id);

		if (
			!playerId &&
			typeof payload?.playerId === "string" &&
			payload.playerId.length > 0
		) {
			playerId = payload.playerId;
			const inRoom = this._findRoomForPlayer(playerId);
			if (inRoom) {
				this.socketToPlayer.set(socket.id, playerId);
				this.playerToSocket.set(playerId, socket.id);
			}
		}

		if (!playerId) {
			return { error: "Not registered" };
		}

		const spectatorRoomId = this.spectatorToRoom.get(playerId);
		if (spectatorRoomId) {
			if (this.useSocketRooms) socket.leave(spectatorRoomId);
			this._removeSpectatorFromRoom(playerId, spectatorRoomId);
			this._scheduleBroadcastHubPresence();
			return { success: true, left: true };
		}

		let roomId = this.playerToRoom.get(playerId);
		if (!roomId) {
			const found = this._findRoomForPlayer(playerId);
			roomId = found?.roomId;
		}
		if (!roomId) {
			this.playerToRoom.delete(playerId);
			return { success: true, left: false };
		}

		const room = this.rooms.get(roomId);
		if (!room) {
			this.playerToRoom.delete(playerId);
			return { success: true, left: false };
		}

		const player = this._getRoomPlayer(room, playerId);
		if (player?.disconnectTimer) {
			clearTimeout(player.disconnectTimer);
			player.disconnectTimer = null;
		}

		if (room && isActiveWordGameSession(room) && !force) {
			if (player) {
				player.connected = false;
			}
			this.playerToRoom.delete(playerId);
			if (this.useSocketRooms) socket.leave(roomId);
			this.broadcastLobbyState(roomId);
			this.broadcastGameState(roomId);
			this._scheduleBroadcastHubPresence();
			return { success: true, left: false, softDisconnect: true };
		}

		if (this.useSocketRooms) socket.leave(roomId);
		this._removePlayerFromRoom(playerId, roomId);
		this._scheduleBroadcastHubPresence();
		return { success: true, left: true, roomId };
	}

	startGame(socket) {
		const playerId = this.socketToPlayer.get(socket.id);
		const roomId = this.playerToRoom.get(playerId);
		if (!roomId) return { error: "Not in a room" };

		const room = this.rooms.get(roomId);
		if (!room) return { error: "Room not found" };
		if (room.hostId !== playerId) return { error: "Only the host can start" };
		if (room.gameType === "wordgame" && isWordGameWon(room)) {
			this._clearNextRoundTimer(room);
			room.game?.teardown?.();
			room.game = null;
			room.status = "lobby";
		}

		if (room.status !== "lobby") return { error: "Game already started" };

		const gameDef = getGame(room.gameType);
		if (!gameDef) return { error: "Invalid game type" };
		if (!isGameEnabled(room.gameType)) {
			return { error: "This game is temporarily unavailable" };
		}

		const connectedPlayers = room.players.filter((p) => p.connected);
		if (connectedPlayers.length < gameDef.minPlayers) {
			return { error: `Need at least ${gameDef.minPlayers} players` };
		}

		if (
			room.gameType === "dominoes" &&
			room.settings.mode === "2v2" &&
			connectedPlayers.length !== 4
		) {
			return { error: "2v2 Team Mode requires exactly 4 players" };
		}

		if (room.gameType === "wordgame" && connectedPlayers.length !== 2) {
			return { error: "Secret Word requires exactly 2 players" };
		}

		if (room.gameType === "bara-alsalafa") {
			room.settings.categoryPackageIds = normalizeCategoryPackageIds(room.settings);
			if (room.settings.categoryPackageIds.length === 0) {
				return { error: "Select at least one category package" };
			}
		}

		if (room.gameType === "sketch-draw") {
			room.settings.categoryPackageIds = normalizeSketchCategoryPackageIds(
				room.settings,
			);
			const { error } = buildActiveWordPool(room.settings);
			if (error) return { error };
		}

		let enginePlayerIds = connectedPlayers.map((p) => p.id);
		if (room.gameType === "mafia") {
			const ids = connectedPlayers.map((p) => p.id);
			if (!room.settings.narratorId || !ids.includes(room.settings.narratorId)) {
				room.settings.narratorId = room.hostId;
			}
			const narratorId = room.settings.narratorId;
			enginePlayerIds = ids.filter((id) => id !== narratorId);
			if (enginePlayerIds.length > 11) {
				return { error: "At most 11 gameplay players (narrator is separate)" };
			}
			if (!room.settings.roleCounts) {
				room.settings.roleCounts = suggestBalancedSetup(
					enginePlayerIds.length,
				).counts;
			}
			room.settings.roleCounts = normalizeRoleCounts(room.settings.roleCounts);
			const setup = validateLobbySetup(
				enginePlayerIds.length,
				room.settings.roleCounts,
			);
			if (!setup.valid) {
				return { error: setup.errors[0] };
			}
		}

		this._resetMatchOverEngagementGate(room);

		const engineSettings =
			room.gameType === "bara-alsalafa" ?
				{ ...room.settings, hostId: room.hostId }
			:	room.settings;
		room.game = gameDef.createEngine(enginePlayerIds, engineSettings);
		room.game.roomId = roomId;
		room.status = "playing";
		if (room.gameType === "dominoes") this._dominoTurnRoomIds.add(roomId);
		if (room.gameType === "bara-alsalafa") this._baraPhaseRoomIds.add(roomId);
		if (room.gameType === "sketch-draw") this._sketchPhaseRoomIds.add(roomId);
		this._touchRoomActivity(room);
		if (room.gameType === "wordgame") {
			room.wordScratchpads = {
				roundNumber: room.game.roundNumber,
				byPlayer: {},
			};
			for (const p of room.players) {
				p.tabFocused = true;
			}
			this._broadcastWordTabFocus(room);
		}
		this.broadcastGameState(roomId);
		this.broadcastLobbyState(roomId);
		this._scheduleBroadcastHubPresence();
		return { success: true };
	}

	updateRoomSettings(socket, settings) {
		const playerId = this.socketToPlayer.get(socket.id);
		const roomId = this.playerToRoom.get(playerId);
		if (!roomId) return { error: "Not in a room" };

		const room = this.rooms.get(roomId);
		if (!room) return { error: "Room not found" };
		if (room.hostId !== playerId)
			return { error: "Only the host can change settings" };
		if (room.status !== "lobby")
			return { error: "Cannot change settings after start" };

		if (settings?.scoreCap && SCORE_CAP_OPTIONS.includes(settings.scoreCap)) {
			room.settings.scoreCap = settings.scoreCap;
		}

		if (settings?.mode === "ffa" || settings?.mode === "2v2") {
			room.settings.mode = settings.mode;
		}

		if (room.gameType === "wordgame") {
			const cap = Number(settings?.pointsToWin);
			if (Number.isInteger(cap) && cap >= 1 && cap <= 99) {
				room.settings.pointsToWin = cap;
			}
			if (
				settings?.wordCategory === "custom" ||
				settings?.wordCategory === "lol-champions"
			) {
				room.settings.wordCategory = settings.wordCategory;
			}
		}

		if (room.gameType === "bara-alsalafa") {
			if (settings?.categoryPackageIds !== undefined) {
				room.settings.categoryPackageIds = normalizeCategoryPackageIds({
					categoryPackageIds: settings.categoryPackageIds,
				});
			} else if (
				settings?.categoryPackageId &&
				CATEGORY_PACKAGE_IDS.includes(settings.categoryPackageId)
			) {
				const current = normalizeCategoryPackageIds(room.settings);
				const id = settings.categoryPackageId;
				const has = current.includes(id);
				const next = has ? current.filter((x) => x !== id) : [...current, id];
				room.settings.categoryPackageIds =
					next.length > 0 ? next : [id];
			}
			const rounds = Number(settings?.roundsToWin);
			if (Number.isInteger(rounds) && rounds >= 1 && rounds <= 10) {
				room.settings.roundsToWin = rounds;
			} else if (BARA_ROUNDS_OPTIONS.includes(settings?.roundsToWin)) {
				room.settings.roundsToWin = settings.roundsToWin;
			}
		}

		if (room.gameType === "mafia") {
			if (
				settings?.narratorId &&
				room.players.some((p) => p.id === settings.narratorId)
			) {
				room.settings.narratorId = settings.narratorId;
			}
			if (typeof settings?.revealRoleOnDeath === "boolean") {
				room.settings.revealRoleOnDeath = settings.revealRoleOnDeath;
			}
			if (settings?.roleCounts && typeof settings.roleCounts === "object") {
				room.settings.roleCounts = normalizeRoleCounts({
					...room.settings.roleCounts,
					...settings.roleCounts,
				});
			}
			if (
				settings?.roleAssignments &&
				typeof settings.roleAssignments === "object"
			) {
				const patch = this._sanitizeMafiaRoleAssignments(
					room,
					settings.roleAssignments,
				);
				const merged = {
					...room.settings.roleAssignments,
					...patch,
				};
				const capped = {};
				let n = 0;
				for (const [playerId, roleId] of Object.entries(merged)) {
					if (n >= 11) break;
					if (!ROLE_IDS.includes(roleId)) continue;
					if (!room.players.some((p) => p.id === playerId)) continue;
					capped[playerId] = roleId;
					n += 1;
				}
				room.settings.roleAssignments = capped;
			}
		}

		if (room.gameType === "sketch-draw") {
			if (settings?.categoryPackageIds !== undefined) {
				room.settings.categoryPackageIds = normalizeSketchCategoryPackageIds({
					categoryPackageIds: settings.categoryPackageIds,
				});
			} else if (
				settings?.categoryPackageId &&
				SKETCH_CATEGORY_PACKAGE_IDS.includes(settings.categoryPackageId)
			) {
				const current = normalizeSketchCategoryPackageIds(room.settings);
				const id = settings.categoryPackageId;
				const has = current.includes(id);
				const next = has ? current.filter((x) => x !== id) : [...current, id];
				room.settings.categoryPackageIds =
					next.length > 0 ? next : [id];
			}
			const rounds = Number(settings?.totalRounds);
			if (Number.isInteger(rounds) && rounds >= 1 && rounds <= 20) {
				room.settings.totalRounds = rounds;
			} else if (SKETCH_DRAW_ROUNDS_OPTIONS.includes(settings?.totalRounds)) {
				room.settings.totalRounds = settings.totalRounds;
			}
			const timerSec = Number(settings?.drawTimerSec);
			if (
				Number.isFinite(timerSec) &&
				timerSec >= SKETCH_DRAW_TIMER_MIN_SEC &&
				timerSec <= SKETCH_DRAW_TIMER_MAX_SEC
			) {
				room.settings.drawTimerSec = Math.floor(timerSec);
			} else if (SKETCH_DRAW_TIMER_OPTIONS.includes(settings?.drawTimerSec)) {
				room.settings.drawTimerSec = settings.drawTimerSec;
			}
			if (typeof settings?.customWords === "string") {
				room.settings.customWords = settings.customWords.slice(0, 4000);
			}
			if (typeof settings?.useCustomWordsOnly === "boolean") {
				room.settings.useCustomWordsOnly = settings.useCustomWordsOnly;
			}
		}

		this._touchRoomActivity(room);
		this.broadcastLobbyState(roomId);
		return { success: true, settings: room.settings };
	}

	addDevBots(socket, requestedCount) {
		const hostId = this.socketToPlayer.get(socket.id);
		const roomId = this.playerToRoom.get(hostId);
		if (!roomId) return { error: "Not in a room" };

		const room = this.rooms.get(roomId);
		if (!room) return { error: "Room not found" };
		if (!isDevBotsEnabled(room.gameType)) {
			return { error: "Dev bots are not enabled for this game" };
		}
		if (room.hostId !== hostId) {
			return { error: "Only the host can add dev bots" };
		}
		if (room.status !== "lobby") {
			return { error: "Bots can only be added in the lobby" };
		}

		const gameDef = getGame(room.gameType);
		if (!gameDef) return { error: "Invalid game type" };

		const slotsLeft = gameDef.maxPlayers - room.players.length;
		if (slotsLeft <= 0) {
			return { error: "Room is full" };
		}

		let toAdd = Number(requestedCount);
		if (!Number.isInteger(toAdd) || toAdd < 1) {
			toAdd = Math.max(0, gameDef.minPlayers - room.players.length);
		}
		toAdd = Math.min(toAdd, slotsLeft);
		if (toAdd <= 0) {
			return {
				error: `Already at or above minimum players (${gameDef.minPlayers})`,
			};
		}

		const existingBots = room.players.filter((p) => p.isBot).length;
		for (let i = 0; i < toAdd; i++) {
			const bot = createBotPlayer(existingBots + i + 1);
			room.players.push(bot);
			this._indexRoomPlayer(room, bot);
		}

		this._touchRoomActivity(room);
		this.broadcastLobbyState(roomId);
		return { success: true, added: toAdd };
	}

	removeDevBots(socket) {
		const hostId = this.socketToPlayer.get(socket.id);
		const roomId = this.playerToRoom.get(hostId);
		if (!roomId) return { error: "Not in a room" };

		const room = this.rooms.get(roomId);
		if (!room) return { error: "Room not found" };
		if (!isDevBotsEnabled(room.gameType)) {
			return { error: "Dev bots are not enabled for this game" };
		}
		if (room.hostId !== hostId) {
			return { error: "Only the host can remove dev bots" };
		}
		if (room.status !== "lobby") {
			return { error: "Bots can only be removed in the lobby" };
		}

		const before = room.players.length;
		room.players = room.players.filter((p) => !p.isBot);
		this._rebuildPlayersById(room);
		const removed = before - room.players.length;
		if (removed === 0) {
			return { error: "No bots in the room" };
		}

		this.broadcastLobbyState(roomId);
		return { success: true, removed };
	}

	kickPlayer(socket, targetPlayerId) {
		const hostId = this.socketToPlayer.get(socket.id);
		const roomId = this.playerToRoom.get(hostId);
		if (!roomId) return { error: "Not in a room" };

		const room = this.rooms.get(roomId);
		if (!room) return { error: "Room not found" };
		if (room.hostId !== hostId)
			return { error: "Only the host can kick players" };
		if (room.status !== "lobby")
			return { error: "Cannot kick players during a match" };
		if (targetPlayerId === hostId) return { error: "Cannot kick yourself" };

		const target = this._getRoomPlayer(room, targetPlayerId);
		if (!target) return { error: "Player not found in room" };

		const targetSocketId = this.playerToSocket.get(targetPlayerId);
		if (targetSocketId) {
			if (this.useSocketRooms) {
				const targetSocket = this.io.sockets.sockets.get(targetSocketId);
				targetSocket?.leave(roomId);
			}
			this.io.to(targetSocketId).emit("room:kicked", {
				roomId,
				message: "You were removed from the lobby by the host",
			});
		}

		if (target.disconnectTimer) {
			clearTimeout(target.disconnectTimer);
		}

		this._removePlayerFromRoom(targetPlayerId, roomId);
		return { success: true };
	}

	cancelMatch(socket) {
		const playerId = this.socketToPlayer.get(socket.id);
		const roomId = this.playerToRoom.get(playerId);
		if (!roomId) return { error: "Not in a room" };

		const room = this.rooms.get(roomId);
		if (!room) return { error: "Room not found" };
		if (room.hostId !== playerId)
			return { error: "Only the host can cancel the match" };

		const finishedWordMatch =
			room.gameType === "wordgame" &&
			room.status === "finished" &&
			room.game?.phase === "match_over";

		const finishedSketchMatch =
			room.gameType === "sketch-draw" &&
			room.status === "finished" &&
			room.game?.phase === "match_over";

		const finishedBaraMatch =
			room.gameType === "bara-alsalafa" &&
			room.status === "finished" &&
			room.game?.phase === "match_over";

		if (
			room.status !== "playing" &&
			!finishedWordMatch &&
			!finishedSketchMatch &&
			!finishedBaraMatch
		) {
			return { error: "No match in progress" };
		}

		this._clearNextRoundTimer(room);
		this._clearAutoPlayTimer(room);
		room.game?.teardown?.();
		room.game = null;
		room.status = "lobby";
		this._touchRoomActivity(room);

		for (const player of room.players) {
			const socketId = this.playerToSocket.get(player.id);
			if (!socketId) continue;
			this.io.to(socketId).emit("game:cancelled", { roomId });
		}
		for (const spectator of room.spectators ?? []) {
			const socketId = this.playerToSocket.get(spectator.id);
			if (!socketId) continue;
			this.io.to(socketId).emit("game:cancelled", { roomId });
		}

		this.broadcastLobbyState(roomId);
		this._scheduleBroadcastHubPresence();
		return { success: true };
	}

	/** Host closes the room; all players are removed and sent home. */
	disbandRoom(socket) {
		const playerId = this.socketToPlayer.get(socket.id);
		const roomId = this.playerToRoom.get(playerId);
		if (!roomId) return { error: "Not in a room" };

		const room = this.rooms.get(roomId);
		if (!room) return { error: "Room not found" };
		if (room.hostId !== playerId) {
			return { error: "Only the host can close the room" };
		}

		const matchFinished = room.game?.phase === "match_over";
		if (room.status === "playing" && !matchFinished) {
			return {
				error: "أنهِ المباراة أو ألغِها قبل إغلاق الغرفة",
			};
		}

		this._clearNextRoundTimer(room);
		this._clearAutoPlayTimer(room);
		room.game?.teardown?.();
		room.game = null;
		room.status = "lobby";

		this._emitToRoom(room, "room:disband", {
			roomId: room.id,
			message: "أغلق المضيف الغرفة",
		});

		const playerIds = [
			...room.players.map((p) => p.id),
			...(room.spectators ?? []).map((s) => s.id),
		];
		for (const id of playerIds) {
			this._removePlayerFromRoom(id, roomId);
		}

		this._scheduleBroadcastHubPresence();
		return { success: true };
	}

	handleMove(socket, tile, end) {
		const ctx = this._getPlayerContext(socket);
		if (ctx.error) return { error: ctx.error };

		const { playerId, room } = ctx;
		const connected = this._requireConnectedPlayer(room, playerId);
		if (connected.error) return { error: connected.error };
		if (!room.game || room.gameType !== "dominoes") {
			return { error: "No active dominoes game" };
		}

		const result = room.game.playMove(playerId, tile, end);
		if (!result.success) return { error: result.error };

		this._touchRoomActivity(room);
		this._clearAutoPlayTimer(room);
		this.broadcastGameState(room.id);
		return { success: true };
	}

	handleDraw(socket) {
		const ctx = this._getPlayerContext(socket);
		if (ctx.error) return { error: ctx.error };

		const { playerId, room } = ctx;
		const connected = this._requireConnectedPlayer(room, playerId);
		if (connected.error) return { error: connected.error };
		if (!room.game || room.gameType !== "dominoes") {
			return { error: "No active dominoes game" };
		}

		const result = room.game.drawTile(playerId);
		if (!result.success) return { error: result.error };

		this._clearAutoPlayTimer(room);
		this.broadcastGameState(room.id);
		return { success: true };
	}

	handlePass(socket) {
		const ctx = this._getPlayerContext(socket);
		if (ctx.error) return { error: ctx.error };

		const { playerId, room } = ctx;
		const connected = this._requireConnectedPlayer(room, playerId);
		if (connected.error) return { error: connected.error };
		if (!room.game || room.gameType !== "dominoes") {
			return { error: "No active dominoes game" };
		}

		const result = room.game.passTurn(playerId);
		if (!result.success) return { error: result.error };

		this._clearAutoPlayTimer(room);
		this.broadcastGameState(room.id);
		return { success: true };
	}

	handleContinueRound(socket) {
		const ctx = this._getPlayerContext(socket);
		if (ctx.error) return { error: ctx.error };

		const { playerId, room } = ctx;
		if (room.hostId !== playerId) {
			return { error: "Only the host can continue" };
		}
		if (!room.game || room.gameType !== "dominoes") {
			return { error: "No active dominoes game" };
		}
		if (room.game.phase !== "round_over") {
			return { error: "Round is not over" };
		}

		this._clearNextRoundTimer(room);
		this._clearAutoPlayTimer(room);
		room.game.startNextRound();
		this.broadcastGameState(room.id);
		return { success: true };
	}

	handleRematch(socket) {
		const ctx = this._getPlayerContext(socket);
		if (ctx.error) return { error: ctx.error };

		const { playerId, room } = ctx;
		if (room.hostId !== playerId) {
			return { error: "Only the host can start a rematch" };
		}
		if (!room.game) {
			return { error: "No match to rematch" };
		}
		if (room.game.phase !== "match_over") {
			return { error: "Match is not finished" };
		}

		const gameDef = getGame(room.gameType);
		if (!gameDef) return { error: "Invalid game type" };
		if (!isGameEnabled(room.gameType)) {
			return { error: "This game is temporarily unavailable" };
		}

		const connectedPlayers = room.players.filter((p) => p.connected);
		let playersToStart = connectedPlayers;

		if (room.gameType === "wordgame") {
			const matchIds = room.game.playerIds ?? [];
			const matchPlayers = room.players.filter((p) =>
				matchIds.includes(p.id),
			);
			if (matchPlayers.length !== 2) {
				return { error: "Secret Word requires exactly 2 players" };
			}
			playersToStart = matchPlayers;
		}

		if (playersToStart.length < gameDef.minPlayers) {
			return { error: `Need at least ${gameDef.minPlayers} players` };
		}

		if (room.gameType === "dominoes") {
			if (
				room.settings.mode === "2v2" &&
				playersToStart.length !== 4
			) {
				return { error: "2v2 Team Mode requires exactly 4 players" };
			}
		}

		if (room.gameType === "bara-alsalafa") {
			room.settings.categoryPackageIds = normalizeCategoryPackageIds(
				room.settings,
			);
			if (room.settings.categoryPackageIds.length === 0) {
				return { error: "Select at least one category package" };
			}
		}

		this._clearNextRoundTimer(room);
		this._clearAutoPlayTimer(room);
		this._resetMatchOverEngagementGate(room);
		room.game = gameDef.createEngine(
			playersToStart.map((p) => p.id),
			room.settings,
		);
		room.game.roomId = room.id;
		room.status = "playing";
		if (room.gameType === "dominoes") this._dominoTurnRoomIds.add(room.id);
		if (room.gameType === "bara-alsalafa") this._baraPhaseRoomIds.add(room.id);
		if (room.gameType === "sketch-draw") this._sketchPhaseRoomIds.add(room.id);
		this._touchRoomActivity(room);
		if (room.gameType === "wordgame") {
			for (const p of room.players) {
				p.tabFocused = true;
			}
			this._broadcastWordTabFocus(room);
		}
		this.broadcastGameState(room.id);
		this.broadcastLobbyState(room.id);
		this._scheduleBroadcastHubPresence();
		return { success: true };
	}

	_normalizeWordSubmitPayload(payload, wordCategory) {
		if (typeof payload === "string") {
			const trimmed = payload.trim();
			if (!trimmed) return null;
			return wordCategory === "lol-champions" ?
					{ championId: trimmed }
				:	{ word: trimmed };
		}

		if (!payload || typeof payload !== "object") return null;

		const championId =
			typeof payload.championId === "string" ? payload.championId.trim() : "";
		const word = typeof payload.word === "string" ? payload.word : "";

		if (wordCategory === "lol-champions") {
			if (championId) return { championId };
			return null;
		}

		if (word.trim()) return { word };
		return null;
	}

	handleWordSubmit(socket, payload) {
		const ctx = this._getPlayerContext(socket);
		if (ctx.error) return { error: ctx.error };

		const { playerId, room } = ctx;
		const connected = this._requireConnectedPlayer(room, playerId);
		if (connected.error) return { error: connected.error };

		if (!room.game || room.gameType !== "wordgame") {
			return { error: "No active word game" };
		}

		const wordCategory = room.game.wordCategory;
		const submitPayload = this._normalizeWordSubmitPayload(
			payload,
			wordCategory,
		);

		if (!submitPayload) {
			return {
				error:
					wordCategory === "lol-champions" ?
						"Select a champion"
					:	"Word is required",
			};
		}

		const result = room.game.submitWord(playerId, submitPayload);
		if (!result.success) return { error: result.error };

		const state = {
			roomId: room.id,
			...room.game.serializeForPlayer(playerId),
		};
		if (!result.duplicate) {
			this.broadcastGameState(room.id);
		}
		return { success: true, state };
	}

	handleWordChampionSubmit(socket, payload) {
		const championId =
			typeof payload === "string" ? payload
			: typeof payload === "object" && payload !== null ? payload.championId
			: undefined;
		return this.handleWordSubmit(socket, { championId });
	}

	_getChatDisplayName(playerId, roomId) {
		if (roomId) {
			const room = this.rooms.get(roomId);
			const player = room ? this._getRoomPlayer(room, playerId) : undefined;
			if (player) return player.displayName;
			const spectator = room?.spectators?.find((s) => s.id === playerId);
			if (spectator) return spectator.displayName;
		}
		return this.hubPresence.get(playerId)?.displayName ?? "Player";
	}

	_ensureRoomEngagement(room) {
		if (!room.engagement) {
			room.engagement = { winStreaks: {} };
		}
		return room.engagement;
	}

	_resetMatchOverEngagementGate(room) {
		const eng = this._ensureRoomEngagement(room);
		delete eng.lastProcessedMatchOver;
	}

	_resolveMatchWinnerPlayerIds(room) {
		const game = room.game;
		if (!game || game.phase !== "match_over") return [];

		if (room.gameType === "dominoes") {
			const mid = game.matchWinnerId;
			if (!mid) return [];
			if (mid === "team1" || mid === "team2") {
				const teamIds = game.teamIds ?? {};
				return (game.playerIds ?? []).filter((id) => teamIds[id] === mid);
			}
			return [mid];
		}

		if (room.gameType === "wordgame" || room.gameType === "sketch-draw") {
			const wid = game.winnerId;
			return wid ? [wid] : [];
		}

		if (room.gameType === "bara-alsalafa") {
			const wid =
				game.winnerId ??
				(game.lastAction?.type === "match_over" ?
					game.lastAction.winnerId
				:	null);
			return wid ? [wid] : [];
		}

		return [];
	}

	_applyMatchOverEngagement(room) {
		if (room.game?.phase !== "match_over") return;

		const eng = this._ensureRoomEngagement(room);
		const versionKey = String(room.game.stateVersion ?? 0);
		if (eng.lastProcessedMatchOver === versionKey) return;
		eng.lastProcessedMatchOver = versionKey;

		const winners = this._resolveMatchWinnerPlayerIds(room);
		const winnerSet = new Set(winners);

		for (const player of room.players) {
			if (!winnerSet.has(player.id)) {
				eng.winStreaks[player.id] = 0;
			}
		}
		for (const winnerId of winners) {
			eng.winStreaks[winnerId] = (eng.winStreaks[winnerId] ?? 0) + 1;
		}
	}

	_broadcastHubChat(payload) {
		for (const [socketId, pid] of this.socketToPlayer) {
			if (this.playerToRoom.has(pid)) continue;
			this.io.to(socketId).emit("chat:message", payload);
		}
	}

	handleChatSend(socket, rawMessage) {
		const playerId = this.socketToPlayer.get(socket.id);
		if (!playerId) return { error: "Not registered" };

		const message = sanitizeChatMessage(rawMessage);
		if (!message) return { error: "Message cannot be empty" };

		const roomId = this._getRoomIdForSocket(playerId);

		if (roomId) {
			const room = this.rooms.get(roomId);
			if (!room) return { error: "Room not found" };
			if (
				room.gameType === "mafia" &&
				room.status === "playing" &&
				room.game?.silencedForDay?.includes(playerId)
			) {
				return { error: "You are silenced and cannot chat today" };
			}

			const payload = {
				roomId,
				playerId,
				displayName: this._getChatDisplayName(playerId, roomId),
				message,
				timestamp: Date.now(),
				channel: room.status === "lobby" ? "lobby" : "match",
			};
			this._touchRoomActivity(room);
			this._emitToRoom(room, "chat:message", payload);
		} else {
			const payload = {
				roomId: null,
				playerId,
				displayName: this._getChatDisplayName(playerId, roomId),
				message,
				timestamp: Date.now(),
			};
			this._broadcastHubChat(payload);
		}

		return { success: true };
	}

	handleRoomReaction(socket, payload) {
		const playerId = this.socketToPlayer.get(socket.id);
		if (!playerId) return { error: "Not registered" };

		const roomId = this._getRoomIdForSocket(playerId);
		if (!roomId) return { error: "Not in a room" };

		const room = this.rooms.get(roomId);
		if (!room) return { error: "Room not found" };

		const reactionId = payload?.reactionId;
		const type = payload?.type;
		if (!isValidRoomReaction(reactionId, type)) {
			return { error: "Invalid reaction" };
		}

		this._touchRoomActivity(room);
		this._emitToRoom(room, "room:reaction:broadcast", {
			roomId,
			senderId: playerId,
			displayName: this._getChatDisplayName(playerId, roomId),
			reactionId,
			type,
			timestamp: Date.now(),
		});

		return { success: true };
	}

	handleSketchDrawGuessSubmit(socket, guess) {
		const ctx = this._getPlayerContext(socket);
		if (ctx.error) return { error: ctx.error };

		const { playerId, room } = ctx;
		if (!room.game || room.gameType !== "sketch-draw") {
			return { error: "No active Sketch Draw game" };
		}
		if (room.status !== "playing" || room.game.phase !== "drawing") {
			return { error: "Guesses are only accepted during drawing" };
		}

		const message =
			typeof guess === "string" ? guess.trim() : "";
		if (!message) return { error: "Guess cannot be empty" };

		return this._handleSketchDrawGuess(socket, room, playerId, message);
	}

	_handleSketchDrawGuess(socket, room, playerId, message) {
		const result = room.game.processGuess(playerId, message);

		if (result.type === "correct") {
			const displayName = this._getChatDisplayName(playerId, room.id);
			this._emitToRoom(room, "sketch-draw:guess:correct", {
				roomId: room.id,
				playerId,
				displayName,
				message: `${displayName} guessed the word!`,
				kind: "correct",
				stateVersion: room.game.stateVersion,
			});
			this.broadcastGameState(room.id);
			if (room.game.phase === "round_end") {
				this._scheduleNextRound(room.id, room);
			}
			return { success: true, outcome: "correct" };
		}

		if (result.type === "close") {
			socket.emit("sketch-draw:guess:close", {
				messageAr: "أنت قريب من الكلمة!",
				messageEn: "You are close to the word!",
			});
			return { success: true, outcome: "close" };
		}

		if (result.type === "wrong") {
			const displayName = this._getChatDisplayName(playerId, room.id);
			const trimmed = typeof message === "string" ? message.trim().slice(0, 200) : "";
			this._emitToRoom(room, "sketch-draw:guess:wrong", {
				roomId: room.id,
				playerId,
				displayName,
				text: trimmed,
				stateVersion: room.game.stateVersion,
			});
			return { success: true, outcome: "wrong" };
		}

		return { success: true, outcome: "ignore" };
	}

	handleSketchDrawSelectWord(socket, index) {
		const ctx = this._getPlayerContext(socket);
		if (ctx.error) return { error: ctx.error };

		const { playerId, room } = ctx;
		if (!room.game || room.gameType !== "sketch-draw") {
			return { error: "No active Sketch Draw game" };
		}

		const result = room.game.selectWord(playerId, index);
		if (!result.success) return { error: result.error };

		this.broadcastGameState(room.id);
		return { success: true };
	}

	handleSketchDrawCanvasStrokeBatch(socket, payload) {
		const ctx = this._getPlayerContext(socket);
		if (ctx.error) return { error: ctx.error };

		const { playerId, room } = ctx;
		if (!room.game || room.gameType !== "sketch-draw") {
			return { error: "No active Sketch Draw game" };
		}

		const result = room.game.appendCanvasBatch(playerId, payload);
		if (!result.success) return { error: result.error };

		const drawerId = room.game.currentDrawerId;
		const batches = result.batches ?? (result.batch ? [result.batch] : []);
		for (const batch of batches) {
			this._emitToRoomExcept(room, drawerId, "sketch-draw:canvas:stroke:batch", {
				roomId: room.id,
				batch,
				canvasBufferVersion: room.game.canvasBufferVersion,
			});
		}

		return { success: true };
	}

	disbandSketchDrawRoom(socket) {
		const playerId = this.socketToPlayer.get(socket.id);
		const roomId = this.playerToRoom.get(playerId);
		if (!roomId) return { error: "Not in a room" };

		const room = this.rooms.get(roomId);
		if (!room) return { error: "Room not found" };
		if (room.hostId !== playerId) return { error: "Only the host can disband the room" };

		this._emitToRoom(room, "sketch-draw:disband", {
			roomId: room.id,
			message: "The host closed the room",
		});

		const playerIds = room.players.map((p) => p.id);
		for (const id of playerIds) {
			this._removePlayerFromRoom(id, roomId);
		}
		for (const spectator of room.spectators ?? []) {
			this._removePlayerFromRoom(spectator.id, roomId);
		}

		return { success: true };
	}

	handleSketchDrawCanvasUndo(socket) {
		const ctx = this._getPlayerContext(socket);
		if (ctx.error) return { error: ctx.error };

		const { playerId, room } = ctx;
		if (!room.game || room.gameType !== "sketch-draw") {
			return { error: "No active Sketch Draw game" };
		}

		const result = room.game.undoCanvas(playerId);
		if (!result.success) return { error: result.error };

		this._emitSketchDrawCanvasSync(room);
		return { success: true };
	}

	handleSketchDrawCanvasRedo(socket) {
		const ctx = this._getPlayerContext(socket);
		if (ctx.error) return { error: ctx.error };

		const { playerId, room } = ctx;
		if (!room.game || room.gameType !== "sketch-draw") {
			return { error: "No active Sketch Draw game" };
		}

		const result = room.game.redoCanvas(playerId);
		if (!result.success) return { error: result.error };

		this._emitSketchDrawCanvasSync(room);
		return { success: true };
	}

	handleSketchDrawCanvasClear(socket) {
		const ctx = this._getPlayerContext(socket);
		if (ctx.error) return { error: ctx.error };

		const { playerId, room } = ctx;
		if (!room.game || room.gameType !== "sketch-draw") {
			return { error: "No active Sketch Draw game" };
		}

		const result = room.game.clearCanvas(playerId);
		if (!result.success) return { error: result.error };

		this._emitSketchDrawCanvasSync(room);
		return { success: true };
	}

	handleSketchDrawCanvasFill(socket, payload) {
		const ctx = this._getPlayerContext(socket);
		if (ctx.error) return { error: ctx.error };

		const { playerId, room } = ctx;
		if (!room.game || room.gameType !== "sketch-draw") {
			return { error: "No active Sketch Draw game" };
		}

		const result = room.game.applyCanvasFill(playerId, payload);
		if (!result.success) return { error: result.error };

		const drawerId = room.game.currentDrawerId;
		this._emitToRoomExcept(room, drawerId, "sketch-draw:canvas:stroke:batch", {
			roomId: room.id,
			batch: result.batch,
			canvasBufferVersion: room.game.canvasBufferVersion,
		});

		return { success: true };
	}

	_emitSketchDrawCanvasSync(room, targetSocketId = null) {
		const payload = {
			roomId: room.id,
			canvasBuffer: room.game.canvasBuffer,
			canvasBufferVersion: room.game.canvasBufferVersion,
		};
		if (targetSocketId) {
			this.io.to(targetSocketId).emit("sketch-draw:canvas:sync", payload);
			return;
		}
		this._emitToRoom(room, "sketch-draw:canvas:sync", payload);
	}

	handleSketchDrawCanvasRecovery(socket) {
		const ctx = this._getPlayerContext(socket);
		if (ctx.error) return { error: ctx.error };

		const { room } = ctx;
		if (!room.game || room.gameType !== "sketch-draw") {
			return { error: "No active Sketch Draw game" };
		}

		const phase = room.game.phase;
		if (phase !== "drawing" && phase !== "word_select") {
			return { error: "Canvas recovery not available in this phase" };
		}

		this._emitSketchDrawCanvasSync(room, socket.id);
		return { success: true };
	}

	handleWordGuessed(socket) {
		const ctx = this._getPlayerContext(socket);
		if (ctx.error) return { error: ctx.error };

		const { playerId, room } = ctx;
		if (!room.game || room.gameType !== "wordgame") {
			return { error: "No active word game" };
		}

		const result = room.game.confirmGuessed(playerId);
		if (!result.success) return { error: result.error };

		const state = {
			roomId: room.id,
			...room.game.serializeForPlayer(playerId),
		};

		const action = room.game.lastAction;
		if (
			!result.duplicate &&
			(action?.type === "word_guessed" || action?.type === "match_won")
		) {
			this._emitToRoom(room, "word:guessed:celebration", {
				wordCategory: room.game.wordCategory,
				championId: action.championId ?? null,
				stateVersion: room.game.stateVersion,
			});
		}

		if (!result.duplicate) {
			this.broadcastGameState(room.id);
		}
		return { success: true, state };
	}

	handleWordTabFocusReport(socket, focused) {
		const ctx = this._getPlayerContext(socket);
		if (ctx.error) return { error: ctx.error };

		const { playerId, room } = ctx;
		if (!isActiveWordGameSession(room)) {
			return { success: true };
		}

		const player = this._getRoomPlayer(room, playerId);
		if (!player) return { error: "Player not in room" };

		const nextFocused = !!focused;
		if (player.tabFocused === nextFocused) {
			return { success: true };
		}

		player.tabFocused = nextFocused;
		this._broadcastWordTabFocus(room);
		return { success: true };
	}

	_broadcastWordTabFocus(room) {
		if (!isWordGameRoom(room)) return;
		this._emitToRoom(room, "word:focus:update", {
			players: room.players.map((p) => ({
				id: p.id,
				displayName: p.displayName,
				tabFocused: p.tabFocused !== false,
			})),
		});
	}

	/** Push current game state to one player (e.g. after client/server desync). */
	syncGameStateForPlayer(socket) {
		const ctx = this._getPlayerContext(socket);
		if (ctx.error) return { error: ctx.error };

		const { playerId, room } = ctx;
		if (!room.game) return { error: "No active game" };

		const state = this._augmentWordSpectatorState(room, {
			roomId: room.id,
			...room.game.serializeForPlayer(playerId),
		});
		socket.emit("game:state:update", state);
		return { success: true, state };
	}

	_requireMafiaGame(room, playerId) {
		if (!room.game || room.gameType !== "mafia") {
			return { error: "No active Mafia game" };
		}
		if (room.game.narratorId !== playerId) {
			return { error: "Only the narrator can control the game" };
		}
		return { game: room.game };
	}

	handleMafiaAcknowledgeRole(socket) {
		const ctx = this._getPlayerContext(socket);
		if (ctx.error) return { error: ctx.error };
		const { playerId, room } = ctx;
		if (!room.game || room.gameType !== "mafia") {
			return { error: "No active Mafia game" };
		}
		const result = room.game.acknowledgeRole(playerId);
		if (!result.success) return { error: result.error };
		this.broadcastGameState(room.id);
		return { success: true };
	}

	handleMafiaNarratorAction(socket, action, payload = {}) {
		const ctx = this._getPlayerContext(socket);
		if (ctx.error) return { error: ctx.error };
		const { playerId, room } = ctx;
		const guard = this._requireMafiaGame(room, playerId);
		if (guard.error) return { error: guard.error };
		const game = guard.game;

		let result;
		switch (action) {
			case "start_day":
				result = game.narratorStartDay(playerId);
				break;
			case "day_eliminate":
				result = game.narratorDayEliminate(playerId, payload.targetPlayerId);
				break;
			case "begin_night":
				result = game.narratorBeginNight(playerId);
				break;
			case "set_night_target":
				result = game.narratorSetNightTarget(
					playerId,
					payload.targetPlayerId ?? null,
				);
				break;
			case "confirm_night_step":
				result = game.narratorConfirmNightStep(playerId);
				break;
			case "end_morning":
				result = game.narratorEndMorning(playerId);
				break;
			case "reset_match":
				result = game.narratorResetMatch(playerId);
				break;
			default:
				return { error: "Unknown action" };
		}

		if (!result.success) return { error: result.error };
		this.broadcastGameState(room.id);
		return { success: true };
	}

	handleBaraReveal(socket) {
		const ctx = this._getPlayerContext(socket);
		if (ctx.error) return { error: ctx.error };

		const { playerId, room } = ctx;
		const connected = this._requireConnectedPlayer(room, playerId);
		if (connected.error) return { error: connected.error };

		if (!room.game || room.gameType !== "bara-alsalafa") {
			return { error: "لا توجد مباراة برا السالفة نشطة" };
		}

		const result = room.game.revealRole(playerId);
		if (!result.success) return { error: result.error };

		this.broadcastGameState(room.id);
		return { success: true };
	}

	handleBaraReady(socket) {
		const ctx = this._getPlayerContext(socket);
		if (ctx.error) return { error: ctx.error };

		const { playerId, room } = ctx;
		const connected = this._requireConnectedPlayer(room, playerId);
		if (connected.error) return { error: connected.error };

		if (!room.game || room.gameType !== "bara-alsalafa") {
			return { error: "لا توجد مباراة برا السالفة نشطة" };
		}

		const result = room.game.markReady(playerId);
		if (!result.success) return { error: result.error };

		this.broadcastGameState(room.id);
		return { success: true };
	}

	handleBaraAdvanceInterrogation(socket) {
		const ctx = this._getPlayerContext(socket);
		if (ctx.error) return { error: ctx.error };

		const { playerId, room } = ctx;
		if (!room.game || room.gameType !== "bara-alsalafa") {
			return { error: "لا توجد مباراة برا السالفة نشطة" };
		}
		const result = room.game.advanceInterrogation(playerId);
		if (!result.success) return { error: result.error };

		this.broadcastGameState(room.id);
		return { success: true };
	}

	handleBaraRequestVoteEnd(socket) {
		const ctx = this._getPlayerContext(socket);
		if (ctx.error) return { error: ctx.error };

		const { playerId, room } = ctx;
		const connected = this._requireConnectedPlayer(room, playerId);
		if (connected.error) return { error: connected.error };

		if (!room.game || room.gameType !== "bara-alsalafa") {
			return { error: "لا توجد مباراة برا السالفة نشطة" };
		}

		const result = room.game.requestVoteEnd(playerId);
		if (!result.success) return { error: result.error };

		this.broadcastGameState(room.id);
		return { success: true };
	}

	handleBaraVote(socket, targetPlayerId) {
		const ctx = this._getPlayerContext(socket);
		if (ctx.error) return { error: ctx.error };

		const { playerId, room } = ctx;
		if (!room.game || room.gameType !== "bara-alsalafa") {
			return { error: "لا توجد مباراة برا السالفة نشطة" };
		}

		const result = room.game.castVote(playerId, targetPlayerId);
		if (!result.success) return { error: result.error };

		this.broadcastGameState(room.id);
		return { success: true };
	}

	handleBaraOutcastFreeGuess(socket) {
		const ctx = this._getPlayerContext(socket);
		if (ctx.error) return { error: ctx.error };

		const { playerId, room } = ctx;
		if (!room.game || room.gameType !== "bara-alsalafa") {
			return { error: "لا توجد مباراة برا السالفة نشطة" };
		}

		const result = room.game.enableOutcastFreeGuess(playerId);
		if (!result.success) return { error: result.error };

		this.broadcastGameState(room.id);
		return { success: true };
	}

	handleBaraGuess(socket, guess) {
		const ctx = this._getPlayerContext(socket);
		if (ctx.error) return { error: ctx.error };

		const { playerId, room } = ctx;
		if (!room.game || room.gameType !== "bara-alsalafa") {
			return { error: "لا توجد مباراة برا السالفة نشطة" };
		}

		if (typeof guess !== "string" || !guess.trim()) {
			return { error: "أدخل تخميناً" };
		}

		const trimmed = guess.trim();
		if (trimmed.length > 128) {
			return { error: "التخمين طويل جداً" };
		}

		const result = room.game.submitOutcastGuess(playerId, trimmed);
		if (!result.success) return { error: result.error };

		this.broadcastGameState(room.id);
		return { success: true };
	}

	_tickBaraPhaseTimers() {
		for (const roomId of this._baraPhaseRoomIds) {
			const room = this.rooms.get(roomId);
			if (!room || room.status !== "playing" || room.gameType !== "bara-alsalafa") {
				this._baraPhaseRoomIds.delete(roomId);
				continue;
			}
			if (!room.game?.phaseEndsAt) continue;
			if (Date.now() < room.game.phaseEndsAt) continue;

			if (room.game.phase === "interrogation") {
				const result = room.game.onInterrogationTimerExpired();
				if (result?.changed) this.broadcastGameState(roomId);
			} else if (room.game.phase === "defend") {
				const result = room.game.onDefendTimerExpired();
				if (result?.changed) this.broadcastGameState(roomId);
			}
		}
	}

	handleDisconnect(socket) {
		const playerId = this.socketToPlayer.get(socket.id);
		if (!playerId) return;

		this._cancelPendingInvitesForPlayer(playerId);
		this._removeHubPresence(playerId, socket.id);
		this.socketToPlayer.delete(socket.id);
		// Keep playerToSocket during Secret Word sessions so reconnect can replace it;
		// stale socket ids are overwritten in registerPlayer.
		const roomId = this.playerToRoom.get(playerId);
		const room = roomId ? this.rooms.get(roomId) : null;
		if (!isActiveWordGameSession(room)) {
			if (this.playerToSocket.get(playerId) === socket.id) {
				this.playerToSocket.delete(playerId);
			}
		}
		this._scheduleBroadcastHubPresence();

		const spectatorRoomId = this.spectatorToRoom.get(playerId);
		if (spectatorRoomId) {
			this._removeSpectatorFromRoom(playerId, spectatorRoomId);
			return;
		}

		if (!roomId) return;
		if (!room) return;

		const player = this._getRoomPlayer(room, playerId);
		if (!player) return;

		player.connected = false;

		if (
			room.game &&
			(room.status === "playing" || isActiveWordGameSession(room))
		) {
			if (isActiveWordGameSession(room) && player.tabFocused !== false) {
				player.tabFocused = false;
				this._broadcastWordTabFocus(room);
			}
			if (typeof room.game.pauseTurnTimer === "function") {
				room.game.pauseTurnTimer();
			}
			this.broadcastGameState(roomId);
			this.broadcastLobbyState(roomId);
			return;
		}

		if (isWordGameWon(room)) {
			this.broadcastLobbyState(roomId);
			return;
		}

		// Pre-game lobby: drop immediately so hub presence does not show a ghost lobby.
		if (room.status === "lobby") {
			if (player.disconnectTimer) {
				clearTimeout(player.disconnectTimer);
				player.disconnectTimer = null;
			}
			if (this.useSocketRooms) socket.leave(roomId);
			this._removePlayerFromRoom(playerId, roomId);
			if (this.playerToSocket.get(playerId) === socket.id) {
				this.playerToSocket.delete(playerId);
			}
			return;
		}

		if (player.disconnectTimer) {
			clearTimeout(player.disconnectTimer);
			player.disconnectTimer = null;
		}

		player.disconnectTimer = setTimeout(() => {
			this._removePlayerFromRoom(playerId, roomId);
		}, DISCONNECT_GRACE_MS);

		this.broadcastLobbyState(roomId);
	}

	_removePlayerFromRoom(playerId, roomId) {
		const room = this.rooms.get(roomId);
		if (!room) return;

		room.players = room.players.filter((p) => p.id !== playerId);
		this._unindexRoomPlayer(room, playerId);
		this.playerToRoom.delete(playerId);

		if (room.players.length === 0) {
			if (!room.spectators?.length) {
				this._destroyRoom(roomId);
			}
			this._scheduleBroadcastHubPresence();
			return;
		}

		if (room.hostId === playerId) {
			room.hostId = room.players[0].id;
		}

		const gameDef = getGame(room.gameType);
		if (
			room.status === "playing" &&
			gameDef &&
			room.players.length < gameDef.minPlayers &&
			!shouldPreserveWordGameRoom(room)
		) {
			room.status = "finished";
		}

		if (room.players.length > 0) {
			this.broadcastLobbyState(roomId);
			if (room.game) {
				this.broadcastGameState(roomId);
			}
		}
		this._scheduleBroadcastHubPresence();
	}

	_removeSpectatorFromRoom(playerId, roomId) {
		const room = this.rooms.get(roomId);
		if (!room) return;

		room.spectators = (room.spectators ?? []).filter((s) => s.id !== playerId);
		this.spectatorToRoom.delete(playerId);

		if (room.players.length === 0 && !room.spectators?.length) {
			this._destroyRoom(roomId);
			this._scheduleBroadcastHubPresence();
			return;
		}

		this.broadcastLobbyState(roomId);
		this._scheduleBroadcastHubPresence();
	}

	_lobbySettingsForViewer(room, viewerId) {
		const settings = { ...room.settings };
		if (viewerId !== room.hostId && room.gameType === "mafia") {
			delete settings.roleAssignments;
			delete settings.roleCounts;
		}
		return settings;
	}

	_lobbyStatePayload(room, viewerId) {
		const gameDef = getGame(room.gameType);
		const eng = this._ensureRoomEngagement(room);
		return {
			roomId: room.id,
			hostId: room.hostId,
			status: room.status,
			gameType: room.gameType,
			players: room.players.map((p) => ({
				id: p.id,
				displayName: p.displayName,
				connected: p.connected,
				tabFocused: p.tabFocused !== false,
				isBot: !!p.isBot,
			})),
			spectators: (room.spectators ?? []).map((s) => ({
				id: s.id,
				displayName: s.displayName,
				connected: s.connected,
			})),
			minPlayers: gameDef?.minPlayers ?? 2,
			maxPlayers: gameDef?.maxPlayers ?? 4,
			devBotsEnabled: isDevBotsEnabled(room.gameType),
			winStreaks: { ...eng.winStreaks },
			settings: this._lobbySettingsForViewer(room, viewerId),
		};
	}

	broadcastLobbyState(roomId) {
		const room = this.rooms.get(roomId);
		if (!room) return;

		for (const player of room.players) {
			const socketId = this.playerToSocket.get(player.id);
			if (!socketId) continue;
			this.io.to(socketId).emit(
				"lobby:state",
				this._lobbyStatePayload(room, player.id),
			);
		}
		for (const spectator of room.spectators ?? []) {
			const socketId = this.playerToSocket.get(spectator.id);
			if (!socketId) continue;
			this.io.to(socketId).emit(
				"lobby:state",
				this._lobbyStatePayload(room, spectator.id),
			);
		}

		this._scheduleBroadcastHubPresence();
	}

	_scheduleBroadcastGameState(roomId) {
		if (this._gameStateFlushTimers.has(roomId)) return;
		const timer = setTimeout(() => {
			this._gameStateFlushTimers.delete(roomId);
			this._broadcastGameStateNow(roomId);
		}, 16);
		this._gameStateFlushTimers.set(roomId, timer);
	}

	broadcastGameState(roomId) {
		this._scheduleBroadcastGameState(roomId);
	}

	_broadcastGameStateNow(roomId) {
		const room = this.rooms.get(roomId);
		if (!room?.game) return;

		if (room.game.phase === "match_over") {
			room.status = "finished";
			this._clearNextRoundTimer(room);
			this._dominoTurnRoomIds.delete(roomId);
			this._baraPhaseRoomIds.delete(roomId);
			this._sketchPhaseRoomIds.delete(roomId);
			this._applyMatchOverEngagement(room);
		} else if (
			room.game.phase === "round_over" ||
			room.game.phase === "round_end"
		) {
			this._scheduleNextRound(roomId, room);
		} else {
			this._clearNextRoundTimer(room);
		}

		for (const player of room.players) {
			const socketId = this.playerToSocket.get(player.id);
			if (!socketId) continue;

			const state = room.game.serializeForPlayer(player.id);
			this.io.to(socketId).emit("game:state:update", { roomId, ...state });
		}

		for (const spectator of room.spectators ?? []) {
			const socketId = this.playerToSocket.get(spectator.id);
			if (!socketId) continue;

			const state = this._augmentWordSpectatorState(
				room,
				room.game.serializeForPlayer(spectator.id),
			);
			this.io.to(socketId).emit("game:state:update", { roomId, ...state });
		}

		if (room.game.phase === "match_over") {
			this.broadcastLobbyState(roomId);
		}

		this._maybeDispatchPhaseBoundary(room);
	}

	_ensurePersistenceBoundaryKeys(room) {
		if (!room._persistenceBoundaryKeys) {
			room._persistenceBoundaryKeys = new Set();
		}
		return room._persistenceBoundaryKeys;
	}

	/** Fire-and-forget persistence at round_end / round_over / match_over only. */
	_maybeDispatchPhaseBoundary(room) {
		const phase = room.game?.phase;
		if (!isPhaseBoundary(phase)) return;

		const roundNumber = room.game.roundNumber ?? 0;
		const key = phaseBoundaryKey(phase, roundNumber);
		const keys = this._ensurePersistenceBoundaryKeys(room);
		if (keys.has(key)) return;
		keys.add(key);

		const payload = buildPhaseBoundaryPayload(room, phase);
		Promise.resolve(this.persistenceAdapter.onPhaseBoundary(payload)).catch(
			(err) => {
				console.error("[RoomManager] persistence phase boundary failed", err);
			},
		);
	}

	_initWordScratchpads(room) {
		if (!room.game) return;
		room.wordScratchpads = {
			roundNumber: room.game.roundNumber,
			byPlayer: {},
		};
	}

	_getWordScratchpadsPayload(room) {
		const pads = room.wordScratchpads;
		if (!pads || !room.game) return {};
		if (pads.roundNumber !== room.game.roundNumber) return {};
		return { ...pads.byPlayer };
	}

	_augmentWordSpectatorState(room, state) {
		if (!state || room.gameType !== "wordgame" || !state.isSpectator) {
			return state;
		}
		return {
			...state,
			scratchpadsByPlayer: this._getWordScratchpadsPayload(room),
		};
	}

	_resetWordScratchpads(room) {
		if (room.gameType !== "wordgame" || !room.game) return;
		this._initWordScratchpads(room);
		this._emitToRoom(room, "word:scratchpad:reset", {
			roomId: room.id,
			roundNumber: room.game.roundNumber,
		});
	}

	handleWordScratchpadSync(socket, payload) {
		const ctx = this._getPlayerContext(socket);
		if (ctx.error) return { error: ctx.error };

		const { playerId, room } = ctx;
		const connected = this._requireConnectedPlayer(room, playerId);
		if (connected.error) return { error: connected.error };

		if (!room.game || room.gameType !== "wordgame") {
			return { error: "No active word game" };
		}
		if (!isActiveWordGameSession(room)) {
			return { success: true, ignored: true };
		}

		const roundNumber = parseScratchpadRoundNumber(payload?.roundNumber);
		if (roundNumber == null) return { error: "Invalid round number" };

		if (roundNumber !== room.game.roundNumber) {
			return { success: true, ignored: true };
		}

		const notes = sanitizeWordScratchpadNotes(payload?.notes);
		if (!room.wordScratchpads) this._initWordScratchpads(room);
		room.wordScratchpads.roundNumber = roundNumber;
		room.wordScratchpads.byPlayer[playerId] = notes;

		this._emitToRoom(room, "word:scratchpad:update", {
			roomId: room.id,
			roundNumber,
			playerId,
			notes,
		});

		return { success: true };
	}

	_scheduleNextRound(roomId, room) {
		if (room.nextRoundTimer) return;

		const delay =
			room.gameType === "wordgame" ?
				WORD_ROUND_RESET_DELAY_MS
			: room.gameType === "bara-alsalafa" ?
				BARA_ROUND_RESET_DELAY_MS
			: room.gameType === "sketch-draw" ?
				SKETCH_DRAW_ROUND_DELAY_MS
			:	ROUND_RESTART_DELAY_MS;

		room.nextRoundTimer = setTimeout(() => {
			room.nextRoundTimer = null;
			const phase = room.game?.phase;
			if (phase === "round_over" || phase === "round_end") {
				room.game.startNextRound();
				if (room.gameType === "wordgame") {
					this._resetWordScratchpads(room);
				}
				this._broadcastGameStateNow(roomId);
			}
		}, delay);
	}

	_clearNextRoundTimer(room) {
		if (room.nextRoundTimer) {
			clearTimeout(room.nextRoundTimer);
			room.nextRoundTimer = null;
		}
	}

	_clearAutoPlayTimer(room) {
		if (room.autoPlayTimer) {
			clearTimeout(room.autoPlayTimer);
			room.autoPlayTimer = null;
		}
		room.autoPlayPending = false;
	}

	_emitReconnectSync(socket, room, viewerId, { isSpectator = false } = {}) {
		socket.emit("reconnect:sync", {
			roomId: room.id,
			hostId: room.hostId,
			status: room.status,
			gameType: room.gameType,
			players: room.players.map((p) => ({
				id: p.id,
				displayName: p.displayName,
				connected: p.connected,
				tabFocused: p.tabFocused !== false,
				isBot: !!p.isBot,
			})),
			spectators: (room.spectators ?? []).map((s) => ({
				id: s.id,
				displayName: s.displayName,
				connected: s.connected,
			})),
			settings: { ...room.settings },
			minPlayers: getGame(room.gameType)?.minPlayers ?? 2,
			maxPlayers: getGame(room.gameType)?.maxPlayers ?? 4,
			isSpectator,
			devBotsEnabled: isDevBotsEnabled(room.gameType),
		});

		if (room.game) {
			const state = this._augmentWordSpectatorState(
				room,
				room.game.serializeForPlayer(viewerId),
			);
			socket.emit("game:state:update", { roomId: room.id, ...state });
		}
	}

	_emitToRoom(room, event, payload) {
		if (this.useSocketRooms) {
			this.io.to(room.id).emit(event, payload);
			return;
		}
		for (const player of room.players) {
			const socketId = this.playerToSocket.get(player.id);
			if (!socketId) continue;
			this.io.to(socketId).emit(event, payload);
		}
		for (const spectator of room.spectators ?? []) {
			const socketId = this.playerToSocket.get(spectator.id);
			if (!socketId) continue;
			this.io.to(socketId).emit(event, payload);
		}
	}

	_emitToRoomExcept(room, excludePlayerId, event, payload) {
		for (const player of room.players) {
			if (player.id === excludePlayerId) continue;
			const socketId = this.playerToSocket.get(player.id);
			if (!socketId) continue;
			this.io.to(socketId).emit(event, payload);
		}
		for (const spectator of room.spectators ?? []) {
			const socketId = this.playerToSocket.get(spectator.id);
			if (!socketId) continue;
			this.io.to(socketId).emit(event, payload);
		}
	}

	_tickSketchDrawPhaseTimers() {
		for (const roomId of this._sketchPhaseRoomIds) {
			const room = this.rooms.get(roomId);
			if (!room || room.status !== "playing" || room.gameType !== "sketch-draw") {
				this._sketchPhaseRoomIds.delete(roomId);
				continue;
			}
			if (!room.game?.phaseEndsAt) continue;

			const phase = room.game.phase;
			const expired = Date.now() >= room.game.phaseEndsAt;

			if (
				!expired &&
				(phase === "word_select" || phase === "drawing")
			) {
				this._emitToRoom(room, "game:time:tick", {
					roomId: room.id,
					gameType: "sketch-draw",
					phase,
					remainingMs: room.game.getPhaseTimeRemaining(),
					phaseEndsAt: room.game.phaseEndsAt,
					stateVersion: room.game.stateVersion,
				});
			}

			if (!expired) continue;

			if (phase === "word_select") {
				const result = room.game.onWordSelectTimerExpired();
				if (result?.changed) this.broadcastGameState(roomId);
			} else if (phase === "drawing") {
				const result = room.game.onDrawingTimerExpired();
				if (result?.changed) this.broadcastGameState(roomId);
			}
		}
	}

	_startSketchDrawPhaseLoop() {
		this._intervalHandles.push(
			setInterval(() => this._tickSketchDrawPhaseTimers(), BARA_PHASE_TICK_MS),
		);
	}

	_startBaraPhaseLoop() {
		this._intervalHandles.push(
			setInterval(() => this._tickBaraPhaseTimers(), BARA_PHASE_TICK_MS),
		);
	}

	_startTurnTimerLoop() {
		this._intervalHandles.push(
			setInterval(() => {
			for (const roomId of this._dominoTurnRoomIds) {
				const room = this.rooms.get(roomId);
				if (!room || room.status !== "playing" || !room.game) {
					this._dominoTurnRoomIds.delete(roomId);
					continue;
				}
				if (room.game.phase !== "playing") continue;
				if (typeof room.game.getTurnTimeRemaining !== "function") continue;
				if (room.game.turnTimerPaused) continue;

				const currentId = room.game.currentPlayerId;
				const player = this._getRoomPlayer(room, currentId);
				if (!player?.connected) continue;

				if (room.game.getTurnTimeRemaining() <= 0) {
					if (!room.autoPlayPending) {
						room.autoPlayPending = true;
						const delayMs = 600 + cryptoRandomInt(300);
						room.autoPlayTimer = setTimeout(() => {
							room.autoPlayTimer = null;
							room.autoPlayPending = false;
							const current = this.rooms.get(roomId);
							if (!current?.game || current.game.phase !== "playing") return;
							if (current.game.currentPlayerId !== currentId) return;
							current.game.autoPlay(currentId);
							this.broadcastGameState(roomId);
						}, delayMs);
					}
				} else if (room.autoPlayPending) {
					this._clearAutoPlayTimer(room);
				}
			}
		}, TURN_TIMER_TICK_MS),
		);
	}

	_startCleanupLoop() {
		this._intervalHandles.push(
			setInterval(() => {
			const now = Date.now();
			for (const [roomId, room] of this.rooms) {
				if (room.status === "playing") continue;
				if (shouldPreserveWordGameRoom(room)) continue;

				const allDisconnected = room.players.every((p) => !p.connected);
				const lastActive = room.lastActivityAt ?? room.createdAt;
				if (allDisconnected && now - lastActive > LOBBY_IDLE_PURGE_MS) {
					this._destroyRoom(roomId);
				}
			}
		}, 60_000),
		);
	}
}
