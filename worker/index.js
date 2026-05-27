/**
 * Cloudflare Worker — static frontend + Socket.io game server on one domain.
 *
 * /socket.io/*  → Durable Objects (socket.io-serverless)
 * /health       → health check
 * everything else → frontend/out static assets
 */

import {
  createEioActor,
  createSioActor,
  generateBase64id,
} from 'socket.io-serverless/dist/cf';
import { RoomManager } from './roomManager.js';
import { registerGameHandlers } from './handlers.js';

/** @type {RoomManager | null} */
let roomManager = null;

export const EngineActor = createEioActor({
  getSocketActorNamespace(bindings) {
    return bindings.socketActor;
  },
});

export const SocketActor = createSioActor({
  async onServerCreated(server) {
    roomManager = new RoomManager(server);
    server.on('connection', (socket) => {
      registerGameHandlers(socket, roomManager);
    });
  },

  async onServerStateRestored(server) {
    if (!roomManager) {
      roomManager = new RoomManager(server);
    }
  },

  getEngineActorNamespace(bindings) {
    return bindings.engineActor;
  },
});

export default {
  /** @param {Request} req @param {Record<string, DurableObjectNamespace>} env */
  async fetch(req, env) {
    const url = new URL(req.url);

    if (url.pathname === '/health') {
      return Response.json({ status: 'ok', timestamp: Date.now() });
    }

    if (url.pathname.startsWith('/socket.io/')) {
      const actorId = env.engineActor.idFromName('singleton');
      const engineStub = env.engineActor.get(actorId);

      if (req.headers.get('upgrade') === 'websocket') {
        const sessionId = generateBase64id();
        return engineStub.fetch(
          `https://internal/socket.io/?eio_sid=${sessionId}`,
          req
        );
      }

      return engineStub.fetch(`https://internal${url.pathname}${url.search}`, req);
    }

    return env.ASSETS.fetch(req);
  },
};
