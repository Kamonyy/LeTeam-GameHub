'use client';

import {
  createContext,
  useContext,
  useMemo,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import type { Socket } from 'socket.io-client';

export interface SocketConnectionMeta {
  connected: boolean;
  playerId: string;
  error: string | null;
  hardResetInFlight: boolean;
}

export interface SocketConnectionValue extends SocketConnectionMeta {
  socketRef: MutableRefObject<Socket | null>;
  actionsRef: MutableRefObject<Record<string, unknown>>;
}

const SocketConnectionContext = createContext<SocketConnectionValue | null>(
  null
);

export function SocketConnectionProvider({
  value,
  children,
}: {
  value: SocketConnectionValue;
  children: ReactNode;
}) {
  return (
    <SocketConnectionContext.Provider value={value}>
      {children}
    </SocketConnectionContext.Provider>
  );
}

export function useSocketConnection(): SocketConnectionValue {
  const ctx = useContext(SocketConnectionContext);
  if (!ctx) {
    throw new Error('useSocketConnection must be used within SocketProvider');
  }
  return ctx;
}

/**
 * Action emitters always read from the latest ref at call time (avoids stale closures).
 */
export function useSocketActions<T extends Record<string, unknown>>(): T {
  const { actionsRef } = useSocketConnection();
  return useMemo(
    () =>
      new Proxy({} as T, {
        get(_target, prop: string | symbol) {
          if (typeof prop !== 'string') return undefined;
          const fn = actionsRef.current[prop];
          if (typeof fn !== 'function') return fn;
          return (...args: unknown[]) => fn(...args);
        },
      }),
    [actionsRef]
  );
}
