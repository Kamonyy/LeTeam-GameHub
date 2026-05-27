'use client';

import Image from 'next/image';
import clsx from 'clsx';
import { championIconSrc, getLolChampionById } from '@/lib/wordgame/lol-champions';

interface ChampionPortraitProps {
  championId: string;
  size?: 'md' | 'lg' | 'xl';
  className?: string;
  showName?: boolean;
}

const SIZE_PX = { md: 64, lg: 96, xl: 140 } as const;

export default function ChampionPortrait({
  championId,
  size = 'lg',
  className,
  showName = true,
}: ChampionPortraitProps) {
  const champ = getLolChampionById(championId);
  if (!champ) return null;

  const px = SIZE_PX[size];

  return (
    <div className={clsx('sw-champ-portrait', `sw-champ-portrait--${size}`, className)}>
      <div className="sw-champ-portrait__frame">
        <Image
          src={championIconSrc(championId)}
          alt=""
          width={px}
          height={px}
          className="sw-champ-portrait__img"
          unoptimized
        />
      </div>
      {showName && (
        <p className="sw-champ-portrait__name">{champ.name}</p>
      )}
    </div>
  );
}
