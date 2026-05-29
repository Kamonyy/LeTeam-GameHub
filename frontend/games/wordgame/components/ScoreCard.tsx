'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { bannerVariantForPlayer } from '../lib/playerBannerTheme';

const POINT_GLOW_MS = 2000;

interface ScoreCardProps {
  playerNames: Record<string, string>;
  playerIds: string[];
  scores: Record<string, number>;
  myPlayerId: string;
  pointsToWin?: number;
  /** Spectator setup tracker — show lock state on banners */
  submissionStatus?: Record<string, boolean>;
  /** Center banners during setup / champion pick; left-align during play. */
  align?: 'start' | 'center';
}

export default function ScoreCard({
  playerNames,
  playerIds,
  scores,
  myPlayerId,
  pointsToWin,
  submissionStatus,
  align = 'start',
}: ScoreCardProps) {
  const [bumpIds, setBumpIds] = useState<Record<string, boolean>>({});
  const [glowIds, setGlowIds] = useState<Record<string, boolean>>({});
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
    setGlowIds(nextBump);
    const bumpTimer = window.setTimeout(() => setBumpIds({}), 700);
    const glowTimer = window.setTimeout(() => setGlowIds({}), POINT_GLOW_MS);
    return () => {
      window.clearTimeout(bumpTimer);
      window.clearTimeout(glowTimer);
    };
  }, [scores, playerIds]);

  return (
    <div
      className={clsx(
        'sw-score-banners flex gap-3 sm:gap-5 sw-animate-ascend sw-stagger',
        align === 'center' ?
          'sw-score-banners--center justify-center'
        : 'sw-score-banners--start justify-start'
      )}
    >
      {playerIds.map((id) => {
        const isMe = id === myPlayerId;
        const variant = bannerVariantForPlayer(id, playerIds);
        const glowing = Boolean(glowIds[id]);

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
            {glowing && <span className="sw-banner__point-glow" aria-hidden />}
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
              {submissionStatus != null ?
                submissionStatus[id] ?
                  'Locked in'
                :	'Still choosing'
              : pointsToWin != null ?
                `First to ${pointsToWin}`
              :	'Session score'}
            </p>
          </div>
        );
      })}
    </div>
  );
}
