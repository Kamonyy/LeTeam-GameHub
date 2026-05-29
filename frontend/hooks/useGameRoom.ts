'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useRoomAutoJoin, type UseRoomAutoJoinOptions } from '@/lib/hub/useRoomAutoJoin';
import type { GameState } from '@/games/dominoes/types';
import type { WordGameState } from '@/games/wordgame/types';
import type { MafiaGameState } from '@/games/mafia/types';
import type { SketchDrawGameState } from '@/games/sketch-draw/types';

export type UseGameRoomOptions = Pick<
  UseRoomAutoJoinOptions,
  | 'gameType'
  | 'gameEnabled'
  | 'basePath'
  | 'roomParam'
  | 'spectateParam'
  | 'onAutoJoinLoading'
>;

export type UseGameRoomReturn = ReturnType<typeof useSocket> & {
  autoJoined: boolean;
  setAutoJoined: (value: boolean) => void;
  inviteJoin: boolean;
  setInviteJoin: (value: boolean) => void;
  joinCode: string;
  setJoinCode: (code: string) => void;
  isDrawer: boolean;
  isActiveTurn: boolean;
  hasCorrectlyGuessed: boolean;
};

export function useGameRoom(options: UseGameRoomOptions): UseGameRoomReturn {
  const socket = useSocket();
  const {
    connected,
    sessionReady,
    reconnectAssessed,
    reconnectedRoomId,
    reconnectedAsSpectator,
    hardResetInFlight,
    lobby,
    gameState,
    playerId,
    isSpectator,
    joinRoom,
    spectateRoom,
    clearError,
    requestSketchCanvasRecovery,
  } = socket;

  const roomJoin = useRoomAutoJoin({
    ...options,
    connected,
    sessionReady,
    reconnectAssessed,
    reconnectedRoomId,
    reconnectedAsSpectator,
    hardResetInFlight,
    lobby,
    playerId,
    joinRoom,
    spectateRoom,
    clearError,
  });

  const wasConnectedRef = useRef(false);
  useEffect(() => {
    const justConnected = connected && !wasConnectedRef.current;
    wasConnectedRef.current = connected;
    if (!justConnected) return;
    if (lobby?.gameType !== 'sketch-draw') return;
    const sketch =
      gameState && 'gameType' in gameState && gameState.gameType === 'sketch-draw' ?
        (gameState as SketchDrawGameState)
      : null;
    if (sketch?.phase === 'drawing') {
      requestSketchCanvasRecovery();
    }
  }, [connected, lobby?.gameType, gameState, requestSketchCanvasRecovery]);

  const sketchState: SketchDrawGameState | null = useMemo(() => {
    if (gameState && 'gameType' in gameState && gameState.gameType === 'sketch-draw') {
      return gameState as SketchDrawGameState;
    }
    return null;
  }, [gameState]);

  const dominoState: GameState | null = useMemo(() => {
    if (gameState && 'board' in gameState) {
      return gameState as GameState;
    }
    return null;
  }, [gameState]);

  const wordState: WordGameState | null = useMemo(() => {
    if (gameState && 'gameType' in gameState && gameState.gameType === 'wordgame') {
      return gameState as WordGameState;
    }
    return null;
  }, [gameState]);

  const mafiaState: MafiaGameState | null = useMemo(() => {
    if (gameState && 'gameType' in gameState && gameState.gameType === 'mafia') {
      return gameState as MafiaGameState;
    }
    return null;
  }, [gameState]);

  const isDrawer = sketchState?.isDrawer ?? false;

  const isActiveTurn = useMemo(() => {
    if (!playerId || isSpectator) return false;
    if (dominoState?.currentPlayerId) {
      return dominoState.currentPlayerId === playerId;
    }
    if (mafiaState?.nightCallout?.isYourTurn) {
      return true;
    }
    if (isDrawer && sketchState?.phase === 'drawing') {
      return true;
    }
    if (wordState?.phase === 'playing' && wordState.canConfirmGuessed) {
      return true;
    }
    return false;
  }, [playerId, isSpectator, dominoState, mafiaState, isDrawer, sketchState?.phase, wordState]);

  const hasCorrectlyGuessed = useMemo(() => {
    if (!playerId) return false;
    if (sketchState?.solvedThisRound?.includes(playerId)) {
      return true;
    }
    if (wordState?.lastGuesserId === playerId) {
      return true;
    }
    return false;
  }, [playerId, sketchState, wordState]);

  // Do not spread `socket` — it is a Proxy; spread only copies own keys and drops
  // action methods (createRoom, joinRoom, …) resolved via actionsRef.
  return useMemo(() => {
    return new Proxy(socket, {
      get(target, prop, receiver) {
        if (prop === 'isDrawer') return isDrawer;
        if (prop === 'isActiveTurn') return isActiveTurn;
        if (prop === 'hasCorrectlyGuessed') return hasCorrectlyGuessed;
        if (Object.prototype.hasOwnProperty.call(roomJoin, prop)) {
          return roomJoin[prop as keyof typeof roomJoin];
        }
        return Reflect.get(target, prop, receiver);
      },
    }) as UseGameRoomReturn;
  }, [socket, roomJoin, isDrawer, isActiveTurn, hasCorrectlyGuessed]);
}
