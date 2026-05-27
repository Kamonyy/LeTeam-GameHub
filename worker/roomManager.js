/**
 * RoomManager for Cloudflare Workers (socket.io-serverless).
 * Broadcasts via direct socket IDs instead of socket.io rooms (DO-compatible).
 */

import { DominoEngine } from '../backend/games/DominoEngine.js';

export const DISCONNECT_GRACE_MS = 60_000;
const TURN_TIMER_TICK_MS = 1000;
const MAX_PLAYERS = 4;
const MIN_PLAYERS = 2;

export function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const length = 4 + Math.floor(Math.random() * 3);
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

export class RoomManager {
  /** @param {import('socket.io').Server} io */
  constructor(io) {
    this.io = io;
    this.rooms = new Map();
    this.socketToPlayer = new Map();
    this.playerToSocket = new Map();
    this.playerToRoom = new Map();
    this._startTurnTimerLoop();
    this._startCleanupLoop();
  }

  registerPlayer(socket, playerId, displayName) {
    this.socketToPlayer.set(socket.id, playerId);

    const existingRoomId = this.playerToRoom.get(playerId);
    if (existingRoomId) {
      const room = this.rooms.get(existingRoomId);
      if (room) {
        const player = room.players.find((p) => p.id === playerId);
        if (player) {
          if (player.disconnectTimer) {
            clearTimeout(player.disconnectTimer);
            player.disconnectTimer = null;
          }
          player.connected = true;
          player.displayName = displayName || player.displayName;
          this.playerToSocket.set(playerId, socket.id);

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

  createRoom(socket, displayName) {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return { error: 'Not registered' };
    if (this.playerToRoom.has(playerId)) return { error: 'Already in a room' };

    let roomId = generateRoomId();
    while (this.rooms.has(roomId)) roomId = generateRoomId();

    const room = {
      id: roomId,
      hostId: playerId,
      status: 'lobby',
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
    this.broadcastLobbyState(roomId);
    return { roomId };
  }

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
      if (room.players.length >= MAX_PLAYERS) return { error: 'Room is full' };
      room.players.push({
        id: playerId,
        displayName: displayName || 'Player',
        connected: true,
        disconnectTimer: null,
      });
    }

    this.playerToRoom.set(playerId, roomId.toUpperCase());
    this.broadcastLobbyState(roomId.toUpperCase());
    return { roomId: roomId.toUpperCase() };
  }

  leaveRoom(socket) {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;
    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return;
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

    const connectedPlayers = room.players.filter((p) => p.connected);
    if (connectedPlayers.length < MIN_PLAYERS) {
      return { error: `Need at least ${MIN_PLAYERS} players` };
    }

    room.game = new DominoEngine(connectedPlayers.map((p) => p.id));
    room.status = 'playing';
    this.broadcastGameState(roomId);
    this.broadcastLobbyState(roomId);
    return { success: true };
  }

  handleMove(socket, tile, end) {
    const playerId = this.socketToPlayer.get(socket.id);
    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return { error: 'Not in a room' };

    const room = this.rooms.get(roomId);
    if (!room?.game) return { error: 'No active game' };

    const result = room.game.playMove(playerId, tile, end);
    if (!result.success) return { error: result.error };

    this.broadcastGameState(roomId);
    return { success: true };
  }

  handleDraw(socket) {
    const playerId = this.socketToPlayer.get(socket.id);
    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return { error: 'Not in a room' };

    const room = this.rooms.get(roomId);
    if (!room?.game) return { error: 'No active game' };

    const result = room.game.drawTile(playerId);
    if (!result.success) return { error: result.error };

    this.broadcastGameState(roomId);
    return { success: true };
  }

  handlePass(socket) {
    const playerId = this.socketToPlayer.get(socket.id);
    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return { error: 'Not in a room' };

    const room = this.rooms.get(roomId);
    if (!room?.game) return { error: 'No active game' };

    const result = room.game.passTurn(playerId);
    if (!result.success) return { error: result.error };

    this.broadcastGameState(roomId);
    return { success: true };
  }

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

  /** Emit to each connected player in the room by socket ID. */
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

    this._emitToRoomPlayers(room, 'lobby:state', payload);
  }

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
      this.io.to(socketId).emit('game:state:update', { roomId, ...state });
    }

    if (room.game.phase === 'finished') {
      this.broadcastLobbyState(roomId);
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
    });

    if (room.game && room.status === 'playing') {
      const state = room.game.serializeForPlayer(playerId);
      socket.emit('game:state:update', { roomId: room.id, ...state });
    }
  }

  _emitToRoomPlayers(room, event, payload) {
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
        const allDisconnected = room.players.every((p) => !p.connected);
        if (allDisconnected && now - room.createdAt > DISCONNECT_GRACE_MS * 2) {
          this.rooms.delete(roomId);
        }
      }
    }, 30_000);
  }
}
