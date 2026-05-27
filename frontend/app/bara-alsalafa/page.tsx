import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const BaraAlsalafaClient = dynamic(
  () => import('@/games/bara-alsalafa/BaraAlsalafaClient'),
  {
    loading: () => (
      <div className="min-h-screen flex items-center justify-center text-hub-muted">
        جاري التحميل…
      </div>
    ),
  }
);

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
