import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const WordGameClient = dynamic(() => import('@/games/wordgame/WordGameClient'), {
  loading: () => (
    <div className="min-h-screen flex items-center justify-center text-hub-muted">
      Loading…
    </div>
  ),
});

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
