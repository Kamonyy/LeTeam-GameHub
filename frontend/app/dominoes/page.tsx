import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import HubGameLoadingScreen from '@/components/hub/arcade/HubGameLoadingScreen';

const DominoesClient = dynamic(() => import('@/games/dominoes/DominoesClient'), {
  loading: () => <HubGameLoadingScreen gameId="dominoes" />,
});

export default function DominoesPage() {
  return (
    <Suspense fallback={<HubGameLoadingScreen gameId="dominoes" />}>
      <DominoesClient />
    </Suspense>
  );
}
