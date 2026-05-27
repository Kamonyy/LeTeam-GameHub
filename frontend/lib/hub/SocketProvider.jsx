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
      socket.on('lobby:state', (state) => setLobby(state));
      socket.on('game:state:update', (state) => setGameState(state));
      socket.on('reconnect:sync', (payload) => setLobby(payload));
      socket.on('game:cancelled', () => setGameState(null));
      socket.on('room:kicked', (payload) => {
        setLobby(null);
        setGameState(null);
        setError(payload?.message || 'You were removed from the room');
      });
      socket.on('game:error', (err) => setError(err.message));
    })();

    return () => {
      cancelled = true;
    };
  }, [registerPlayer]);

  const clearError = useCallback(() => setError(null), []);

  const refreshDisplayName = useCallback((name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setDisplayName(trimmed);
    const socket = socketRef.current;
    if (socket?.connected && playerIdRef.current) {
      registerPlayer(socket, playerIdRef.current);
    }
  }, [registerPlayer]);

  const createRoom = useCallback((displayName, gameType = 'dominoes') => {
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

  const joinRoom = useCallback((roomId, displayName) => {
    return new Promise((resolve) => {
      const socket = socketRef.current;
      if (!socket?.connected) {
        resolve(false);
        return;
      }
      socket.emit(
        'room:join',
        { roomId: roomId.toUpperCase(), displayName },
        (res) => {
          if (res?.error) {
            setError(res.error);
            resolve(false);
          } else {
            resolve(true);
          }
        }
      );
    });
  }, []);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('room:leave', {}, () => {
      setLobby(null);
      setGameState(null);
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

  const value = {
    connected,
    playerId,
    lobby,
    gameState,
    error,
    hubPresence,
    clearError,
    refreshDisplayName,
    createRoom,
    joinRoom,
    leaveRoom,
    updateRoomSettings,
    startGame,
    kickPlayer,
    cancelMatch,
    playMove,
    drawTile,
    passTurn,
    submitSecretWord,
    confirmWordGuessed,
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
