'use client';

import { Suspense } from 'react';
import WordGameClient from '@/games/wordgame/WordGameClient';

export default function WordGamePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-hub-muted">
          Loading…
        </div>
      }
    >
      <WordGameClient />
    </Suspense>
  );
}
