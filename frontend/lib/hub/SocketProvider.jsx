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
  resetPlayerSessionKeepingName,
} from '@/lib/player';
import { isSameOriginServer, resolveServerUrl } from '@/lib/socket-url';
import { HubLiveProvider } from '@/lib/hub/HubLiveContext';
import { HardResetProvider } from '@/lib/hub/HardResetContext';
import { hubPresenceEqual, lobbyStateEqual } from '@/lib/hub/hub-live';
import { isGameActive } from '@/lib/hub/games-registry';
import { stripNarratorSecrets } from '@/games/mafia/lib/redactMafiaState';

const SocketContext = createContext(null);

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
  const [error, setError] = useState(null);
  const [hubPresence, setHubPresence] = useState({ total: 0, players: [] });
  const [chatMessages, setChatMessages] = useState([]);
  const [isSpectator, setIsSpectator] = useState(false);
  const [wordGuessedCelebration, setWordGuessedCelebration] = useState(null);
  const chatChannelRef = useRef(null);
  const wordActionInFlightRef = useRef(false);
  const skipNextConnectRegisterRef = useRef(false);

  const registerPlayer = useCallback((socket, id, isRetry = false) => {
    return new Promise((resolve) => {
      socket.emit(
        'player:register',
        {
          playerId: id,
          displayName: getDisplayName() || 'Player',
          sessionToken: getSessionToken() || undefined,
        },
        (res) => {
          if (
            !isRetry &&
            res?.error &&
            (res.error === 'Invalid session token' ||
              res.error === 'Session token required')
          ) {
            clearSessionToken();
            registerPlayer(socket, id, true).then(resolve);
            return;
          }
          if (res?.error) {
            setError(res.error);
            resolve(false);
            return;
          }
          if (res?.sessionToken) {
            setSessionToken(res.sessionToken);
          }
          if (res?.reconnected && res?.roomId) {
            // lobby/game state arrives via reconnect:sync + game:state:update
            if (res?.isSpectator) setIsSpectator(true);
          } else if (!res?.reconnected) {
            setLobby(null);
            setGameState(null);
            setIsSpectator(false);
          }
          resolve(true);
        }
      );
    });
  }, []);

  const ensureRegistered = useCallback(async () => {
    await registerReadyRef.current;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let socket = null;
    const id = getOrCreatePlayerId();
    playerIdRef.current = id;
    setPlayerId(id);

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
        registerReadyRef.current = registerPlayer(socket, playerIdRef.current).then(
          (ok) => {
            if (ok) socket.emit('hub:presence:request', {});
            return ok;
          }
        );
      });

      socket.on('disconnect', () => {
        setConnected(false);
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
        setLobby((prev) => {
          if (lobbyStateEqual(prev, state)) return prev;
          if (state?.status === 'lobby') {
            setGameState(null);
            setWordGuessedCelebration(null);
          }
          const nextSpectator =
            state?.isSpectator !== undefined ?
              !!state.isSpectator
            :	!!(
                state?.spectators &&
                playerIdRef.current &&
                state.spectators.some((s) => s.id === playerIdRef.current)
              );
          setIsSpectator((was) => (was === nextSpectator ? was : nextSpectator));
          return state;
        });
      });
      socket.on('game:state:update', (state) => {
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
        if (state && 'board' in state) {
          setGameState(state);
        }
      });
      socket.on('reconnect:sync', (payload) => {
        setLobby((prev) => (lobbyStateEqual(prev, payload) ? prev : payload));
        setIsSpectator(!!payload?.isSpectator);
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
      socket.on('room:kicked', (payload) => {
        setLobby(null);
        setGameState(null);
        setWordGuessedCelebration(null);
        setIsSpectator(false);
        setError(payload?.message || 'You were removed from the room');
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
  }, [registerPlayer]);

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

  const createRoom = useCallback((displayName, gameType = 'wordgame') => {
    return new Promise((resolve) => {
      (async () => {
        await ensureRegistered();
        const socket = socketRef.current;
        if (!socket?.connected) {
          resolve(null);
          return;
        }
        if (!isGameActive(gameType)) {
          setError('This game is temporarily unavailable');
          resolve(null);
          return;
        }
        socket.emit('room:create', { displayName, gameType }, (res) => {
          if (res?.error) {
            setError(res.error);
            resolve(null);
          } else {
            resolve(res.roomId ?? null);
          }
        });
      })();
    });
  }, [ensureRegistered]);

  const joinRoom = useCallback((roomId, displayName, options = {}) => {
    const { spectate = false } = options;
    return new Promise((resolve) => {
      (async () => {
        await ensureRegistered();
        const socket = socketRef.current;
        if (!socket?.connected) {
          resolve(false);
          return;
        }
        const payload = {
          roomId: roomId.toUpperCase(),
          displayName,
          ...(spectate ? { spectate: true } : {}),
        };
        const event = spectate ? 'room:spectate' : 'room:join';
        socket.emit(event, payload, (res) => {
          if (res?.error) {
            setError(res.error);
            resolve(false);
          } else {
            setIsSpectator(!!res?.isSpectator || spectate);
            resolve(true);
          }
        });
      })();
    });
  }, [ensureRegistered]);

  const spectateRoom = useCallback((roomId, displayName) => {
    return joinRoom(roomId, displayName, { spectate: true });
  }, [joinRoom]);

  /** Join as player, or spectate if the match already started. */
  const joinRoomOrSpectate = useCallback((roomId, displayName) => {
    return new Promise((resolve) => {
      const socket = socketRef.current;
      if (!socket?.connected) {
        resolve({ ok: false, spectating: false });
        return;
      }
      const code = roomId.toUpperCase();
      socket.emit('room:join', { roomId: code, displayName }, (res) => {
        if (!res?.error) {
          setIsSpectator(false);
          resolve({ ok: true, spectating: false });
          return;
        }
        if (res.error !== 'Game already in progress') {
          setError(res.error);
          resolve({ ok: false, spectating: false });
          return;
        }
        socket.emit('room:spectate', { roomId: code, displayName }, (specRes) => {
          if (specRes?.error) {
            setError(specRes.error);
            resolve({ ok: false, spectating: false });
          } else {
            setIsSpectator(true);
            resolve({ ok: true, spectating: true });
          }
        });
      });
    });
  }, []);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('room:leave', {}, () => {
      setLobby(null);
      setGameState(null);
      setWordGuessedCelebration(null);
      setIsSpectator(false);
    });
  }, []);

  const hardResetPlayer = useCallback(async () => {
    const socket = socketRef.current;

    registerReadyRef.current = createUnsettledRegistration();

    if (socket?.connected) {
      await new Promise((resolve) => {
        socket.emit('room:leave', {}, () => resolve());
      });

      socket.disconnect();
      try {
        await waitForSocketEvent(socket, 'disconnect', 8000);
      } catch {
        /* proceed — local state reset still runs */
      }
    }

    setLobby(null);
    setGameState(null);
    setChatMessages([]);
    setError(null);
    setWordGuessedCelebration(null);
    setIsSpectator(false);
    wordActionInFlightRef.current = false;

    const newId = resetPlayerSessionKeepingName();
    playerIdRef.current = newId;
    setPlayerId(newId);

    if (!socket) return;

    skipNextConnectRegisterRef.current = true;

    if (!socket.connected) {
      socket.connect();
      try {
        await waitForSocketEvent(socket, 'connect', 8000);
      } catch {
        return;
      }
    }

    try {
      registerReadyRef.current = registerPlayer(socket, newId).then((ok) => {
        if (ok) socket.emit('hub:presence:request', {});
        return ok;
      });
      await registerReadyRef.current;
    } finally {
      skipNextConnectRegisterRef.current = false;
    }
  }, [registerPlayer]);

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

  const value = useMemo(
    () => ({
      connected,
      playerId,
      lobby,
      gameState,
      isSpectator,
      error,
      hubPresence,
      chatMessages,
      sendChat,
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
      playMove,
      drawTile,
      passTurn,
      continueRound,
      requestRematch,
      submitSecretWord,
      submitSecretChampion,
      confirmWordGuessed,
      reportWordTabFocus,
      baraReveal,
      baraAdvanceInterrogation,
      baraVote,
      baraGuess,
      mafiaAcknowledgeRole,
      mafiaNarratorAction,
      addDevBots,
      removeDevBots,
    }),
    [
      connected,
      playerId,
      lobby,
      gameState,
      isSpectator,
      error,
      hubPresence,
      chatMessages,
      sendChat,
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
      playMove,
      drawTile,
      passTurn,
      continueRound,
      requestRematch,
      submitSecretWord,
      submitSecretChampion,
      confirmWordGuessed,
      reportWordTabFocus,
      baraReveal,
      baraAdvanceInterrogation,
      baraVote,
      baraGuess,
      mafiaAcknowledgeRole,
      mafiaNarratorAction,
      addDevBots,
      removeDevBots,
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
        <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
      </HardResetProvider>
    </HubLiveProvider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return ctx;
}
