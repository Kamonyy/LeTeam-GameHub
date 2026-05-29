'use client';

import clsx from 'clsx';
import { EyeOff } from 'lucide-react';
import type { LobbyPlayer } from '@/lib/hub/types';

interface WordTabFocusAlertsProps {
  active: boolean;
  playerId: string;
  players: LobbyPlayer[];
  selfFocused: boolean;
  className?: string;
}

export default function WordTabFocusAlerts({
  active,
  playerId,
  players,
  selfFocused,
  className,
}: WordTabFocusAlertsProps) {
  if (!active) return null;

  const opponent = players.find((p) => p.id !== playerId);
  const opponentName = opponent?.displayName ?? 'Your opponent';
  const opponentAway =
    !!opponent &&
    opponent.connected !== false &&
    opponent.tabFocused === false;

  const showSelf = !selfFocused;
  const showOpponent = opponentAway;

  const inGameSlot = className?.includes('game-slot');

  if (!showSelf && !showOpponent) {
    if (inGameSlot) {
      return (
        <div
          className={clsx('sw-focus-alerts', className, 'sw-focus-alerts--game-slot-empty')}
          aria-hidden
        />
      );
    }
    return null;
  }

  if (!inGameSlot) {
    return (
      <div
        className={clsx('sw-focus-alerts', className)}
        role="status"
        aria-live="polite"
      >
        {showSelf && (
          <p className="sw-focus-alert sw-focus-alert--self">
            <EyeOff className="sw-focus-alert__icon shrink-0" aria-hidden />
            You left this tab — your opponent was notified.
          </p>
        )}
        {showOpponent && (
          <p className="sw-focus-alert sw-focus-alert--opponent">
            <EyeOff className="sw-focus-alert__icon shrink-0" aria-hidden />
            <span>
              <strong>{opponentName}</strong> switched away from the game tab.
            </span>
          </p>
        )}
      </div>
    );
  }

  const visibleCount = (showSelf ? 1 : 0) + (showOpponent ? 1 : 0);
  const focusLayout =
    showSelf && showOpponent ? 'both'
    : showSelf ? 'self'
    : 'opponent';

  return (
    <div
      className={clsx('sw-focus-alerts', className)}
      data-visible-count={visibleCount}
      data-focus-layout={focusLayout}
      role="status"
      aria-live="polite"
    >
      <div
        className={clsx(
          'sw-focus-alert-slot',
          showSelf && 'sw-focus-alert-slot--visible',
        )}
        aria-hidden={!showSelf}
      >
        <p className="sw-focus-alert sw-focus-alert--self">
          <EyeOff className="sw-focus-alert__icon shrink-0" aria-hidden />
          <span className="sw-focus-alert__text">
            You left the tab — opponent notified.
          </span>
        </p>
      </div>
      <div
        className={clsx(
          'sw-focus-alert-slot',
          showOpponent && 'sw-focus-alert-slot--visible',
        )}
        aria-hidden={!showOpponent}
      >
        <p className="sw-focus-alert sw-focus-alert--opponent">
          <EyeOff className="sw-focus-alert__icon shrink-0" aria-hidden />
          <span className="sw-focus-alert__text">
            <strong>{opponentName}</strong> left the game tab.
          </span>
        </p>
      </div>
    </div>
  );
}
