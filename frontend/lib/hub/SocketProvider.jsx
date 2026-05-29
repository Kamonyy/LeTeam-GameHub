'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { io } from 'socket.io-client';
import {
  getDisplayName,
  getOrCreatePlayerId,
  getSessionToken,
  setDisplayName,
  setSessionToken,
  clearSessionToken,
  clearPlayerLocalGameDataKeepingIdentity,
} from '@/lib/player';
import { isSameOriginServer, resolveServerUrl } from '@/lib/socket-url';
import { HubLiveProvider } from '@/lib/hub/HubLiveContext';
import { HardResetProvider } from '@/lib/hub/HardResetContext';
import { hubPresenceEqual, lobbyStateEqual } from '@/lib/hub/hub-live';
import { resolveClientIsSpectator } from '@/lib/hub/resolveClientIsSpectator';
import { isGameActive } from '@/lib/hub/games-registry';
import { stripNarratorSecrets } from '@/games/mafia/lib/redactMafiaState';
import { InvitationProvider } from '@/context/InvitationContext';
import { RoomReactionFeedProvider } from '@/lib/engagement/RoomReactionFeedContext';
import { socketDispatchRegistry } from '@/lib/hub/socket/dispatch-registry';
import { GameTimerProvider } from '@/lib/hub/socket/GameTimerContext';
import { SketchCanvasProvider } from '@/lib/hub/socket/SketchCanvasContext';
import { GameStateProvider } from '@/lib/hub/socket/GameStateContext';
import {
  SocketConnectionProvider,
  useSocketConnection,
} from '@/lib/hub/socket/SocketConnectionContext';
import { useGameState } from '@/lib/hub/socket/GameStateContext';
import { useGameTimer } from '@/lib/hub/socket/GameTimerContext';
import { useSketchCanvas } from '@/lib/hub/socket/SketchCanvasContext';

/** @param {import('@/games/wordgame/types').WordGameState | null | undefined} prev */
/** @param {import('@/games/wordgame/types').WordGameState | null | undefined} next */
function mergeWordGameState(prev, next) {
  if (!next || next.gameType !== 'wordgame') return next ?? prev ?? null;
  if (!prev || prev.gameType !== 'wordgame') return next;
  const prevVer = typeof prev.stateVersion === 'number' ? prev.stateVersion : 0;
  const nextVer = typeof next.stateVersion === 'number' ? next.stateVersion : 0;
  // Rematch creates a new engine with stateVersion 0; always accept leaving match_over.
  if (prev.phase === 'match_over' && next.phase !== 'match_over') return next;
  if (nextVer < prevVer) return prev;
  return next;
}

/** @param {import('@/games/mafia/types').MafiaGameState | null | undefined} state */
function sanitizeMafiaClientState(state) {
  if (!state || state.gameType !== 'mafia') return state ?? null;
  return stripNarratorSecrets(state);
}

/** @param {Record<string, unknown>} a */
/** @param {Record<string, unknown>} b */
function shallowObjectEqual(a, b) {
  if (a === b) return true;
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  for (const key of aKeys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

/** @param {import('@/games/mafia/types').MafiaGameState | null | undefined} prev */
/** @param {import('@/games/mafia/types').MafiaGameState | null | undefined} next */
function mergeMafiaGameState(prev, next) {
  if (!next || next.gameType !== 'mafia') return next ?? prev ?? null;
  if (!prev || prev.gameType !== 'mafia') return sanitizeMafiaClientState(next);
  const prevVer = typeof prev.stateVersion === 'number' ? prev.stateVersion : 0;
  const nextVer = typeof next.stateVersion === 'number' ? next.stateVersion : 0;
  if (nextVer < prevVer) return prev;
  const sanitized = sanitizeMafiaClientState(next);
  if (shallowObjectEqual(prev, sanitized)) return prev;
  return sanitized;
}

/** @param {import('@/games/sketch-draw/types').SketchDrawGameState | null | undefined} prev */
/** @param {import('@/games/sketch-draw/types').SketchDrawGameState | null | undefined} next */
function mergeSketchDrawState(prev, next) {
  if (!next || next.gameType !== 'sketch-draw') return next ?? prev ?? null;
  if (!prev || prev.gameType !== 'sketch-draw') return next;
  const prevVer = typeof prev.stateVersion === 'number' ? prev.stateVersion : 0;
  const nextVer = typeof next.stateVersion === 'number' ? next.stateVersion : 0;
  if (prev.phase === 'match_over' && next.phase !== 'match_over') return next;
  if (nextVer < prevVer) return prev;
  return next;
}

function createUnsettledRegistration() {
  return new Promise(() => {});
}

function waitForSocketEvent(socket, event, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error('No socket'));
      return;
    }
    const timer = setTimeout(() => {
      socket.off(event, onEvent);
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeoutMs);
    const onEvent = () => {
      clearTimeout(timer);
      resolve();
    };
    socket.once(event, onEvent);
  });
}

const WORD_ACTION_TIMEOUT_MS = 12000;
const REGISTER_ACK_MS = 12000;
const ROOM_ACTION_ACK_MS = 12000;
/** Max wait for reconnect + register during كموني ساعندي hard reset. */
const HARD_RESET_REGISTER_MS = 2500;

/**
 * @param {import('socket.io-client').Socket | null | undefined} socket
 * @param {string} event
 * @param {unknown} payload
 * @param {number} timeoutMs
 */
function emitWithAck(socket, event, payload, timeoutMs) {
  return new Promise((resolve) => {
    if (!socket?.connected) {
      resolve(null);
      return;
    }
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(null);
    }, timeoutMs);
    socket.emit(event, payload, (res) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(res ?? null);
    });
  });
}

const BENIGN_WORD_GAME_ERRORS = new Set([
  'You already chose a champion',
  'You already submitted a word',
  'Not in champion selection phase',
  'Not in word selection phase',
  'Not in active champion guessing phase',
  'Not in active guessing phase',
]);

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const socketInstRef = useRef(null);
  const playerIdRef = useRef('');
  const registerReadyRef = useRef(createUnsettledRegistration());
  const [connected, setConnected] = useState(false);
  const [playerId, setPlayerId] = useState('');
  const [lobby, setLobby] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [error, setErrorRaw] = useState(null);
  const [transientWarning, setTransientWarning] = useState(null);
  const [hubPresence, setHubPresence] = useState({ total: 0, players: [] });
  const [chatMessages, setChatMessages] = useState([]);
  const [isSpectator, setIsSpectator] = useState(false);
  const [wordGuessedCelebration, setWordGuessedCelebration] = useState(null);
  const [sketchDrawLocalHints, setSketchDrawLocalHints] = useState([]);
  const [sketchDrawRoomAlerts, setSketchDrawRoomAlerts] = useState([]);
  const [sketchDrawGuessFeed, setSketchDrawGuessFeed] = useState([]);
  const [sketchDrawDisbandAt, setSketchDrawDisbandAt] = useState(0);
  const [hardResetInFlight, setHardResetInFlight] = useState(false);
  const [isIdentityHydrated, setIsIdentityHydrated] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [reconnectAssessed, setReconnectAssessed] = useState(false);
  const [reconnectedRoomId, setReconnectedRoomId] = useState(null);
  const [reconnectedAsSpectator, setReconnectedAsSpectator] = useState(false);
  const actionsRef = useRef({});
  const chatChannelRef = useRef(null);
  const wordActionInFlightRef = useRef(false);
  const skipNextConnectRegisterRef = useRef(false);
  const hardResetInFlightRef = useRef(false);
  const leavingRoomRef = useRef(false);
  const roomReactionSubscribersRef = useRef(new Set());

  const setError = useCallback((message) => {
    if (message != null && hardResetInFlightRef.current) return;
    setErrorRaw(message);
  }, []);

  const registerPlayer = useCallback((socket, id, isRetry = false) => {
    return (async () => {
      if (!id) {
        return false;
      }

      try {
        const res = await emitWithAck(
          socket,
          'player:register',
          {
            playerId: id,
            displayName: getDisplayName() || 'Player',
            sessionToken: getSessionToken() || undefined,
          },
          REGISTER_ACK_MS
        );

        if (!res) {
          return false;
        }

        if (
          !isRetry &&
          res.error &&
          (res.error === 'Invalid session token' ||
            res.error === 'Session token required')
        ) {
          clearSessionToken();
          return registerPlayer(socket, id, true);
        }

        if (res.error) {
          setError(res.error);
          setReconnectedRoomId(null);
          setReconnectedAsSpectator(false);
          return false;
        }

        if (res.sessionToken) {
          setSessionToken(res.sessionToken);
        }
        if (res.reconnected && res.roomId) {
          setReconnectedRoomId(res.roomId);
          setReconnectedAsSpectator(!!res.isSpectator);
          setIsSpectator(!!res.isSpectator);
        } else {
          setReconnectedRoomId(null);
          setReconnectedAsSpectator(false);
          if (!res.reconnected) {
            setLobby(null);
            setGameState(null);
            setIsSpectator(false);
          }
        }
        return true;
      } finally {
        setReconnectAssessed(true);
      }
    })();
  }, [setError]);

  const ensureRegistered = useCallback(async () => {
    let ok = await Promise.race([
      registerReadyRef.current,
      new Promise((resolve) => {
        setTimeout(() => resolve(false), REGISTER_ACK_MS);
      }),
    ]);

    if (ok) return true;

    const socket = socketRef.current;
    if (!socket?.connected) return false;

    ok = await registerPlayer(socket, playerIdRef.current);
    registerReadyRef.current = Promise.resolve(ok);
    return ok;
  }, [registerPlayer]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = getOrCreatePlayerId();
    if (!id) return;
    playerIdRef.current = id;
    setPlayerId(id);
    setIsIdentityHydrated(true);
  }, []);

  useEffect(() => {
    if (!isIdentityHydrated || !playerId) return;

    let cancelled = false;
    let socket = null;

    (async () => {
      const serverUrl = await resolveServerUrl();
      if (cancelled) return;

      socket = io(serverUrl, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        transports: isSameOriginServer(serverUrl)
          ? ['websocket']
          : ['websocket', 'polling'],
      });

      socketRef.current = socket;
      socketInstRef.current = socket;

      socket.on('connect', () => {
        setConnected(true);
        if (skipNextConnectRegisterRef.current) {
          skipNextConnectRegisterRef.current = false;
          return;
        }
        const id = playerIdRef.current;
        if (!id) return;

        setSessionReady(false);
        setReconnectAssessed(false);
        registerReadyRef.current = registerPlayer(socket, id).then((ok) => {
          setSessionReady(true);
          if (ok) socket.emit('hub:presence:request', {});
          return ok;
        });
      });

      socket.on('disconnect', () => {
        setConnected(false);
        setSessionReady(false);
        setReconnectAssessed(false);
        setReconnectedRoomId(null);
        setReconnectedAsSpectator(false);
        registerReadyRef.current = createUnsettledRegistration();
        wordActionInFlightRef.current = false;
      });
      socket.on('connect_error', () => setConnected(false));
      socket.on('hub:presence', (payload) => {
        if (!Array.isArray(payload?.players)) return;
        setHubPresence((prev) =>
          hubPresenceEqual(prev, payload) ? prev : payload
        );
      });
      socket.on('lobby:state', (state) => {
        if (leavingRoomRef.current) return;
        setLobby((prev) => {
          if (lobbyStateEqual(prev, state)) return prev;
          if (state?.status === 'lobby') {
            setGameState(null);
            setWordGuessedCelebration(null);
          }
          const nextSpectator = resolveClientIsSpectator(
            state,
            playerIdRef.current
          );
          setIsSpectator((was) => (was === nextSpectator ? was : nextSpectator));
          return state;
        });
      });
      socket.on('game:state:update', (state) => {
        if (leavingRoomRef.current) return;
        if (state?.gameType === 'wordgame') {
          setGameState((prev) => mergeWordGameState(prev, state));
          return;
        }
        if (state?.gameType === 'bara-alsalafa') {
          setGameState(state);
          return;
        }
        if (state?.gameType === 'mafia') {
          setGameState((prev) => mergeMafiaGameState(prev, state));
          return;
        }
        if (state?.gameType === 'sketch-draw') {
          setGameState((prev) => mergeSketchDrawState(prev, state));
          return;
        }
        if (state && 'board' in state) {
          setGameState(state);
        }
      });
      socket.on('reconnect:sync', (payload) => {
        if (leavingRoomRef.current) return;
        setLobby((prev) => (lobbyStateEqual(prev, payload) ? prev : payload));
        setIsSpectator(
          resolveClientIsSpectator(payload, playerIdRef.current)
        );
        if (payload?.status === 'lobby') {
          setGameState(null);
          setWordGuessedCelebration(null);
        }
        // game:state:update follows for playing / finished Secret Word matches
      });
      socket.on('game:cancelled', () => {
        setGameState(null);
        setWordGuessedCelebration(null);
      });
      socket.on('room:disband', (payload) => {
        setLobby(null);
        setGameState(null);
        setWordGuessedCelebration(null);
        socketDispatchRegistry.setGameTimerTick?.(null);
        socketDispatchRegistry.clearSketchStreams?.();
        if (payload?.message) setError(payload.message);
      });
      socket.on('word:guessed:celebration', (payload) => {
        if (!payload || typeof payload !== 'object') return;
        setWordGuessedCelebration({
          wordCategory: payload.wordCategory ?? 'custom',
          championId: payload.championId ?? null,
          stateVersion:
            typeof payload.stateVersion === 'number' ? payload.stateVersion : null,
          at: Date.now(),
        });
      });
      socket.on('word:focus:update', (payload) => {
        if (!Array.isArray(payload?.players)) return;
        const focusById = new Map(
          payload.players.map((p) => [p.id, p.tabFocused !== false])
        );
        setLobby((prev) => {
          if (!prev || prev.gameType !== 'wordgame') return prev;
          let changed = false;
          const players = prev.players.map((p) => {
            if (!focusById.has(p.id)) return p;
            const tabFocused = focusById.get(p.id);
            if ((p.tabFocused !== false) === tabFocused) return p;
            changed = true;
            return { ...p, tabFocused };
          });
          if (!changed) return prev;
          const next = { ...prev, players };
          return lobbyStateEqual(prev, next) ? prev : next;
        });
      });
      socket.on('word:scratchpad:update', (payload) => {
        if (!payload?.roomId || !payload?.playerId) return;
        const notes = Array.isArray(payload.notes) ? payload.notes : [];
        setGameState((prev) => {
          if (!prev || prev.gameType !== 'wordgame' || !prev.isSpectator) return prev;
          if (prev.roomId && prev.roomId !== payload.roomId) return prev;
          if (
            typeof payload.roundNumber === 'number' &&
            payload.roundNumber !== prev.roundNumber
          ) {
            return prev;
          }
          return {
            ...prev,
            scratchpadsByPlayer: {
              ...(prev.scratchpadsByPlayer ?? {}),
              [payload.playerId]: notes,
            },
          };
        });
      });
      socket.on('word:scratchpad:reset', (payload) => {
        if (!payload?.roomId) return;
        setGameState((prev) => {
          if (!prev || prev.gameType !== 'wordgame' || !prev.isSpectator) return prev;
          if (prev.roomId && prev.roomId !== payload.roomId) return prev;
          if (
            typeof payload.roundNumber === 'number' &&
            payload.roundNumber !== prev.roundNumber
          ) {
            return prev;
          }
          const empty = Object.fromEntries(
            (prev.playerIds ?? []).map((id) => [id, []])
          );
          return { ...prev, scratchpadsByPlayer: empty };
        });
      });
      socket.on('room:kicked', (payload) => {
        setLobby(null);
        setGameState(null);
        setWordGuessedCelebration(null);
        setIsSpectator(false);
        setError(payload?.message || 'You were removed from the room');
      });
      socket.on('protocol:error', (payload) => {
        if (!payload || typeof payload !== 'object') return;
        if (payload.code === 'SESSION_INVALID') {
          registerPlayer(socket, playerIdRef.current).then((ok) => {
            if (!ok) setError(payload.message || 'Session expired');
          });
          return;
        }
        if (payload.code === 'RATE_LIMIT') {
          const msg = payload.message || 'Too many requests, slow down';
          setTransientWarning(msg);
          window.setTimeout(() => {
            setTransientWarning((prev) => (prev === msg ? null : prev));
          }, 4000);
          return;
        }
        if (payload.code === 'VALIDATION') return;
        if (payload.message) setError(payload.message);
      });
      socket.on('game:error', (err) => {
        const message =
          typeof err === 'string' ? err
          : err?.message ? err.message
          : 'Unknown game error';
        setError(message);
      });
      socket.on('chat:message', (msg) => {
        if (!msg?.message || !msg?.playerId) return;
        setChatMessages((prev) => {
          const next = [...prev, msg];
          return next.length > 200 ? next.slice(-200) : next;
        });
      });
      socket.on('room:reaction:broadcast', (payload) => {
        if (!payload?.roomId || !payload?.reactionId || !payload?.senderId) return;
        for (const listener of roomReactionSubscribersRef.current) {
          try {
            listener(payload);
          } catch {
            /* ignore subscriber errors */
          }
        }
      });
      socket.on('sketch-draw:guess:close', (payload) => {
        if (!payload) return;
        setSketchDrawLocalHints((prev) => [
          ...prev.slice(-20),
          {
            id: `close-${Date.now()}`,
            messageAr: payload.messageAr ?? 'أنت قريب من الكلمة!',
            messageEn: payload.messageEn ?? 'You are close to the word!',
            at: Date.now(),
          },
        ]);
      });
      socket.on('sketch-draw:guess:correct', (payload) => {
        if (!payload?.message) return;
        setSketchDrawRoomAlerts((prev) => [
          ...prev.slice(-30),
          {
            id: `correct-${payload.playerId}-${Date.now()}`,
            message: payload.message,
            kind: 'correct',
            at: Date.now(),
          },
        ]);
      });
      socket.on('sketch-draw:guess:wrong', (payload) => {
        if (!payload?.playerId || payload.text == null) return;
        setSketchDrawGuessFeed((prev) => [
          ...prev.slice(-80),
          {
            id: `wrong-${payload.playerId}-${Date.now()}`,
            playerId: payload.playerId,
            displayName: payload.displayName ?? 'Player',
            text: payload.text ?? '',
            at: Date.now(),
          },
        ]);
      });
      socket.on('game:time:tick', (payload) => {
        if (!payload || payload.gameType !== 'sketch-draw') return;
        socketDispatchRegistry.setGameTimerTick?.({
          roomId: payload.roomId,
          phase: payload.phase,
          remainingMs: payload.remainingMs ?? 0,
          phaseEndsAt: payload.phaseEndsAt ?? null,
          stateVersion: payload.stateVersion ?? 0,
          at: Date.now(),
        });
      });
      socket.on('sketch-draw:canvas:stroke:batch', (payload) => {
        if (!payload?.batch) return;
        socketDispatchRegistry.setSketchRemoteBatch?.({
          ...payload.batch,
          _at: Date.now(),
        });
      });
      socket.on('sketch-draw:canvas:sync', (payload) => {
        if (!Array.isArray(payload?.canvasBuffer)) return;
        socketDispatchRegistry.setSketchCanvasSync?.({
          canvasBuffer: payload.canvasBuffer,
          canvasBufferVersion: payload.canvasBufferVersion ?? 0,
          at: Date.now(),
        });
      });
      socket.on('sketch-draw:disband', (payload) => {
        setSketchDrawLocalHints([]);
        setSketchDrawRoomAlerts([]);
        setSketchDrawGuessFeed([]);
        socketDispatchRegistry.setGameTimerTick?.(null);
        socketDispatchRegistry.clearSketchStreams?.();
        setLobby(null);
        setGameState(null);
        setSketchDrawDisbandAt(Date.now());
        if (payload?.message) setError(payload.message);
      });
    })();

    return () => {
      cancelled = true;
      const s = socketInstRef.current;
      if (s) {
        s.removeAllListeners();
        s.disconnect();
      }
      socketInstRef.current = null;
      socketRef.current = null;
    };
  }, [isIdentityHydrated, playerId, registerPlayer]);

  const requestHubPresenceRefresh = useCallback(() => {
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('hub:presence:request', {});
    }
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        requestHubPresenceRefresh();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [requestHubPresenceRefresh]);

  useEffect(() => {
    const channel = lobby?.roomId ?? null;
    if (chatChannelRef.current === channel) return;
    chatChannelRef.current = channel;
    setChatMessages([]);
  }, [lobby?.roomId]);

  const clearError = useCallback(() => setError(null), []);

  const refreshDisplayName = useCallback((name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setDisplayName(trimmed);
    const socket = socketRef.current;
    if (!socket?.connected || !playerIdRef.current) return;
    socket.emit('player:updateDisplayName', { displayName: trimmed }, (res) => {
      if (res?.error) setError(res.error);
    });
  }, []);

  const createRoom = useCallback(
    async (displayName, gameType = 'wordgame') => {
      const registered = await ensureRegistered();
      if (!registered) {
        setError('Could not register with server. Check your connection.');
        return null;
      }

      const socket = socketRef.current;
      if (!socket?.connected) {
        setError('Not connected to server');
        return null;
      }
      if (!isGameActive(gameType)) {
        setError('This game is temporarily unavailable');
        return null;
      }

      const attempt = async (didLeave) => {
        const res = await emitWithAck(
          socket,
          'room:create',
          { displayName, gameType },
          ROOM_ACTION_ACK_MS
        );

        if (!res) {
          setError('Server did not respond. Try again.');
          return null;
        }

        if (res.error === 'Already in a room' && !didLeave) {
          await emitWithAck(
            socket,
            'room:leave',
            { force: true, playerId: playerIdRef.current },
            ROOM_ACTION_ACK_MS
          );
          setLobby(null);
          setGameState(null);
          setIsSpectator(false);
          return attempt(true);
        }

        if (res.error) {
          setError(res.error);
          return null;
        }

        return res.roomId ?? null;
      };

      return attempt(false);
    },
    [ensureRegistered, setError]
  );

  const joinRoom = useCallback(
    async (roomId, displayName, options = {}) => {
      const { spectate = false } = options;
      const registered = await ensureRegistered();
      if (!registered) {
        setError('Could not register with server. Check your connection.');
        return false;
      }

      const socket = socketRef.current;
      if (!socket?.connected) {
        setError('Not connected to server');
        return false;
      }

      const payload = {
        roomId: roomId.toUpperCase(),
        displayName,
        ...(spectate ? { spectate: true } : {}),
      };
      const event = spectate ? 'room:spectate' : 'room:join';
      const res = await emitWithAck(socket, event, payload, ROOM_ACTION_ACK_MS);

      if (hardResetInFlightRef.current) {
        return false;
      }
      if (!res) {
        setError('Server did not respond. Try again.');
        return false;
      }
      if (res.error) {
        setError(res.error);
        return false;
      }

      setIsSpectator(spectate ? true : !!res.isSpectator);
      return true;
    },
    [ensureRegistered, setError]
  );

  const spectateRoom = useCallback((roomId, displayName) => {
    return joinRoom(roomId, displayName, { spectate: true });
  }, [joinRoom]);

  /**
   * Join as player, or spectate only when explicitly requested (options / ?spectate=1).
   * Never auto-demotes a failed join to spectator (prevents refresh races).
   */
  const joinRoomOrSpectate = useCallback(
    (roomId, displayName, options = {}) => {
      const { spectate: explicitSpectate = false } = options;
      const wantsSpectate =
        explicitSpectate ||
        (typeof window !== 'undefined' &&
          (window.location.search.includes('spectate=1') ||
            window.location.search.includes('spectate=true')));

      return new Promise((resolve) => {
        const socket = socketRef.current;
        if (!socket?.connected) {
          resolve({ ok: false, spectating: false });
          return;
        }
        const code = roomId.toUpperCase();

        if (wantsSpectate) {
          socket.emit('room:spectate', { roomId: code, displayName }, (specRes) => {
            if (hardResetInFlightRef.current) {
              resolve({ ok: false, spectating: false });
              return;
            }
            if (specRes?.error) {
              setError(specRes.error);
              resolve({ ok: false, spectating: false });
              return;
            }
            setIsSpectator(true);
            resolve({ ok: true, spectating: true });
          });
          return;
        }

        socket.emit('room:join', { roomId: code, displayName }, (res) => {
          if (hardResetInFlightRef.current) {
            resolve({ ok: false, spectating: false });
            return;
          }
          if (!res?.error) {
            setIsSpectator(false);
            resolve({ ok: true, spectating: false });
            return;
          }
          setError(res.error);
          resolve({ ok: false, spectating: false });
        });
      });
    },
    [setError]
  );

  const clearSketchDrawSession = useCallback(() => {
    setSketchDrawLocalHints([]);
    setSketchDrawRoomAlerts([]);
    setSketchDrawGuessFeed([]);
    setSketchDrawDisbandAt(0);
    socketDispatchRegistry.setGameTimerTick?.(null);
    socketDispatchRegistry.clearSketchStreams?.();
  }, []);

  const leaveRoom = useCallback(() => {
    const clearLocalRoomState = () => {
      setLobby(null);
      setGameState(null);
      setWordGuessedCelebration(null);
      setIsSpectator(false);
      clearSketchDrawSession();
    };

    return (async () => {
      leavingRoomRef.current = true;
      try {
        await ensureRegistered();
        const socket = socketRef.current;
        const id = playerIdRef.current;
        if (!socket?.connected) {
          clearLocalRoomState();
          return;
        }

        await new Promise((resolve) => {
          const timer = setTimeout(() => {
            clearLocalRoomState();
            resolve();
          }, 4000);

          socket.emit(
            'room:leave',
            { force: true, playerId: id },
            (res) => {
              clearTimeout(timer);
              if (res?.error) {
                setError(res.error);
              }
              clearLocalRoomState();
              resolve();
            }
          );
        });
      } finally {
        leavingRoomRef.current = false;
      }
    })();
  }, [clearSketchDrawSession, ensureRegistered, setError]);

  const clearClientSessionState = useCallback(() => {
    setLobby(null);
    setGameState(null);
    setChatMessages([]);
    setError(null);
    setWordGuessedCelebration(null);
    setIsSpectator(false);
    wordActionInFlightRef.current = false;
    chatChannelRef.current = null;
    clearSketchDrawSession();
  }, [clearSketchDrawSession]);

  const hardResetPlayer = useCallback(async () => {
    hardResetInFlightRef.current = true;
    setHardResetInFlight(true);

    const socket = socketRef.current;
    const id = playerIdRef.current || getOrCreatePlayerId();

    try {
      clearClientSessionState();
      clearPlayerLocalGameDataKeepingIdentity();

      if (socket?.connected) {
        await Promise.race([
          new Promise((resolve) => {
            socket.emit('room:leave', { force: true }, () => resolve());
          }),
          new Promise((resolve) => {
            setTimeout(resolve, 1200);
          }),
        ]);
      }

      if (!socket) {
        registerReadyRef.current = Promise.resolve(false);
        return;
      }

      skipNextConnectRegisterRef.current = true;

      const registerSameIdentity = () =>
        Promise.race([
          registerPlayer(socket, id).then((ok) => {
            if (ok && socket.connected) {
              socket.emit('hub:presence:request', {});
            }
            return ok;
          }),
          new Promise((resolve) => {
            setTimeout(() => resolve(false), HARD_RESET_REGISTER_MS);
          }),
        ]);

      registerReadyRef.current = registerSameIdentity();

      if (!socket.connected) {
        socket.connect();
        await Promise.race([
          waitForSocketEvent(socket, 'connect', HARD_RESET_REGISTER_MS),
          new Promise((resolve) => {
            setTimeout(resolve, HARD_RESET_REGISTER_MS);
          }),
        ]).catch(() => {});
      }

      await registerReadyRef.current;
    } finally {
      skipNextConnectRegisterRef.current = false;
      hardResetInFlightRef.current = false;
      setHardResetInFlight(false);
      setError(null);
    }
  }, [registerPlayer, clearClientSessionState, setError]);

  const updateRoomSettings = useCallback((settings) => {
    return new Promise((resolve) => {
      socketRef.current?.emit('room:settings:update', settings, (res) => {
        if (res?.error) {
          setError(res.error);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }, []);

  const startGame = useCallback(() => {
    return new Promise((resolve) => {
      socketRef.current?.emit('game:start', {}, (res) => {
        if (res?.error) {
          setError(res.error);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }, []);

  const kickPlayer = useCallback((targetPlayerId) => {
    return new Promise((resolve) => {
      socketRef.current?.emit('room:kick', { targetPlayerId }, (res) => {
        if (res?.error) {
          setError(res.error);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }, []);

  const cancelMatch = useCallback(() => {
    return new Promise((resolve) => {
      socketRef.current?.emit('game:cancel', {}, (res) => {
        if (res?.error) {
          setError(res.error);
          resolve(false);
        } else {
          setGameState(null);
          resolve(true);
        }
      });
    });
  }, []);

  const disbandRoom = useCallback(() => {
    return new Promise((resolve) => {
      socketRef.current?.emit('room:disband', {}, (res) => {
        if (res?.error) {
          setError(res.error);
          resolve(false);
        } else {
          setLobby(null);
          setGameState(null);
          resolve(true);
        }
      });
    });
  }, []);

  const playMove = useCallback((tile, end) => {
    socketRef.current?.emit('game:move:request', { tile, end });
  }, []);

  const drawTile = useCallback(() => {
    socketRef.current?.emit('game:draw:request', {});
  }, []);

  const passTurn = useCallback(() => {
    socketRef.current?.emit('game:pass:request', {});
  }, []);

  const continueRound = useCallback(() => {
    return new Promise((resolve) => {
      socketRef.current?.emit('game:round:continue', {}, (res) => {
        if (res?.error) {
          setError(res.error);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }, []);

  const requestGameStateSync = useCallback(() => {
    return new Promise((resolve) => {
      const socket = socketRef.current;
      if (!socket?.connected) {
        resolve(null);
        return;
      }
      socket.emit('game:state:request', {}, (res) => {
        if (res?.state) {
          setGameState((prev) => {
            if (res.state.gameType === 'wordgame') {
              return mergeWordGameState(prev, res.state);
            }
            if (res.state.gameType === 'mafia') {
              return mergeMafiaGameState(prev, res.state);
            }
            return res.state;
          });
          resolve(res.state);
        } else {
          resolve(null);
        }
      });
    });
  }, []);

  const requestRematch = useCallback(() => {
    return new Promise((resolve) => {
      const socket = socketRef.current;
      if (!socket?.connected) {
        setError('Not connected to server');
        resolve(false);
        return;
      }
      socket.emit('game:rematch:request', {}, async (res) => {
        if (res?.error) {
          setError(res.error);
          resolve(false);
          return;
        }
        await requestGameStateSync();
        resolve(true);
      });
    });
  }, [requestGameStateSync]);

  const finishWordSubmitAck = useCallback(
    async (res, resolve) => {
      if (res?.state) {
        setGameState((prev) => mergeWordGameState(prev, res.state));
      }
      if (!res?.error) {
        resolve(true);
        return;
      }

      const synced = await requestGameStateSync();
      if (synced?.gameType === 'wordgame' && synced.iHaveSubmitted) {
        resolve(true);
        return;
      }

      if (!BENIGN_WORD_GAME_ERRORS.has(res.error)) {
        setError(res.error);
      }
      resolve(false);
    },
    [requestGameStateSync]
  );

  const finishWordGuessedAck = useCallback(
    async (res, resolve) => {
      if (res?.state) {
        setGameState((prev) => mergeWordGameState(prev, res.state));
      }
      if (!res?.error) {
        resolve(true);
        return;
      }

      const synced = await requestGameStateSync();
      if (
        synced?.gameType === 'wordgame' &&
        (synced.phase === 'round_end' || synced.phase === 'match_over')
      ) {
        resolve(true);
        return;
      }

      if (!BENIGN_WORD_GAME_ERRORS.has(res.error)) {
        setError(res.error);
      }
      resolve(false);
    },
    [requestGameStateSync]
  );

  const submitSecretWord = useCallback((word) => {
    return new Promise((resolve) => {
      (async () => {
        if (wordActionInFlightRef.current) {
          resolve(false);
          return;
        }
        await ensureRegistered();
        const socket = socketRef.current;
        if (!socket?.connected) {
          resolve(false);
          return;
        }
        wordActionInFlightRef.current = true;
        const release = () => {
          wordActionInFlightRef.current = false;
        };
        const timer = setTimeout(release, WORD_ACTION_TIMEOUT_MS);
        socket.emit('word:submit', { word }, (res) => {
          clearTimeout(timer);
          void finishWordSubmitAck(res, resolve).finally(release);
        });
      })();
    });
  }, [ensureRegistered, finishWordSubmitAck]);

  const submitSecretChampion = useCallback((championId) => {
    return new Promise((resolve) => {
      (async () => {
        if (wordActionInFlightRef.current) {
          resolve(false);
          return;
        }
        await ensureRegistered();
        const socket = socketRef.current;
        if (!socket?.connected) {
          resolve(false);
          return;
        }
        wordActionInFlightRef.current = true;
        const release = () => {
          wordActionInFlightRef.current = false;
        };
        const timer = setTimeout(release, WORD_ACTION_TIMEOUT_MS);
        socket.emit('word:champion:submit', { championId }, (res) => {
          clearTimeout(timer);
          void finishWordSubmitAck(res, resolve).finally(release);
        });
      })();
    });
  }, [ensureRegistered, finishWordSubmitAck]);

  const sendChat = useCallback((message) => {
    const trimmed = typeof message === 'string' ? message.trim() : '';
    if (!trimmed || trimmed.length > 200) return;
    (async () => {
      await ensureRegistered();
      const socket = socketRef.current;
      if (!socket?.connected) return;
      socket.emit('chat:send', { message: trimmed }, (res) => {
        if (res?.error) setError(res.error);
      });
    })();
  }, [ensureRegistered]);

  const subscribeRoomReactions = useCallback((listener) => {
    roomReactionSubscribersRef.current.add(listener);
    return () => {
      roomReactionSubscribersRef.current.delete(listener);
    };
  }, []);

  const sendRoomReaction = useCallback(
    (roomId, reactionId, type) => {
      if (!roomId || typeof reactionId !== 'string' || !reactionId) return;
      if (type !== 'emoji' && type !== 'sound') return;
      (async () => {
        await ensureRegistered();
        const socket = socketRef.current;
        if (!socket?.connected) return;
        socket.emit('room:reaction', { reactionId, type }, (res) => {
          if (res?.error) setError(res.error);
        });
      })();
    },
    [ensureRegistered, setError],
  );

  const confirmWordGuessed = useCallback(() => {
    return new Promise((resolve) => {
      (async () => {
        if (wordActionInFlightRef.current) {
          resolve(false);
          return;
        }
        await ensureRegistered();
        const socket = socketRef.current;
        if (!socket?.connected) {
          resolve(false);
          return;
        }
        wordActionInFlightRef.current = true;
        const release = () => {
          wordActionInFlightRef.current = false;
        };
        const timer = setTimeout(release, WORD_ACTION_TIMEOUT_MS);
        socket.emit('word:guessed', {}, (res) => {
          clearTimeout(timer);
          void finishWordGuessedAck(res, resolve).finally(release);
        });
      })();
    });
  }, [ensureRegistered, finishWordGuessedAck]);

  const reportWordTabFocus = useCallback((focused) => {
    const socket = socketRef.current;
    if (!socket?.connected || typeof focused !== 'boolean') return;
    socket.emit('word:focus:report', { focused }, () => {});
  }, []);

  const syncWordScratchpad = useCallback((roundNumber, notes) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    if (!Number.isInteger(roundNumber) || roundNumber < 1) return;
    if (!Array.isArray(notes)) return;
    socket.emit(
      'word:scratchpad:sync',
      { roundNumber, notes },
      () => {}
    );
  }, []);

  const baraReveal = useCallback(() => {
    return new Promise((resolve) => {
      (async () => {
        await ensureRegistered();
        const socket = socketRef.current;
        if (!socket?.connected) {
          resolve(false);
          return;
        }
        socket.emit('bara:reveal', {}, (res) => {
          if (res?.error) {
            setError(res.error);
            resolve(false);
          } else {
            if (res?.state) setGameState(res.state);
            resolve(true);
          }
        });
      })();
    });
  }, [ensureRegistered]);

  const baraReady = useCallback(() => {
    return new Promise((resolve) => {
      (async () => {
        await ensureRegistered();
        const socket = socketRef.current;
        if (!socket?.connected) {
          resolve(false);
          return;
        }
        socket.emit('bara:ready', {}, (res) => {
          if (res?.error) {
            setError(res.error);
            resolve(false);
          } else {
            if (res?.state) setGameState(res.state);
            resolve(true);
          }
        });
      })();
    });
  }, [ensureRegistered]);

  const baraAdvanceInterrogation = useCallback(() => {
    return new Promise((resolve) => {
      (async () => {
        await ensureRegistered();
        const socket = socketRef.current;
        if (!socket?.connected) {
          resolve(false);
          return;
        }
        socket.emit('bara:interrogation:advance', {}, (res) => {
          if (res?.error) {
            setError(res.error);
            resolve(false);
          } else {
            resolve(true);
          }
        });
      })();
    });
  }, [ensureRegistered]);

  const baraRequestVoteEnd = useCallback(() => {
    return new Promise((resolve) => {
      (async () => {
        await ensureRegistered();
        const socket = socketRef.current;
        if (!socket?.connected) {
          resolve(false);
          return;
        }
        socket.emit('bara:vote:end', {}, (res) => {
          if (res?.error) {
            setError(res.error);
            resolve(false);
          } else {
            if (res?.state) setGameState(res.state);
            resolve(true);
          }
        });
      })();
    });
  }, [ensureRegistered]);

  const baraVote = useCallback((targetPlayerId) => {
    return new Promise((resolve) => {
      (async () => {
        await ensureRegistered();
        const socket = socketRef.current;
        if (!socket?.connected) {
          resolve(false);
          return;
        }
        socket.emit('bara:vote', { targetPlayerId }, (res) => {
          if (res?.error) {
            setError(res.error);
            resolve(false);
          } else {
            if (res?.state) setGameState(res.state);
            resolve(true);
          }
        });
      })();
    });
  }, [ensureRegistered]);

  const addDevBots = useCallback((count) => {
    return new Promise((resolve) => {
      (async () => {
        await ensureRegistered();
        const socket = socketRef.current;
        if (!socket?.connected) {
          resolve({ ok: false, error: 'Not connected' });
          return;
        }
        socket.emit('room:dev:add-bots', { count }, (res) => {
          if (res?.error) {
            setError(res.error);
            resolve({ ok: false, error: res.error });
          } else {
            resolve({ ok: true, added: res.added ?? 0 });
          }
        });
      })();
    });
  }, [ensureRegistered]);

  const removeDevBots = useCallback(() => {
    return new Promise((resolve) => {
      (async () => {
        await ensureRegistered();
        const socket = socketRef.current;
        if (!socket?.connected) {
          resolve({ ok: false, error: 'Not connected' });
          return;
        }
        socket.emit('room:dev:remove-bots', {}, (res) => {
          if (res?.error) {
            setError(res.error);
            resolve({ ok: false, error: res.error });
          } else {
            resolve({ ok: true, removed: res.removed ?? 0 });
          }
        });
      })();
    });
  }, [ensureRegistered]);

  const mafiaAcknowledgeRole = useCallback(() => {
    return new Promise((resolve) => {
      (async () => {
        await ensureRegistered();
        const socket = socketRef.current;
        if (!socket?.connected) {
          resolve(false);
          return;
        }
        socket.emit('mafia:role:acknowledge', {}, (res) => {
          if (res?.error) {
            setError(res.error);
            resolve(false);
          } else {
            if (res?.state) {
              setGameState((prev) => mergeMafiaGameState(prev, res.state));
            }
            resolve(true);
          }
        });
      })();
    });
  }, [ensureRegistered]);

  const mafiaNarratorAction = useCallback((action, targetPlayerId = null) => {
    return new Promise((resolve) => {
      (async () => {
        await ensureRegistered();
        const socket = socketRef.current;
        if (!socket?.connected) {
          resolve(false);
          return;
        }
        socket.emit(
          'mafia:narrator',
          { action, targetPlayerId },
          (res) => {
            if (res?.error) {
              setError(res.error);
              resolve(false);
            } else {
              if (res?.state) {
                setGameState((prev) => mergeMafiaGameState(prev, res.state));
              }
              resolve(true);
            }
          }
        );
      })();
    });
  }, [ensureRegistered]);

  const sketchDrawSelectWord = useCallback((index) => {
    return new Promise((resolve) => {
      (async () => {
        await ensureRegistered();
        const socket = socketRef.current;
        if (!socket?.connected) {
          resolve(false);
          return;
        }
        socket.emit('sketch-draw:word:select', { index }, (res) => {
          if (res?.error) {
            setError(res.error);
            resolve(false);
          } else {
            resolve(true);
          }
        });
      })();
    });
  }, [ensureRegistered]);

  const sketchDrawDisbandRoom = useCallback(() => {
    return new Promise((resolve) => {
      const socket = socketRef.current;
      if (!socket?.connected) {
        resolve(false);
        return;
      }
      socket.emit('sketch-draw:disband', {}, (res) => {
        if (res?.error) {
          setError(res.error);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }, []);

  const sketchDrawSubmitGuess = useCallback((guess) => {
    return new Promise((resolve) => {
      (async () => {
        await ensureRegistered();
        const socket = socketRef.current;
        if (!socket?.connected) {
          resolve({ ok: false, outcome: 'error' });
          return;
        }
        socket.emit('game:guess:submit', { text: guess, guess }, (res) => {
          if (res?.error) {
            setError(res.error);
            resolve({ ok: false, outcome: 'error', error: res.error });
            return;
          }
          resolve({ ok: true, outcome: res.outcome ?? 'ok' });
        });
      })();
    });
  }, [ensureRegistered]);

  const clearSketchDrawLocalHints = useCallback(() => {
    setSketchDrawLocalHints([]);
  }, []);

  const baraGuess = useCallback((guess) => {
    return new Promise((resolve) => {
      (async () => {
        await ensureRegistered();
        const socket = socketRef.current;
        if (!socket?.connected) {
          resolve(false);
          return;
        }
        socket.emit('bara:guess', { guess }, (res) => {
          if (res?.error) {
            setError(res.error);
            resolve(false);
          } else {
            if (res?.state) setGameState(res.state);
            resolve(true);
          }
        });
      })();
    });
  }, [ensureRegistered]);

  const baraOutcastFreeGuess = useCallback(() => {
    return new Promise((resolve) => {
      (async () => {
        await ensureRegistered();
        const socket = socketRef.current;
        if (!socket?.connected) {
          resolve(false);
          return;
        }
        socket.emit('bara:outcast:free-guess', {}, (res) => {
          if (res?.error) {
            setError(res.error);
            resolve(false);
          } else {
            if (res?.state) setGameState(res.state);
            resolve(true);
          }
        });
      })();
    });
  }, [ensureRegistered]);

  const registerSocketListener = useCallback((event, handler) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [connected]);

  const emitInviteSend = useCallback(
    (payload) =>
      new Promise((resolve) => {
        const socket = socketRef.current;
        if (!socket?.connected) {
          resolve({ error: 'Not connected' });
          return;
        }
        socket.emit('invite:send', payload, (res) => {
          resolve(res ?? {});
        });
      }),
    []
  );

  const emitInviteRespond = useCallback(
    (payload) =>
      new Promise((resolve) => {
        const socket = socketRef.current;
        if (!socket?.connected) {
          resolve({ error: 'Not connected' });
          return;
        }
        socket.emit('invite:respond', payload, (res) => {
          resolve(res ?? {});
        });
      }),
    []
  );

  const joinLobbyByTargetPlayer = useCallback(
    async (targetPlayerId) => {
      const registered = await ensureRegistered();
      if (!registered) {
        setError('Could not register with server. Check your connection.');
        return { error: 'Not registered' };
      }

      const socket = socketRef.current;
      if (!socket?.connected) {
        setError('Not connected to server');
        return { error: 'Not connected' };
      }

      const sessionToken = getSessionToken();
      if (!sessionToken) {
        setError('Session required');
        return { error: 'Session required' };
      }

      const res = await emitWithAck(
        socket,
        'room:join_by_target_player',
        {
          targetPlayerId,
          playerId: playerIdRef.current,
          sessionToken,
        },
        ROOM_ACTION_ACK_MS
      );

      if (hardResetInFlightRef.current) {
        return { error: 'Unavailable' };
      }
      if (!res) {
        setError('Server did not respond. Try again.');
        return { error: 'Server did not respond' };
      }
      if (res.error) {
        setError(res.error);
        return { error: res.error };
      }

      setIsSpectator(false);
      return {
        roomId: res.roomId,
        gameType: res.gameType,
      };
    },
    [ensureRegistered, setError]
  );

  actionsRef.current = {
    clearError,
    refreshDisplayName,
    createRoom,
    joinRoom,
    spectateRoom,
    joinRoomOrSpectate,
    leaveRoom,
    hardResetPlayer,
    updateRoomSettings,
    startGame,
    kickPlayer,
    cancelMatch,
    disbandRoom,
    playMove,
    drawTile,
    passTurn,
    continueRound,
    requestRematch,
    submitSecretWord,
    submitSecretChampion,
    confirmWordGuessed,
    reportWordTabFocus,
    syncWordScratchpad,
    baraReveal,
    baraReady,
    baraAdvanceInterrogation,
    baraRequestVoteEnd,
    baraVote,
    baraGuess,
    baraOutcastFreeGuess,
    sketchDrawSelectWord,
    sketchDrawSubmitGuess,
    sketchDrawDisbandRoom,
    mafiaAcknowledgeRole,
    mafiaNarratorAction,
    addDevBots,
    removeDevBots,
    registerSocketListener,
    emitInviteSend,
    emitInviteRespond,
    joinLobbyByTargetPlayer,
    sendChat,
    sendRoomReaction,
  };

  const connectionValue = useMemo(
    () => ({
      socketRef,
      actionsRef,
      connected,
      playerId,
      error,
      transientWarning,
      hardResetInFlight,
      isIdentityHydrated,
      sessionReady,
      reconnectAssessed,
      reconnectedRoomId,
      reconnectedAsSpectator,
    }),
    [
      connected,
      playerId,
      error,
      transientWarning,
      hardResetInFlight,
      isIdentityHydrated,
      sessionReady,
      reconnectAssessed,
      reconnectedRoomId,
      reconnectedAsSpectator,
    ]
  );

  const gameStateValue = useMemo(
    () => ({
      lobby,
      gameState,
      isSpectator,
      hubPresence,
      chatMessages,
      sketchDrawLocalHints,
      sketchDrawRoomAlerts,
      sketchDrawGuessFeed,
      sketchDrawDisbandAt,
      clearSketchDrawLocalHints,
      sendChat,
    }),
    [
      lobby,
      gameState,
      isSpectator,
      hubPresence,
      chatMessages,
      sketchDrawLocalHints,
      sketchDrawRoomAlerts,
      sketchDrawGuessFeed,
      sketchDrawDisbandAt,
      clearSketchDrawLocalHints,
      sendChat,
    ]
  );

  const hubLiveValue = useMemo(
    () => ({
      connected,
      hubPresence,
      error,
      clearError,
      refreshDisplayName,
      requestHubPresenceRefresh,
    }),
    [
      connected,
      hubPresence,
      error,
      clearError,
      refreshDisplayName,
      requestHubPresenceRefresh,
    ]
  );

  return (
    <HubLiveProvider value={hubLiveValue}>
      <HardResetProvider hardResetPlayer={hardResetPlayer}>
        <SocketConnectionProvider value={connectionValue}>
          <GameTimerProvider>
            <SketchCanvasProvider>
              <GameStateProvider value={gameStateValue}>
                <RoomReactionFeedProvider subscribe={subscribeRoomReactions}>
                  <InvitationProvider>{children}</InvitationProvider>
                </RoomReactionFeedProvider>
              </GameStateProvider>
            </SketchCanvasProvider>
          </GameTimerProvider>
        </SocketConnectionProvider>
      </HardResetProvider>
    </HubLiveProvider>
  );
}

export function useSocket() {
  const connection = useSocketConnection();
  const game = useGameState();
  const sketchDrawTimeTick = useGameTimer();
  const canvas = useSketchCanvas();
  const { actionsRef } = useSocketConnection();

  return useMemo(() => {
    const stateSlice = {
      connected: connection.connected,
      playerId: connection.playerId,
      error: connection.error,
      transientWarning: connection.transientWarning,
      hardResetInFlight: connection.hardResetInFlight,
      isIdentityHydrated: connection.isIdentityHydrated,
      sessionReady: connection.sessionReady,
      reconnectAssessed: connection.reconnectAssessed,
      reconnectedRoomId: connection.reconnectedRoomId,
      reconnectedAsSpectator: connection.reconnectedAsSpectator,
      ...game,
      sketchDrawTimeTick,
      sketchDrawRemoteBatch: canvas.sketchDrawRemoteBatch,
      sketchDrawCanvasSync: canvas.sketchDrawCanvasSync,
      sketchDrawStrokeBatch: canvas.sketchDrawStrokeBatch,
      sketchDrawCanvasUndo: canvas.sketchDrawCanvasUndo,
      sketchDrawCanvasRedo: canvas.sketchDrawCanvasRedo,
      sketchDrawCanvasClear: canvas.sketchDrawCanvasClear,
      sketchDrawCanvasFill: canvas.sketchDrawCanvasFill,
      requestSketchCanvasRecovery: canvas.requestSketchCanvasRecovery,
    };

    // Socket actions live on actionsRef; do not spread a Proxy (ownKeys is empty).
    return new Proxy(stateSlice, {
      get(target, prop, receiver) {
        if (Reflect.has(target, prop)) {
          return Reflect.get(target, prop, receiver);
        }
        if (typeof prop !== 'string') return undefined;
        const fn = actionsRef.current[prop];
        if (typeof fn === 'function') {
          return (...args) => fn(...args);
        }
        return fn;
      },
    });
  }, [connection, game, sketchDrawTimeTick, canvas, actionsRef]);
}
