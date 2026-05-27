'use client';

import clsx from 'clsx';
import { getGameEntry } from '@/lib/hub/games-registry';

interface GameAboutPanelProps {
  gameId: string;
  className?: string;
  /** Match game theme when shown in sidebar */
  variant?: 'hub' | 'wordgame' | 'bara';
}

/** Detailed game copy for the game route and waiting lobby */
export default function GameAboutPanel({
  gameId,
  className,
  variant = 'hub',
}: GameAboutPanelProps) {
  const game = getGameEntry(gameId);
  if (!game) return null;

  const isWordgame = variant === 'wordgame';
  const isBara = variant === 'bara';
  const isThemed = isWordgame || isBara;

  return (
    <div
      className={clsx(
        isThemed ?
          'text-sm space-y-2.5'
        :	'rounded-xl border border-hub-border bg-hub-surface/50 p-4 text-sm text-hub-muted space-y-2',
        className,
      )}
      dir={isBara ? 'rtl' : undefined}
    >
      {!isThemed && (
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-300">
          About {game.name}
        </p>
      )}
      {game.lobbyDescription.map((paragraph, i) => (
        <p
          key={i}
          className={clsx(
            'leading-relaxed',
            isWordgame && 'sw-muted text-[13px]',
            isBara && 'bara-muted text-[13px]',
          )}
        >
          {paragraph}
        </p>
      ))}
      {!game.active && game.disabledReason && (
        <p className="text-hub-warning text-xs pt-1 border-t border-hub-border/60">
          {game.disabledReason}
        </p>
      )}
    </div>
  );
}
