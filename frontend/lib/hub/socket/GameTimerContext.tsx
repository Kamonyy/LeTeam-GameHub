'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { SketchDrawTimeTick } from '@/hooks/useSocket';
import { socketDispatchRegistry } from './dispatch-registry';

const GameTimerContext = createContext<SketchDrawTimeTick | null>(null);

export function GameTimerProvider({ children }: { children: ReactNode }) {
  const [tick, setTick] = useState<SketchDrawTimeTick | null>(null);

  useEffect(() => {
    socketDispatchRegistry.setGameTimerTick = setTick;
    return () => {
      socketDispatchRegistry.setGameTimerTick = null;
    };
  }, []);

  const value = useMemo(() => tick, [tick]);

  return (
    <GameTimerContext.Provider value={value}>{children}</GameTimerContext.Provider>
  );
}

export function useGameTimer(): SketchDrawTimeTick | null {
  return useContext(GameTimerContext);
}
