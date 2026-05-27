'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import {
  getResolvedChampionIconUrlSync,
  resolveChampionIconUrl,
} from '@/lib/wordgame/champion-icon-cache';

interface ChampionIconImageProps {
  championId: string;
  width: number;
  height: number;
  className?: string;
  alt?: string;
  loading?: 'lazy' | 'eager';
}

export default function ChampionIconImage({
  championId,
  width,
  height,
  className,
  alt = '',
  loading = 'lazy',
}: ChampionIconImageProps) {
  const [src, setSrc] = useState<string | null>(() =>
    getResolvedChampionIconUrlSync(championId)
  );

  useEffect(() => {
    const cached = getResolvedChampionIconUrlSync(championId);
    if (cached) {
      setSrc(cached);
      return;
    }

    let cancelled = false;
    resolveChampionIconUrl(championId).then((url) => {
      if (!cancelled) setSrc(url);
    });

    return () => {
      cancelled = true;
    };
  }, [championId]);

  if (!src) {
    return (
      <span
        className={clsx(className, 'sw-champ-icon-placeholder')}
        style={{ width, height }}
        aria-hidden
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={loading}
      decoding="async"
    />
  );
}
