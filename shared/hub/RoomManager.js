/**
 * Hub room manager — game-agnostic lobby/session layer.
 * useSocketRooms: true for Node (socket.join); false for Cloudflare DO (direct emit).
 */

import {
  DEFAULT_MATCH_SETTINGS,
  DEFAULT_WORD_GAME_SETTINGS,
  DISCONNECT_GRACE_MS,
  ROUND_RESTART_DELAY_MS,
  ROOM_IDLE_CLEANUP_MS,
  SCORE_CAP_OPTIONS,
  TURN_TIMER_TICK_MS,
  WORD_POINTS_OPTIONS,
  WORD_ROUND_RESET_DELAY_MS,
} from './constants.js';
import { generateRoomId } from './generateRoomId.js';
import { getGame } from '../games/registry.js';
import { RateLimiter } from './RateLimiter.js';
import { generateSessionToken } from './session.js';
import { sanitizeDisplayName } from './validate.js';
import {
  MAX_ROOMS,
  RATE_LIMIT_WINDOW_MS,
} from './constants.js';

export class RoomManager {
  /**
   * @param {import('socket.io').Server} io
   * @param {{ useSocketRooms?: boolean }} options
   */
  constructor(io, { useSocketRooms = false } = {}) {
    this.io = io;
    this.useSocketRooms = useSocketRooms;
    this.rooms = new Map();
    this.socketToPlayer = new Map();
    this.playerToSocket = new Map();
    this.playerToRoom = new Map();
    this.playerSessions = new Map();
    this.hubPresence = new Map();
    this.rateLimiter = new RateLimiter();
    this._startTurnTimerLoop();
    this._startCleanupLoop();
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

  _resolvePlayerSession(playerId, sessionToken) {
    const activeSocket = this.playerToSocket.get(playerId);
    const existingToken = this.playerSessions.get(playerId);

    if (!existingToken) {
      const token = generateSessionToken();
      this.playerSessions.set(playerId, token);
      return { sessionToken: token };
    }

    if (sessionToken && sessionToken === existingToken) {
      return { sessionToken: existingToken };
    }

    if (activeSocket) {
      return { error: 'Invalid session token' };
    }

    const token = generateSessionToken();
    this.playerSessions.set(playerId, token);
    return { sessionToken: token, rotated: true };
  }

  /** Resolve player + room even if playerToRoom map was lost (e.g. reconnect). */
  _getPlayerContext(socket) {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return { error: 'Not registered' };

    let roomId = this.playerToRoom.get(playerId);
    let room = roomId ? this.rooms.get(roomId) : null;

    if (!room) {
      const found = this._findRoomForPlayer(playerId);
      if (found) {
        roomId = found.roomId;
        room = found.room;
      }
    }

    if (!roomId || !room) return { error: 'Not in a room' };

    this.playerToSocket.set(playerId, socket.id);
    return { playerId, roomId, room };
  }

  _ensureRoomLink(playerId, roomId) {
    this.playerToRoom.set(playerId, roomId);
  }

  checkRateLimit(socketId, action, limit) {
    const ok = this.rateLimiter.allow(
      `${socketId}:${action}`,
      limit,
      RATE_LIMIT_WINDOW_MS
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

  _buildHubPresencePayload(forPlayerId) {
    const players = [...this.hubPresence.entries()]
      .map(([id, entry]) => ({
        displayName: entry.displayName,
        isYou: id === forPlayerId,
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    return { total: players.length, players };
  }

  sendHubPresenceToSocket(socket) {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;
    socket.emit('hub:presence', this._buildHubPresencePayload(playerId));
  }

  _broadcastHubPresence() {
    for (const socketId of this.socketToPlayer.keys()) {
      const playerId = this.socketToPlayer.get(socketId);
      if (!playerId) continue;
      this.io.to(socketId).emit('hub:presence', this._buildHubPresencePayload(playerId));
    }
  }

  registerPlayer(socket, playerId, displayName, sessionToken) {
    const session = this._resolvePlayerSession(playerId, sessionToken);
    if (session.error) return { error: session.error };

    const safeName = sanitizeDisplayName(displayName);
    this.socketToPlayer.set(socket.id, playerId);
    this.playerToSocket.set(playerId, socket.id);

    const found = this._findRoomForPlayer(playerId);
    if (found) {
      const { roomId, room } = found;
      const player = room.players.find((p) => p.id === playerId);
      if (player) {
        if (player.disconnectTimer) {
          clearTimeout(player.disconnectTimer);
          player.disconnectTimer = null;
        }
        player.connected = true;
        player.displayName = safeName;
        this._ensureRoomLink(playerId, roomId);
        if (this.useSocketRooms) socket.join(roomId);

        if (room.game && room.status === 'playing') {
          if (typeof room.game.resumeTurnTimer === 'function') {
            room.game.resumeTurnTimer();
          }
        }

        this._emitReconnectSync(socket, room, playerId);
        this.broadcastLobbyState(roomId);
        this._upsertHubPresence(playerId, safeName, socket.id);
        this._broadcastHubPresence();
        return {
          reconnected: true,
          roomId,
          sessionToken: session.sessionToken,
        };
      }
    }

    this._upsertHubPresence(playerId, safeName, socket.id);
    this._broadcastHubPresence();
    return { reconnected: false, sessionToken: session.sessionToken };
  }

  createRoom(socket, displayName, gameType = 'dominoes') {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return { error: 'Not registered' };
    if (this.playerToRoom.has(playerId)) return { error: 'Already in a room' };

    if (this.rooms.size >= MAX_ROOMS) {
      return { error: 'Server at room capacity, try again later' };
    }

    const game = getGame(gameType);
    if (!game) return { error: 'Unknown game type' };

    const safeName = sanitizeDisplayName(displayName);

    let roomId = generateRoomId();
    while (this.rooms.has(roomId)) roomId = generateRoomId();

    const room = {
      id: roomId,
      hostId: playerId,
      status: 'lobby',
      gameType,
      players: [
        {
          id: playerId,
          displayName: safeName,
          connected: true,
          disconnectTimer: null,
        },
      ],
      game: null,
      settings:
        gameType === 'wordgame'
          ? { ...DEFAULT_WORD_GAME_SETTINGS }
          : { ...DEFAULT_MATCH_SETTINGS },
      nextRoundTimer: null,
      createdAt: Date.now(),
    };

    this.rooms.set(roomId, room);
    this.playerToRoom.set(playerId, roomId);
    if (this.useSocketRooms) socket.join(roomId);

    this.broadcastLobbyState(roomId);
    return { roomId };
  }

  joinRoom(socket, roomId, displayName) {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return { error: 'Not registered' };

    const room = this.rooms.get(roomId);
    if (!room) return { error: 'Room not found' };

    const safeName = sanitizeDisplayName(displayName);

    const gameDef = getGame(room.gameType);
    if (!gameDef) return { error: 'Invalid room game type' };

    if (room.status === 'playing') {
      const existing = room.players.find((p) => p.id === playerId);
      if (!existing) return { error: 'Game already in progress' };
    }

    const alreadyIn = room.players.find((p) => p.id === playerId);
    if (alreadyIn) {
      if (alreadyIn.disconnectTimer) {
        clearTimeout(alreadyIn.disconnectTimer);
        alreadyIn.disconnectTimer = null;
      }
      alreadyIn.connected = true;
      alreadyIn.displayName = safeName;
    } else {
      if (room.players.length >= gameDef.maxPlayers) {
        return { error: 'Room is full' };
      }
      room.players.push({
        id: playerId,
        displayName: safeName,
        connected: true,
        disconnectTimer: null,
      });
    }

    this.playerToRoom.set(playerId, roomId);
    if (this.useSocketRooms) socket.join(roomId);

    this.broadcastLobbyState(roomId);
    return { roomId };
  }

  leaveRoom(socket) {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return;

    if (this.useSocketRooms) socket.leave(roomId);
    this._removePlayerFromRoom(playerId, roomId);
  }

  startGame(socket) {
    const playerId = this.socketToPlayer.get(socket.id);
    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return { error: 'Not in a room' };

    const room = this.rooms.get(roomId);
    if (!room) return { error: 'Room not found' };
    if (room.hostId !== playerId) return { error: 'Only the host can start' };
    if (room.status !== 'lobby') return { error: 'Game already started' };

    const gameDef = getGame(room.gameType);
    if (!gameDef) return { error: 'Invalid game type' };

    const connectedPlayers = room.players.filter((p) => p.connected);
    if (connectedPlayers.length < gameDef.minPlayers) {
      return { error: `Need at least ${gameDef.minPlayers} players` };
    }

    if (room.gameType === 'dominoes' && room.settings.mode === '2v2' && connectedPlayers.length !== 4) {
      return { error: '2v2 Team Mode requires exactly 4 players' };
    }

    if (room.gameType === 'wordgame' && connectedPlayers.length !== 2) {
      return { error: 'Secret Word requires exactly 2 players' };
    }

    room.game = gameDef.createEngine(
      connectedPlayers.map((p) => p.id),
      room.settings
    );
    room.status = 'playing';
    this.broadcastGameState(roomId);
    this.broadcastLobbyState(roomId);
    return { success: true };
  }

  updateRoomSettings(socket, settings) {
    const playerId = this.socketToPlayer.get(socket.id);
    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return { error: 'Not in a room' };

    const room = this.rooms.get(roomId);
    if (!room) return { error: 'Room not found' };
    if (room.hostId !== playerId) return { error: 'Only the host can change settings' };
    if (room.status !== 'lobby') return { error: 'Cannot change settings after start' };

    if (settings?.scoreCap && SCORE_CAP_OPTIONS.includes(settings.scoreCap)) {
      room.settings.scoreCap = settings.scoreCap;
    }

    if (settings?.mode === 'ffa' || settings?.mode === '2v2') {
      room.settings.mode = settings.mode;
    }

    if (room.gameType === 'wordgame') {
      const cap = Number(settings?.pointsToWin);
      if (Number.isInteger(cap) && cap >= 1 && cap <= 99) {
        room.settings.pointsToWin = cap;
      }
    }

    this.broadcastLobbyState(roomId);
    return { success: true, settings: room.settings };
  }

  kickPlayer(socket, targetPlayerId) {
    const hostId = this.socketToPlayer.get(socket.id);
    const roomId = this.playerToRoom.get(hostId);
    if (!roomId) return { error: 'Not in a room' };

    const room = this.rooms.get(roomId);
    if (!room) return { error: 'Room not found' };
    if (room.hostId !== hostId) return { error: 'Only the host can kick players' };
    if (room.status !== 'lobby') return { error: 'Cannot kick players during a match' };
    if (targetPlayerId === hostId) return { error: 'Cannot kick yourself' };

    const target = room.players.find((p) => p.id === targetPlayerId);
    if (!target) return { error: 'Player not found in room' };

    const targetSocketId = this.playerToSocket.get(targetPlayerId);
    if (targetSocketId) {
      this.io.to(targetSocketId).emit('room:kicked', {
        roomId,
        message: 'You were removed from the lobby by the host',
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
    if (!roomId) return { error: 'Not in a room' };

    const room = this.rooms.get(roomId);
    if (!room) return { error: 'Room not found' };
    if (room.hostId !== playerId) return { error: 'Only the host can cancel the match' };
    if (room.status !== 'playing') return { error: 'No match in progress' };

    this._clearNextRoundTimer(room);
    room.game = null;
    room.status = 'lobby';

    for (const player of room.players) {
      const socketId = this.playerToSocket.get(player.id);
      if (!socketId) continue;
      this.io.to(socketId).emit('game:cancelled', { roomId });
    }

    this.broadcastLobbyState(roomId);
    return { success: true };
  }

  handleMove(socket, tile, end) {
    const ctx = this._getPlayerContext(socket);
    if (ctx.error) return { error: ctx.error };

    const { playerId, room } = ctx;
    if (!room.game || room.gameType !== 'dominoes') {
      return { error: 'No active dominoes game' };
    }

    const result = room.game.playMove(playerId, tile, end);
    if (!result.success) return { error: result.error };

    this.broadcastGameState(room.id);
    return { success: true };
  }

  handleDraw(socket) {
    const ctx = this._getPlayerContext(socket);
    if (ctx.error) return { error: ctx.error };

    const { playerId, room } = ctx;
    if (!room.game || room.gameType !== 'dominoes') {
      return { error: 'No active dominoes game' };
    }

    const result = room.game.drawTile(playerId);
    if (!result.success) return { error: result.error };

    this.broadcastGameState(room.id);
    return { success: true };
  }

  handlePass(socket) {
    const ctx = this._getPlayerContext(socket);
    if (ctx.error) return { error: ctx.error };

    const { playerId, room } = ctx;
    if (!room.game || room.gameType !== 'dominoes') {
      return { error: 'No active dominoes game' };
    }

    const result = room.game.passTurn(playerId);
    if (!result.success) return { error: result.error };

    this.broadcastGameState(room.id);
    return { success: true };
  }

  handleWordSubmit(socket, word) {
    const ctx = this._getPlayerContext(socket);
    if (ctx.error) return { error: ctx.error };

    const { playerId, room } = ctx;
    if (!room.game || room.gameType !== 'wordgame') {
      return { error: 'No active word game' };
    }

    if (typeof word !== 'string' || !word.trim()) {
      return { error: 'Word is required' };
    }

    const result = room.game.submitWord(playerId, word);
    if (!result.success) return { error: result.error };

    this.broadcastGameState(room.id);
    return {
      success: true,
      state: { roomId: room.id, ...room.game.serializeForPlayer(playerId) },
    };
  }

  handleWordGuessed(socket) {
    const ctx = this._getPlayerContext(socket);
    if (ctx.error) return { error: ctx.error };

    const { playerId, room } = ctx;
    if (!room.game || room.gameType !== 'wordgame') {
      return { error: 'No active word game' };
    }

    const result = room.game.confirmGuessed(playerId);
    if (!result.success) return { error: result.error };

    this.broadcastGameState(room.id);
    return {
      success: true,
      state: { roomId: room.id, ...room.game.serializeForPlayer(playerId) },
    };
  }

  handleDisconnect(socket) {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    this._removeHubPresence(playerId, socket.id);
    this.socketToPlayer.delete(socket.id);
    this.playerToSocket.delete(playerId);
    this._broadcastHubPresence();

    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;

    player.connected = false;

    if (room.game && room.status === 'playing') {
      if (typeof room.game.pauseTurnTimer === 'function') {
        room.game.pauseTurnTimer();
      }
      this.broadcastGameState(roomId);
      this.broadcastLobbyState(roomId);
      return;
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
    this.playerToRoom.delete(playerId);

    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      return;
    }

    if (room.hostId === playerId) {
      room.hostId = room.players[0].id;
    }

    const gameDef = getGame(room.gameType);
    if (
      room.status === 'playing' &&
      gameDef &&
      room.players.length < gameDef.minPlayers
    ) {
      room.status = 'finished';
    }

    this.broadcastLobbyState(roomId);
  }

  broadcastLobbyState(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const gameDef = getGame(room.gameType);
    const payload = {
      roomId: room.id,
      hostId: room.hostId,
      status: room.status,
      gameType: room.gameType,
      players: room.players.map((p) => ({
        id: p.id,
        displayName: p.displayName,
        connected: p.connected,
      })),
      minPlayers: gameDef?.minPlayers ?? 2,
      maxPlayers: gameDef?.maxPlayers ?? 4,
      settings: { ...room.settings },
    };

    this._emitToRoom(room, 'lobby:state', payload);
  }

  broadcastGameState(roomId) {
    const room = this.rooms.get(roomId);
    if (!room?.game) return;

    if (room.game.phase === 'match_over') {
      room.status = 'finished';
      this._clearNextRoundTimer(room);
    } else if (room.game.phase === 'round_over' || room.game.phase === 'round_end') {
      this._scheduleNextRound(roomId, room);
    } else {
      this._clearNextRoundTimer(room);
    }

    for (const player of room.players) {
      const socketId = this.playerToSocket.get(player.id);
      if (!socketId) continue;

      const state = room.game.serializeForPlayer(player.id);
      this.io.to(socketId).emit('game:state:update', { roomId, ...state });
    }

    if (room.game.phase === 'match_over') {
      this.broadcastLobbyState(roomId);
    }
  }

  _scheduleNextRound(roomId, room) {
    if (room.nextRoundTimer) return;

    const delay =
      room.gameType === 'wordgame'
        ? WORD_ROUND_RESET_DELAY_MS
        : ROUND_RESTART_DELAY_MS;

    room.nextRoundTimer = setTimeout(() => {
      room.nextRoundTimer = null;
      const phase = room.game?.phase;
      if (phase === 'round_over' || phase === 'round_end') {
        room.game.startNextRound();
        this.broadcastGameState(roomId);
      }
    }, delay);
  }

  _clearNextRoundTimer(room) {
    if (room.nextRoundTimer) {
      clearTimeout(room.nextRoundTimer);
      room.nextRoundTimer = null;
    }
  }

  _emitReconnectSync(socket, room, playerId) {
    socket.emit('reconnect:sync', {
      roomId: room.id,
      hostId: room.hostId,
      status: room.status,
      gameType: room.gameType,
      players: room.players.map((p) => ({
        id: p.id,
        displayName: p.displayName,
        connected: p.connected,
      })),
      settings: { ...room.settings },
      minPlayers: getGame(room.gameType)?.minPlayers ?? 2,
      maxPlayers: getGame(room.gameType)?.maxPlayers ?? 4,
    });

    if (room.game && room.status === 'playing') {
      const state = room.game.serializeForPlayer(playerId);
      socket.emit('game:state:update', { roomId: room.id, ...state });
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
  }

  _startTurnTimerLoop() {
    setInterval(() => {
      for (const [roomId, room] of this.rooms) {
        if (room.status !== 'playing' || !room.game) continue;
        if (room.game.phase !== 'playing') continue;
        if (typeof room.game.getTurnTimeRemaining !== 'function') continue;
        if (room.game.turnTimerPaused) continue;

        const currentId = room.game.currentPlayerId;
        const player = room.players.find((p) => p.id === currentId);
        if (!player?.connected) continue;

        if (room.game.getTurnTimeRemaining() <= 0) {
          room.game.autoPlay(currentId);
          this.broadcastGameState(roomId);
        }
      }
    }, TURN_TIMER_TICK_MS);
  }

  _startCleanupLoop() {
    setInterval(() => {
      const now = Date.now();
      for (const [roomId, room] of this.rooms) {
        if (room.status === 'playing') continue;

        const allDisconnected = room.players.every((p) => !p.connected);
        if (allDisconnected && now - room.createdAt > ROOM_IDLE_CLEANUP_MS) {
          for (const player of room.players) {
            if (player.disconnectTimer) clearTimeout(player.disconnectTimer);
          }
          this.rooms.delete(roomId);
        }
      }
    }, 60_000);
  }
}
