'use client';

import clsx from 'clsx';
import { getGameEntry } from '@/lib/hub/games-registry';

interface GameAboutPanelProps {
  gameId: string;
  className?: string;
}

/** Detailed game copy for the game route and waiting lobby */
export default function GameAboutPanel({ gameId, className }: GameAboutPanelProps) {
  const game = getGameEntry(gameId);
  if (!game) return null;

  return (
    <div
      className={clsx(
        'rounded-xl border border-hub-border bg-hub-surface/50 p-4 text-sm text-hub-muted space-y-2',
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-300">
        About {game.name}
      </p>
      {game.lobbyDescription.map((paragraph, i) => (
        <p key={i} className="leading-relaxed">
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
