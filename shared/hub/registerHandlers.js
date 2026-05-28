/** Hub + dominoes socket event wiring (shared by Worker and local server). */

import {
  RATE_LIMITS,
} from './constants.js';
import { isDevBotsEnabled } from './devBots.js';
import {
  normalizeRoomId,
  sanitizeDisplayName,
  validateDominoTile,
  validateGameType,
  validateMafiaNarratorAction,
  validateMoveEnd,
  validatePlayerId,
  validateSessionToken,
  validateTargetPlayerId,
} from './validate.js';

const JOIN_ERROR_GENERIC = 'Unable to join room';

function mapJoinError(error) {
  if (error === 'Room not found' || error === 'Room is full') {
    return JOIN_ERROR_GENERIC;
  }
  return error;
}

function isPlainObject(payload) {
  return payload != null && typeof payload === 'object' && !Array.isArray(payload);
}

export function registerHandlers(socket, roomManager) {
  socket.on('player:register', ({ playerId, displayName, sessionToken }, ack) => {
    if (!roomManager.checkRateLimit(socket.id, 'register', RATE_LIMITS.register)) {
      ack?.({ error: 'Too many requests, slow down' });
      return;
    }
    if (!validatePlayerId(playerId)) {
      ack?.({ error: 'Invalid playerId' });
      return;
    }
    if (!validateSessionToken(sessionToken)) {
      ack?.({ error: 'Invalid session token' });
      return;
    }
    const result = roomManager.registerPlayer(
      socket,
      playerId,
      displayName,
      sessionToken || undefined
    );
    if (result.error) {
      ack?.({ error: result.error });
      return;
    }
    ack?.({ success: true, ...result });
  });

  socket.on('player:updateDisplayName', ({ displayName }, ack) => {
    if (!roomManager.checkRateLimit(socket.id, 'profile', RATE_LIMITS.profile)) {
      ack?.({ error: 'Too many requests, slow down' });
      return;
    }
    const result = roomManager.updateDisplayName(
      socket,
      sanitizeDisplayName(displayName)
    );
    if (result.error) {
      ack?.({ error: result.error });
      return;
    }
    ack?.({ success: true });
  });

  socket.on('hub:presence:request', (_payload, ack) => {
    if (!roomManager.checkRateLimit(socket.id, 'hubPresence', RATE_LIMITS.hubPresence)) {
      ack?.({ error: 'Too many requests, slow down' });
      return;
    }
    roomManager.sendHubPresenceToSocket(socket);
    ack?.({ success: true });
  });

  socket.on('room:create', ({ displayName, gameType }, ack) => {
    if (!roomManager.checkRateLimit(socket.id, 'create', RATE_LIMITS.create)) {
      ack?.({ error: 'Too many requests, slow down' });
      return;
    }
    const type = gameType || 'wordgame';
    if (!validateGameType(type)) {
      ack?.({ error: 'Invalid game type' });
      return;
    }
    const result = roomManager.createRoom(socket, displayName, type);
    if (result.error) {
      ack?.({ error: result.error });
      return;
    }
    ack?.({ success: true, roomId: result.roomId });
  });

  socket.on('room:join', (payload, ack) => {
    if (!roomManager.checkRateLimit(socket.id, 'join', RATE_LIMITS.join)) {
      ack?.({ error: 'Too many requests, slow down' });
      return;
    }
    if (!isPlainObject(payload)) {
      ack?.({ error: 'Invalid payload' });
      return;
    }
    const { roomId, displayName, spectate } = payload;
    if (spectate !== undefined && typeof spectate !== 'boolean') {
      ack?.({ error: 'Invalid spectate flag' });
      return;
    }
    const normalized = normalizeRoomId(roomId);
    if (!normalized) {
      ack?.({ error: 'Invalid room code' });
      return;
    }
    const result =
      spectate ?
        roomManager.spectateRoom(socket, normalized, displayName)
      : roomManager.joinRoom(socket, normalized, displayName);
    if (result.error) {
      ack?.({ error: mapJoinError(result.error) });
      return;
    }
    ack?.({
      success: true,
      roomId: result.roomId,
      isSpectator: !!result.isSpectator,
    });
  });

  socket.on('room:spectate', ({ roomId, displayName }, ack) => {
    if (!roomManager.checkRateLimit(socket.id, 'join', RATE_LIMITS.join)) {
      ack?.({ error: 'Too many requests, slow down' });
      return;
    }
    const normalized = normalizeRoomId(roomId);
    if (!normalized) {
      ack?.({ error: 'Invalid room code' });
      return;
    }
    const result = roomManager.spectateRoom(socket, normalized, displayName);
    if (result.error) {
      ack?.({ error: mapJoinError(result.error) });
      return;
    }
    ack?.({ success: true, roomId: result.roomId, isSpectator: true });
  });

  if (isDevBotsEnabled()) {
    socket.on('room:dev:add-bots', ({ count }, ack) => {
      const result = roomManager.addDevBots(socket, count);
      if (result?.error) {
        ack?.({ error: result.error });
        return;
      }
      ack?.({ success: true, added: result.added });
    });

    socket.on('room:dev:remove-bots', (_payload, ack) => {
      const result = roomManager.removeDevBots(socket);
      if (result?.error) {
        ack?.({ error: result.error });
        return;
      }
      ack?.({ success: true, removed: result.removed });
    });
  }

  socket.on('room:leave', (_payload, ack) => {
    roomManager.leaveRoom(socket);
    ack?.({ success: true });
  });

  socket.on('room:settings:update', (settings, ack) => {
    if (!roomManager.checkRateLimit(socket.id, 'roomSettingsUpdate', RATE_LIMITS.roomSettingsUpdate)) {
      ack?.({ error: 'Too many requests, slow down' });
      return;
    }
    if (!settings || typeof settings !== 'object') {
      ack?.({ error: 'Invalid settings' });
      return;
    }
    const result = roomManager.updateRoomSettings(socket, settings);
    if (result?.error) {
      ack?.({ error: result.error });
      return;
    }
    ack?.({ success: true, settings: result.settings });
  });

  socket.on('room:kick', ({ targetPlayerId }, ack) => {
    if (!validateTargetPlayerId(targetPlayerId)) {
      ack?.({ error: 'Invalid target player' });
      return;
    }
    const result = roomManager.kickPlayer(socket, targetPlayerId);
    if (result?.error) {
      ack?.({ error: result.error });
      return;
    }
    ack?.({ success: true });
  });

  socket.on('game:cancel', (_payload, ack) => {
    if (!roomManager.checkRateLimit(socket.id, 'gameCancel', RATE_LIMITS.gameCancel)) {
      ack?.({ error: 'Too many requests, slow down' });
      return;
    }
    const result = roomManager.cancelMatch(socket);
    if (result?.error) {
      ack?.({ error: result.error });
      return;
    }
    ack?.({ success: true });
  });

  socket.on('game:start', (_payload, ack) => {
    if (!roomManager.checkRateLimit(socket.id, 'gameStart', RATE_LIMITS.gameStart)) {
      ack?.({ error: 'Too many requests, slow down' });
      return;
    }
    const result = roomManager.startGame(socket);
    if (result?.error) {
      ack?.({ error: result.error });
      return;
    }
    ack?.({ success: true });
  });

  socket.on('game:move:request', ({ tile, end }, ack) => {
    if (!roomManager.checkRateLimit(socket.id, 'move', RATE_LIMITS.move)) {
      ack?.({ error: 'Too many requests, slow down' });
      return;
    }
    if (!validateDominoTile(tile) || !validateMoveEnd(end)) {
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
    if (!roomManager.checkRateLimit(socket.id, 'move', RATE_LIMITS.move)) {
      ack?.({ error: 'Too many requests, slow down' });
      return;
    }
    const result = roomManager.handleDraw(socket);
    if (result?.error) {
      socket.emit('game:error', { message: result.error });
      ack?.({ error: result.error });
      return;
    }
    ack?.({ success: true });
  });

  socket.on('game:pass:request', (_payload, ack) => {
    if (!roomManager.checkRateLimit(socket.id, 'move', RATE_LIMITS.move)) {
      ack?.({ error: 'Too many requests, slow down' });
      return;
    }
    const result = roomManager.handlePass(socket);
    if (result?.error) {
      socket.emit('game:error', { message: result.error });
      ack?.({ error: result.error });
      return;
    }
    ack?.({ success: true });
  });

  socket.on('game:round:continue', (_payload, ack) => {
    const result = roomManager.handleContinueRound(socket);
    if (result?.error) {
      socket.emit('game:error', { message: result.error });
      ack?.({ error: result.error });
      return;
    }
    ack?.({ success: true });
  });

  socket.on('game:rematch:request', (_payload, ack) => {
    const result = roomManager.handleRematch(socket);
    if (result?.error) {
      socket.emit('game:error', { message: result.error });
      ack?.({ error: result.error });
      return;
    }
    ack?.({ success: true });
  });

  socket.on('word:submit', (payload, ack) => {
    if (!roomManager.checkRateLimit(socket.id, 'wordSubmit', RATE_LIMITS.wordSubmit)) {
      ack?.({ error: 'Too many requests, slow down' });
      return;
    }
    const result = roomManager.handleWordSubmit(socket, payload);
    if (result?.error) {
      socket.emit('game:error', { message: result.error });
      ack?.({ error: result.error });
      return;
    }
    ack?.({ success: true, state: result.state });
  });

  socket.on('word:champion:submit', (payload, ack) => {
    if (!roomManager.checkRateLimit(socket.id, 'wordChampionSubmit', RATE_LIMITS.wordChampionSubmit)) {
      ack?.({ error: 'Too many requests, slow down' });
      return;
    }
    const result = roomManager.handleWordChampionSubmit(socket, payload);
    if (result?.error) {
      socket.emit('game:error', { message: result.error });
      ack?.({ error: result.error });
      return;
    }
    ack?.({ success: true, state: result.state });
  });

  socket.on('word:guessed', (_payload, ack) => {
    if (!roomManager.checkRateLimit(socket.id, 'wordGuessed', RATE_LIMITS.wordGuessed)) {
      ack?.({ error: 'Too many requests, slow down' });
      return;
    }
    const result = roomManager.handleWordGuessed(socket);
    if (result?.error) {
      socket.emit('game:error', { message: result.error });
      ack?.({ error: result.error });
      return;
    }
    ack?.({ success: true, state: result.state });
  });

  socket.on('word:focus:report', ({ focused }, ack) => {
    if (!roomManager.checkRateLimit(socket.id, 'focus', RATE_LIMITS.focus)) {
      ack?.({ error: 'Too many requests, slow down' });
      return;
    }
    if (typeof focused !== 'boolean') {
      ack?.({ error: 'Invalid focus state' });
      return;
    }
    const result = roomManager.handleWordTabFocusReport(socket, focused);
    if (result?.error) {
      ack?.({ error: result.error });
      return;
    }
    ack?.({ success: true });
  });

  socket.on('game:state:request', (_payload, ack) => {
    if (!roomManager.checkRateLimit(socket.id, 'gameStateRequest', RATE_LIMITS.gameStateRequest)) {
      ack?.({ error: 'Too many requests, slow down' });
      return;
    }
    const result = roomManager.syncGameStateForPlayer(socket);
    if (result?.error) {
      ack?.({ error: result.error });
      return;
    }
    ack?.({ success: true, state: result.state });
  });

  socket.on('mafia:role:acknowledge', (_payload, ack) => {
    if (!roomManager.checkRateLimit(socket.id, 'mafiaRoleAcknowledge', RATE_LIMITS.mafiaRoleAcknowledge)) {
      ack?.({ error: 'Too many requests, slow down' });
      return;
    }
    const result = roomManager.handleMafiaAcknowledgeRole(socket);
    if (result?.error) {
      socket.emit('game:error', { message: result.error });
      ack?.({ error: result.error });
      return;
    }
    ack?.({ success: true, state: result.state });
  });

  socket.on('mafia:narrator', (payload, ack) => {
    if (!roomManager.checkRateLimit(socket.id, 'mafiaNarrator', RATE_LIMITS.mafiaNarrator)) {
      ack?.({ error: 'Too many requests, slow down' });
      return;
    }
    if (!isPlainObject(payload)) {
      ack?.({ error: 'Invalid payload' });
      return;
    }
    const { action, targetPlayerId } = payload;
    if (!validateMafiaNarratorAction(action)) {
      ack?.({ error: 'Invalid action' });
      return;
    }
    if (
      (action === 'day_eliminate' || action === 'set_night_target') &&
      targetPlayerId != null &&
      !validateTargetPlayerId(targetPlayerId)
    ) {
      ack?.({ error: 'Invalid target player' });
      return;
    }
    const result = roomManager.handleMafiaNarratorAction(socket, action, {
      targetPlayerId: targetPlayerId ?? null,
    });
    if (result?.error) {
      socket.emit('game:error', { message: result.error });
      ack?.({ error: result.error });
      return;
    }
    ack?.({ success: true, state: result.state });
  });

  socket.on('bara:reveal', (_payload, ack) => {
    if (!roomManager.checkRateLimit(socket.id, 'baraReveal', RATE_LIMITS.baraReveal)) {
      ack?.({ error: 'Too many requests, slow down' });
      return;
    }
    const result = roomManager.handleBaraReveal(socket);
    if (result?.error) {
      socket.emit('game:error', { message: result.error });
      ack?.({ error: result.error });
      return;
    }
    ack?.({ success: true, state: result.state });
  });

  socket.on('bara:interrogation:advance', (_payload, ack) => {
    const result = roomManager.handleBaraAdvanceInterrogation(socket);
    if (result?.error) {
      socket.emit('game:error', { message: result.error });
      ack?.({ error: result.error });
      return;
    }
    ack?.({ success: true });
  });

  socket.on('bara:vote', ({ targetPlayerId }, ack) => {
    if (!roomManager.checkRateLimit(socket.id, 'baraVote', RATE_LIMITS.baraVote)) {
      ack?.({ error: 'Too many requests, slow down' });
      return;
    }
    if (!validateTargetPlayerId(targetPlayerId)) {
      ack?.({ error: 'Invalid target player' });
      return;
    }
    const result = roomManager.handleBaraVote(socket, targetPlayerId);
    if (result?.error) {
      socket.emit('game:error', { message: result.error });
      ack?.({ error: result.error });
      return;
    }
    ack?.({ success: true, state: result.state });
  });

  socket.on('bara:guess', (payload, ack) => {
    if (!roomManager.checkRateLimit(socket.id, 'baraGuess', RATE_LIMITS.baraGuess)) {
      ack?.({ error: 'Too many requests, slow down' });
      return;
    }
    if (!isPlainObject(payload)) {
      ack?.({ error: 'Invalid payload' });
      return;
    }
    const { guess } = payload;
    const result = roomManager.handleBaraGuess(socket, guess);
    if (result?.error) {
      socket.emit('game:error', { message: result.error });
      ack?.({ error: result.error });
      return;
    }
    ack?.({ success: true, state: result.state });
  });

  socket.on('chat:send', ({ message }, ack) => {
    if (!roomManager.checkRateLimit(socket.id, 'chat', RATE_LIMITS.chat)) {
      ack?.({ error: 'Too many messages, slow down' });
      return;
    }
    const result = roomManager.handleChatSend(socket, message);
    if (result?.error) {
      ack?.({ error: result.error });
      return;
    }
    ack?.({ success: true });
  });

  socket.on('disconnect', () => {
    roomManager.handleDisconnect(socket);
  });
}
