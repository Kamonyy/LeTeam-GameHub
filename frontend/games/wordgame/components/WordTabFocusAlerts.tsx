'use client';

import { EyeOff } from 'lucide-react';
import type { LobbyPlayer } from '@/lib/hub/types';

interface WordTabFocusAlertsProps {
  active: boolean;
  playerId: string;
  players: LobbyPlayer[];
  selfFocused: boolean;
}

export default function WordTabFocusAlerts({
  active,
  playerId,
  players,
  selfFocused,
}: WordTabFocusAlertsProps) {
  if (!active) return null;

  const opponent = players.find((p) => p.id !== playerId);
  const opponentName = opponent?.displayName ?? 'Your opponent';
  const opponentAway =
    !!opponent &&
    opponent.connected !== false &&
    opponent.tabFocused === false;

  if (selfFocused && !opponentAway) return null;

  return (
    <div className="sw-focus-alerts" role="status" aria-live="polite">
      {!selfFocused && (
        <p className="sw-focus-alert sw-focus-alert--self">
          <EyeOff className="w-4 h-4 shrink-0" aria-hidden />
          You left this tab — your opponent was notified.
        </p>
      )}
      {opponentAway && (
        <p className="sw-focus-alert sw-focus-alert--opponent">
          <EyeOff className="w-4 h-4 shrink-0" aria-hidden />
          <span>
            <strong>{opponentName}</strong> switched away from the game tab.
          </span>
        </p>
      )}
    </div>
  );
}
