import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import HubGameLoadingScreen from '@/components/hub/arcade/HubGameLoadingScreen';
import '@/app/hub-arcade.css';

const BaraAlsalafaClient = dynamic(
  () => import('@/games/bara-alsalafa/BaraAlsalafaClient'),
  {
    loading: () => <HubGameLoadingScreen gameId="bara-alsalafa" />,
  }
);

export default function BaraAlsalafaPage() {
  return (
    <Suspense fallback={<HubGameLoadingScreen gameId="bara-alsalafa" />}>
      <BaraAlsalafaClient />
    </Suspense>
  );
}
