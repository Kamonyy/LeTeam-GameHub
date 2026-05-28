'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { HubGameState, UseSocketReturn } from '@/hooks/useSocket';

/** Structural match + lobby data (excludes timer ticks and live canvas strokes). */
export type GameStateContextValue = Pick<
  UseSocketReturn,
  | 'lobby'
  | 'gameState'
  | 'isSpectator'
  | 'chatMessages'
  | 'sketchDrawLocalHints'
  | 'sketchDrawRoomAlerts'
  | 'sketchDrawGuessFeed'
  | 'sketchDrawDisbandAt'
  | 'clearSketchDrawLocalHints'
  | 'sendChat'
> & {
  hubPresence: UseSocketReturn['hubPresence'];
};

const GameStateContext = createContext<GameStateContextValue | null>(null);

export function GameStateProvider({
  value,
  children,
}: {
  value: GameStateContextValue;
  children: ReactNode;
}) {
  return (
    <GameStateContext.Provider value={value}>{children}</GameStateContext.Provider>
  );
}

export function useGameState(): GameStateContextValue {
  const ctx = useContext(GameStateContext);
  if (!ctx) {
    throw new Error('useGameState must be used within SocketProvider');
  }
  return ctx;
}

export type { HubGameState };
