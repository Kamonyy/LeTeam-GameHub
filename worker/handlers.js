/**
 * Socket.io event handlers — same protocol as backend/server.js
 */

export function registerGameHandlers(socket, roomManager) {
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
}
