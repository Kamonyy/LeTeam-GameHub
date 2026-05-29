/** Socket event configs for the unified executeSecureEvent pipeline. */

import { RATE_LIMITS } from './constants.js';
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

/** @param {Record<string, unknown>} payload */
function extractSketchGuess(payload) {
  if (typeof payload.text === 'string') return payload.text;
  if (typeof payload.guess === 'string') return payload.guess;
  if (typeof payload.message === 'string') return payload.message;
  return '';
}

// --- Handlers ---

function registerPlayer(socket, payload, roomManager) {
  const { playerId, displayName, sessionToken } = payload ?? {};
  return roomManager.registerPlayer(
    socket,
    playerId,
    displayName,
    sessionToken || undefined
  );
}

function updateDisplayName(socket, payload, roomManager) {
  const { displayName } = payload ?? {};
  return roomManager.updateDisplayName(socket, sanitizeDisplayName(displayName));
}

function hubPresenceRequest(socket, _payload, roomManager) {
  roomManager.sendHubPresenceToSocket(socket);
  return {};
}

function roomCreate(socket, payload, roomManager) {
  const { displayName, gameType } = payload ?? {};
  const type = gameType || 'wordgame';
  return roomManager.createRoom(socket, displayName, type);
}

function roomJoin(socket, payload, roomManager) {
  const { roomId, displayName, spectate } = payload ?? {};
  const normalized = normalizeRoomId(roomId);
  const result =
    spectate ?
      roomManager.spectateRoom(socket, normalized, displayName)
    : roomManager.joinRoom(socket, normalized, displayName);
  if (result.error) {
    return { error: mapJoinError(result.error) };
  }
  return {
    roomId: result.roomId,
    isSpectator: !!result.isSpectator,
  };
}

function roomSpectate(socket, payload, roomManager) {
  const { roomId, displayName } = payload ?? {};
  const normalized = normalizeRoomId(roomId);
  const result = roomManager.spectateRoom(socket, normalized, displayName);
  if (result.error) {
    return { error: mapJoinError(result.error) };
  }
  return { roomId: result.roomId, isSpectator: true };
}

function roomDevAddBots(socket, payload, roomManager) {
  const { count } = payload ?? {};
  return roomManager.addDevBots(socket, count);
}

function roomDevRemoveBots(socket, _payload, roomManager) {
  return roomManager.removeDevBots(socket);
}

function roomLeave(socket, payload, roomManager) {
  const options =
    payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
  return roomManager.leaveRoom(socket, options);
}

function roomSettingsUpdate(socket, settings, roomManager) {
  const result = roomManager.updateRoomSettings(socket, settings);
  if (result?.error) return result;
  return { settings: result.settings };
}

function roomKick(socket, payload, roomManager) {
  const { targetPlayerId } = payload ?? {};
  return roomManager.kickPlayer(socket, targetPlayerId);
}

function gameCancel(socket, _payload, roomManager) {
  return roomManager.cancelMatch(socket);
}

function roomDisband(socket, _payload, roomManager) {
  return roomManager.disbandRoom(socket);
}

function gameStart(socket, _payload, roomManager) {
  return roomManager.startGame(socket);
}

function gameMoveRequest(socket, payload, roomManager) {
  const { tile, end } = payload ?? {};
  return roomManager.handleMove(socket, tile, end);
}

function gameDrawRequest(socket, _payload, roomManager) {
  return roomManager.handleDraw(socket);
}

function gamePassRequest(socket, _payload, roomManager) {
  return roomManager.handlePass(socket);
}

function gameRoundContinue(socket, _payload, roomManager) {
  return roomManager.handleContinueRound(socket);
}

function gameRematchRequest(socket, _payload, roomManager) {
  return roomManager.handleRematch(socket);
}

function wordSubmit(socket, payload, roomManager) {
  return roomManager.handleWordSubmit(socket, payload);
}

function wordChampionSubmit(socket, payload, roomManager) {
  return roomManager.handleWordChampionSubmit(socket, payload);
}

function wordGuessed(socket, _payload, roomManager) {
  return roomManager.handleWordGuessed(socket);
}

function wordFocusReport(socket, payload, roomManager) {
  const { focused } = payload ?? {};
  return roomManager.handleWordTabFocusReport(socket, focused);
}

function gameStateRequest(socket, _payload, roomManager) {
  return roomManager.syncGameStateForPlayer(socket);
}

function mafiaRoleAcknowledge(socket, _payload, roomManager) {
  return roomManager.handleMafiaAcknowledgeRole(socket);
}

function mafiaNarrator(socket, payload, roomManager) {
  const { action, targetPlayerId } = payload ?? {};
  return roomManager.handleMafiaNarratorAction(socket, action, {
    targetPlayerId: targetPlayerId ?? null,
  });
}

function baraReveal(socket, _payload, roomManager) {
  return roomManager.handleBaraReveal(socket);
}

function baraReady(socket, _payload, roomManager) {
  return roomManager.handleBaraReady(socket);
}

function baraInterrogationAdvance(socket, _payload, roomManager) {
  return roomManager.handleBaraAdvanceInterrogation(socket);
}

function baraVoteEnd(socket, _payload, roomManager) {
  return roomManager.handleBaraRequestVoteEnd(socket);
}

function baraVote(socket, payload, roomManager) {
  const { targetPlayerId } = payload ?? {};
  return roomManager.handleBaraVote(socket, targetPlayerId);
}

function baraOutcastFreeGuess(socket, _payload, roomManager) {
  return roomManager.handleBaraOutcastFreeGuess(socket);
}

function baraGuess(socket, payload, roomManager) {
  const { guess } = payload ?? {};
  return roomManager.handleBaraGuess(socket, guess);
}

function sketchDrawWordSelect(socket, payload, roomManager) {
  const { index } = payload ?? {};
  return roomManager.handleSketchDrawSelectWord(socket, index);
}

function sketchDrawCanvasStrokeBatch(socket, payload, roomManager) {
  return roomManager.handleSketchDrawCanvasStrokeBatch(socket, payload);
}

function sketchDrawCanvasUndo(socket, _payload, roomManager) {
  return roomManager.handleSketchDrawCanvasUndo(socket);
}

function sketchDrawCanvasRedo(socket, _payload, roomManager) {
  return roomManager.handleSketchDrawCanvasRedo(socket);
}

function handleSketchGuessSubmit(socket, payload, roomManager) {
  const guess = extractSketchGuess(payload);
  const result = roomManager.handleSketchDrawGuessSubmit(socket, guess);
  if (result?.error) return result;
  return { outcome: result.outcome ?? 'ok' };
}

function sketchDrawCanvasFill(socket, payload, roomManager) {
  return roomManager.handleSketchDrawCanvasFill(socket, payload);
}

function sketchDrawCanvasClear(socket, _payload, roomManager) {
  return roomManager.handleSketchDrawCanvasClear(socket);
}

function sketchDrawCanvasRecoveryRequest(socket, _payload, roomManager) {
  return roomManager.handleSketchDrawCanvasRecovery(socket);
}

function sketchDrawDisband(socket, _payload, roomManager) {
  return roomManager.disbandSketchDrawRoom(socket);
}

function chatSend(socket, payload, roomManager) {
  const { message } = payload ?? {};
  return roomManager.handleChatSend(socket, message);
}

function inviteSend(socket, payload, roomManager) {
  const { targetPlayerId, roomId, gameType, sessionToken } = payload ?? {};
  const normalized = normalizeRoomId(roomId);
  const result = roomManager.sendInvite(socket, {
    targetPlayerId,
    roomId: normalized,
    gameType,
    sessionToken,
  });
  if (result.error) {
    roomManager._emitInviteError(socket, result.error);
  }
  return result;
}

function inviteRespond(socket, payload, roomManager) {
  const { inviteId, accept, sessionToken } = payload ?? {};
  const result = roomManager.respondToInvite(socket, {
    inviteId,
    accept,
    sessionToken,
  });
  if (result.error) {
    roomManager._emitInviteError(socket, result.error);
  }
  return result;
}

// --- Validators (return error string or null) ---

function validatePlayerRegister(payload) {
  if (!isPlainObject(payload)) return 'Invalid payload';
  const { playerId, sessionToken } = payload;
  if (!validatePlayerId(playerId)) return 'Invalid playerId';
  if (!validateSessionToken(sessionToken)) return 'Invalid session token';
  return null;
}

function validateRoomCreate(payload) {
  const type = isPlainObject(payload) ? payload.gameType || 'wordgame' : 'wordgame';
  if (!validateGameType(type)) return 'Invalid game type';
  return null;
}

function validateRoomJoin(payload) {
  if (!isPlainObject(payload)) return 'Invalid payload';
  const { roomId, spectate } = payload;
  if (spectate !== undefined && typeof spectate !== 'boolean') {
    return 'Invalid spectate flag';
  }
  if (!normalizeRoomId(roomId)) return 'Invalid room code';
  return null;
}

function validateRoomSpectate(payload) {
  if (!isPlainObject(payload)) return 'Invalid payload';
  if (!normalizeRoomId(payload.roomId)) return 'Invalid room code';
  return null;
}

function validateRoomSettings(payload) {
  if (!payload || typeof payload !== 'object') return 'Invalid settings';
  return null;
}

function validateRoomKick(payload) {
  if (!isPlainObject(payload)) return 'Invalid payload';
  if (!validateTargetPlayerId(payload.targetPlayerId)) return 'Invalid target player';
  return null;
}

function validateGameMove(payload) {
  if (!isPlainObject(payload)) return 'Invalid move payload';
  const { tile, end } = payload;
  if (!validateDominoTile(tile) || !validateMoveEnd(end)) return 'Invalid move payload';
  return null;
}

function validateWordFocus(payload) {
  if (!isPlainObject(payload)) return 'Invalid payload';
  if (typeof payload.focused !== 'boolean') return 'Invalid focus state';
  return null;
}

function validateMafiaNarrator(payload) {
  if (!isPlainObject(payload)) return 'Invalid payload';
  const { action, targetPlayerId } = payload;
  if (!validateMafiaNarratorAction(action)) return 'Invalid action';
  if (
    (action === 'day_eliminate' || action === 'set_night_target') &&
    targetPlayerId != null &&
    !validateTargetPlayerId(targetPlayerId)
  ) {
    return 'Invalid target player';
  }
  return null;
}

function validateBaraVote(payload) {
  if (!isPlainObject(payload)) return 'Invalid payload';
  if (!validateTargetPlayerId(payload.targetPlayerId)) return 'Invalid target player';
  return null;
}

function validateBaraGuess(payload) {
  if (!isPlainObject(payload)) return 'Invalid payload';
  return null;
}

function validatePlainObject(payload) {
  if (!isPlainObject(payload)) return 'Invalid payload';
  return null;
}

function validateSketchGuess(payload) {
  if (!isPlainObject(payload)) return 'Invalid payload';
  return null;
}

function validateInviteSend(payload) {
  if (!isPlainObject(payload)) return 'Invalid payload';
  const { targetPlayerId, roomId, gameType, sessionToken } = payload;
  if (!validateTargetPlayerId(targetPlayerId)) return 'Invalid target player';
  if (!normalizeRoomId(roomId)) return 'Invalid room code';
  if (!validateGameType(gameType)) return 'Invalid game type';
  if (!validateSessionToken(sessionToken)) return 'Invalid session token';
  return null;
}

function validateInviteRespond(payload) {
  if (!isPlainObject(payload)) return 'Invalid payload';
  const { inviteId, accept, sessionToken } = payload;
  if (typeof inviteId !== 'string' || inviteId.length > 64) return 'Invalid invite id';
  if (typeof accept !== 'boolean') return 'Invalid accept flag';
  if (!validateSessionToken(sessionToken)) return 'Invalid session token';
  return null;
}

/**
 * @typedef {object} EventConfig
 * @property {string} event
 * @property {string} [actionKey]
 * @property {number} [rateLimit]
 * @property {boolean} [requiresAuth]
 * @property {boolean} [requiresRegistered]
 * @property {(payload: unknown) => string | null} [validate]
 * @property {boolean} [emitGameError]
 * @property {boolean} [validationToast]
 * @property {(socket: import('socket.io').Socket, payload: unknown, roomManager: import('./RoomManager.js').RoomManager) => Promise<object> | object} handler
 */

/** @type {EventConfig[]} */
export const ALL_EVENTS = [
  {
    event: 'player:register',
    actionKey: 'register',
    rateLimit: RATE_LIMITS.register,
    validate: validatePlayerRegister,
    handler: registerPlayer,
  },
  {
    event: 'player:updateDisplayName',
    actionKey: 'profile',
    rateLimit: RATE_LIMITS.profile,
    handler: updateDisplayName,
  },
  {
    event: 'hub:presence:request',
    actionKey: 'hubPresence',
    rateLimit: RATE_LIMITS.hubPresence,
    handler: hubPresenceRequest,
  },
  {
    event: 'room:create',
    actionKey: 'create',
    rateLimit: RATE_LIMITS.create,
    validate: validateRoomCreate,
    handler: roomCreate,
  },
  {
    event: 'room:join',
    actionKey: 'join',
    rateLimit: RATE_LIMITS.join,
    validate: validateRoomJoin,
    handler: roomJoin,
  },
  {
    event: 'room:spectate',
    actionKey: 'join',
    rateLimit: RATE_LIMITS.join,
    validate: validateRoomSpectate,
    handler: roomSpectate,
  },
  {
    event: 'room:dev:add-bots',
    handler: roomDevAddBots,
  },
  {
    event: 'room:dev:remove-bots',
    handler: roomDevRemoveBots,
  },
  {
    event: 'room:leave',
    handler: roomLeave,
  },
  {
    event: 'room:settings:update',
    actionKey: 'roomSettingsUpdate',
    rateLimit: RATE_LIMITS.roomSettingsUpdate,
    validate: validateRoomSettings,
    handler: roomSettingsUpdate,
  },
  {
    event: 'room:kick',
    validate: validateRoomKick,
    handler: roomKick,
  },
  {
    event: 'game:cancel',
    actionKey: 'gameCancel',
    rateLimit: RATE_LIMITS.gameCancel,
    handler: gameCancel,
  },
  {
    event: 'room:disband',
    actionKey: 'roomDisband',
    rateLimit: RATE_LIMITS.gameCancel,
    handler: roomDisband,
  },
  {
    event: 'game:start',
    actionKey: 'gameStart',
    rateLimit: RATE_LIMITS.gameStart,
    handler: gameStart,
  },
  {
    event: 'game:move:request',
    actionKey: 'move',
    rateLimit: RATE_LIMITS.move,
    validate: validateGameMove,
    emitGameError: true,
    handler: gameMoveRequest,
  },
  {
    event: 'game:draw:request',
    actionKey: 'move',
    rateLimit: RATE_LIMITS.move,
    emitGameError: true,
    handler: gameDrawRequest,
  },
  {
    event: 'game:pass:request',
    actionKey: 'move',
    rateLimit: RATE_LIMITS.move,
    emitGameError: true,
    handler: gamePassRequest,
  },
  {
    event: 'game:round:continue',
    emitGameError: true,
    handler: gameRoundContinue,
  },
  {
    event: 'game:rematch:request',
    emitGameError: true,
    handler: gameRematchRequest,
  },
  {
    event: 'word:submit',
    actionKey: 'wordSubmit',
    rateLimit: RATE_LIMITS.wordSubmit,
    emitGameError: true,
    handler: wordSubmit,
  },
  {
    event: 'word:champion:submit',
    actionKey: 'wordChampionSubmit',
    rateLimit: RATE_LIMITS.wordChampionSubmit,
    emitGameError: true,
    handler: wordChampionSubmit,
  },
  {
    event: 'word:guessed',
    actionKey: 'wordGuessed',
    rateLimit: RATE_LIMITS.wordGuessed,
    emitGameError: true,
    handler: wordGuessed,
  },
  {
    event: 'word:focus:report',
    actionKey: 'focus',
    rateLimit: RATE_LIMITS.focus,
    validate: validateWordFocus,
    handler: wordFocusReport,
  },
  {
    event: 'game:state:request',
    actionKey: 'gameStateRequest',
    rateLimit: RATE_LIMITS.gameStateRequest,
    handler: gameStateRequest,
  },
  {
    event: 'mafia:role:acknowledge',
    actionKey: 'mafiaRoleAcknowledge',
    rateLimit: RATE_LIMITS.mafiaRoleAcknowledge,
    emitGameError: true,
    handler: mafiaRoleAcknowledge,
  },
  {
    event: 'mafia:narrator',
    actionKey: 'mafiaNarrator',
    rateLimit: RATE_LIMITS.mafiaNarrator,
    validate: validateMafiaNarrator,
    emitGameError: true,
    handler: mafiaNarrator,
  },
  {
    event: 'bara:reveal',
    actionKey: 'baraReveal',
    rateLimit: RATE_LIMITS.baraReveal,
    emitGameError: true,
    handler: baraReveal,
  },
  {
    event: 'bara:ready',
    actionKey: 'baraReady',
    rateLimit: RATE_LIMITS.baraReady,
    emitGameError: true,
    handler: baraReady,
  },
  {
    event: 'bara:interrogation:advance',
    emitGameError: true,
    handler: baraInterrogationAdvance,
  },
  {
    event: 'bara:vote:end',
    actionKey: 'baraVoteEnd',
    rateLimit: RATE_LIMITS.baraVoteEnd,
    emitGameError: true,
    handler: baraVoteEnd,
  },
  {
    event: 'bara:vote',
    actionKey: 'baraVote',
    rateLimit: RATE_LIMITS.baraVote,
    validate: validateBaraVote,
    emitGameError: true,
    handler: baraVote,
  },
  {
    event: 'bara:outcast:free-guess',
    actionKey: 'baraOutcastFreeGuess',
    rateLimit: RATE_LIMITS.baraGuess,
    emitGameError: true,
    handler: baraOutcastFreeGuess,
  },
  {
    event: 'bara:guess',
    actionKey: 'baraGuess',
    rateLimit: RATE_LIMITS.baraGuess,
    validate: validateBaraGuess,
    emitGameError: true,
    handler: baraGuess,
  },
  {
    event: 'sketch-draw:word:select',
    actionKey: 'sketchDrawWordSelect',
    rateLimit: RATE_LIMITS.sketchDrawWordSelect,
    emitGameError: true,
    handler: sketchDrawWordSelect,
  },
  {
    event: 'sketch-draw:canvas:stroke:batch',
    actionKey: 'sketchDrawCanvasBatch',
    rateLimit: RATE_LIMITS.sketchDrawCanvasBatch,
    validate: validatePlainObject,
    emitGameError: true,
    handler: sketchDrawCanvasStrokeBatch,
  },
  {
    event: 'sketch-draw:canvas:undo',
    actionKey: 'sketchDrawCanvasUndo',
    rateLimit: RATE_LIMITS.sketchDrawCanvasUndo,
    emitGameError: true,
    handler: sketchDrawCanvasUndo,
  },
  {
    event: 'sketch-draw:canvas:redo',
    actionKey: 'sketchDrawCanvasRedo',
    rateLimit: RATE_LIMITS.sketchDrawCanvasRedo,
    emitGameError: true,
    handler: sketchDrawCanvasRedo,
  },
  {
    event: 'game:guess:submit',
    actionKey: 'sketchDrawGuessSubmit',
    rateLimit: RATE_LIMITS.sketchDrawGuessSubmit,
    validate: validateSketchGuess,
    handler: handleSketchGuessSubmit,
  },
  {
    event: 'sketch-draw:guess:submit',
    actionKey: 'sketchDrawGuessSubmit',
    rateLimit: RATE_LIMITS.sketchDrawGuessSubmit,
    validate: validateSketchGuess,
    handler: handleSketchGuessSubmit,
  },
  {
    event: 'sketch-draw:canvas:fill',
    actionKey: 'sketchDrawCanvasFill',
    rateLimit: RATE_LIMITS.sketchDrawCanvasFill,
    validate: validatePlainObject,
    emitGameError: true,
    handler: sketchDrawCanvasFill,
  },
  {
    event: 'sketch-draw:canvas:clear',
    actionKey: 'sketchDrawCanvasClear',
    rateLimit: RATE_LIMITS.sketchDrawCanvasClear,
    emitGameError: true,
    handler: sketchDrawCanvasClear,
  },
  {
    event: 'sketch-draw:canvas:recovery:request',
    actionKey: 'sketchDrawCanvasRecovery',
    rateLimit: RATE_LIMITS.sketchDrawCanvasRecovery,
    handler: sketchDrawCanvasRecoveryRequest,
  },
  {
    event: 'sketch-draw:disband',
    handler: sketchDrawDisband,
  },
  {
    event: 'chat:send',
    actionKey: 'chat',
    rateLimit: RATE_LIMITS.chat,
    handler: chatSend,
  },
  {
    event: 'invite:send',
    actionKey: 'inviteSend',
    rateLimit: RATE_LIMITS.inviteSend,
    requiresAuth: true,
    validate: validateInviteSend,
    handler: inviteSend,
  },
  {
    event: 'invite:respond',
    actionKey: 'inviteRespond',
    rateLimit: RATE_LIMITS.inviteRespond,
    requiresAuth: true,
    validate: validateInviteRespond,
    handler: inviteRespond,
  },
];
