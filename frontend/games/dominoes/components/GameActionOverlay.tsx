'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import type { GameLastAction } from '../types';

interface GameActionOverlayProps {
  lastAction: GameLastAction | null;
  playerNames: Record<string, string>;
}

export default function GameActionOverlay({
  lastAction,
  playerNames,
}: GameActionOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [content, setContent] = useState<{
    title: string;
    subtitle?: string;
    variant: 'blocked' | 'domino' | 'pass';
  } | null>(null);

  useEffect(() => {
    if (!lastAction) return;

    if (lastAction.type === 'pass' && lastAction.auto) {
      const name = playerNames[lastAction.playerId || ''] || 'Player';
      setContent({
        title: 'BLOCKED!',
        subtitle: `${name} cannot play`,
        variant: 'pass',
      });
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 1800);
      return () => clearTimeout(t);
    }

    if (lastAction.type === 'gameover') {
      const name = playerNames[lastAction.winnerId || ''] || 'Winner';
      if (lastAction.reason === 'domino') {
        setContent({
          title: 'DOMINO!',
          subtitle: `${name} cleared their hand`,
          variant: 'domino',
        });
      } else {
        setContent({
          title: 'TABLE LOCKED',
          subtitle: `${name} wins the round`,
          variant: 'blocked',
        });
      }
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 3200);
      return () => clearTimeout(t);
    }
  }, [lastAction, playerNames]);

  if (!visible || !content) return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
      <div
        className={clsx(
          'animate-overlay-pop max-md:animate-fade-in px-10 py-6 rounded-2xl border-2 glass-blur-md shadow-2xl text-center',
          content.variant === 'domino' &&
            'border-amber-400/60 bg-amber-950/85 text-amber-100',
          content.variant === 'blocked' &&
            'border-orange-400/50 bg-orange-950/80 text-orange-100',
          content.variant === 'pass' &&
            'border-red-400/50 bg-red-950/75 text-red-100'
        )}
      >
        <p className="text-4xl sm:text-5xl font-black tracking-wider drop-shadow-lg">
          {content.title}
        </p>
        {content.subtitle && (
          <p className="mt-2 text-sm sm:text-base opacity-90">{content.subtitle}</p>
        )}
      </div>
    </div>
  );
}
