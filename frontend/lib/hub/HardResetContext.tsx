'use client';

import { createContext, useContext, type ReactNode } from 'react';

type HardResetFn = () => Promise<void>;

const HardResetContext = createContext<HardResetFn | null>(null);

export function HardResetProvider({
  hardResetPlayer,
  children,
}: {
  hardResetPlayer: HardResetFn;
  children: ReactNode;
}) {
  return (
    <HardResetContext.Provider value={hardResetPlayer}>
      {children}
    </HardResetContext.Provider>
  );
}

export function useHardResetPlayer(): HardResetFn {
  const hardResetPlayer = useContext(HardResetContext);
  if (!hardResetPlayer) {
    throw new Error('useHardResetPlayer must be used within SocketProvider');
  }
  return hardResetPlayer;
}
