/**
 * LeTeam Game Hub — Authoritative Game Server
 *
 * HTTP + WebSocket upgrade via Express + Socket.io.
 * All game logic is server-side; clients are render-only.
 *
 * Environment:
 *   PORT          — HTTP/WS port (default 3001)
 *   CLIENT_URL    — Comma-separated allowed frontend origins for CORS
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { RoomManager } from './managers/RoomManager.js';
import {
  createCorsOriginChecker,
  parseAllowedOrigins,
} from './config/cors.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';
const allowedOrigins = parseAllowedOrigins(process.env.CLIENT_URL);
const corsOrigin = createCorsOriginChecker(allowedOrigins);

const app = express();

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: 10_000,
  pingTimeout: 5_000,
  transports: ['websocket', 'polling'],
});

const roomManager = new RoomManager(io);

io.on('connection', (socket) => {
  socket.on('player:register', ({ playerId, displayName }, ack) => {
    if (!playerId || typeof playerId !== 'string') {
      ack?.({ error: 'Invalid playerId' });
      return;
    }

    const result = roomManager.registerPlayer(
      socket,
      playerId,
      displayName || 'Player'
    );
    ack?.({ success: true, ...result });
  });

  socket.on('room:create', ({ displayName }, ack) => {
    const result = roomManager.createRoom(socket, displayName);
    if (result.error) {
      ack?.({ error: result.error });
      return;
    }
    ack?.({ success: true, roomId: result.roomId });
  });

  socket.on('room:join', ({ roomId, displayName }, ack) => {
    if (!roomId) {
      ack?.({ error: 'Room ID required' });
      return;
    }
    const result = roomManager.joinRoom(socket, roomId, displayName);
    if (result.error) {
      ack?.({ error: result.error });
      return;
    }
    ack?.({ success: true, roomId: result.roomId });
  });

  socket.on('room:leave', (_payload, ack) => {
    roomManager.leaveRoom(socket);
    ack?.({ success: true });
  });

  socket.on('game:start', (_payload, ack) => {
    const result = roomManager.startGame(socket);
    if (result?.error) {
      ack?.({ error: result.error });
      return;
    }
    ack?.({ success: true });
  });

  socket.on('game:move:request', ({ tile, end }, ack) => {
    if (!tile || !end) {
      socket.emit('game:error', { message: 'Invalid move payload' });
      ack?.({ error: 'Invalid move payload' });
      return;
    }

    const result = roomManager.handleMove(socket, tile, end);
    if (result?.error) {
      socket.emit('game:error', { message: result.error });
      ack?.({ error: result.error });
      return;
    }
    ack?.({ success: true });
  });

  socket.on('game:draw:request', (_payload, ack) => {
    const result = roomManager.handleDraw(socket);
    if (result?.error) {
      socket.emit('game:error', { message: result.error });
      ack?.({ error: result.error });
      return;
    }
    ack?.({ success: true });
  });

  socket.on('game:pass:request', (_payload, ack) => {
    const result = roomManager.handlePass(socket);
    if (result?.error) {
      socket.emit('game:error', { message: result.error });
      ack?.({ error: result.error });
      return;
    }
    ack?.({ success: true });
  });

  socket.on('disconnect', () => {
    roomManager.handleDisconnect(socket);
  });
});

httpServer.listen(PORT, HOST, () => {
  console.log(`Game Hub server listening on ${HOST}:${PORT}`);
  console.log(`CORS allowed origins: ${allowedOrigins.join(', ')} (+ *.pages.dev)`);
});
