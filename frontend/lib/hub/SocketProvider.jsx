'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { io } from 'socket.io-client';
import { getDisplayName, getOrCreatePlayerId, getSessionToken, setDisplayName, setSessionToken, clearSessionToken } from '@/lib/player';
import { isSameOriginServer, resolveServerUrl } from '@/lib/socket-url';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const playerIdRef = useRef('');
  const registerReadyRef = useRef(Promise.resolve(true));
  const [connected, setConnected] = useState(false);
  const [playerId, setPlayerId] = useState('');
  const [lobby, setLobby] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState(null);
  const [hubPresence, setHubPresence] = useState({ total: 0, players: [] });
  const [chatMessages, setChatMessages] = useState([]);
  const [isSpectator, setIsSpectator] = useState(false);
  const chatChannelRef = useRef(null);

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

      socket.on('connect', () => {
        setConnected(true);
        registerReadyRef.current = registerPlayer(socket, playerIdRef.current).then(
          (ok) => {
            if (ok) socket.emit('hub:presence:request', {});
            return ok;
          }
        );
      });

      socket.on('disconnect', () => setConnected(false));
      socket.on('connect_error', () => setConnected(false));
      socket.on('hub:presence', (payload) => {
        if (payload?.players) setHubPresence(payload);
      });
      socket.on('lobby:state', (state) => {
        setLobby(state);
        if (state?.isSpectator !== undefined) {
          setIsSpectator(!!state.isSpectator);
        } else if (state?.spectators && playerIdRef.current) {
          setIsSpectator(state.spectators.some((s) => s.id === playerIdRef.current));
        }
        if (state?.status === 'lobby') {
          setGameState(null);
        }
      });
      socket.on('game:state:update', (state) => {
        if (state?.gameType === 'wordgame' || state?.gameType === 'bara-alsalafa') {
          setGameState(state);
          return;
        }
        if (state && 'board' in state) {
          setGameState(state);
        }
      });
      socket.on('reconnect:sync', (payload) => {
        setLobby(payload);
        setIsSpectator(!!payload?.isSpectator);
        if (payload?.status === 'lobby') {
          setGameState(null);
        }
        // game:state:update follows for playing / finished Secret Word matches
      });
      socket.on('game:cancelled', () => setGameState(null));
      socket.on('room:kicked', (payload) => {
        setLobby(null);
        setGameState(null);
        setIsSpectator(false);
        setError(payload?.message || 'You were removed from the room');
      });
      socket.on('game:error', (err) => setError(err.message));
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
    };
  }, [registerPlayer]);

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
      const socket = socketRef.current;
      if (!socket?.connected) {
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
    });
  }, []);

  const joinRoom = useCallback((roomId, displayName, options = {}) => {
    const { spectate = false } = options;
    return new Promise((resolve) => {
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
    });
  }, []);

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
      setIsSpectator(false);
    });
  }, []);

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

  const requestRematch = useCallback(() => {
    return new Promise((resolve) => {
      socketRef.current?.emit('game:rematch:request', {}, (res) => {
        if (res?.error) {
          setError(res.error);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }, []);

  const submitSecretWord = useCallback((word) => {
    return new Promise((resolve) => {
      (async () => {
        await ensureRegistered();
        const socket = socketRef.current;
        if (!socket?.connected) {
          resolve(false);
          return;
        }
        socket.emit('word:submit', { word }, (res) => {
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

  const submitSecretChampion = useCallback((championId) => {
    return new Promise((resolve) => {
      (async () => {
        await ensureRegistered();
        const socket = socketRef.current;
        if (!socket?.connected) {
          resolve(false);
          return;
        }
        socket.emit('word:submit', { championId }, (res) => {
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

  const sendChat = useCallback((message) => {
    const trimmed = typeof message === 'string' ? message.trim() : '';
    if (!trimmed || trimmed.length > 200) return;
    (async () => {
      await ensureRegistered();
      socketRef.current?.emit('chat:send', { message: trimmed }, (res) => {
        if (res?.error) setError(res.error);
      });
    })();
  }, [ensureRegistered]);

  const confirmWordGuessed = useCallback(() => {
    return new Promise((resolve) => {
      (async () => {
        await ensureRegistered();
        const socket = socketRef.current;
        if (!socket?.connected) {
          resolve(false);
          return;
        }
        socket.emit('word:guessed', {}, (res) => {
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

  const value = {
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
    baraReveal,
    baraAdvanceInterrogation,
    baraVote,
    baraGuess,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return ctx;
}
