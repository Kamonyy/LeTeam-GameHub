/**
 * RoomManager — Room lifecycle, player sessions, disconnect grace periods,
 * and socket event routing to game engines.
 *
 * Reconnection flow:
 *   1. Client stores playerId in sessionStorage and sends it on connect
 *   2. On disconnect, player slot is marked disconnected (not removed)
 *   3. Room state + game engine persist for DISCONNECT_GRACE_MS (60s)
 *   4. Reconnecting socket with same playerId rebinds to the slot
 *   5. Client receives reconnect:sync with full lobby/game state
 */

import { randomBytes } from 'crypto';
import { DominoEngine } from '../games/DominoEngine.js';

/** Grace period before evicting a disconnected player's slot. */
export const DISCONNECT_GRACE_MS = 60_000;

/** Turn timer tick interval on the server. */
const TURN_TIMER_TICK_MS = 1000;

/** Max players per room. */
const MAX_PLAYERS = 4;

/** Min players to start. */
const MIN_PLAYERS = 2;

/**
 * Generate a short readable room code (4–6 alphanumeric chars).
 * @returns {string}
 */
export function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const length = 4 + Math.floor(Math.random() * 3); // 4–6
  const bytes = randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

export class RoomManager {
  constructor(io) {
    this.io = io;
    /** @type {Map<string, Room>} */
    this.rooms = new Map();
    /** @type {Map<string, string>} socketId → playerId */
    this.socketToPlayer = new Map();
    /** @type {Map<string, string>} playerId → socketId */
    this.playerToSocket = new Map();
    /** @type {Map<string, string>} playerId → roomId */
    this.playerToRoom = new Map();

    this._startTurnTimerLoop();
    this._startCleanupLoop();
  }

  /**
   * Register or restore a player session.
   * @param {import('socket.io').Socket} socket
   * @param {string} playerId
   * @param {string} displayName
   */
  registerPlayer(socket, playerId, displayName) {
    this.socketToPlayer.set(socket.id, playerId);

    const existingRoomId = this.playerToRoom.get(playerId);
    if (existingRoomId) {
      const room = this.rooms.get(existingRoomId);
      if (room) {
        const player = room.players.find((p) => p.id === playerId);
        if (player) {
          // Rebind socket — reconnection path
          if (player.disconnectTimer) {
            clearTimeout(player.disconnectTimer);
            player.disconnectTimer = null;
          }
          player.connected = true;
          player.displayName = displayName || player.displayName;
          this.playerToSocket.set(playerId, socket.id);
          socket.join(existingRoomId);

          if (room.game && room.status === 'playing') {
            room.game.resumeTurnTimer();
          }

          this._emitReconnectSync(socket, room, playerId);
          this.broadcastLobbyState(existingRoomId);
          return { reconnected: true, roomId: existingRoomId };
        }
      }
    }

    this.playerToSocket.set(playerId, socket.id);
    return { reconnected: false };
  }

  /**
   * @param {import('socket.io').Socket} socket
   * @param {string} displayName
   */
  createRoom(socket, displayName) {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return { error: 'Not registered' };

    if (this.playerToRoom.has(playerId)) {
      return { error: 'Already in a room' };
    }

    let roomId = generateRoomId();
    while (this.rooms.has(roomId)) {
      roomId = generateRoomId();
    }

    const room = {
      id: roomId,
      hostId: playerId,
      status: 'lobby', // lobby | playing | finished
      gameType: 'dominoes',
      players: [
        {
          id: playerId,
          displayName: displayName || 'Player',
          connected: true,
          disconnectTimer: null,
        },
      ],
      game: null,
      createdAt: Date.now(),
    };

    this.rooms.set(roomId, room);
    this.playerToRoom.set(playerId, roomId);
    socket.join(roomId);

    this.broadcastLobbyState(roomId);
    return { roomId };
  }

  /**
   * @param {import('socket.io').Socket} socket
   * @param {string} roomId
   * @param {string} displayName
   */
  joinRoom(socket, roomId, displayName) {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return { error: 'Not registered' };

    const room = this.rooms.get(roomId.toUpperCase());
    if (!room) return { error: 'Room not found' };

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
      alreadyIn.displayName = displayName || alreadyIn.displayName;
    } else {
      if (room.players.length >= MAX_PLAYERS) {
        return { error: 'Room is full' };
      }
      room.players.push({
        id: playerId,
        displayName: displayName || 'Player',
        connected: true,
        disconnectTimer: null,
      });
    }

    this.playerToRoom.set(playerId, roomId.toUpperCase());
    socket.join(roomId.toUpperCase());

    this.broadcastLobbyState(roomId.toUpperCase());
    return { roomId: roomId.toUpperCase() };
  }

  /**
   * @param {import('socket.io').Socket} socket
   */
  leaveRoom(socket) {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return;

    this._removePlayerFromRoom(playerId, roomId);
    socket.leave(roomId);
  }

  /**
   * @param {import('socket.io').Socket} socket
   */
  startGame(socket) {
    const playerId = this.socketToPlayer.get(socket.id);
    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return { error: 'Not in a room' };

    const room = this.rooms.get(roomId);
    if (!room) return { error: 'Room not found' };
    if (room.hostId !== playerId) return { error: 'Only the host can start' };
    if (room.status !== 'lobby') return { error: 'Game already started' };

    const connectedPlayers = room.players.filter((p) => p.connected);
    if (connectedPlayers.length < MIN_PLAYERS) {
      return { error: `Need at least ${MIN_PLAYERS} players` };
    }

    const playerIds = connectedPlayers.map((p) => p.id);
    room.game = new DominoEngine(playerIds);
    room.status = 'playing';

    this.broadcastGameState(roomId);
    this.broadcastLobbyState(roomId);
    return { success: true };
  }

  /**
   * @param {import('socket.io').Socket} socket
   * @param {{ left: number, right: number }} tile
   * @param {'left' | 'right'} end
   */
  handleMove(socket, tile, end) {
    const playerId = this.socketToPlayer.get(socket.id);
    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return { error: 'Not in a room' };

    const room = this.rooms.get(roomId);
    if (!room?.game) return { error: 'No active game' };

    const result = room.game.playMove(playerId, tile, end);
    if (!result.success) {
      return { error: result.error };
    }

    this.broadcastGameState(roomId);
    return { success: true };
  }

  /**
   * @param {import('socket.io').Socket} socket
   */
  handleDraw(socket) {
    const playerId = this.socketToPlayer.get(socket.id);
    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return { error: 'Not in a room' };

    const room = this.rooms.get(roomId);
    if (!room?.game) return { error: 'No active game' };

    const result = room.game.drawTile(playerId);
    if (!result.success) {
      return { error: result.error };
    }

    this.broadcastGameState(roomId);
    return { success: true };
  }

  /**
   * @param {import('socket.io').Socket} socket
   */
  handlePass(socket) {
    const playerId = this.socketToPlayer.get(socket.id);
    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return { error: 'Not in a room' };

    const room = this.rooms.get(roomId);
    if (!room?.game) return { error: 'No active game' };

    const result = room.game.passTurn(playerId);
    if (!result.success) {
      return { error: result.error };
    }

    this.broadcastGameState(roomId);
    return { success: true };
  }

  /**
   * Handle socket disconnect — mark player offline, start grace timer.
   * @param {import('socket.io').Socket} socket
   */
  handleDisconnect(socket) {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;

    this.socketToPlayer.delete(socket.id);
    this.playerToSocket.delete(playerId);

    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;

    player.connected = false;

    if (room.game && room.status === 'playing') {
      room.game.pauseTurnTimer();
    }

    player.disconnectTimer = setTimeout(() => {
      this._removePlayerFromRoom(playerId, roomId);
    }, DISCONNECT_GRACE_MS);

    this.broadcastLobbyState(roomId);
  }

  /**
   * @param {string} playerId
   * @param {string} roomId
   */
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

    if (room.status === 'playing' && room.players.length < MIN_PLAYERS) {
      room.status = 'finished';
    }

    this.broadcastLobbyState(roomId);
  }

  /**
   * Emit lobby:state to all clients in a room.
   * @param {string} roomId
   */
  broadcastLobbyState(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

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
      minPlayers: MIN_PLAYERS,
      maxPlayers: MAX_PLAYERS,
    };

    this.io.to(roomId).emit('lobby:state', payload);
  }

  /**
   * Emit personalized game:state:update to each player in the room.
   * @param {string} roomId
   */
  broadcastGameState(roomId) {
    const room = this.rooms.get(roomId);
    if (!room?.game) return;

    if (room.game.phase === 'finished') {
      room.status = 'finished';
    }

    for (const player of room.players) {
      if (!player.connected) continue;
      const socketId = this.playerToSocket.get(player.id);
      if (!socketId) continue;

      const state = room.game.serializeForPlayer(player.id);
      this.io.to(socketId).emit('game:state:update', {
        roomId,
        ...state,
      });
    }

    if (room.game.phase === 'finished') {
      this.broadcastLobbyState(roomId);
    }
  }

  /**
   * Full resync payload for reconnecting clients.
   * @param {import('socket.io').Socket} socket
   * @param {object} room
   * @param {string} playerId
   */
  _emitReconnectSync(socket, room, playerId) {
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
    };

    socket.emit('reconnect:sync', payload);

    if (room.game && room.status === 'playing') {
      const state = room.game.serializeForPlayer(playerId);
      socket.emit('game:state:update', { roomId: room.id, ...state });
    }
  }

  /** Server-side turn timer loop — auto-play on timeout. */
  _startTurnTimerLoop() {
    setInterval(() => {
      for (const [roomId, room] of this.rooms) {
        if (room.status !== 'playing' || !room.game) continue;
        if (room.game.phase !== 'playing') continue;
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

  /** Evict empty/stale rooms periodically. */
  _startCleanupLoop() {
    setInterval(() => {
      const now = Date.now();
      for (const [roomId, room] of this.rooms) {
        const allDisconnected = room.players.every((p) => !p.connected);
        if (allDisconnected && now - room.createdAt > DISCONNECT_GRACE_MS * 2) {
          this.rooms.delete(roomId);
        }
      }
    }, 30_000);
  }
}
