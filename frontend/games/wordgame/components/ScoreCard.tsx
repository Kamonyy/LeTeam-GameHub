'use client';

import clsx from 'clsx';

interface ScoreCardProps {
  playerNames: Record<string, string>;
  playerIds: string[];
  scores: Record<string, number>;
  myPlayerId: string;
  pointsToWin?: number;
}

export default function ScoreCard({
  playerNames,
  playerIds,
  scores,
  myPlayerId,
  pointsToWin,
}: ScoreCardProps) {
  return (
    <div className="flex gap-4 sm:gap-6 justify-center animate-fade-in px-2">
      {playerIds.map((id, index) => {
        const isMe = id === myPlayerId;
        const variant = index === 0 ? 'ember' : 'frost';
        return (
          <div
            key={id}
            className={clsx(
              'sw-banner',
              variant === 'ember' ? 'sw-banner--ember' : 'sw-banner--frost',
              isMe && 'sw-banner--me'
            )}
          >
            <span className="sw-banner__pulse" aria-hidden />
            <p className="sw-banner__label">
              {variant === 'ember' ? 'Challenger I' : 'Challenger II'}
              {isMe && ' · You'}
            </p>
            <p className="sw-banner__name truncate">{playerNames[id] || 'Player'}</p>
            <p className="sw-banner__score tabular-nums">{scores[id] ?? 0}</p>
            <p className="sw-banner__meta">
              {pointsToWin != null ? `First to ${pointsToWin}` : 'Session score'}
            </p>
          </div>
        );
      })}
    </div>
  );
}
