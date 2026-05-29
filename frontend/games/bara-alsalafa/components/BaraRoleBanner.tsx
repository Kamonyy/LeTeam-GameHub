'use client';

import clsx from 'clsx';
import type { BaraGameState } from '@/games/bara-alsalafa/types';

interface BaraRoleBannerProps {
  gameState: BaraGameState;
  compact?: boolean;
}

export default function BaraRoleBanner({
  gameState,
  compact = false,
}: BaraRoleBannerProps) {
  const role = gameState.roleView;
  if (!role) return null;

  const word = gameState.secretWord ?? role.secretWord;

  return (
    <div
      className={clsx(
        'bara-role-banner',
        compact && 'bara-role-banner--compact'
      )}
      dir="rtl"
      aria-live="polite"
    >
      <p className="bara-role-banner__label">بطاقتك</p>
      {role.isOutcast ?
        <p className="bara-role-banner__outcast">{role.outcastMessage}</p>
      : word ?
        <p className="bara-role-banner__word">{word}</p>
      : null}
      {!compact && (
        <p className="bara-role-banner__hint">
          {role.isOutcast ?
            'اندمج مع الإجابات دون أن تُفضح نفسك'
          : 'تذكّر الكلمة — لا تُفضحها أثناء الأسئلة'}
        </p>
      )}
    </div>
  );
}
