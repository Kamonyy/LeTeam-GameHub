'use client';

import { Suspense } from 'react';
import DominoesClient from '@/games/dominoes/DominoesClient';

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
