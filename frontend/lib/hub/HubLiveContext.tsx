'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { HubPresenceState } from './types';

export interface HubLiveValue {
  connected: boolean;
  hubPresence: HubPresenceState;
  error: string | null;
  clearError: () => void;
  refreshDisplayName: (name: string) => void;
  requestHubPresenceRefresh: () => void;
}

const HubLiveContext = createContext<HubLiveValue | null>(null);

export function HubLiveProvider({
  value,
  children,
}: {
  value: HubLiveValue;
  children: ReactNode;
}) {
  const memo = useMemo(
    () => value,
    [
      value.connected,
      value.hubPresence,
      value.error,
      value.clearError,
      value.refreshDisplayName,
      value.requestHubPresenceRefresh,
    ]
  );

  return (
    <HubLiveContext.Provider value={memo}>{children}</HubLiveContext.Provider>
  );
}

export function useHubLive(): HubLiveValue {
  const ctx = useContext(HubLiveContext);
  if (!ctx) {
    throw new Error('useHubLive must be used within SocketProvider');
  }
  return ctx;
}
