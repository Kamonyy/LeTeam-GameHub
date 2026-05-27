'use client';

import clsx from 'clsx';
import { getLolChampionById } from '@/lib/wordgame/lol-champions';
import ChampionIconImage from './ChampionIconImage';

interface ChampionPortraitProps {
  championId: string;
  size?: 'md' | 'lg' | 'xl';
  className?: string;
  showName?: boolean;
  /** Dramatic hero entrance (reveals, large portraits) */
  reveal?: boolean;
}

const SIZE_PX = { md: 64, lg: 96, xl: 140 } as const;

export default function ChampionPortrait({
  championId,
  size = 'lg',
  className,
  showName = true,
  reveal = false,
}: ChampionPortraitProps) {
  const champ = getLolChampionById(championId);
  if (!champ) return null;

  const px = SIZE_PX[size];

  return (
    <div
      className={clsx(
        'sw-champ-portrait',
        `sw-champ-portrait--${size}`,
        reveal && 'sw-champ-portrait--reveal',
        className
      )}
    >
      <div className="sw-champ-portrait__frame">
        <ChampionIconImage
          championId={championId}
          width={px}
          height={px}
          className="sw-champ-portrait__img"
          loading="eager"
        />
      </div>
      {showName && (
        <p className="sw-champ-portrait__name">{champ.name}</p>
      )}
    </div>
  );
}
