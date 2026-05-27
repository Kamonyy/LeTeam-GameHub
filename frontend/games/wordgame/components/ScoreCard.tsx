'use client';

import { useEffect, useRef, useState } from 'react';
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
  const [bumpIds, setBumpIds] = useState<Record<string, boolean>>({});
  const prevScores = useRef(scores);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      prevScores.current = scores;
      return;
    }

    const nextBump: Record<string, boolean> = {};
    for (const id of playerIds) {
      if ((prevScores.current[id] ?? 0) < (scores[id] ?? 0)) {
        nextBump[id] = true;
      }
    }
    prevScores.current = scores;

    if (Object.keys(nextBump).length === 0) return;

    setBumpIds(nextBump);
    const timer = window.setTimeout(() => setBumpIds({}), 700);
    return () => window.clearTimeout(timer);
  }, [scores, playerIds]);

  return (
    <div className="flex gap-4 sm:gap-6 justify-center sw-animate-ascend px-2 sw-stagger">
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
            <p
              className={clsx(
                'sw-banner__score tabular-nums',
                bumpIds[id] && 'sw-banner__score--pulse'
              )}
            >
              {scores[id] ?? 0}
            </p>
            <p className="sw-banner__meta">
              {pointsToWin != null ? `First to ${pointsToWin}` : 'Session score'}
            </p>
          </div>
        );
      })}
    </div>
  );
}
