'use client';

import clsx from 'clsx';
import type { WordCategory } from '../types';
import ChampionPortrait from './ChampionPortrait';
import { playerBannerRevealClasses } from '../lib/playerBannerTheme';

export type RevealCardLayout = 'hero' | 'side';

export interface RevealCardProps {
  wordCategory: WordCategory;
  word: string;
  championId: string | null;
  ownerPlayerId: string;
  viewerPlayerId: string;
  playerIds: string[];
  caption: string;
  layout?: RevealCardLayout;
  compact?: boolean;
  className?: string;
}

export default function RevealCard({
  wordCategory,
  word,
  championId,
  ownerPlayerId,
  viewerPlayerId,
  playerIds,
  caption,
  layout = 'side',
  compact = false,
  className,
}: RevealCardProps) {
  const isLol = wordCategory === 'lol-champions' && championId;
  const isHero = layout === 'hero';
  const portraitSize = compact ? 'md' : isHero ? 'xl' : 'md';
  const showPortraitName = !compact || isHero;

  return (
    <article
      className={playerBannerRevealClasses(
        ownerPlayerId,
        viewerPlayerId,
        playerIds,
        clsx(
          isHero ? 'sw-reveal-box--hero' : 'sw-reveal-box--side',
          compact && 'sw-reveal-box--compact',
          className
        )
      )}
    >
      <span className="sw-reveal-box__pulse" aria-hidden />
      {isLol ?
        <div className="sw-reveal-box__media">
          <ChampionPortrait
            championId={championId!}
            size={portraitSize}
            reveal={isHero && !compact}
            showName={showPortraitName}
          />
        </div>
      :	<p
          className={clsx(
            'sw-word-reveal',
            !isHero && 'text-lg',
            compact && isHero && 'sw-word-reveal--compact-hero',
          )}
        >
          {word}
        </p>
      }
      <p className="sw-reveal-box__caption">{caption}</p>
    </article>
  );
}
