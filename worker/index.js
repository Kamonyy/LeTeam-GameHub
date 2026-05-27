/**
 * Cloudflare Worker — static frontend + Socket.io on one domain.
 */

import {
  createEioActor,
  createSioActor,
  generateBase64id,
} from 'socket.io-serverless/dist/cf';
import { RoomManager } from '../shared/hub/RoomManager.js';
import { registerHandlers } from '../shared/hub/registerHandlers.js';
import { isAllowedSocketRequest } from '../shared/hub/security.js';

/** @type {RoomManager | null} */
let roomManager = null;

function attachConnectionHandlers(server) {
  roomManager = new RoomManager(server, { useSocketRooms: false });
  server.on('connection', (socket) => {
    registerHandlers(socket, roomManager);
  });
}

export const EngineActor = createEioActor({
  getSocketActorNamespace(bindings) {
    return bindings.socketActor;
  },
});

export const SocketActor = createSioActor({
  async onServerCreated(server) {
    attachConnectionHandlers(server);
  },

  async onServerStateRestored(server) {
    if (!roomManager) {
      attachConnectionHandlers(server);
    }
  },

  getEngineActorNamespace(bindings) {
    return bindings.engineActor;
  },
});

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    if (url.pathname === '/health') {
      return Response.json({ status: 'ok' });
    }

    if (url.pathname.startsWith('/socket.io/')) {
      if (!isAllowedSocketRequest(req)) {
        return new Response('Forbidden', { status: 403 });
      }

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
