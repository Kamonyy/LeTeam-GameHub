'use client';

import { Suspense } from 'react';
import BaraAlsalafaClient from '@/games/bara-alsalafa/BaraAlsalafaClient';

export default function BaraAlsalafaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-hub-muted">
          جاري التحميل…
        </div>
      }
    >
      <BaraAlsalafaClient />
    </Suspense>
  );
}
