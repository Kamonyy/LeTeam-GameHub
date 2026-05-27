/**
 * Local dev server — Express + Socket.io (production uses Cloudflare Worker).
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { RoomManager } from '../shared/hub/RoomManager.js';
import { registerHandlers } from '../shared/hub/registerHandlers.js';
import {
  createCorsOriginChecker,
  parseAllowedOrigins,
} from './cors.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';
const allowedOrigins = parseAllowedOrigins(process.env.CLIENT_URL);
const corsOrigin = createCorsOriginChecker(allowedOrigins);

const app = express();
app.use(cors({ origin: corsOrigin, credentials: true }));
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

const roomManager = new RoomManager(io, { useSocketRooms: true });

io.on('connection', (socket) => {
  registerHandlers(socket, roomManager);
});

httpServer.listen(PORT, HOST, () => {
  console.log(`Local dev server ${HOST}:${PORT}`);
});
