'use client';

import { useMemo, useRef } from 'react';
import clsx from 'clsx';
import { usePathname } from 'next/navigation';
import {
  getGameEntry,
  resolveGameIdFromPath,
} from '@/lib/hub/games-registry';
import { useClientStorage } from '@/lib/session/ClientStorageContext';
import { peekHubGameNavigationIntent } from '@/lib/hub/hubGameNavigation';
import HubArcadeLoadingEnvironment from './HubArcadeLoadingEnvironment';

interface HubGameLoadingScreenProps {
  /** Authoritative game id when known (route bridge, page dynamic import). */
  gameId?: string;
}

function readSessionNavigationHint(): string | null {
  return peekHubGameNavigationIntent();
}

type LoadingPanelProps = {
  resolvedId?: string;
  gameName?: string;
  gameIcon?: string;
  showLive?: boolean;
  ariaLabel: string;
};

function LoadingPanel({
  resolvedId,
  gameName,
  gameIcon = '🎮',
  showLive,
  ariaLabel,
}: LoadingPanelProps) {
  const modifier = resolvedId ? `hub-game-loading--${resolvedId}` : '';

  return (
    <div
      className={clsx('hub-game-loading hub-game-loading--enter', modifier)}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={ariaLabel}
    >
      {showLive ?
        <div className="hub-game-loading__meta">
          <span className="hub-game-loading__live">Live</span>
        </div>
      : null}

      <div className="hub-game-loading__mark" aria-hidden>
        <span className="hub-game-loading__spinner" />
        <span className="hub-game-loading__icon">{gameIcon}</span>
      </div>

      <div className="hub-game-loading__copy">
        <p className="hub-game-loading__title">
          {gameName ? `Opening ${gameName}` : 'Loading game'}
        </p>
        <p className="hub-game-loading__subtitle">
          {gameName ?
            'Preparing your lobby'
          :	'Connecting to the arcade'}
        </p>
      </div>

      <div className="hub-game-loading__track" aria-hidden>
        <span className="hub-game-loading__track-fill" />
      </div>
    </div>
  );
}

export default function HubGameLoadingScreen({ gameId }: HubGameLoadingScreenProps) {
  const pathname = usePathname();
  const { isStorageReady } = useClientStorage();
  const sessionHintRef = useRef<string | null | undefined>(undefined);

  if (sessionHintRef.current === undefined) {
    sessionHintRef.current = readSessionNavigationHint();
  }

  const resolvedId = useMemo(() => {
    if (gameId) return gameId;
    const fromPath = resolveGameIdFromPath(pathname);
    if (fromPath) return fromPath;
    return sessionHintRef.current ?? undefined;
  }, [gameId, pathname]);

  const game = resolvedId ? getGameEntry(resolvedId) : null;

  if (!isStorageReady && !resolvedId) {
    return (
      <HubArcadeLoadingEnvironment>
        <LoadingPanel ariaLabel="Loading" gameIcon="🎮" />
      </HubArcadeLoadingEnvironment>
    );
  }

  return (
    <HubArcadeLoadingEnvironment>
      <LoadingPanel
        resolvedId={resolvedId}
        gameName={game?.name}
        gameIcon={game?.icon ?? '🎮'}
        showLive={game?.active}
        ariaLabel={game ? `Opening ${game.name}` : 'Loading game'}
      />
    </HubArcadeLoadingEnvironment>
  );
}
