'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import GameAboutPanel from '@/components/hub/GameAboutPanel';
import { getGameEntry } from '@/lib/hub/games-registry';

interface InactiveGameScreenProps {
  gameId: string;
}

/** Shown when a game route is visited but the game is disabled in the catalog. */
export default function InactiveGameScreen({ gameId }: InactiveGameScreenProps) {
  const game = getGameEntry(gameId);
  if (!game) return null;

  return (
    <div className="max-w-md mx-auto animate-fade-in space-y-6">
      <div className="card text-center">
        <h2 className="text-lg font-semibold mb-2">{game.name} is offline</h2>
        <p className="text-sm text-hub-muted mb-6">
          {game.disabledReason ?? 'This game is temporarily unavailable.'}
        </p>
        <Link href="/" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to games
        </Link>
      </div>
      <GameAboutPanel gameId={gameId} />
    </div>
  );
}
