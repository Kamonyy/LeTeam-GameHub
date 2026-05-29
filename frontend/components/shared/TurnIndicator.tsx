'use client';

import { Clock, Pause } from 'lucide-react';
import clsx from 'clsx';

interface TurnIndicatorProps {
  currentPlayerId: string;
  myPlayerId: string;
  playerNames: Record<string, string>;
  turnTimeRemaining: number;
  turnTimerPaused: boolean;
}

export default function TurnIndicator({
  currentPlayerId,
  myPlayerId,
  playerNames,
  turnTimeRemaining,
  turnTimerPaused,
}: TurnIndicatorProps) {
  const isMyTurn = currentPlayerId === myPlayerId;
  const seconds = Math.ceil(turnTimeRemaining / 1000);
  const urgent = seconds <= 10 && !turnTimerPaused;

  const displayName =
    playerNames[currentPlayerId] ||
    (isMyTurn ? 'You' : `Player ${currentPlayerId.slice(0, 4)}`);

  return (
    <div
      className={clsx(
        'flex items-center justify-center gap-3 px-5 py-2.5 rounded-full border transition-all duration-300',
        isMyTurn
          ? 'bg-hub-accent/15 border-hub-accent/40 text-hub-accent'
          : 'bg-hub-surface border-hub-border text-muted-foreground',
        urgent && isMyTurn && 'animate-pulse-soft border-hub-danger/50 text-hub-danger'
      )}
    >
      {turnTimerPaused ? (
        <Pause className="w-4 h-4" />
      ) : (
        <Clock className="w-4 h-4" />
      )}

      <span className="text-sm font-medium">
        {turnTimerPaused
          ? 'Turn paused — waiting for player'
          : isMyTurn
            ? 'Your turn'
            : `${displayName}'s turn`}
      </span>

      {!turnTimerPaused && (
        <span
          className={clsx(
            'font-mono text-sm font-bold tabular-nums',
            urgent && isMyTurn ? 'text-hub-danger' : ''
          )}
        >
          {seconds}s
        </span>
      )}
    </div>
  );
}
