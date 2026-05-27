import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const DominoesClient = dynamic(() => import('@/games/dominoes/DominoesClient'), {
  loading: () => (
    <div className="min-h-screen flex items-center justify-center text-hub-muted">
      Loading…
    </div>
  ),
});

export default function DominoesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-hub-muted">
          Loading…
        </div>
      }
    >
      <DominoesClient />
    </Suspense>
  );
}
