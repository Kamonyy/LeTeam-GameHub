'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { getGameEntry } from '@/lib/hub/games-registry';
import { useClientStorage } from '@/lib/session/ClientStorageContext';
import { HUB_NAVIGATING_KEY } from '@/lib/session/core-session';

interface HubGameLoadingScreenProps {
  /** Fallback when session hint is missing (e.g. direct URL). */
  gameId?: string;
}

export default function HubGameLoadingScreen({ gameId }: HubGameLoadingScreenProps) {
  const { isStorageReady, hubNavigatingGameId } = useClientStorage();
  const [resolvedId, setResolvedId] = useState<string | undefined>(gameId);

  useEffect(() => {
    if (!isStorageReady) return;

    const fromBoot = hubNavigatingGameId ?? gameId;
    if (fromBoot) {
      setResolvedId(fromBoot);
      return;
    }

    try {
      const stored = sessionStorage.getItem(HUB_NAVIGATING_KEY);
      if (stored) {
        setResolvedId(stored);
        sessionStorage.removeItem(HUB_NAVIGATING_KEY);
      }
    } catch {
      /* ignore */
    }
  }, [isStorageReady, hubNavigatingGameId, gameId]);

  if (!isStorageReady) {
    return (
      <main className="hub-arcade min-h-dvh relative flex items-center justify-center px-6">
        <div className="h-8 w-8 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" />
      </main>
    );
  }

  const game = resolvedId ? getGameEntry(resolvedId) : null;

  return (
    <main className="hub-arcade min-h-dvh relative flex items-center justify-center px-6 overflow-x-hidden">
      <div
        className={clsx(
          'hub-game-loading text-center max-w-sm',
          resolvedId && `hub-game-loading--${resolvedId}`
        )}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="hub-game-loading__spinner mx-auto mb-5" aria-hidden>
          <Loader2 className="w-10 h-10 animate-spin" />
        </div>
        <p className="text-lg font-semibold text-gray-100 mb-1">
          {game ? `Opening ${game.name}` : 'Loading game'}
          <span className="hub-game-loading__dots" aria-hidden>
            …
          </span>
        </p>
        <p className="text-sm text-hub-muted">
          {game ?
            'Preparing your lobby — one moment'
          :	'Connecting to the arcade server'}
        </p>
      </div>
    </main>
  );
}
