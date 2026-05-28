'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { initializeClientStorage } from '@/lib/session/core-session';

interface ClientStorageContextValue {
  isStorageReady: boolean;
  hubNavigatingGameId: string | null;
}

const ClientStorageContext = createContext<ClientStorageContextValue>({
  isStorageReady: false,
  hubNavigatingGameId: null,
});

export function ClientStorageProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [hubNavigatingGameId, setHubNavigatingGameId] = useState<string | null>(
    null
  );

  useEffect(() => {
    const { hubNavigatingGameId: navId } = initializeClientStorage();
    setHubNavigatingGameId(navId);
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div
        className="min-h-dvh bg-[hsl(var(--background))] flex items-center justify-center"
        role="status"
        aria-busy="true"
        aria-label="Loading"
      >
        <div className="h-8 w-8 rounded-full border-2 border-[hsl(var(--primary))] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <ClientStorageContext.Provider
      value={{ isStorageReady: true, hubNavigatingGameId }}
    >
      {children}
    </ClientStorageContext.Provider>
  );
}

export function useClientStorage(): ClientStorageContextValue {
  return useContext(ClientStorageContext);
}
