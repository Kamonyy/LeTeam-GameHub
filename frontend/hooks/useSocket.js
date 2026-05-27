'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { getDisplayName, getOrCreatePlayerId } from '@/lib/player';
import { isSameOriginServer, resolveServerUrl } from '@/lib/socket-url';

export function useSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [playerId, setPlayerId] = useState('');
  const [lobby, setLobby] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState(null);

  const registerPlayer = useCallback((socket, id) => {
    socket.emit(
      'player:register',
      { playerId: id, displayName: getDisplayName() || 'Player' },
      () => {}
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    let socket = null;
    const id = getOrCreatePlayerId();
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
        registerPlayer(socket, id);
      });

      socket.on('disconnect', () => setConnected(false));
      socket.on('connect_error', () => setConnected(false));
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
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [registerPlayer]);

  const clearError = useCallback(() => setError(null), []);

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
      socketRef.current?.emit('word:submit', { word }, (res) => {
        if (res?.error) {
          setError(res.error);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }, []);

  const confirmWordGuessed = useCallback(() => {
    return new Promise((resolve) => {
      socketRef.current?.emit('word:guessed', {}, (res) => {
        if (res?.error) {
          setError(res.error);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }, []);

  return {
    connected,
    playerId,
    lobby,
    gameState,
    error,
    clearError,
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
}
