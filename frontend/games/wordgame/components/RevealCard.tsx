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
  className,
}: RevealCardProps) {
  const isLol = wordCategory === 'lol-champions' && championId;
  const isHero = layout === 'hero';

  return (
    <article
      className={playerBannerRevealClasses(
        ownerPlayerId,
        viewerPlayerId,
        playerIds,
        clsx(
          isHero ? 'sw-reveal-box--hero' : 'sw-reveal-box--side',
          className
        )
      )}
    >
      <span className="sw-reveal-box__pulse" aria-hidden />
      {isLol ?
        <div className="sw-reveal-box__media">
          <ChampionPortrait
            championId={championId!}
            size={isHero ? 'xl' : 'md'}
            reveal={isHero}
          />
        </div>
      :	<p className={clsx('sw-word-reveal', isHero ? undefined : 'text-lg')}>
          {word}
        </p>
      }
      <p className="sw-reveal-box__caption">{caption}</p>
    </article>
  );
}
