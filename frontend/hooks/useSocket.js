'use client';

/**
 * useSocket — React hook for Socket.io connection lifecycle.
 *
 * Resolves server URL at runtime via /config.json (production) before connecting.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import {
  getDisplayName,
  getOrCreatePlayerId,
  resolveServerUrl,
} from '@/lib/player';

export function useSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [playerId, setPlayerId] = useState('');
  const [lobby, setLobby] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState(null);

  const registerPlayer = useCallback((socket, id) => {
    const name = getDisplayName();
    socket.emit(
      'player:register',
      { playerId: id, displayName: name },
      (res) => {
        if (res?.reconnected && res.roomId) {
          // Server restored session — lobby/game events will follow
        }
      }
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
        transports: ['websocket', 'polling'],
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        setConnected(true);
        registerPlayer(socket, id);
      });

      socket.on('disconnect', () => {
        setConnected(false);
      });

      socket.on('connect_error', () => {
        setConnected(false);
      });

      socket.on('lobby:state', (state) => {
        setLobby(state);
      });

      socket.on('game:state:update', (state) => {
        setGameState(state);
      });

      socket.on('reconnect:sync', (payload) => {
        setLobby(payload);
      });

      socket.on('game:error', (err) => {
        setError(err.message);
      });
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

  const createRoom = useCallback((displayName) => {
    return new Promise((resolve) => {
      const socket = socketRef.current;
      if (!socket?.connected) {
        resolve(null);
        return;
      }
      socket.emit(
        'room:create',
        { displayName },
        (res) => {
          if (res?.error) {
            setError(res.error);
            resolve(null);
          } else {
            resolve(res.roomId ?? null);
          }
        }
      );
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

  const startGame = useCallback(() => {
    return new Promise((resolve) => {
      socketRef.current?.emit(
        'game:start',
        {},
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

  const playMove = useCallback((tile, end) => {
    socketRef.current?.emit('game:move:request', { tile, end });
  }, []);

  const drawTile = useCallback(() => {
    socketRef.current?.emit('game:draw:request', {});
  }, []);

  const passTurn = useCallback(() => {
    socketRef.current?.emit('game:pass:request', {});
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
    startGame,
    playMove,
    drawTile,
    passTurn,
  };
}
