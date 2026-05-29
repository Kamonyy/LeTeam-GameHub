'use client';

import clsx from 'clsx';
import { ArrowLeft } from 'lucide-react';
import HubBackLink from '@/components/hub/HubBackLink';
import GameAboutPanel from '@/components/hub/GameAboutPanel';
import { getGameEntry } from '@/lib/hub/games-registry';

interface InactiveGameScreenProps {
  gameId: string;
}

/** Shown when a game route is visited but the game is disabled in the catalog. */
export default function InactiveGameScreen({ gameId }: InactiveGameScreenProps) {
  const game = getGameEntry(gameId);
  if (!game) return null;

  const isBara = gameId === 'bara-alsalafa';

  return (
    <div
      className="max-w-md mx-auto animate-fade-in space-y-6"
      dir={isBara ? 'rtl' : undefined}
      lang={isBara ? 'ar' : undefined}
    >
      <div className={isBara ? 'bara-card text-center' : 'card text-center'}>
        <h2 className="text-lg font-semibold mb-2">
          {isBara ? `${game.name} غير متاحة حالياً` : `${game.name} is offline`}
        </h2>
        <p className={clsx('text-sm mb-6', isBara ? 'bara-muted' : 'text-hub-muted')}>
          {game.disabledReason ??
            (isBara ?
              'اللعبة غير متاحة مؤقتاً.'
            :	'This game is temporarily unavailable.')}
        </p>
        <HubBackLink
          className={
            isBara ?
              'bara-btn-primary inline-flex items-center gap-2'
            :	'btn-primary inline-flex items-center gap-2'
          }
        >
          {isBara ?
            <>
              <ArrowLeft className="w-4 h-4 rotate-180" aria-hidden />
              العودة للألعاب
            </>
          :	<>
              <ArrowLeft className="w-4 h-4" />
              Back to games
            </>}
        </HubBackLink>
      </div>
      <GameAboutPanel gameId={gameId} variant={isBara ? 'bara' : 'hub'} />
    </div>
  );
}
